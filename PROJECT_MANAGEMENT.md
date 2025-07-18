# Nexus Node Manager - Project Management Guide

Complete guide for managing Nexus Node Manager after installation.

## Table of Contents

- [Service Management](#service-management)
- [Updates](#updates)
- [Backup & Restore](#backup--restore)
- [Monitoring & Logs](#monitoring--logs)
- [Troubleshooting](#troubleshooting)
- [Complete Removal](#complete-removal)

## Service Management

### Check Service Status

```bash
# Check if service is running
systemctl status nexus-backend

# Check if service is enabled (starts at boot)
systemctl is-enabled nexus-backend

# Check if service is active
systemctl is-active nexus-backend
```

### Start Service

```bash
# Start the service
systemctl start nexus-backend

# Start and enable service (auto-start at boot)
systemctl enable --now nexus-backend

# Verify service started
systemctl status nexus-backend
```

### Stop Service

```bash
# Stop the service
systemctl stop nexus-backend

# Stop and disable service (don't auto-start at boot)
systemctl disable --now nexus-backend

# Verify service stopped
systemctl status nexus-backend
```

### Restart Service

```bash
# Restart service (stop then start)
systemctl restart nexus-backend

# Reload service configuration without stopping
systemctl reload nexus-backend

# Restart if running, start if stopped
systemctl restart nexus-backend
```

### Manual Service Management

```bash
# If systemd is not available, run manually:
cd /opt/nexus-node-manager/backend
node src/server.js

# Run in background
nohup node src/server.js > /dev/null 2>&1 &

# Kill manual processes
pkill -f "node.*nexus"
```

## Updates

### Automated Update

```bash
# Use the update script
/opt/nexus-node-manager/update.sh

# Make script executable if needed
chmod +x /opt/nexus-node-manager/update.sh
```

### Manual Update

```bash
# 1. Stop the service
systemctl stop nexus-backend

# 2. Navigate to project directory
cd /opt/nexus-node-manager

# 3. Backup current version (optional)
cp -r . ../nexus-node-manager-backup-$(date +%Y%m%d)

# 4. Pull latest changes
git pull origin main

# 5. Update backend dependencies
cd backend
npm install --production

# 6. Rebuild frontend
cd ../frontend
npm install
npm run build

# 7. Run database migrations
cd ../backend
npm run db:migrate

# 8. Start the service
systemctl start nexus-backend

# 9. Verify update
systemctl status nexus-backend
```

### Update Specific Components

```bash
# Update only backend
cd /opt/nexus-node-manager/backend
npm install --production
systemctl restart nexus-backend

# Update only frontend
cd /opt/nexus-node-manager/frontend
npm install
npm run build

# Update only database
cd /opt/nexus-node-manager/backend
npm run db:migrate
```

## Backup & Restore

### Create Backup

```bash
# Use the backup script
/opt/nexus-node-manager/backup.sh

# Manual backup
tar -czf /opt/backups/nexus-manager-$(date +%Y%m%d_%H%M%S).tar.gz \
  /opt/nexus-node-manager/database \
  /opt/nexus-node-manager/backend/.env \
  /opt/nexus-node-manager/backend/logs
```

### Backup Database Only

```bash
# Copy database file
cp /opt/nexus-node-manager/database/nexus-nodes.db \
   /opt/backups/nexus-nodes-$(date +%Y%m%d_%H%M%S).db

# Create database dump
sqlite3 /opt/nexus-node-manager/database/nexus-nodes.db \
  .dump > /opt/backups/nexus-db-$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup

```bash
# Stop service
systemctl stop nexus-backend

# Restore database
cp /opt/backups/nexus-nodes-YYYYMMDD_HHMMSS.db \
   /opt/nexus-node-manager/database/nexus-nodes.db

# Restore configuration
cp /opt/backups/.env /opt/nexus-node-manager/backend/.env

# Start service
systemctl start nexus-backend
```

## Monitoring & Logs

### View Logs

```bash
# Real-time logs
journalctl -u nexus-backend -f

# Recent logs
journalctl -u nexus-backend -n 100

# Logs since yesterday
journalctl -u nexus-backend --since yesterday

# Logs with errors only
journalctl -u nexus-backend -p err

# Application logs
tail -f /opt/nexus-node-manager/backend/logs/nexus-manager.log
```

### Check System Resources

```bash
# CPU and memory usage
top -p $(pgrep -f "node.*nexus")

# Detailed process info
ps aux | grep nexus

# Disk usage
df -h /opt/nexus-node-manager
du -sh /opt/nexus-node-manager/*

# Port usage
netstat -tlnp | grep 3001
lsof -i :3001
```

### Health Checks

```bash
# API health check (production)
curl -I http://localhost/nexus/api/health

# API health check (development)
curl -I http://localhost:3001/api/health

# WebSocket check (production)
curl -I http://localhost/nexus/ws

# WebSocket check (development)
curl -I http://localhost:3001/ws

# Database check
sqlite3 /opt/nexus-node-manager/database/nexus-nodes.db ".tables"

# Frontend check (production)
curl -I http://localhost/nexus/

# Server info page
curl -I http://localhost/
```

### Application URLs

**Production (after installation):**
- Management Panel: `http://SERVER_IP/nexus/`
- API: `http://SERVER_IP/nexus/api/`
- WebSocket: `http://SERVER_IP/nexus/ws`
- Server Info: `http://SERVER_IP/`

**Development:**
- Management Panel: `http://localhost:3000/`
- API: `http://localhost:3001/api/`
- WebSocket: `http://localhost:3001/ws`

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs for errors
journalctl -u nexus-backend -n 50

# Check if port is in use
lsof -i :3001

# Check file permissions
ls -la /opt/nexus-node-manager/backend/

# Check Node.js version
node --version
```

#### Database Issues

```bash
# Check database file
ls -la /opt/nexus-node-manager/database/

# Test database connection
sqlite3 /opt/nexus-node-manager/database/nexus-nodes.db ".tables"

# Reset database (WARNING: deletes all data)
cd /opt/nexus-node-manager/backend
npm run db:reset
```

#### High CPU/Memory Usage

```bash
# Monitor resource usage
htop

# Check for memory leaks
ps aux --sort=-%mem | head -10

# Restart service to free memory
systemctl restart nexus-backend
```

#### Network Issues

```bash
# Check firewall
ufw status

# Check nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx
```

### Reset to Default State

```bash
# Stop service
systemctl stop nexus-backend

# Reset database
cd /opt/nexus-node-manager/backend
npm run db:reset

# Clear logs
rm -f /opt/nexus-node-manager/backend/logs/*.log

# Start service
systemctl start nexus-backend
```

## Complete Removal

### Stop and Remove Service

```bash
# Stop and disable service
systemctl stop nexus-backend
systemctl disable nexus-backend

# Remove service file
rm /etc/systemd/system/nexus-backend.service

# Reload systemd
systemctl daemon-reload
```

### Remove Web Server Configuration

```bash
# Remove nginx configuration
rm -f /etc/nginx/sites-available/nexus-manager
rm -f /etc/nginx/sites-enabled/nexus-manager

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx
```

### Remove Project Files

```bash
# Create final backup (optional)
tar -czf /opt/backups/nexus-manager-final-$(date +%Y%m%d).tar.gz \
  /opt/nexus-node-manager

# Remove project directory
rm -rf /opt/nexus-node-manager

# Remove backups (optional)
rm -rf /opt/backups/nexus-manager*
```

### Remove Firewall Rules

```bash
# Remove firewall rules
ufw delete allow 3001
ufw delete allow 'Nginx HTTP'

# Check remaining rules
ufw status
```

### Clean Up System

```bash
# Remove unused dependencies (careful!)
apt autoremove

# Clean package cache
apt autoclean

# Remove logs
rm -rf /var/log/nexus-*
```

### Automated Removal Script

```bash
# Show help
./scripts/remove.sh --help

# Interactive removal (with confirmations)
./scripts/remove.sh

# Force removal (no confirmations)
./scripts/remove.sh --force

# Quick removal (main folders only)
./scripts/remove.sh --quick
```

### Quick Removal Command

For a simple and fast removal of main project folders:

```bash
# Remove main project directories
sudo rm -rf /opt/nexus-node-manager /opt/nexus-manager ~/nexus-node-manager ~/nexus-manager

# Also clean up service and nginx (optional)
sudo systemctl stop nexus-backend 2>/dev/null || true
sudo systemctl disable nexus-backend 2>/dev/null || true
sudo rm -f /etc/systemd/system/nexus-backend.service
sudo rm -f /etc/nginx/sites-available/nexus-manager
sudo rm -f /etc/nginx/sites-enabled/nexus-manager
sudo systemctl daemon-reload
sudo systemctl restart nginx 2>/dev/null || true
```

The automated removal script will:
- Stop and disable the nexus-backend service
- Remove nginx configuration
- Remove project files from `/opt/nexus-node-manager`
- Find and remove local copies of the project
- Remove firewall rules
- Optionally remove backup files
- Clean up any remaining processes

### Manual Complete Removal Script

```bash
#!/bin/bash
echo "🗑️  Removing Nexus Node Manager..."

# Stop service
systemctl stop nexus-backend 2>/dev/null || true
systemctl disable nexus-backend 2>/dev/null || true

# Remove service file
rm -f /etc/systemd/system/nexus-backend.service

# Remove nginx configuration
rm -f /etc/nginx/sites-available/nexus-manager
rm -f /etc/nginx/sites-enabled/nexus-manager

# Remove project files
rm -rf /opt/nexus-node-manager

# Remove firewall rules
ufw delete allow 3001 2>/dev/null || true
ufw delete allow 'Nginx HTTP' 2>/dev/null || true

# Reload services
systemctl daemon-reload
systemctl restart nginx 2>/dev/null || true

echo "✅ Nexus Node Manager removed successfully!"
```

## Configuration Management

### Update Configuration

```bash
# Edit environment variables
nano /opt/nexus-node-manager/backend/.env

# Restart service to apply changes
systemctl restart nexus-backend
```

### Common Configuration Changes

```bash
# Change port
sed -i 's/PORT=3001/PORT=3002/' /opt/nexus-node-manager/backend/.env

# Change log level
sed -i 's/LOG_LEVEL=info/LOG_LEVEL=debug/' /opt/nexus-node-manager/backend/.env

# Update RPC endpoint
sed -i 's|NEXUS_RPC_URL=.*|NEXUS_RPC_URL=https://new-rpc.nexus.xyz/http|' \
  /opt/nexus-node-manager/backend/.env
```

### Reset Configuration

```bash
# Backup current configuration
cp /opt/nexus-node-manager/backend/.env \
   /opt/nexus-node-manager/backend/.env.backup

# Restore default configuration
# (You'll need to recreate the .env file with default values)
```

---

**Need help?** Check the [GitHub Issues](https://github.com/Sharkman96/nexus-manager/issues) or [documentation](README.md). 