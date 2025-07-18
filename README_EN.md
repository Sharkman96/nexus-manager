# Nexus Node Manager

Nexus Node Manager is a web application for managing Nexus prover nodes with real-time performance monitoring and analytics.

## Features

- 🔧 **Node Management**: Start, stop, and configure Nexus prover nodes
- 📊 **Performance Monitoring**: Real-time metrics, NEX Points tracking, system resource monitoring
- 🌐 **Web Dashboard**: User-friendly interface with charts and analytics
- 🔄 **WebSocket Support**: Real-time updates and notifications
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🗄️ **Data Persistence**: SQLite database for storing node data and metrics
- 🔐 **Security**: Rate limiting, CORS protection, input validation

## Architecture

```
├── backend/          # Node.js + Express API server
├── frontend/         # React.js web application
├── database/         # SQLite database schema
├── scripts/          # Installation and management scripts
└── docs/             # Documentation
```

## Technologies

**Backend:**
- Node.js, Express.js
- SQLite (database)
- WebSocket (real-time updates)
- Nexus CLI integration
- System monitoring (CPU, memory, disk)

**Frontend:**
- React.js, React Router
- Tailwind CSS (styling)
- Chart.js (data visualization)
- Socket.io (WebSocket client)
- React Query (data fetching)

**Production:**
- Ubuntu Server
- Nginx (reverse proxy)
- systemd (service management)
- UFW (firewall)

## Quick Start

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Sharkman96/nexus-manager.git
   cd nexus-manager
   ```

2. Run the setup script:
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. Start the application:
   ```bash
   # Backend
   cd backend && npm run dev

   # Frontend (new terminal)
   cd frontend && npm start
   ```

4. Open http://localhost:3000 in your browser

### Production Installation (Ubuntu Server)

1. Clone the repository:
   ```bash
   git clone https://github.com/Sharkman96/nexus-manager.git nexus-node-manager
   cd nexus-node-manager
   ```

2. Run the automated installer:
   ```bash
   chmod +x scripts/ubuntu-install.sh
   ./scripts/ubuntu-install.sh
   ```

   > ⚠️ **Important**: The script works only with existing users and never creates new ones! Use a regular user with sudo privileges or run as root.

3. Follow the installer prompts:
   - Choose additional options (Nexus CLI, auto-updates)
   - Wait for installation to complete

4. Application will be available at: `http://YOUR_SERVER_IP`

**Detailed guide**: [INSTALLATION_EN.md](INSTALLATION_EN.md)

## Application Access

After installation, the management panel will be available at:
- **Management Panel**: `http://SERVER_IP/nexus/`
- **API**: `http://SERVER_IP/nexus/api/`
- **Root Page**: `http://SERVER_IP/` (server information)

This allows you to have other applications on the server at the root address.

## Project Management

### Service Management

```bash
# Check service status
systemctl status nexus-backend

# Start service
systemctl start nexus-backend

# Stop service
systemctl stop nexus-backend

# Restart service
systemctl restart nexus-backend

# View logs
journalctl -u nexus-backend -f
```

### Updates

```bash
# Update to latest version
/opt/nexus-node-manager/update.sh

# Or manually:
cd /opt/nexus-node-manager
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install && npm run build
cd ../backend && npm run db:migrate
systemctl restart nexus-backend
```

### Backup

```bash
# Create backup
/opt/nexus-node-manager/backup.sh

# Or manually:
tar -czf /opt/backups/nexus-manager-$(date +%Y%m%d_%H%M%S).tar.gz \
  /opt/nexus-node-manager/database \
  /opt/nexus-node-manager/backend/.env \
  /opt/nexus-node-manager/backend/logs
```

### Complete Removal

```bash
# Interactive removal (with confirmations)
chmod +x scripts/remove.sh
./scripts/remove.sh

# Force removal (no confirmations)
./scripts/remove.sh --force

# Quick removal of main project folders only
./scripts/remove.sh --quick

# Or directly with command
sudo rm -rf /opt/nexus-node-manager /opt/nexus-manager ~/nexus-node-manager ~/nexus-manager

# Or complete manual removal:
systemctl stop nexus-backend
systemctl disable nexus-backend
rm /etc/systemd/system/nexus-backend.service
rm /etc/nginx/sites-available/nexus-manager
rm /etc/nginx/sites-enabled/nexus-manager
rm -rf /opt/nexus-node-manager
ufw delete allow 3001
ufw delete allow 'Nginx HTTP'
systemctl daemon-reload
systemctl restart nginx
```

## First Steps

1. **Get Prover ID**: Register at https://app.nexus.xyz
2. **Add Node**: Click "Add Node" and enter your Prover ID
3. **Start Node**: Click "Start" button to begin proving
4. **Monitor**: Track metrics and performance on the dashboard

## API Endpoints

- `GET /api/nodes` - List all nodes
- `POST /api/nodes` - Create new node
- `GET /api/nodes/:id` - Get node details
- `POST /api/nodes/:id/start` - Start node
- `POST /api/nodes/:id/stop` - Stop node
- `GET /api/metrics` - Get system metrics
- `GET /api/system/health` - Health check

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Nexus CLI (optional)

### Local Setup

```bash
# Install dependencies
npm install

# Backend development
cd backend
npm run dev

# Frontend development
cd frontend
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Environment Variables

Create `.env` file in backend directory:

```bash
PORT=3001
NODE_ENV=development
DB_PATH=./database/nexus-nodes.db
NEXUS_RPC_URL=https://rpc.nexus.xyz/http
NEXUS_WS_URL=wss://rpc.nexus.xyz/ws
NEXUS_EXPLORER_API=https://explorer.nexus.xyz/api/v1
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Scripts

- [📦 Installation](scripts/ubuntu-install.sh) - Automated Ubuntu installation
- [🔄 Setup](scripts/setup.sh) - Local development setup
- [🗑️ Removal](scripts/remove.sh) - Complete project removal (`--help` for options)
- [🔄 Migration](scripts/migrate-to-nexus-path.sh) - Migrate existing installations to `/nexus/` path

## Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/Sharkman96/nexus-manager/issues)
- Nexus Documentation: https://docs.nexus.xyz

## Troubleshooting

### Common Issues

1. **Port already in use**: Change PORT in .env file
2. **Node not starting**: Check Nexus CLI installation
3. **Database errors**: Run `npm run db:migrate`
4. **Service not starting**: Check logs with `journalctl -u nexus-backend`

### Health Check

```bash
# Test API
curl -I http://localhost:3001/api/health

# Test WebSocket
curl -I http://localhost:3001/ws

# Check database
sqlite3 /opt/nexus-node-manager/database/nexus-nodes.db ".tables"
```

---

**Nexus Node Manager** - Simplifying Nexus prover node management with real-time monitoring and analytics. 