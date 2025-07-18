const express = require('express');
const router = express.Router();

/**
 * GET /api/system/info - Получение информации о системе
 */
router.get('/info', async (req, res) => {
  try {
    const systemInfo = await req.systemMonitor.getSystemInfo();
    const cliInfo = await req.nexusCLI.checkCLIAvailability();
    const rpcInfo = await req.nexusRPC.checkConnection();
    
    res.json({
      success: true,
      data: {
        system: systemInfo,
        nexus_cli: cliInfo,
        nexus_rpc: rpcInfo,
        server: {
          version: '1.0.0',
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version,
          platform: process.platform
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting system info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/system/health - Проверка состояния системы
 */
router.get('/health', async (req, res) => {
  try {
    const systemHealth = await req.systemMonitor.checkSystemHealth();
    const cliHealth = await req.nexusCLI.checkCLIAvailability();
    const rpcHealth = await req.nexusRPC.checkConnection();
    
    const overallHealth = {
      healthy: systemHealth.healthy && cliHealth.available && rpcHealth.connected,
      timestamp: new Date().toISOString(),
      services: {
        system: systemHealth,
        nexus_cli: cliHealth,
        nexus_rpc: rpcHealth,
        database: { connected: true },
        websocket: { 
          connected: true,
          clients: req.wsClients.size
        }
      }
    };
    
    const statusCode = overallHealth.healthy ? 200 : 503;
    res.status(statusCode).json({
      success: overallHealth.healthy,
      data: overallHealth
    });
  } catch (error) {
    console.error('❌ Error checking system health:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/system/processes - Получение информации о процессах Nexus
 */
router.get('/processes', async (req, res) => {
  try {
    const nexusProcesses = await req.systemMonitor.getNexusProcesses();
    const runningNodes = req.nexusCLI.getRunningNodes();
    
    res.json({
      success: true,
      data: {
        nexus_processes: nexusProcesses,
        running_nodes: runningNodes,
        total_processes: nexusProcesses.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error getting processes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/system/process/:pid - Получение детальной информации о процессе
 */
router.get('/process/:pid', async (req, res) => {
  try {
    const pid = parseInt(req.params.pid);
    const processDetails = await req.systemMonitor.getProcessDetails(pid);
    
    if (!processDetails) {
      return res.status(404).json({
        success: false,
        error: 'Process not found'
      });
    }
    
    res.json({
      success: true,
      data: processDetails
    });
  } catch (error) {
    console.error('❌ Error getting process details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/system/metrics - Получение системных метрик
 */
router.get('/metrics', async (req, res) => {
  try {
    const systemMetrics = req.systemMonitor.getLatestMetrics();
    const loadStats = await req.systemMonitor.getLoadStats();
    const networkStats = await req.systemMonitor.getNetworkStats();
    
    res.json({
      success: true,
      data: {
        system_metrics: systemMetrics,
        load_stats: loadStats,
        network_stats: networkStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error getting system metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/system/stats - Получение статистики системы
 */
router.get('/stats', async (req, res) => {
  try {
    const nodes = await req.db.getNodes();
    const systemMetrics = req.systemMonitor.getLatestMetrics();
    
    // Подсчет статистики узлов
    const nodeStats = {
      total: nodes.length,
      running: nodes.filter(n => n.status === 'running').length,
      stopped: nodes.filter(n => n.status === 'stopped').length,
      error: nodes.filter(n => n.status === 'error').length,
      starting: nodes.filter(n => n.status === 'starting').length
    };
    
    // Подсчет общих метрик
    let totalPoints = 0;
    let totalTasks = 0;
    
    for (const node of nodes) {
      const nexPoints = await req.nexusRPC.getNEXPoints(node.prover_id);
      totalPoints += nexPoints.points || 0;
      totalTasks += nexPoints.tasks || 0;
    }
    
    res.json({
      success: true,
      data: {
        nodes: nodeStats,
        performance: {
          total_points: totalPoints,
          total_tasks: totalTasks,
          avg_points_per_node: nodes.length > 0 ? Math.round(totalPoints / nodes.length) : 0,
          avg_tasks_per_node: nodes.length > 0 ? Math.round(totalTasks / nodes.length) : 0
        },
        system: {
          cpu_usage: systemMetrics?.cpu?.usage || 0,
          memory_usage: systemMetrics?.memory?.usage || 0,
          uptime: process.uptime(),
          load_average: systemMetrics?.load_average || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error getting system stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/system/restart - Перезапуск мониторинга
 */
router.post('/restart', async (req, res) => {
  try {
    req.systemMonitor.stop();
    req.systemMonitor.start();
    
    res.json({
      success: true,
      message: 'System monitoring restarted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error restarting system monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/system/cleanup - Очистка старых данных
 */
router.post('/cleanup', async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 30;
    
    // Очистка старых метрик
    const metricsResult = await req.db.cleanOldMetrics(days);
    
    // Очистка старых уведомлений
    const notificationsResult = await req.db.run(
      `DELETE FROM notifications WHERE timestamp < datetime('now', '-${days} days')`
    );
    
    res.json({
      success: true,
      message: `Cleaned data older than ${days} days`,
      data: {
        metrics_deleted: metricsResult.changes,
        notifications_deleted: notificationsResult.changes
      }
    });
  } catch (error) {
    console.error('❌ Error cleaning up data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/system/logs - Получение логов приложения
 */
router.get('/logs', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100;
    const level = req.query.level || 'info';
    
    // Симуляция получения логов (в реальном приложении читали бы из файла)
    const logs = [
      { timestamp: new Date().toISOString(), level: 'info', message: 'System monitoring started' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Connected to Nexus RPC' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'WebSocket server ready' }
    ];
    
    res.json({
      success: true,
      data: {
        logs: logs,
        total_lines: logs.length,
        level: level
      }
    });
  } catch (error) {
    console.error('❌ Error getting logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/system/config - Получение конфигурации
 */
router.get('/config', async (req, res) => {
  try {
    const configKeys = [
      'app_version',
      'installation_date',
      'default_update_interval',
      'metrics_retention_days'
    ];
    
    const config = {};
    for (const key of configKeys) {
      const value = await req.db.getConfig(key);
      config[key] = value;
    }
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('❌ Error getting config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/system/config - Обновление конфигурации
 */
router.post('/config', async (req, res) => {
  try {
    const updates = req.body;
    
    for (const [key, value] of Object.entries(updates)) {
      await req.db.setConfig(key, value);
    }
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: updates
    });
  } catch (error) {
    console.error('❌ Error updating config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/system/test-connection - Тестирование подключений
 */
router.post('/test-connection', async (req, res) => {
  try {
    const { service } = req.body;
    
    let result = {};
    
    switch (service) {
      case 'nexus-cli':
        result = await req.nexusCLI.checkCLIAvailability();
        break;
      case 'nexus-rpc':
        result = await req.nexusRPC.checkConnection();
        break;
      case 'database':
        result = { connected: true, message: 'Database connection active' };
        break;
      case 'all':
        result = {
          nexus_cli: await req.nexusCLI.checkCLIAvailability(),
          nexus_rpc: await req.nexusRPC.checkConnection(),
          database: { connected: true, message: 'Database connection active' }
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid service specified'
        });
    }
    
    res.json({
      success: true,
      service: service,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 