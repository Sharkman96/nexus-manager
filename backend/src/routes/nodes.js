const express = require('express');
const router = express.Router();

/**
 * GET /api/nodes - Получение списка всех узлов
 */
router.get('/', async (req, res) => {
  try {
    const nodes = await req.db.getNodes();
    
    // Обогащение данных статусом из CLI
    const enrichedNodes = await Promise.all(nodes.map(async (node) => {
      const cliStatus = await req.nexusCLI.getNodeStatus(node.prover_id);
      const latestMetrics = await req.db.getLatestMetrics(node.id);
      
      return {
        ...node,
        config: node.config ? JSON.parse(node.config) : {},
        cli_status: cliStatus,
        latest_metrics: latestMetrics
      };
    }));
    
    res.json({
      success: true,
      data: enrichedNodes,
      count: enrichedNodes.length
    });
  } catch (error) {
    console.error('❌ Error getting nodes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/nodes/:id/start - Запуск узла
 */
router.post('/:id/start', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = await req.db.getNode(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    if (node.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Node is already running'
      });
    }
    
    // Обновление статуса
    await req.db.updateNode(nodeId, { status: 'starting' });
    
    // Запуск через CLI
    const config = node.config ? JSON.parse(node.config) : {};
    const result = await req.nexusCLI.startNode(node.prover_id, config);
    
    if (result.success) {
      await req.db.updateNode(nodeId, { 
        status: 'running',
        last_seen: new Date().toISOString()
      });
      
      // Добавление уведомления
      await req.db.addNotification(nodeId, {
        type: 'success',
        title: 'Node Started',
        message: `Node ${node.name} has been started successfully`
      });
      
      // Уведомление через WebSocket
      req.wsClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'nodeStarted',
            data: { id: nodeId, prover_id: node.prover_id },
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      res.json({
        success: true,
        message: 'Node started successfully',
        data: result
      });
    } else {
      await req.db.updateNode(nodeId, { 
        status: 'error',
        errors: result.error
      });
      
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error starting node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/nodes/:id/stop - Остановка узла
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = await req.db.getNode(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    if (node.status === 'stopped') {
      return res.status(400).json({
        success: false,
        error: 'Node is already stopped'
      });
    }
    
    // Остановка через CLI
    const result = await req.nexusCLI.stopNode(node.prover_id);
    
    if (result.success) {
      await req.db.updateNode(nodeId, { 
        status: 'stopped',
        last_seen: new Date().toISOString()
      });
      
      // Добавление уведомления
      await req.db.addNotification(nodeId, {
        type: 'info',
        title: 'Node Stopped',
        message: `Node ${node.name} has been stopped`
      });
      
      // Уведомление через WebSocket
      req.wsClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'nodeStopped',
            data: { id: nodeId, prover_id: node.prover_id },
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      res.json({
        success: true,
        message: 'Node stopped successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error stopping node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/nodes/:id/status - Получение статуса узла
 */
router.get('/:id/status', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = await req.db.getNode(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    const cliStatus = await req.nexusCLI.getNodeStatus(node.prover_id);
    
    res.json({
      success: true,
      data: {
        id: nodeId,
        prover_id: node.prover_id,
        db_status: node.status,
        cli_status: cliStatus,
        last_seen: node.last_seen
      }
    });
  } catch (error) {
    console.error('❌ Error getting node status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/nodes/:id/logs - Получение логов узла
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const lines = parseInt(req.query.lines) || 100;
    
    const node = await req.db.getNode(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    const logs = await req.nexusCLI.getNodeLogs(node.prover_id, lines);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('❌ Error getting node logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/nodes/:id - Получение информации о конкретном узле
 */
router.get('/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = await req.db.getNode(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    // Получение дополнительной информации
    const [cliStatus, latestMetrics, recentTransactions] = await Promise.all([
      req.nexusCLI.getNodeStatus(node.prover_id),
      req.db.getLatestMetrics(nodeId),
      req.db.getTransactions(nodeId, 10)
    ]);
    
    const enrichedNode = {
      ...node,
      config: node.config ? JSON.parse(node.config) : {},
      cli_status: cliStatus,
      latest_metrics: latestMetrics,
      recent_transactions: recentTransactions
    };
    
    res.json({
      success: true,
      data: enrichedNode
    });
  } catch (error) {
    console.error('❌ Error getting node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/nodes - Создание нового узла
 */
router.post('/', async (req, res) => {
  try {
    const { prover_id, name, config } = req.body;
    
    if (!prover_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'prover_id and name are required'
      });
    }
    
    // Проверка на дублирование
    const existingNode = await req.db.getNodeByProverId(prover_id);
    if (existingNode) {
      return res.status(400).json({
        success: false,
        error: 'Node with this prover_id already exists'
      });
    }
    
    const nodeData = {
      prover_id,
      name,
      config: config || {}
    };
    
    const result = await req.db.createNode(nodeData);
    const newNode = await req.db.getNode(result.id);
    
    // Уведомление через WebSocket
    req.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'nodeCreated',
          data: newNode,
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    res.status(201).json({
      success: true,
      data: newNode,
      message: 'Node created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/nodes/:id - Обновление узла
 */
router.put('/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const updates = req.body;
    
    const node = await req.db.getNode(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    // Подготовка обновлений
    const updateData = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.config) updateData.config = JSON.stringify(updates.config);
    if (updates.status) updateData.status = updates.status;
    
    await req.db.updateNode(nodeId, updateData);
    const updatedNode = await req.db.getNode(nodeId);
    
    // Уведомление через WebSocket
    req.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'nodeUpdated',
          data: updatedNode,
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    res.json({
      success: true,
      data: updatedNode,
      message: 'Node updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/nodes/:id - Удаление узла
 */
router.delete('/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = await req.db.getNode(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    // Остановка узла если он запущен
    if (node.status === 'running') {
      await req.nexusCLI.stopNode(node.prover_id);
    }
    
    await req.db.deleteNode(nodeId);
    
    // Уведомление через WebSocket
    req.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'nodeDeleted',
          data: { id: nodeId, prover_id: node.prover_id },
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    res.json({
      success: true,
      message: 'Node deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 