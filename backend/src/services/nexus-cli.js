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
      const command = this.buildStartCommand(proverId, options);
      console.log(`🚀 Starting node with command: ${command}`);

      const nodeProcess = spawn(this.cliPath, command.split(' ').slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
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
        
        return {
          success: true,
          message: 'Node stopped successfully'
        };
      } else {
        // Попытка остановки через CLI
        const { stdout } = await execAsync(`${this.cliPath} node stop --prover-id ${proverId}`);
        return {
          success: true,
          message: 'Node stopped via CLI',
          output: stdout
        };
      }
    } catch (error) {
      console.error(`❌ Failed to stop node ${proverId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Получение статуса узла
   */
  async getNodeStatus(proverId) {
    try {
      const { stdout } = await execAsync(`${this.cliPath} node status --prover-id ${proverId}`);
      
      // Парсим вывод CLI
      const status = this.parseStatusOutput(stdout);
      
      return {
        success: true,
        status: status,
        raw_output: stdout
      };
    } catch (error) {
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
      const { stdout } = await execAsync(`${this.cliPath} node logs --prover-id ${proverId} --lines ${lines}`);
      
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