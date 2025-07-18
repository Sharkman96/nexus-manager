const express = require('express');
const router = express.Router();

/**
 * GET /api/notifications - Получение всех уведомлений
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const nodeId = req.query.node_id ? parseInt(req.query.node_id) : null;
    const type = req.query.type;
    const unreadOnly = req.query.unread_only === 'true';
    
    let notifications = await req.db.getNotifications(nodeId, limit);
    
    // Фильтрация по типу
    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }
    
    // Фильтрация по статусу прочтения
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.is_read);
    }
    
    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      filters: {
        node_id: nodeId,
        type: type,
        unread_only: unreadOnly,
        limit: limit
      }
    });
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/notifications - Создание нового уведомления
 */
router.post('/', async (req, res) => {
  try {
    const { node_id, type, title, message } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'type, title, and message are required'
      });
    }
    
    const validTypes = ['info', 'warning', 'error', 'success'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification type'
      });
    }
    
    const notificationData = {
      type,
      title,
      message
    };
    
    const result = await req.db.addNotification(node_id, notificationData);
    
    // Получение созданного уведомления
    const notification = await req.db.get(
      'SELECT * FROM notifications WHERE id = ?',
      [result.id]
    );
    
    // Уведомление через WebSocket
    req.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'newNotification',
          data: notification,
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/notifications/:id/read - Отметить уведомление как прочитанное
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    const result = await req.db.markNotificationAsRead(notificationId);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/notifications/read-all - Отметить все уведомления как прочитанные
 */
router.put('/read-all', async (req, res) => {
  try {
    const nodeId = req.body.node_id ? parseInt(req.body.node_id) : null;
    
    let sql = 'UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE';
    let params = [];
    
    if (nodeId) {
      sql += ' AND node_id = ?';
      params.push(nodeId);
    }
    
    const result = await req.db.run(sql, params);
    
    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updated_count: result.changes
      }
    });
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/notifications/:id - Удаление уведомления
 */
router.delete('/:id', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    const result = await req.db.run(
      'DELETE FROM notifications WHERE id = ?',
      [notificationId]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/notifications - Удаление множественных уведомлений
 */
router.delete('/', async (req, res) => {
  try {
    const { ids, node_id, type, older_than_days } = req.body;
    
    let sql = 'DELETE FROM notifications WHERE 1=1';
    let params = [];
    
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      sql += ` AND id IN (${placeholders})`;
      params.push(...ids);
    }
    
    if (node_id) {
      sql += ' AND node_id = ?';
      params.push(node_id);
    }
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    if (older_than_days) {
      sql += ` AND timestamp < datetime('now', '-${older_than_days} days')`;
    }
    
    const result = await req.db.run(sql, params);
    
    res.json({
      success: true,
      message: 'Notifications deleted successfully',
      data: {
        deleted_count: result.changes
      }
    });
  } catch (error) {
    console.error('❌ Error deleting notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/stats - Получение статистики уведомлений
 */
router.get('/stats', async (req, res) => {
  try {
    const nodeId = req.query.node_id ? parseInt(req.query.node_id) : null;
    
    // Базовый запрос для подсчета
    let whereClause = '';
    let params = [];
    
    if (nodeId) {
      whereClause = 'WHERE node_id = ?';
      params.push(nodeId);
    }
    
    const stats = await req.db.all(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count
      FROM notifications 
      ${whereClause}
      GROUP BY type
    `, params);
    
    const totalStats = await req.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_total
      FROM notifications 
      ${whereClause}
    `, params);
    
    const recentStats = await req.db.get(`
      SELECT 
        COUNT(*) as recent_count
      FROM notifications 
      ${whereClause ? whereClause + ' AND' : 'WHERE'} 
      timestamp > datetime('now', '-24 hours')
    `, nodeId ? [...params, nodeId] : []);
    
    res.json({
      success: true,
      data: {
        by_type: stats.reduce((acc, stat) => {
          acc[stat.type] = {
            total: stat.count,
            unread: stat.unread_count
          };
          return acc;
        }, {}),
        totals: {
          total: totalStats.total || 0,
          unread: totalStats.unread_total || 0,
          recent_24h: recentStats.recent_count || 0
        },
        node_id: nodeId
      }
    });
  } catch (error) {
    console.error('❌ Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/recent - Получение последних уведомлений
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const hours = parseInt(req.query.hours) || 24;
    
    const notifications = await req.db.all(`
      SELECT * FROM notifications 
      WHERE timestamp > datetime('now', '-${hours} hours')
      ORDER BY timestamp DESC 
      LIMIT ?
    `, [limit]);
    
    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      period: `${hours} hours`
    });
  } catch (error) {
    console.error('❌ Error getting recent notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/test - Создание тестового уведомления
 */
router.post('/test', async (req, res) => {
  try {
    const { node_id, type = 'info' } = req.body;
    
    const testNotification = {
      type: type,
      title: 'Test Notification',
      message: `This is a test notification created at ${new Date().toISOString()}`
    };
    
    const result = await req.db.addNotification(node_id, testNotification);
    
    // Получение созданного уведомления
    const notification = await req.db.get(
      'SELECT * FROM notifications WHERE id = ?',
      [result.id]
    );
    
    // Уведомление через WebSocket
    req.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'newNotification',
          data: notification,
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    res.json({
      success: true,
      data: notification,
      message: 'Test notification created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 