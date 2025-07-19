const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const config = require('../../config');

const execAsync = promisify(exec);

class NexusCLI {
  constructor() {
    this.cliPath = config.nexus.cliPath;
    this.runningNodes = new Map(); // Карта запущенных процессов
  }

  /**
   * Проверка доступности Nexus CLI
   */
  async checkCLIAvailability() {
    try {
      const { stdout } = await execAsync(`${this.cliPath} --version`);
      return {
        available: true,
        version: stdout.trim()
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Запуск узла
   */
  async startNode(proverId, options = {}) {
    try {
      console.log(`🚀 Starting node ${proverId}`);

      // Запускаем ноду с node-id
      const nodeProcess = spawn(this.cliPath, ['start', '--node-id', proverId], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: true, // Запускаем в фоновом режиме
        cwd: process.cwd()
      });

      // Сохраняем процесс для управления
      this.runningNodes.set(proverId, nodeProcess);

      // Обработка вывода
      nodeProcess.stdout.on('data', (data) => {
        console.log(`[${proverId}] ${data.toString()}`);
      });

      nodeProcess.stderr.on('data', (data) => {
        console.error(`[${proverId}] ERROR: ${data.toString()}`);
      });

      nodeProcess.on('exit', (code) => {
        console.log(`[${proverId}] Process exited with code ${code}`);
        this.runningNodes.delete(proverId);
      });

      // Ждем немного чтобы убедиться что процесс запустился
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        pid: nodeProcess.pid,
        message: 'Node started successfully'
      };

    } catch (error) {
      console.error(`❌ Failed to start node ${proverId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Остановка узла
   */
  async stopNode(proverId) {
    try {
      console.log(`🛑 Stopping node ${proverId}`);

      // Проверяем есть ли запущенный процесс в памяти
      const nodeProcess = this.runningNodes.get(proverId);
      if (nodeProcess) {
        nodeProcess.kill('SIGTERM');
        
        // Ждем завершения процесса
        await new Promise((resolve) => {
          nodeProcess.on('exit', resolve);
          setTimeout(() => {
            if (!nodeProcess.killed) {
              nodeProcess.kill('SIGKILL');
            }
            resolve();
          }, 5000);
        });

        this.runningNodes.delete(proverId);
        return { success: true, message: 'Node stopped successfully' };
      }

      // Если процесс не найден в памяти, ищем и убиваем демон nexus
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`pkill -f "nexus"`, (error) => {
          if (error && error.code !== 1) { // code 1 = no processes found
            console.error(`❌ Failed to stop node ${proverId}:`, error);
            resolve({ success: false, error: error.message });
          } else {
            resolve({ success: true, message: 'Node stopped successfully' });
          }
        });
      });

    } catch (error) {
      console.error(`❌ Failed to stop node ${proverId}:`, error);
      return { success: false, error: error.message };
    }
  }

    /**
   * Получение статуса узла
   */
  async getNodeStatus(proverId) {
    try {
      console.log(`🔍 Checking status for node ${proverId}`);

      // Проверяем, запущен ли процесс в памяти
      const nodeProcess = this.runningNodes.get(proverId);
      if (nodeProcess && !nodeProcess.killed) {
        return {
          success: true,
          status: {
            status: 'running',
            uptime: 'active',
            tasks_completed: 0,
            nex_points: 0
          },
          raw_output: 'Node is running (in memory)'
        };
      }

      // Проверяем через ps команду - ищем демон или процесс nexus
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        // Ищем процессы nexus, связанные с нашим node-id
        exec(`ps aux | grep -E "(nexus|prover)" | grep -v grep`, (error, stdout) => {
          if (stdout.trim()) {
            // Если есть процессы nexus, считаем что нода работает
            resolve({
              success: true,
              status: {
                status: 'running',
                uptime: 'active',
                tasks_completed: 0,
                nex_points: 0
              },
              raw_output: stdout
            });
          } else {
            resolve({
              success: true,
              status: {
                status: 'stopped',
                uptime: '0',
                tasks_completed: 0,
                nex_points: 0
              },
              raw_output: 'Node is not running'
            });
          }
        });
      });

    } catch (error) {
      console.error(`❌ Error checking status for node ${proverId}:`, error);
      return {
        success: false,
        error: error.message,
        status: 'error'
      };
    }
  }

  /**
   * Получение информации о производительности
   */
  async getNodeMetrics(proverId) {
    try {
      const { stdout } = await execAsync(`${this.cliPath} node metrics --prover-id ${proverId}`);
      
      const metrics = this.parseMetricsOutput(stdout);
      
      return {
        success: true,
        metrics: metrics,
        raw_output: stdout
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metrics: null
      };
    }
  }

  /**
   * Обновление конфигурации узла
   */
  async updateNodeConfig(proverId, config) {
    try {
      const configStr = JSON.stringify(config);
      const { stdout } = await execAsync(`${this.cliPath} node config --prover-id ${proverId} --config '${configStr}'`);
      
      return {
        success: true,
        message: 'Configuration updated successfully',
        output: stdout
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Получение логов узла
   */
  async getNodeLogs(proverId, lines = 100) {
    try {
      const { stdout } = await execAsync(`${this.cliPath} logs --node-id ${proverId} --lines ${lines}`);
      
      return {
        success: true,
        logs: stdout.split('\n').filter(line => line.trim())
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        logs: []
      };
    }
  }

  /**
   * Проверка запущенных узлов
   */
  getRunningNodes() {
    const nodes = [];
    for (const [proverId, process] of this.runningNodes) {
      nodes.push({
        prover_id: proverId,
        pid: process.pid,
        status: process.killed ? 'stopped' : 'running'
      });
    }
    return nodes;
  }

  /**
   * Построение команды запуска
   */
  buildStartCommand(proverId, options = {}) {
    let command = `${this.cliPath} node start --prover-id ${proverId}`;
    
    if (options.config) {
      command += ` --config '${JSON.stringify(options.config)}'`;
    }
    
    if (options.logLevel) {
      command += ` --log-level ${options.logLevel}`;
    }
    
    if (options.workers) {
      command += ` --workers ${options.workers}`;
    }
    
    return command;
  }

  /**
   * Парсинг вывода статуса
   */
  parseStatusOutput(output) {
    const lines = output.split('\n');
    const status = {};
    
    for (const line of lines) {
      if (line.includes('Status:')) {
        status.status = line.split(':')[1].trim().toLowerCase();
      } else if (line.includes('Uptime:')) {
        status.uptime = line.split(':')[1].trim();
      } else if (line.includes('Tasks:')) {
        status.tasks_completed = parseInt(line.split(':')[1].trim()) || 0;
      } else if (line.includes('Points:')) {
        status.nex_points = parseInt(line.split(':')[1].trim()) || 0;
      }
    }
    
    return status;
  }

  /**
   * Парсинг вывода метрик
   */
  parseMetricsOutput(output) {
    const lines = output.split('\n');
    const metrics = {};
    
    for (const line of lines) {
      if (line.includes('CPU:')) {
        metrics.cpu_usage = parseFloat(line.split(':')[1].replace('%', '').trim()) || 0;
      } else if (line.includes('Memory:')) {
        metrics.memory_usage = parseFloat(line.split(':')[1].replace('%', '').trim()) || 0;
      } else if (line.includes('Network:')) {
        metrics.network_usage = line.split(':')[1].trim();
      } else if (line.includes('Block Height:')) {
        metrics.block_height = parseInt(line.split(':')[1].trim()) || 0;
      }
    }
    
    return metrics;
  }

  /**
   * Получение списка всех нод
   */
  async listNodes() {
    try {
      const { stdout } = await execAsync(`${this.cliPath} list`);
      
      return {
        success: true,
        nodes: this.parseListOutput(stdout)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        nodes: []
      };
    }
  }

  /**
   * Создание новой ноды
   */
  async createNode(nodeId, config = {}) {
    try {
      const configStr = JSON.stringify(config);
      const { stdout } = await execAsync(`${this.cliPath} create --node-id ${nodeId} --config '${configStr}'`);
      
      return {
        success: true,
        message: 'Node created successfully',
        output: stdout
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Удаление ноды
   */
  async deleteNode(nodeId) {
    try {
      const { stdout } = await execAsync(`${this.cliPath} delete --node-id ${nodeId}`);
      
      return {
        success: true,
        message: 'Node deleted successfully',
        output: stdout
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Получение информации о ноде
   */
  async getNodeInfo(nodeId) {
    try {
      const { stdout } = await execAsync(`${this.cliPath} info --node-id ${nodeId}`);
      
      return {
        success: true,
        info: this.parseInfoOutput(stdout)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        info: null
      };
    }
  }

  /**
   * Парсинг вывода команды list
   */
  parseListOutput(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const nodes = [];
    
    for (const line of lines) {
      // Пример вывода: "node_123 (running) - 127.0.0.1:8080"
      const match = line.match(/^(\w+)\s+\((\w+)\)\s*-\s*(.+)$/);
      if (match) {
        nodes.push({
          id: match[1],
          status: match[2],
          address: match[3]
        });
      }
    }
    
    return nodes;
  }

  /**
   * Парсинг вывода команды info
   */
  parseInfoOutput(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const info = {};
    
    for (const line of lines) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        info[key.toLowerCase().replace(/\s+/g, '_')] = value;
      }
    }
    
    return info;
  }

  /**
   * Очистка ресурсов
   */
  cleanup() {
    for (const [proverId, process] of this.runningNodes) {
      try {
        process.kill('SIGTERM');
        console.log(`🛑 Stopped node ${proverId}`);
      } catch (error) {
        console.error(`❌ Failed to stop node ${proverId}:`, error);
      }
    }
    this.runningNodes.clear();
  }
}

module.exports = NexusCLI; 