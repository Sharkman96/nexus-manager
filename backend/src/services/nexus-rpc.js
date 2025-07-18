const { ethers } = require('ethers');
const WebSocket = require('ws');
const axios = require('axios');
const config = require('../../config');

class NexusRPC {
  constructor() {
    this.rpcUrl = config.nexus.rpcUrl;
    this.wsUrl = config.nexus.wsUrl;
    this.explorerApi = config.nexus.explorerApi;
    
    // Инициализация провайдеров
    this.httpProvider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.wsProvider = null;
    this.websocket = null;
    
    // Обработчики событий
    this.eventHandlers = new Map();
  }

  /**
   * Подключение к WebSocket
   */
  async connectWebSocket() {
    try {
      this.websocket = new WebSocket(this.wsUrl);
      
      this.websocket.on('open', () => {
        console.log('🔗 Connected to Nexus WebSocket');
        this.setupWebSocketHandlers();
      });

      this.websocket.on('close', () => {
        console.log('📪 WebSocket connection closed');
        this.reconnectWebSocket();
      });

      this.websocket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      this.websocket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to connect to WebSocket:', error);
      return false;
    }
  }

  /**
   * Настройка обработчиков WebSocket
   */
  setupWebSocketHandlers() {
    if (!this.websocket) return;

    // Подписка на новые блоки
    this.websocket.send(JSON.stringify({
      id: 1,
      method: 'eth_subscribe',
      params: ['newHeads']
    }));

    // Подписка на логи транзакций
    this.websocket.send(JSON.stringify({
      id: 2,
      method: 'eth_subscribe',
      params: ['logs', {}]
    }));

    // Heartbeat для поддержания соединения
    this.startHeartbeat();
  }

  /**
   * Обработка сообщений WebSocket
   */
  handleWebSocketMessage(message) {
    if (message.method === 'eth_subscription') {
      const { subscription, result } = message.params;
      
      if (result.number) {
        // Новый блок
        this.emit('newBlock', {
          number: parseInt(result.number, 16),
          hash: result.hash,
          timestamp: parseInt(result.timestamp, 16)
        });
      } else if (result.topics) {
        // Новый лог
        this.emit('newLog', result);
      }
    }
  }

  /**
   * Переподключение WebSocket
   */
  reconnectWebSocket() {
    setTimeout(() => {
      console.log('🔄 Reconnecting to WebSocket...');
      this.connectWebSocket();
    }, 5000);
  }

  /**
   * Heartbeat для поддержания соединения
   */
  startHeartbeat() {
    setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          id: Date.now(),
          method: 'eth_chainId',
          params: []
        }));
      }
    }, config.monitoring.wsHeartbeatInterval);
  }

  /**
   * Получение информации о блокчейне
   */
  async getBlockchainInfo() {
    try {
      const [blockNumber, gasPrice, balance] = await Promise.all([
        this.httpProvider.getBlockNumber(),
        this.httpProvider.getFeeData(),
        this.httpProvider.getBalance('0x0000000000000000000000000000000000000000')
      ]);

      return {
        blockNumber,
        gasPrice: gasPrice.gasPrice?.toString() || '0',
        networkBalance: balance.toString()
      };
    } catch (error) {
      console.error('❌ Failed to get blockchain info:', error);
      return null;
    }
  }

  /**
   * Получение информации о блоке
   */
  async getBlock(blockNumber) {
    try {
      const block = await this.httpProvider.getBlock(blockNumber);
      return block;
    } catch (error) {
      console.error(`❌ Failed to get block ${blockNumber}:`, error);
      return null;
    }
  }

  /**
   * Получение транзакции
   */
  async getTransaction(txHash) {
    try {
      const tx = await this.httpProvider.getTransaction(txHash);
      return tx;
    } catch (error) {
      console.error(`❌ Failed to get transaction ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Получение данных о NEX Points через Explorer API
   */
  async getNEXPoints(proverId) {
    try {
      const response = await axios.get(`${this.explorerApi}/nexus/points/${proverId}`, {
        timeout: 10000
      });
      
      return {
        points: response.data.points || 0,
        tasks: response.data.tasks || 0,
        rank: response.data.rank || 0,
        lastUpdate: response.data.lastUpdate || new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to get NEX points for ${proverId}:`, error);
      return {
        points: 0,
        tasks: 0,
        rank: 0,
        lastUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Получение истории транзакций узла
   */
  async getNodeTransactions(proverId, limit = 50) {
    try {
      const response = await axios.get(`${this.explorerApi}/nexus/transactions/${proverId}`, {
        params: { limit },
        timeout: 10000
      });
      
      return response.data.transactions || [];
    } catch (error) {
      console.error(`❌ Failed to get transactions for ${proverId}:`, error);
      return [];
    }
  }

  /**
   * Получение статистики сети
   */
  async getNetworkStats() {
    try {
      const response = await axios.get(`${this.explorerApi}/nexus/stats`, {
        timeout: 10000
      });
      
      return {
        totalNodes: response.data.totalNodes || 0,
        totalTasks: response.data.totalTasks || 0,
        totalPoints: response.data.totalPoints || 0,
        networkHashrate: response.data.networkHashrate || 0,
        avgBlockTime: response.data.avgBlockTime || 0
      };
    } catch (error) {
      console.error('❌ Failed to get network stats:', error);
      return {
        totalNodes: 0,
        totalTasks: 0,
        totalPoints: 0,
        networkHashrate: 0,
        avgBlockTime: 0
      };
    }
  }

  /**
   * Поиск событий по адресу
   */
  async getEventsByAddress(address, fromBlock = 'latest', toBlock = 'latest') {
    try {
      const logs = await this.httpProvider.getLogs({
        address,
        fromBlock,
        toBlock
      });
      
      return logs;
    } catch (error) {
      console.error(`❌ Failed to get events for ${address}:`, error);
      return [];
    }
  }

  /**
   * Проверка статуса соединения
   */
  async checkConnection() {
    try {
      const blockNumber = await this.httpProvider.getBlockNumber();
      return {
        connected: true,
        blockNumber,
        wsConnected: this.websocket?.readyState === WebSocket.OPEN
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        wsConnected: false
      };
    }
  }

  /**
   * Добавление обработчика событий
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Удаление обработчика событий
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Эмиссия события
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Event handler error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Закрытие соединений
   */
  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    if (this.wsProvider) {
      this.wsProvider.removeAllListeners();
      this.wsProvider = null;
    }
    
    console.log('🔌 Disconnected from Nexus RPC');
  }
}

module.exports = NexusRPC; 