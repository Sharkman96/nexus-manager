const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

// Импорт конфигурации и сервисов
const config = require('../config');
const Database = require('./database/db');
const DatabaseMigration = require('./database/migrate');
const NexusCLI = require('./services/nexus-cli');
const NexusRPC = require('./services/nexus-rpc');
const SystemMonitor = require('./services/system-monitor');

// Импорт роутов
const nodeRoutes = require('./routes/nodes');
const metricsRoutes = require('./routes/metrics');
const systemRoutes = require('./routes/system');
const notificationRoutes = require('./routes/notifications');

class NexusNodeManager {
  constructor() {
    this.app = express();
    this.server = null;
    this.wss = null;
    
    // Сервисы
    this.db = new Database();
    this.nexusCLI = new NexusCLI();
    this.nexusRPC = new NexusRPC();
    this.systemMonitor = new SystemMonitor();
    
    // WebSocket клиенты
    this.wsClients = new Set();
  }

  async init() {
    try {
      console.log('🚀 Starting Nexus Node Manager...');
      
      // Инициализация базы данных
      await this.initDatabase();
      
      // Настройка Express
      this.setupExpress();
      
      // Настройка роутов
      this.setupRoutes();
      
      // Создание HTTP сервера
      this.server = http.createServer(this.app);
      
      // Настройка WebSocket
      this.setupWebSocket();
      
      // Инициализация сервисов
      await this.initServices();
      
      // Запуск сервера
      await this.startServer();
      
      console.log('✅ Nexus Node Manager started successfully!');
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async initDatabase() {
    console.log('📦 Initializing database...');
    
    // Выполнение миграций
    const migration = new DatabaseMigration();
    await migration.init();
    
    // Подключение к базе данных
    await this.db.connect();
    
    console.log('✅ Database initialized');
  }

  setupExpress() {
    console.log('⚙️  Setting up Express middleware...');
    
    // Базовое middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.security.corsOrigins,
      credentials: true
    }));
    
    // Логирование
    this.app.use(morgan('combined'));
    
    // Парсинг JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindow * 60 * 1000,
      max: config.security.rateLimitMaxRequests,
      message: 'Too many requests from this IP'
    });
    this.app.use('/api/', limiter);
    
    // Статические файлы
    this.app.use('/static', express.static(path.join(__dirname, '../../public')));
    
    console.log('✅ Express middleware configured');
  }

  setupRoutes() {
    console.log('🛣️  Setting up routes...');
    
    // Передача сервисов в роуты
    this.app.use((req, res, next) => {
      req.db = this.db;
      req.nexusCLI = this.nexusCLI;
      req.nexusRPC = this.nexusRPC;
      req.systemMonitor = this.systemMonitor;
      req.wsClients = this.wsClients;
      next();
    });
    
    // API роуты
    this.app.use('/api/nodes', nodeRoutes);
    this.app.use('/api/metrics', metricsRoutes);
    this.app.use('/api/system', systemRoutes);
    this.app.use('/api/notifications', notificationRoutes);
    
    // Базовые роуты
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Nexus Node Manager API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });
    
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.checkHealth();
        res.json(health);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    });
    
    // 404 обработчик
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
      });
    });
    
    // Обработчик ошибок
    this.app.use((err, req, res, next) => {
      console.error('❌ Express error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
      });
    });
    
    console.log('✅ Routes configured');
  }

  setupWebSocket() {
    console.log('🔌 Setting up WebSocket...');
    
    this.wss = new WebSocket.Server({ server: this.server });
    
    this.wss.on('connection', (ws, req) => {
      console.log('🔗 New WebSocket client connected');
      
      this.wsClients.add(ws);
      
      // Отправка текущего состояния
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Nexus Node Manager',
        timestamp: new Date().toISOString()
      }));
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('❌ WebSocket message error:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('📪 WebSocket client disconnected');
        this.wsClients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.wsClients.delete(ws);
      });
    });
    
    console.log('✅ WebSocket configured');
  }

  handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;
      
      case 'subscribe':
        // Подписка на определенные события
        if (data.events) {
          ws.subscribedEvents = data.events;
        }
        break;
      
      default:
        console.warn('🤔 Unknown WebSocket message type:', data.type);
    }
  }

  async initServices() {
    console.log('🔧 Initializing services...');
    
    // Инициализация Nexus RPC
    await this.nexusRPC.connectWebSocket();
    
    // Настройка обработчиков событий
    this.setupEventHandlers();
    
    // Запуск системного мониторинга
    this.systemMonitor.start();
    
    console.log('✅ Services initialized');
  }

  setupEventHandlers() {
    // Обработка новых блоков
    this.nexusRPC.on('newBlock', (blockData) => {
      this.broadcastToClients({
        type: 'newBlock',
        data: blockData,
        timestamp: new Date().toISOString()
      });
    });
    
    // Обработка системных метрик
    this.systemMonitor.subscribe('metrics', (metrics) => {
      this.broadcastToClients({
        type: 'systemMetrics',
        data: metrics,
        timestamp: new Date().toISOString()
      });
    });
  }

  broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    
    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        // Проверка подписки на события
        if (!client.subscribedEvents || client.subscribedEvents.includes(message.type)) {
          client.send(messageStr);
        }
      }
    });
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server.listen(config.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🌐 Server running on port ${config.port}`);
          console.log(`📡 WebSocket server ready`);
          resolve();
        }
      });
    });
  }

  async checkHealth() {
    const [cliHealth, rpcHealth, systemHealth] = await Promise.all([
      this.nexusCLI.checkCLIAvailability(),
      this.nexusRPC.checkConnection(),
      this.systemMonitor.checkSystemHealth()
    ]);
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        nexusCLI: cliHealth,
        nexusRPC: rpcHealth,
        systemMonitor: systemHealth,
        database: { connected: true },
        webSocket: { 
          connected: true,
          clients: this.wsClients.size
        }
      }
    };
  }

  async shutdown() {
    console.log('🛑 Shutting down server...');
    
    // Закрытие WebSocket соединений
    this.wsClients.forEach(client => {
      client.close();
    });
    
    // Остановка сервисов
    this.systemMonitor.cleanup();
    this.nexusRPC.disconnect();
    this.nexusCLI.cleanup();
    
    // Закрытие базы данных
    await this.db.close();
    
    // Закрытие HTTP сервера
    if (this.server) {
      this.server.close();
    }
    
    console.log('✅ Server shutdown complete');
  }
}

// Создание и запуск приложения
const app = new NexusNodeManager();

// Обработка сигналов завершения
process.on('SIGTERM', async () => {
  console.log('📥 Received SIGTERM');
  await app.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📥 Received SIGINT');
  await app.shutdown();
  process.exit(0);
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Запуск приложения
app.init().catch(console.error);

module.exports = app; 