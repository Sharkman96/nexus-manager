const express = require('express');
const router = express.Router();

/**
 * GET /api/metrics - Получение метрик для всех узлов
 */
router.get('/', async (req, res) => {
  try {
    const nodes = await req.db.getNodes();
    const metricsData = [];
    
    for (const node of nodes) {
      const latestMetrics = await req.db.getLatestMetrics(node.id);
      const nexPoints = await req.nexusRPC.getNEXPoints(node.prover_id);
      
      metricsData.push({
        node_id: node.id,
        prover_id: node.prover_id,
        name: node.name,
        status: node.status,
        metrics: latestMetrics,
        nex_points: nexPoints.points,
        tasks_completed: nexPoints.tasks,
        rank: nexPoints.rank,
        last_update: nexPoints.lastUpdate
      });
    }
    
    res.json({
      success: true,
      data: metricsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/node/:id - Получение метрик для конкретного узла
 */
router.get('/node/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 100;
    
    const node = await req.db.getNode(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    const metrics = await req.db.getMetrics(nodeId, limit);
    const nexPoints = await req.nexusRPC.getNEXPoints(node.prover_id);
    
    res.json({
      success: true,
      data: {
        node_id: nodeId,
        prover_id: node.prover_id,
        name: node.name,
        metrics: metrics,
        nex_points: nexPoints.points,
        tasks_completed: nexPoints.tasks,
        rank: nexPoints.rank
      }
    });
  } catch (error) {
    console.error('❌ Error getting node metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/node/:id/history - Получение исторических данных
 */
router.get('/node/:id/history', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const hours = parseInt(req.query.hours) || 24;
    
    const node = await req.db.getNode(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);
    
    const metrics = await req.db.getMetricsInRange(
      nodeId, 
      startDate.toISOString(), 
      endDate.toISOString()
    );
    
    // Группировка данных по времени для графиков
    const chartData = {
      timestamps: metrics.map(m => m.timestamp),
      cpu_usage: metrics.map(m => m.cpu_usage),
      memory_usage: metrics.map(m => m.memory_usage),
      nex_points: metrics.map(m => m.nex_points),
      tasks_completed: metrics.map(m => m.tasks_completed),
      uptime: metrics.map(m => m.uptime)
    };
    
    res.json({
      success: true,
      data: {
        node_id: nodeId,
        prover_id: node.prover_id,
        period: `${hours} hours`,
        chart_data: chartData,
        raw_metrics: metrics
      }
    });
  } catch (error) {
    console.error('❌ Error getting node history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/metrics/node/:id - Добавление метрики для узла
 */
router.post('/node/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const metricsData = req.body;
    
    const node = await req.db.getNode(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    // Получение системных метрик
    const systemMetrics = req.systemMonitor.getLatestMetrics();
    
    // Получение метрик из CLI
    const cliMetrics = await req.nexusCLI.getNodeMetrics(node.prover_id);
    
    // Получение NEX Points
    const nexPoints = await req.nexusRPC.getNEXPoints(node.prover_id);
    
    // Объединение всех метрик
    const combinedMetrics = {
      nex_points: nexPoints.points || 0,
      tasks_completed: nexPoints.tasks || 0,
      cpu_usage: systemMetrics?.cpu?.usage || 0,
      memory_usage: systemMetrics?.memory?.usage || 0,
      uptime: metricsData.uptime || 0,
      block_height: cliMetrics?.metrics?.block_height || 0,
      ...metricsData
    };
    
    const result = await req.db.addMetric(nodeId, combinedMetrics);
    
    // Уведомление через WebSocket
    req.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'newMetrics',
          data: {
            node_id: nodeId,
            prover_id: node.prover_id,
            metrics: combinedMetrics
          },
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    res.json({
      success: true,
      message: 'Metrics added successfully',
      data: {
        id: result.id,
        metrics: combinedMetrics
      }
    });
  } catch (error) {
    console.error('❌ Error adding metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/system - Получение системных метрик
 */
router.get('/system', async (req, res) => {
  try {
    const systemMetrics = req.systemMonitor.getLatestMetrics();
    const nexusProcesses = await req.systemMonitor.getNexusProcesses();
    const systemInfo = await req.systemMonitor.getSystemInfo();
    
    res.json({
      success: true,
      data: {
        system_metrics: systemMetrics,
        nexus_processes: nexusProcesses,
        system_info: systemInfo,
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
 * GET /api/metrics/network - Получение метрик сети Nexus
 */
router.get('/network', async (req, res) => {
  try {
    const [blockchainInfo, networkStats] = await Promise.all([
      req.nexusRPC.getBlockchainInfo(),
      req.nexusRPC.getNetworkStats()
    ]);
    
    res.json({
      success: true,
      data: {
        blockchain: blockchainInfo,
        network: networkStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error getting network metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/transactions/:proverId - Получение транзакций узла
 */
router.get('/transactions/:proverId', async (req, res) => {
  try {
    const proverId = req.params.proverId;
    const limit = parseInt(req.query.limit) || 50;
    
    const node = await req.db.getNodeByProverId(proverId);
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    const [dbTransactions, rpcTransactions] = await Promise.all([
      req.db.getTransactions(node.id, limit),
      req.nexusRPC.getNodeTransactions(proverId, limit)
    ]);
    
    res.json({
      success: true,
      data: {
        node_id: node.id,
        prover_id: proverId,
        db_transactions: dbTransactions,
        rpc_transactions: rpcTransactions,
        total_count: dbTransactions.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/summary - Получение сводки по всем узлам
 */
router.get('/summary', async (req, res) => {
  try {
    const nodes = await req.db.getNodes();
    const systemMetrics = req.systemMonitor.getLatestMetrics();
    
    let totalPoints = 0;
    let totalTasks = 0;
    let runningNodes = 0;
    let errorNodes = 0;
    
    const nodesSummary = [];
    
    for (const node of nodes) {
      const latestMetrics = await req.db.getLatestMetrics(node.id);
      const nexPoints = await req.nexusRPC.getNEXPoints(node.prover_id);
      
      totalPoints += nexPoints.points || 0;
      totalTasks += nexPoints.tasks || 0;
      
      if (node.status === 'running') runningNodes++;
      if (node.status === 'error') errorNodes++;
      
      nodesSummary.push({
        id: node.id,
        name: node.name,
        status: node.status,
        points: nexPoints.points || 0,
        tasks: nexPoints.tasks || 0,
        last_seen: node.last_seen
      });
    }
    
    res.json({
      success: true,
      data: {
        overview: {
          total_nodes: nodes.length,
          running_nodes: runningNodes,
          error_nodes: errorNodes,
          total_points: totalPoints,
          total_tasks: totalTasks
        },
        system: {
          cpu_usage: systemMetrics?.cpu?.usage || 0,
          memory_usage: systemMetrics?.memory?.usage || 0,
          uptime: process.uptime()
        },
        nodes: nodesSummary,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error getting summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/metrics/node/:id/old - Очистка старых метрик
 */
router.delete('/node/:id/old', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const days = parseInt(req.query.days) || 30;
    
    const node = await req.db.getNode(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    // Удаление старых метрик
    const result = await req.db.cleanOldMetrics(days);
    
    res.json({
      success: true,
      message: `Cleaned metrics older than ${days} days`,
      data: {
        deleted_count: result.changes
      }
    });
  } catch (error) {
    console.error('❌ Error cleaning old metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/realtime - Получение метрик в реальном времени
 */
router.get('/realtime', async (req, res) => {
  try {
    // Установка SSE заголовков
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    const sendMetrics = async () => {
      try {
        const summary = await getSummaryData(req);
        res.write(`data: ${JSON.stringify(summary)}\n\n`);
      } catch (error) {
        console.error('❌ Error sending realtime metrics:', error);
      }
    };
    
    // Отправка данных каждые 10 секунд
    const interval = setInterval(sendMetrics, 10000);
    
    // Первая отправка
    sendMetrics();
    
    // Очистка при закрытии соединения
    req.on('close', () => {
      clearInterval(interval);
    });
    
    req.on('end', () => {
      clearInterval(interval);
    });
    
  } catch (error) {
    console.error('❌ Error setting up realtime metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Вспомогательная функция для получения сводных данных
async function getSummaryData(req) {
  const nodes = await req.db.getNodes();
  const systemMetrics = req.systemMonitor.getLatestMetrics();
  
  let totalPoints = 0;
  let totalTasks = 0;
  let runningNodes = 0;
  
  for (const node of nodes) {
    const nexPoints = await req.nexusRPC.getNEXPoints(node.prover_id);
    totalPoints += nexPoints.points || 0;
    totalTasks += nexPoints.tasks || 0;
    if (node.status === 'running') runningNodes++;
  }
  
  return {
    overview: {
      total_nodes: nodes.length,
      running_nodes: runningNodes,
      total_points: totalPoints,
      total_tasks: totalTasks
    },
    system: {
      cpu_usage: systemMetrics?.cpu?.usage || 0,
      memory_usage: systemMetrics?.memory?.usage || 0
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = router; 