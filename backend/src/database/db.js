const sqlite3 = require('sqlite3').verbose();
const config = require('../../config');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = config.dbPath;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('🔗 Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('📪 Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Узлы
  async createNode(proverData) {
    const sql = `
      INSERT INTO nodes (prover_id, name, status, config)
      VALUES (?, ?, ?, ?)
    `;
    return this.run(sql, [
      proverData.prover_id,
      proverData.name,
      proverData.status || 'stopped',
      JSON.stringify(proverData.config || {})
    ]);
  }

  async getNodes() {
    const sql = `SELECT * FROM nodes ORDER BY created_at DESC`;
    return this.all(sql);
  }

  async getNode(id) {
    const sql = `SELECT * FROM nodes WHERE id = ?`;
    return this.get(sql, [id]);
  }

  async getNodeByProverId(proverId) {
    const sql = `SELECT * FROM nodes WHERE prover_id = ?`;
    return this.get(sql, [proverId]);
  }

  async updateNode(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const sql = `UPDATE nodes SET ${fields} WHERE id = ?`;
    return this.run(sql, [...values, id]);
  }

  async deleteNode(id) {
    const sql = `DELETE FROM nodes WHERE id = ?`;
    return this.run(sql, [id]);
  }

  // Метрики
  async addMetric(nodeId, metrics) {
    const sql = `
      INSERT INTO metrics (node_id, nex_points, tasks_completed, cpu_usage, memory_usage, uptime, block_height)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return this.run(sql, [
      nodeId,
      metrics.nex_points || 0,
      metrics.tasks_completed || 0,
      metrics.cpu_usage || 0,
      metrics.memory_usage || 0,
      metrics.uptime || 0,
      metrics.block_height || 0
    ]);
  }

  async getMetrics(nodeId, limit = 100) {
    const sql = `
      SELECT * FROM metrics 
      WHERE node_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    return this.all(sql, [nodeId, limit]);
  }

  async getLatestMetrics(nodeId) {
    const sql = `
      SELECT * FROM metrics 
      WHERE node_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `;
    return this.get(sql, [nodeId]);
  }

  async getMetricsInRange(nodeId, startDate, endDate) {
    const sql = `
      SELECT * FROM metrics 
      WHERE node_id = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `;
    return this.all(sql, [nodeId, startDate, endDate]);
  }

  // Транзакции
  async addTransaction(nodeId, txData) {
    const sql = `
      INSERT INTO transactions (node_id, tx_hash, block_number, gas_used, status, reward)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    return this.run(sql, [
      nodeId,
      txData.tx_hash,
      txData.block_number,
      txData.gas_used,
      txData.status || 'pending',
      txData.reward || 0
    ]);
  }

  async getTransactions(nodeId, limit = 50) {
    const sql = `
      SELECT * FROM transactions 
      WHERE node_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    return this.all(sql, [nodeId, limit]);
  }

  // Уведомления
  async addNotification(nodeId, notification) {
    const sql = `
      INSERT INTO notifications (node_id, type, title, message)
      VALUES (?, ?, ?, ?)
    `;
    return this.run(sql, [
      nodeId,
      notification.type,
      notification.title,
      notification.message
    ]);
  }

  async getNotifications(nodeId = null, limit = 50) {
    let sql = `
      SELECT * FROM notifications 
      ${nodeId ? 'WHERE node_id = ?' : ''}
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    const params = nodeId ? [nodeId, limit] : [limit];
    return this.all(sql, params);
  }

  async markNotificationAsRead(id) {
    const sql = `UPDATE notifications SET is_read = TRUE WHERE id = ?`;
    return this.run(sql, [id]);
  }

  // Конфигурация
  async getConfig(key) {
    const sql = `SELECT value FROM app_config WHERE key = ?`;
    const result = await this.get(sql, [key]);
    return result ? result.value : null;
  }

  async setConfig(key, value) {
    const sql = `
      INSERT OR REPLACE INTO app_config (key, value)
      VALUES (?, ?)
    `;
    return this.run(sql, [key, value]);
  }

  // Утилиты
  async cleanOldMetrics(days = 30) {
    const sql = `
      DELETE FROM metrics 
      WHERE timestamp < datetime('now', '-${days} days')
    `;
    return this.run(sql);
  }

  // Базовые методы для работы с SQLite
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = Database; 