import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' 
    ? window.location.origin + '/nexus/api'
    : 'http://localhost:3001/api'
);

// Создание экземпляра axios с базовой конфигурацией
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерсептор для логирования запросов
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Интерсептор для обработки ответов
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    if (error.response?.status === 401) {
      // Обработка неавторизованного доступа
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// API методы для узлов
export const nodesAPI = {
  getAll: () => api.get('/api/nodes'),
  getById: (id) => api.get(`/api/nodes/${id}`),
  create: (data) => api.post('/api/nodes', data),
  update: (id, data) => api.put(`/api/nodes/${id}`, data),
  delete: (id) => api.delete(`/api/nodes/${id}`),
  start: (id) => api.post(`/api/nodes/${id}/start`),
  stop: (id) => api.post(`/api/nodes/${id}/stop`),
  getStatus: (id) => api.get(`/api/nodes/${id}/status`),
  getLogs: (id, lines = 100) => api.get(`/api/nodes/${id}/logs?lines=${lines}`),
};

// API методы для метрик
export const metricsAPI = {
  getAll: () => api.get('/api/metrics'),
  getByNode: (id, limit = 100) => api.get(`/api/metrics/node/${id}?limit=${limit}`),
  getHistory: (id, hours = 24) => api.get(`/api/metrics/node/${id}/history?hours=${hours}`),
  addMetric: (id, data) => api.post(`/api/metrics/node/${id}`, data),
  getSystem: () => api.get('/api/metrics/system'),
  getNetwork: () => api.get('/api/metrics/network'),
  getTransactions: (proverId, limit = 50) => api.get(`/api/metrics/transactions/${proverId}?limit=${limit}`),
  getSummary: () => api.get('/api/metrics/summary'),
  cleanOld: (id, days = 30) => api.delete(`/api/metrics/node/${id}/old?days=${days}`),
};

// API методы для системы
export const systemAPI = {
  getInfo: () => api.get('/api/system/info'),
  getHealth: () => api.get('/api/system/health'),
  getProcesses: () => api.get('/api/system/processes'),
  getProcess: (pid) => api.get(`/api/system/process/${pid}`),
  getMetrics: () => api.get('/api/system/metrics'),
  getStats: () => api.get('/api/system/stats'),
  restart: () => api.post('/api/system/restart'),
  cleanup: (days = 30) => api.post('/api/system/cleanup', { days }),
  getLogs: (lines = 100, level = 'info') => api.get(`/api/system/logs?lines=${lines}&level=${level}`),
  getConfig: () => api.get('/api/system/config'),
  updateConfig: (data) => api.post('/api/system/config', data),
  testConnection: (service) => api.post('/api/system/test-connection', { service }),
};

// API методы для уведомлений
export const notificationsAPI = {
  getAll: (params = {}) => api.get('/api/notifications', { params }),
  create: (data) => api.post('/api/notifications', data),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: (nodeId = null) => api.put('/api/notifications/read-all', { node_id: nodeId }),
  delete: (id) => api.delete(`/api/notifications/${id}`),
  deleteMultiple: (data) => api.delete('/api/notifications', { data }),
  getStats: (nodeId = null) => api.get(`/api/notifications/stats${nodeId ? `?node_id=${nodeId}` : ''}`),
  getRecent: (limit = 10, hours = 24) => api.get(`/api/notifications/recent?limit=${limit}&hours=${hours}`),
  createTest: (nodeId = null, type = 'info') => api.post('/api/notifications/test', { node_id: nodeId, type }),
};

// Утилиты для форматирования данных
export const formatters = {
  formatBytes: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  formatUptime: (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },
  
  formatNumber: (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  },
  
  formatPercentage: (value) => {
    return `${Math.round(value)}%`;
  },
  
  formatDate: (date) => {
    return new Date(date).toLocaleString();
  },
  
  formatRelativeTime: (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  },
};

// Функция для создания WebSocket соединения
export const createWebSocket = (url) => {
  if (!url) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    url = process.env.NODE_ENV === 'production' 
      ? `${protocol}//${host}/nexus/ws`
      : 'ws://localhost:3001';
  }
  return new WebSocket(url);
};

// Обработчик ошибок API
export const handleAPIError = (error) => {
  if (error.response) {
    // Сервер ответил с ошибкой
    return {
      message: error.response.data?.error || 'Server error',
      status: error.response.status,
      details: error.response.data,
    };
  } else if (error.request) {
    // Запрос был отправлен, но ответа не получено
    return {
      message: 'Network error - server not responding',
      status: 0,
      details: null,
    };
  } else {
    // Что-то пошло не так при настройке запроса
    return {
      message: error.message || 'Unknown error',
      status: -1,
      details: null,
    };
  }
};

export default api; 