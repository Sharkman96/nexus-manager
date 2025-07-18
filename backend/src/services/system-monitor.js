const si = require('systeminformation');
const config = require('../../config');

class SystemMonitor {
  constructor() {
    this.updateInterval = config.monitoring.metricsUpdateInterval;
    this.isRunning = false;
    this.monitoringData = new Map();
    this.callbacks = new Map();
  }

  /**
   * Запуск мониторинга
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('📊 System monitoring started');
    
    // Запуск периодического сбора метрик
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.updateInterval);
    
    // Первый сбор метрик
    this.collectMetrics();
  }

  /**
   * Остановка мониторинга
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('📊 System monitoring stopped');
  }

  /**
   * Сбор системных метрик
   */
  async collectMetrics() {
    try {
      const [cpu, memory, disk, network, processes] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
        si.processes()
      ]);

      const currentLoad = await si.currentLoad();
      const temperature = await si.cpuTemperature();

      const metrics = {
        timestamp: new Date().toISOString(),
        cpu: {
          usage: currentLoad.currentload || 0,
          temperature: temperature.main || 0,
          cores: cpu.cores || 0,
          manufacturer: cpu.manufacturer || 'Unknown',
          brand: cpu.brand || 'Unknown',
          speed: cpu.speed || 0
        },
        memory: {
          total: memory.total || 0,
          used: memory.used || 0,
          free: memory.free || 0,
          usage: memory.total ? (memory.used / memory.total) * 100 : 0
        },
        disk: this.processDiskInfo(disk),
        network: this.processNetworkInfo(network),
        processes: {
          total: processes.all || 0,
          running: processes.running || 0,
          sleeping: processes.sleeping || 0
        }
      };

      // Сохранение метрик
      this.monitoringData.set('latest', metrics);
      
      // Уведомление подписчиков
      this.notifyCallbacks('metrics', metrics);
      
      return metrics;
    } catch (error) {
      console.error('❌ Failed to collect system metrics:', error);
      return null;
    }
  }

  /**
   * Получение информации о процессах Nexus
   */
  async getNexusProcesses() {
    try {
      const processes = await si.processes();
      
      const nexusProcesses = processes.list.filter(proc => 
        proc.name && (
          proc.name.includes('nexus') || 
          proc.name.includes('prover') ||
          proc.command?.includes('nexus-cli')
        )
      );

      return nexusProcesses.map(proc => ({
        pid: proc.pid,
        name: proc.name,
        command: proc.command,
        cpu: proc.cpu || 0,
        memory: proc.memory || 0,
        state: proc.state,
        started: proc.started
      }));
    } catch (error) {
      console.error('❌ Failed to get Nexus processes:', error);
      return [];
    }
  }

  /**
   * Получение детальной информации о процессе
   */
  async getProcessDetails(pid) {
    try {
      const processes = await si.processes();
      const process = processes.list.find(proc => proc.pid === pid);
      
      if (!process) {
        return null;
      }

      return {
        pid: process.pid,
        name: process.name,
        command: process.command,
        cpu: process.cpu || 0,
        memory: process.memory || 0,
        state: process.state,
        started: process.started,
        params: process.params
      };
    } catch (error) {
      console.error(`❌ Failed to get process details for PID ${pid}:`, error);
      return null;
    }
  }

  /**
   * Получение информации о системе
   */
  async getSystemInfo() {
    try {
      const [system, osInfo, versions] = await Promise.all([
        si.system(),
        si.osInfo(),
        si.versions()
      ]);

      return {
        system: {
          manufacturer: system.manufacturer || 'Unknown',
          model: system.model || 'Unknown',
          uuid: system.uuid || 'Unknown'
        },
        os: {
          platform: osInfo.platform || 'Unknown',
          distro: osInfo.distro || 'Unknown',
          release: osInfo.release || 'Unknown',
          arch: osInfo.arch || 'Unknown',
          hostname: osInfo.hostname || 'Unknown'
        },
        versions: {
          node: versions.node || 'Unknown',
          npm: versions.npm || 'Unknown'
        }
      };
    } catch (error) {
      console.error('❌ Failed to get system info:', error);
      return null;
    }
  }

  /**
   * Получение статистики загрузки
   */
  async getLoadStats() {
    try {
      const currentLoad = await si.currentLoad();
      
      return {
        currentload: currentLoad.currentload || 0,
        currentload_user: currentLoad.currentload_user || 0,
        currentload_system: currentLoad.currentload_system || 0,
        cpus: currentLoad.cpus || []
      };
    } catch (error) {
      console.error('❌ Failed to get load stats:', error);
      return null;
    }
  }

  /**
   * Получение сетевой статистики
   */
  async getNetworkStats() {
    try {
      const networkStats = await si.networkStats();
      return networkStats;
    } catch (error) {
      console.error('❌ Failed to get network stats:', error);
      return [];
    }
  }

  /**
   * Обработка информации о дисках
   */
  processDiskInfo(diskInfo) {
    if (!diskInfo || !Array.isArray(diskInfo)) return [];
    
    return diskInfo.map(disk => ({
      fs: disk.fs || 'Unknown',
      size: disk.size || 0,
      used: disk.used || 0,
      use: disk.use || 0,
      mount: disk.mount || 'Unknown'
    }));
  }

  /**
   * Обработка сетевой информации
   */
  processNetworkInfo(networkInfo) {
    if (!networkInfo || !Array.isArray(networkInfo)) return [];
    
    return networkInfo.map(net => ({
      iface: net.iface || 'Unknown',
      rx_bytes: net.rx_bytes || 0,
      rx_sec: net.rx_sec || 0,
      tx_bytes: net.tx_bytes || 0,
      tx_sec: net.tx_sec || 0
    }));
  }

  /**
   * Получение последних метрик
   */
  getLatestMetrics() {
    return this.monitoringData.get('latest') || null;
  }

  /**
   * Подписка на обновления метрик
   */
  subscribe(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  /**
   * Отписка от обновлений
   */
  unsubscribe(event, callback) {
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Уведомление подписчиков
   */
  notifyCallbacks(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Callback error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Проверка состояния системы
   */
  async checkSystemHealth() {
    try {
      const metrics = await this.collectMetrics();
      if (!metrics) return { healthy: false, message: 'Failed to collect metrics' };
      
      const issues = [];
      
      // Проверка CPU
      if (metrics.cpu.usage > 90) {
        issues.push('High CPU usage');
      }
      
      // Проверка памяти
      if (metrics.memory.usage > 90) {
        issues.push('High memory usage');
      }
      
      // Проверка дисков
      for (const disk of metrics.disk) {
        if (disk.use > 90) {
          issues.push(`High disk usage on ${disk.mount}`);
        }
      }
      
      // Проверка температуры
      if (metrics.cpu.temperature > 80) {
        issues.push('High CPU temperature');
      }
      
      return {
        healthy: issues.length === 0,
        issues: issues,
        metrics: metrics
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Health check failed',
        error: error.message
      };
    }
  }

  /**
   * Очистка ресурсов
   */
  cleanup() {
    this.stop();
    this.monitoringData.clear();
    this.callbacks.clear();
  }
}

module.exports = SystemMonitor; 