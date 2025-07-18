-- Узлы Nexus (prover nodes)
CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prover_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'stopped', -- stopped, starting, running, error
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME,
    config TEXT, -- JSON конфигурация
    errors TEXT -- последние ошибки
);

-- Метрики производительности
CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    nex_points INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    cpu_usage REAL DEFAULT 0.0,
    memory_usage REAL DEFAULT 0.0,
    uptime INTEGER DEFAULT 0, -- в секундах
    block_height INTEGER DEFAULT 0,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Транзакции и задачи
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    tx_hash TEXT NOT NULL,
    block_number INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    gas_used INTEGER,
    status TEXT DEFAULT 'pending', -- pending, success, failed
    reward INTEGER DEFAULT 0,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Уведомления и события
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER,
    type TEXT NOT NULL, -- info, warning, error, success
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Конфигурация приложения
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_metrics_node_timestamp ON metrics(node_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_node_timestamp ON transactions(node_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp);
CREATE INDEX IF NOT EXISTS idx_nodes_prover_id ON nodes(prover_id);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);

-- Триггеры для автоматического обновления timestamps
CREATE TRIGGER IF NOT EXISTS update_nodes_timestamp
    AFTER UPDATE ON nodes
    FOR EACH ROW
BEGIN
    UPDATE nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Начальная конфигурация
INSERT OR IGNORE INTO app_config (key, value) VALUES 
('app_version', '1.0.0'),
('installation_date', datetime('now')),
('default_update_interval', '30000'),
('metrics_retention_days', '30'); 