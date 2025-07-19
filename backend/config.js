require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  dbPath: process.env.DB_PATH || '../database/nexus-nodes.db',

  // Nexus Network Configuration
  nexus: {
    rpcUrl: process.env.NEXUS_RPC_URL || 'https://rpc.nexus.xyz/http',
    wsUrl: process.env.NEXUS_WS_URL || 'wss://rpc.nexus.xyz/ws',
    explorerApi: process.env.NEXUS_EXPLORER_API || 'https://explorer.nexus.xyz/api/v1',
    defaultProverId: process.env.DEFAULT_PROVER_ID || '',
    cliPath: process.env.NEXUS_CLI_PATH || 'nexus-cli'
  },

  // Docker Configuration
  docker: {
    dockerPath: process.env.DOCKER_PATH || 'docker',
    dockerComposePath: process.env.DOCKER_COMPOSE_PATH || 'docker-compose',
    nexusDataDir: process.env.NEXUS_DOCKER_DATA_DIR || '../nexus-docker',
    defaultNodeType: process.env.DEFAULT_NODE_TYPE || 'docker', // 'docker' or 'cli'
    autoInstallDocker: process.env.AUTO_INSTALL_DOCKER === 'true' || false
  },

  // Monitoring Configuration
  monitoring: {
    metricsUpdateInterval: parseInt(process.env.METRICS_UPDATE_INTERVAL) || 30000,
    performanceHistoryDays: parseInt(process.env.PERFORMANCE_HISTORY_DAYS) || 30,
    wsHeartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000
  },

  // Security
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/nexus-manager.log'
  }
};

module.exports = config; 