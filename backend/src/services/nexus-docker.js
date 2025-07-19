const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config');

const execAsync = promisify(exec);

class NexusDocker {
  constructor() {
    this.dockerPath = config.docker?.dockerPath || 'docker';
    this.dockerComposePath = config.docker?.dockerComposePath || 'docker-compose';
    this.nexusDataDir = config.docker?.nexusDataDir || './nexus-docker';
    this.runningContainers = new Map();
  }

  /**
   * Проверка доступности Docker
   */
  async checkDockerAvailability() {
    try {
      const { stdout } = await execAsync(`${this.dockerPath} --version`);
      const { stdout: composeVersion } = await execAsync(`${this.dockerComposePath} --version`);
      
      return {
        available: true,
        dockerVersion: stdout.trim(),
        composeVersion: composeVersion.trim()
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Установка Docker (Ubuntu/Debian)
   */
  async installDocker() {
    try {
      console.log('🔧 Installing Docker...');
      
      const commands = [
        'sudo apt update',
        'sudo apt install -y apt-transport-https ca-certificates curl software-properties-common',
        'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -',
        'sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"',
        'sudo apt update',
        'sudo apt install -y docker-ce docker-ce-cli containerd.io',
        'sudo systemctl start docker',
        'sudo systemctl enable docker'
      ];

      for (const command of commands) {
        console.log(`Executing: ${command}`);
        await execAsync(command);
      }

      // Установка Docker Compose
      await execAsync('sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose');
      await execAsync('sudo chmod +x /usr/local/bin/docker-compose');

      // Проверка версии
      const { stdout } = await execAsync('docker-compose --version');
      
      return {
        success: true,
        version: stdout.trim(),
        message: 'Docker installed successfully'
      };
    } catch (error) {
      console.error('❌ Failed to install Docker:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Создание Dockerfile для Nexus ноды
   */
  async createDockerfile(nodeId) {
    try {
      const dockerfileContent = `FROM rust:latest

RUN apt update && apt install -y protobuf-compiler git

RUN git clone https://github.com/nexus-xyz/nexus-cli.git /nexus

WORKDIR /nexus/clients/cli
RUN cargo build --release

ENTRYPOINT ["./target/release/nexus-network"]
CMD ["start", "--node-id", "${nodeId}"]`;

      const dockerfilePath = path.join(this.nexusDataDir, 'Dockerfile');
      await fs.writeFile(dockerfilePath, dockerfileContent);
      
      return {
        success: true,
        path: dockerfilePath
      };
    } catch (error) {
      console.error('❌ Failed to create Dockerfile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Создание docker-compose.yml для ноды
   */
  async createDockerCompose(nodeId, containerName = null) {
    try {
      const containerNameFinal = containerName || `nexus-node-${nodeId}`;
      const volumeName = `nexus_data_${nodeId}`;
      
      const composeContent = `services:
  ${containerNameFinal}:
    image: nexus-node-${nodeId}
    container_name: ${containerNameFinal}
    volumes:
      - ${volumeName}:/nexus-data
    command: ["start", "--node-id", "${nodeId}"]
    restart: unless-stopped
    stdin_open: true
    tty: true
    environment:
      - NODE_ID=${nodeId}
    ports:
      - "0:8080"  # Динамический порт для мониторинга

volumes:
  ${volumeName}:`;

      const composePath = path.join(this.nexusDataDir, `docker-compose-${nodeId}.yml`);
      await fs.writeFile(composePath, composeContent);
      
      return {
        success: true,
        path: composePath,
        containerName: containerNameFinal,
        volumeName: volumeName
      };
    } catch (error) {
      console.error('❌ Failed to create docker-compose.yml:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Сборка Docker образа для ноды
   */
  async buildNodeImage(nodeId) {
    try {
      console.log(`🔨 Building Docker image for node ${nodeId}`);
      
      // Создаем Dockerfile если его нет
      await this.createDockerfile(nodeId);
      
      const imageName = `nexus-node-${nodeId}`;
      const buildCommand = `${this.dockerPath} build -t ${imageName} ${this.nexusDataDir}`;
      
      const { stdout } = await execAsync(buildCommand);
      
      return {
        success: true,
        imageName: imageName,
        output: stdout
      };
    } catch (error) {
      console.error(`❌ Failed to build image for node ${nodeId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Запуск ноды в Docker контейнере
   */
  async startNode(nodeId, options = {}) {
    try {
      console.log(`🚀 Starting Docker node ${nodeId}`);

      // Создаем директорию если её нет
      await fs.mkdir(this.nexusDataDir, { recursive: true });

      // Создаем docker-compose файл
      const composeResult = await this.createDockerCompose(nodeId, options.containerName);
      if (!composeResult.success) {
        throw new Error(composeResult.error);
      }

      // Собираем образ если нужно
      if (options.rebuild || !options.skipBuild) {
        const buildResult = await this.buildNodeImage(nodeId);
        if (!buildResult.success) {
          throw new Error(buildResult.error);
        }
      }

      // Запускаем контейнер
      const upCommand = `${this.dockerComposePath} -f ${composeResult.path} up -d`;
      const { stdout } = await execAsync(upCommand);

      // Получаем информацию о контейнере
      const containerInfo = await this.getContainerInfo(composeResult.containerName);

      // Сохраняем информацию о запущенном контейнере
      this.runningContainers.set(nodeId, {
        containerName: composeResult.containerName,
        composePath: composeResult.path,
        startTime: new Date().toISOString()
      });

      return {
        success: true,
        containerName: composeResult.containerName,
        containerId: containerInfo?.Id,
        status: containerInfo?.State?.Status,
        output: stdout
      };

    } catch (error) {
      console.error(`❌ Failed to start Docker node ${nodeId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Остановка ноды в Docker контейнере
   */
  async stopNode(nodeId) {
    try {
      console.log(`🛑 Stopping Docker node ${nodeId}`);

      const containerInfo = this.runningContainers.get(nodeId);
      if (!containerInfo) {
        // Пытаемся найти контейнер по имени
        const containers = await this.listContainers();
        const container = containers.find(c => c.Names.includes(`nexus-node-${nodeId}`));
        
        if (container) {
          const stopCommand = `${this.dockerPath} stop ${container.Id}`;
          await execAsync(stopCommand);
          
          const removeCommand = `${this.dockerPath} rm ${container.Id}`;
          await execAsync(removeCommand);
        }
      } else {
        // Останавливаем через docker-compose
        const downCommand = `${this.dockerComposePath} -f ${containerInfo.composePath} down`;
        await execAsync(downCommand);
      }

      this.runningContainers.delete(nodeId);

      return {
        success: true,
        message: 'Docker node stopped successfully'
      };

    } catch (error) {
      console.error(`❌ Failed to stop Docker node ${nodeId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Получение статуса Docker ноды
   */
  async getNodeStatus(nodeId) {
    try {
      console.log(`🔍 Checking Docker status for node ${nodeId}`);

      const containerInfo = this.runningContainers.get(nodeId);
      if (containerInfo) {
        const containerStatus = await this.getContainerInfo(containerInfo.containerName);
        
        if (containerStatus && containerStatus.State.Running) {
          return {
            success: true,
            status: {
              status: 'running',
              uptime: this.calculateUptime(containerStatus.State.StartedAt),
              containerId: containerStatus.Id,
              image: containerStatus.Image
            },
            raw_output: containerStatus
          };
        }
      }

      // Ищем контейнер по имени
      const containers = await this.listContainers();
      const container = containers.find(c => c.Names.includes(`nexus-node-${nodeId}`));
      
      if (container) {
        return {
          success: true,
          status: {
            status: container.State === 'running' ? 'running' : 'stopped',
            uptime: container.State === 'running' ? this.calculateUptime(container.Created) : '0',
            containerId: container.Id,
            image: container.Image
          },
          raw_output: container
        };
      }

      return {
        success: true,
        status: {
          status: 'stopped',
          uptime: '0',
          containerId: null,
          image: null
        },
        raw_output: 'Container not found'
      };

    } catch (error) {
      console.error(`❌ Error checking Docker status for node ${nodeId}:`, error);
      return {
        success: false,
        error: error.message,
        status: 'error'
      };
    }
  }

  /**
   * Получение логов Docker контейнера
   */
  async getNodeLogs(nodeId, lines = 100) {
    try {
      const containerInfo = this.runningContainers.get(nodeId);
      let containerName = `nexus-node-${nodeId}`;
      
      if (containerInfo) {
        containerName = containerInfo.containerName;
      }

      const logsCommand = `${this.dockerPath} logs --tail ${lines} ${containerName}`;
      const { stdout } = await execAsync(logsCommand);

      return {
        success: true,
        logs: stdout.split('\n').filter(line => line.trim()),
        containerName: containerName
      };

    } catch (error) {
      console.error(`❌ Error getting Docker logs for node ${nodeId}:`, error);
      return {
        success: false,
        error: error.message,
        logs: []
      };
    }
  }

  /**
   * Получение метрик Docker контейнера
   */
  async getNodeMetrics(nodeId) {
    try {
      console.log(`📊 Getting Docker metrics for node ${nodeId}`);
      
      const status = await this.getNodeStatus(nodeId);
      
      if (!status.success) {
        return {
          success: false,
          error: status.error,
          metrics: null
        };
      }

      const metrics = {
        status: status.status.status,
        uptime: status.status.uptime,
        containerId: status.status.containerId,
        image: status.status.image,
        last_check: new Date().toISOString()
      };

      // Получаем статистику контейнера если он запущен
      if (status.status.status === 'running' && status.status.containerId) {
        try {
          const statsCommand = `${this.dockerPath} stats ${status.status.containerId} --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"`;
          const { stdout } = await execAsync(statsCommand);
          
          const statsLines = stdout.trim().split('\n');
          if (statsLines.length > 1) {
            const stats = statsLines[1].split('\t');
            metrics.cpu_usage = stats[0] || '0%';
            metrics.memory_usage = stats[1] || '0B / 0B';
            metrics.network_io = stats[2] || '0B / 0B';
            metrics.disk_io = stats[3] || '0B / 0B';
          }
        } catch (statsError) {
          console.log(`⚠️ Could not get container stats for node ${nodeId}:`, statsError.message);
        }
      }

      return {
        success: true,
        metrics: metrics,
        raw_output: 'Docker metrics generated'
      };

    } catch (error) {
      console.error(`❌ Error getting Docker metrics for node ${nodeId}:`, error);
      return {
        success: false,
        error: error.message,
        metrics: null
      };
    }
  }

  /**
   * Получение списка всех Docker контейнеров
   */
  async listContainers() {
    try {
      const { stdout } = await execAsync(`${this.dockerPath} ps -a --format "table {{.ID}}\t{{.Image}}\t{{.Command}}\t{{.CreatedAt}}\t{{.Status}}\t{{.Ports}}\t{{.Names}}"`);
      
      const lines = stdout.trim().split('\n');
      if (lines.length <= 1) return [];

      const containers = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length >= 7) {
          containers.push({
            Id: parts[0],
            Image: parts[1],
            Command: parts[2],
            CreatedAt: parts[3],
            Status: parts[4],
            Ports: parts[5],
            Names: parts[6]
          });
        }
      }

      return containers;
    } catch (error) {
      console.error('❌ Error listing containers:', error);
      return [];
    }
  }

  /**
   * Получение информации о контейнере
   */
  async getContainerInfo(containerName) {
    try {
      const { stdout } = await execAsync(`${this.dockerPath} inspect ${containerName}`);
      return JSON.parse(stdout)[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Вычисление времени работы контейнера
   */
  calculateUptime(startedAt) {
    if (!startedAt) return '0';
    
    const startTime = new Date(startedAt);
    const now = new Date();
    const diffMs = now - startTime;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Очистка ресурсов
   */
  async cleanup() {
    try {
      // Останавливаем все запущенные контейнеры
      for (const [nodeId, containerInfo] of this.runningContainers) {
        await this.stopNode(nodeId);
      }
      
      this.runningContainers.clear();
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NexusDocker; 