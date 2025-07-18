# Установка Nexus Node Manager на Ubuntu Server

> **⚠️ ВАЖНО**: Рекомендуется использовать **автоматический скрипт установки** `./scripts/ubuntu-install.sh`, который упрощен и не требует настройки SSL/доменов. Данная инструкция предназначена для ручной установки и может быть устаревшей.

Полное руководство по установке и настройке Nexus Node Manager на Ubuntu сервер для production использования.

## Системные требования

- Ubuntu 20.04 LTS или новее
- 2+ CPU cores
- 4+ GB RAM
- 20+ GB свободного места на диске
- Sudo права
- Интернет соединение

## 1. Подготовка системы

### Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### Установка базовых пакетов
```bash
sudo apt install -y curl wget git build-essential software-properties-common
```

## 2. Установка Node.js

### Установка Node.js 18.x (LTS)
```bash
# Добавление репозитория NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Установка Node.js
sudo apt install -y nodejs

# Проверка версии
node --version
npm --version
```

### Установка Yarn (опционально)
```bash
npm install -g yarn
```

## 3. Установка зависимостей для Nexus

### Установка Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env
rustc --version
```

### Установка Docker
```bash
# Удаление старых версий
sudo apt remove docker docker-engine docker.io containerd runc

# Установка зависимостей
sudo apt install -y ca-certificates curl gnupg lsb-release

# Добавление GPG ключа Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Добавление репозитория Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Включение Docker при старте системы
sudo systemctl enable docker
sudo systemctl start docker
```

### Установка CMake
```bash
sudo apt install -y cmake
cmake --version
```

## 4. Установка Nexus CLI

```bash
# Установка Nexus CLI
curl https://cli.nexus.xyz/ | sh

# Перезагрузка shell или добавление в PATH
source ~/.bashrc

# Проверка установки
nexus-cli --version
```

## 5. Клонирование и настройка проекта

### Клонирование проекта
```bash
# Клонирование в домашнюю директорию
cd ~
git clone https://github.com/Sharkman96/nexus-manager.git nexus-node-manager
cd nexus-node-manager
```

### Создание пользователя для приложения
```bash
# Создание пользователя nexus
sudo adduser --system --group --home /opt/nexus-node-manager nexus

# Копирование файлов
sudo cp -r ~/nexus-node-manager/* /opt/nexus-node-manager/
sudo chown -R nexus:nexus /opt/nexus-node-manager
```

### Установка зависимостей
```bash
cd /opt/nexus-node-manager

# Установка backend зависимостей
sudo -u nexus bash -c "cd backend && npm install --production"

# Установка frontend зависимостей и сборка
sudo -u nexus bash -c "cd frontend && npm install && npm run build"
```

### Инициализация базы данных
```bash
sudo -u nexus bash -c "cd backend && npm run db:migrate"
```

## 6. Настройка конфигурации

### Создание production конфигурации
```bash
sudo -u nexus tee /opt/nexus-node-manager/backend/.env > /dev/null <<EOF
# Server Configuration
PORT=3001
NODE_ENV=production

# Database
DB_PATH=./database/nexus-nodes.db

# Nexus Network Configuration
NEXUS_RPC_URL=https://rpc.nexus.xyz/http
NEXUS_WS_URL=wss://rpc.nexus.xyz/ws
NEXUS_EXPLORER_API=https://explorer.nexus.xyz/api/v1

# CLI Configuration
NEXUS_CLI_PATH=/home/nexus/.cargo/bin/nexus-cli

# Monitoring Configuration
METRICS_UPDATE_INTERVAL=30000
PERFORMANCE_HISTORY_DAYS=30

# Security
CORS_ORIGINS=http://localhost:3000,http://SERVER_IP
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/nexus-manager.log
EOF
```

### Создание директорий для логов
```bash
sudo -u nexus mkdir -p /opt/nexus-node-manager/backend/logs
sudo -u nexus mkdir -p /opt/nexus-node-manager/database
```

## 7. Создание systemd сервиса

### Backend сервис
```bash
sudo tee /etc/systemd/system/nexus-backend.service > /dev/null <<EOF
[Unit]
Description=Nexus Node Manager Backend
After=network.target

[Service]
Type=simple
User=nexus
WorkingDirectory=/opt/nexus-node-manager/backend
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Логирование
StandardOutput=journal
StandardError=journal
SyslogIdentifier=nexus-backend

# Ограничения ресурсов
LimitNOFILE=65535
MemoryMax=2G

[Install]
WantedBy=multi-user.target
EOF
```

### Включение и запуск сервиса
```bash
sudo systemctl daemon-reload
sudo systemctl enable nexus-backend
sudo systemctl start nexus-backend
sudo systemctl status nexus-backend
```

## 8. Настройка веб-сервера (Nginx)

### Установка Nginx
```bash
sudo apt install -y nginx
```

### Конфигурация Nginx
```bash
sudo tee /etc/nginx/sites-available/nexus-manager > /dev/null <<'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL конфигурация (настроится позже)
    ssl_certificate /etc/ssl/certs/nexus-manager.crt;
    ssl_certificate_key /etc/ssl/private/nexus-manager.key;
    
    # Корневая директория для статических файлов
    root /opt/nexus-node-manager/frontend/build;
    index index.html;
    
    # Gzip сжатие
    gzip on;
    gzip_types text/css application/javascript application/json;
    
    # Статические файлы
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API проксирование
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket проксирование
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
EOF
```

### Активация конфигурации
```bash
sudo ln -s /etc/nginx/sites-available/nexus-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 9. Настройка SSL (Let's Encrypt)

### Установка Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Получение SSL сертификата
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Автоматическое обновление сертификатов
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## 10. Настройка Firewall

### Настройка UFW
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

## 11. Мониторинг и логи

### Просмотр логов
```bash
# Логи backend сервиса
sudo journalctl -u nexus-backend -f

# Логи приложения
sudo tail -f /opt/nexus-node-manager/backend/logs/nexus-manager.log

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Мониторинг системы
```bash
# Статус сервиса
sudo systemctl status nexus-backend

# Использование ресурсов
htop
df -h
```

## 12. Обновление приложения

### Создание скрипта обновления
```bash
sudo tee /opt/nexus-node-manager/update.sh > /dev/null <<'EOF'
#!/bin/bash
set -e

echo "🔄 Updating Nexus Node Manager..."

# Остановка сервиса
sudo systemctl stop nexus-backend

# Обновление кода
cd /opt/nexus-node-manager
sudo -u nexus git pull origin main

# Обновление зависимостей
sudo -u nexus bash -c "cd backend && npm install --production"
sudo -u nexus bash -c "cd frontend && npm install && npm run build"

# Миграция базы данных
sudo -u nexus bash -c "cd backend && npm run db:migrate"

# Запуск сервиса
sudo systemctl start nexus-backend

echo "✅ Update completed successfully!"
EOF

sudo chmod +x /opt/nexus-node-manager/update.sh
```

## 13. Резервное копирование

### Создание скрипта бэкапа
```bash
sudo tee /opt/nexus-node-manager/backup.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/nexus-manager"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Бэкап базы данных
cp /opt/nexus-node-manager/database/nexus-nodes.db $BACKUP_DIR/nexus-nodes_$DATE.db

# Бэкап конфигурации
cp /opt/nexus-node-manager/backend/.env $BACKUP_DIR/env_$DATE

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "env_*" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_DIR"
EOF

sudo chmod +x /opt/nexus-node-manager/backup.sh
```

### Настройка автоматического бэкапа
```bash
# Добавление в crontab
sudo crontab -e

# Добавить строку для ежедневного бэкапа в 2:00
0 2 * * * /opt/nexus-node-manager/backup.sh
```

## 14. Проверка установки

### Тестирование работы
```bash
# Проверка статуса сервиса
sudo systemctl status nexus-backend

# Проверка портов
sudo netstat -tlpn | grep :3001
sudo netstat -tlpn | grep :80
sudo netstat -tlpn | grep :443

# Проверка API
curl -I http://localhost:3001/health
curl -I https://yourdomain.com/api/health
```

### Первый запуск
1. Откройте https://yourdomain.com в браузере
2. Зарегистрируйтесь на https://app.nexus.xyz
3. Получите ваш Prover ID
4. Добавьте узел в приложении

## 15. Полезные команды

### Управление сервисом
```bash
# Перезапуск
sudo systemctl restart nexus-backend

# Остановка
sudo systemctl stop nexus-backend

# Запуск
sudo systemctl start nexus-backend

# Статус
sudo systemctl status nexus-backend
```

### Мониторинг
```bash
# Просмотр логов в реальном времени
sudo journalctl -u nexus-backend -f

# Проверка использования ресурсов
sudo systemctl show nexus-backend --property=MemoryCurrent
sudo systemctl show nexus-backend --property=CPUUsageNSec
```

## Готово! 🎉

Nexus Node Manager успешно установлен на Ubuntu сервер. Приложение доступно по адресу https://yourdomain.com

### Следующие шаги:
1. Настройте DNS для вашего домена
2. Добавьте ваш первый Nexus узел
3. Настройте мониторинг и алерты
4. Регулярно обновляйте приложение
5. Делайте регулярные бэкапы

Для технической поддержки обращайтесь к документации или создавайте issue в репозитории проекта. 