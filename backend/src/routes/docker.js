const express = require('express');
const router = express.Router();

/**
 * GET /api/docker/status - Проверка статуса Docker
 */
router.get('/status', async (req, res) => {
  try {
    const dockerStatus = await req.nexusDocker.checkDockerAvailability();
    
    res.json({
      success: true,
      data: dockerStatus
    });
  } catch (error) {
    console.error('❌ Error checking Docker status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/docker/install - Установка Docker
 */
router.post('/install', async (req, res) => {
  try {
    const result = await req.nexusDocker.installDocker();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Docker installed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error installing Docker:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/docker/containers - Получение списка Docker контейнеров
 */
router.get('/containers', async (req, res) => {
  try {
    const containers = await req.nexusDocker.listContainers();
    
    res.json({
      success: true,
      data: containers,
      count: containers.length
    });
  } catch (error) {
    console.error('❌ Error listing Docker containers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/docker/nodes/:id/start - Запуск Docker ноды
 */
router.post('/nodes/:id/start', async (req, res) => {
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
    
    // Запуск через Docker
    const options = {
      containerName: req.body.containerName,
      rebuild: req.body.rebuild || false,
      skipBuild: req.body.skipBuild || false
    };
    
    const result = await req.nexusDocker.startNode(node.prover_id, options);
    
    if (result.success) {
      await req.db.updateNode(nodeId, { 
        status: 'running',
        last_seen: new Date().toISOString(),
        node_type: 'docker',
        container_name: result.containerName,
        container_id: result.containerId
      });
      
      // Добавление уведомления
      await req.db.addNotification(nodeId, {
        type: 'success',
        title: 'Docker Node Started',
        message: `Docker node ${node.name} has been started successfully`
      });
      
      // Уведомление через WebSocket
      req.wsClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'dockerNodeStarted',
            data: { 
              id: nodeId, 
              prover_id: node.prover_id,
              containerName: result.containerName,
              containerId: result.containerId
            },
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      res.json({
        success: true,
        message: 'Docker node started successfully',
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
    console.error('❌ Error starting Docker node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/docker/nodes/:id/stop - Остановка Docker ноды
 */
router.post('/nodes/:id/stop', async (req, res) => {
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
    
    // Остановка через Docker
    const result = await req.nexusDocker.stopNode(node.prover_id);
    
    if (result.success) {
      await req.db.updateNode(nodeId, { 
        status: 'stopped',
        last_seen: new Date().toISOString(),
        container_id: null
      });
      
      // Добавление уведомления
      await req.db.addNotification(nodeId, {
        type: 'info',
        title: 'Docker Node Stopped',
        message: `Docker node ${node.name} has been stopped`
      });
      
      // Уведомление через WebSocket
      req.wsClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'dockerNodeStopped',
            data: { id: nodeId, prover_id: node.prover_id },
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      res.json({
        success: true,
        message: 'Docker node stopped successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error stopping Docker node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/docker/nodes/:id/status - Получение статуса Docker ноды
 */
router.get('/nodes/:id/status', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = await req.db.getNode(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    const dockerStatus = await req.nexusDocker.getNodeStatus(node.prover_id);
    
    res.json({
      success: true,
      data: {
        id: nodeId,
        prover_id: node.prover_id,
        db_status: node.status,
        docker_status: dockerStatus,
        last_seen: node.last_seen,
        container_name: node.container_name,
        container_id: node.container_id
      }
    });
  } catch (error) {
    console.error('❌ Error getting Docker node status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/docker/nodes/:id/logs - Получение логов Docker ноды
 */
router.get('/nodes/:id/logs', async (req, res) => {
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
    
    const logs = await req.nexusDocker.getNodeLogs(node.prover_id, lines);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('❌ Error getting Docker node logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/docker/nodes/:id/metrics - Получение метрик Docker ноды
 */
router.get('/nodes/:id/metrics', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    
    const node = await req.db.getNode(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    const metrics = await req.nexusDocker.getNodeMetrics(node.prover_id);
    
    if (metrics.success) {
      // Сохраняем метрики в базу данных
      await req.db.addMetrics(nodeId, metrics.metrics);
    }
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('❌ Error getting Docker node metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/docker/nodes/:id/build - Сборка Docker образа для ноды
 */
router.post('/nodes/:id/build', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = await req.db.getNode(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    const result = await req.nexusDocker.buildNodeImage(node.prover_id);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Docker image built successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error building Docker image:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/docker/nodes/:id/rebuild - Пересборка и перезапуск Docker ноды
 */
router.post('/nodes/:id/rebuild', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const node = await req.db.getNode(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    // Останавливаем ноду если она запущена
    if (node.status === 'running') {
      await req.nexusDocker.stopNode(node.prover_id);
      await req.db.updateNode(nodeId, { status: 'stopped' });
    }
    
    // Собираем новый образ
    const buildResult = await req.nexusDocker.buildNodeImage(node.prover_id);
    if (!buildResult.success) {
      throw new Error(buildResult.error);
    }
    
    // Запускаем ноду с новым образом
    const startResult = await req.nexusDocker.startNode(node.prover_id, { 
      rebuild: false, 
      skipBuild: true 
    });
    
    if (startResult.success) {
      await req.db.updateNode(nodeId, { 
        status: 'running',
        last_seen: new Date().toISOString(),
        container_name: startResult.containerName,
        container_id: startResult.containerId
      });
      
      res.json({
        success: true,
        message: 'Docker node rebuilt and restarted successfully',
        data: {
          build: buildResult,
          start: startResult
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: startResult.error
      });
    }
  } catch (error) {
    console.error('❌ Error rebuilding Docker node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 