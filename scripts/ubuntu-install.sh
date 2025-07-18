#!/bin/bash

# Автоматизированная установка Nexus Node Manager на Ubuntu Server
# Использование: bash ubuntu-install.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для цветного вывода
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Функция для выполнения команд с sudo при необходимости
run_cmd() {
    if [[ $EUID -eq 0 ]]; then
        # Если запущен под root, выполняем команду напрямую
        "$@"
    else
        # Если не под root, используем sudo
        sudo "$@"
    fi
}

# Определение пользователя
REAL_USER=${SUDO_USER:-$(whoami)}
if [ "$REAL_USER" = "root" ]; then
    REAL_USER="nexus"
fi

# Информация о пользователе
if [[ $EUID -eq 0 ]]; then
    print_info "Запуск с правами root"
else
    print_info "Запуск под пользователем: $REAL_USER"
    print_warning "Для некоторых операций может потребоваться sudo"
fi

print_header "Установка Nexus Node Manager на Ubuntu Server"
print_info "Пользователь: $REAL_USER"
print_info "Система: $(lsb_release -d | cut -f2)"

# Проверка версии Ubuntu
UBUNTU_VERSION=$(lsb_release -rs)
if ! echo "$UBUNTU_VERSION" | grep -E "^(20|22|24)\." > /dev/null; then
    print_warning "Тестировалось на Ubuntu 20.04+. Ваша версия: $UBUNTU_VERSION"
    read -p "Продолжить? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Интерактивная настройка
print_header "Настройка параметров"

# Получение IP адреса сервера
SERVER_IP=$(ip route get 1.1.1.1 | awk '{print $7}' | head -1)
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

print_info "Сервер будет доступен по адресу: http://$SERVER_IP:3000"
print_info "Панель управления: http://$SERVER_IP"

read -p "Установить Nexus CLI? (y/n): " -n 1 -r INSTALL_NEXUS_CLI
echo

read -p "Настроить автоматические обновления? (y/n): " -n 1 -r SETUP_AUTO_UPDATES
echo

print_header "Обновление системы"
run_cmd apt update && run_cmd apt upgrade -y
print_status "Система обновлена"

print_header "Установка базовых пакетов"
run_cmd apt install -y curl wget git build-essential software-properties-common \
    ufw nginx htop unzip
print_status "Базовые пакеты установлены"

print_header "Установка Node.js 18.x"
curl -fsSL https://deb.nodesource.com/setup_18.x | run_cmd bash -
run_cmd apt install -y nodejs
print_status "Node.js установлен: $(node --version)"

print_header "Установка Docker"
# Удаление старых версий
run_cmd apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Установка Docker
run_cmd apt install -y ca-certificates curl gnupg lsb-release
run_cmd mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | run_cmd gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | run_cmd tee /etc/apt/sources.list.d/docker.list > /dev/null
run_cmd apt update
run_cmd apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
run_cmd usermod -aG docker $REAL_USER
run_cmd systemctl enable docker
run_cmd systemctl start docker
print_status "Docker установлен и настроен"

print_header "Установка дополнительных зависимостей"
run_cmd apt install -y cmake
print_status "CMake установлен: $(cmake --version | head -1)"

# Установка Rust для пользователя
if [[ $INSTALL_NEXUS_CLI =~ ^[Yy]$ ]]; then
    print_header "Установка Rust и Nexus CLI"
    sudo -u $REAL_USER bash -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'
    sudo -u $REAL_USER bash -c 'source ~/.cargo/env && rustc --version'
    
    # Установка Nexus CLI
    sudo -u $REAL_USER bash -c 'curl https://cli.nexus.xyz/ | sh'
    print_status "Nexus CLI установлен"
fi

print_header "Подготовка проекта"
# Проверка что проект уже клонирован
if [ ! -d "$(pwd)/nexus-node-manager" ] && [ ! -d "/opt/nexus-node-manager" ]; then
    print_error "Проект не найден. Клонируйте проект сначала:"
    print_info "git clone https://github.com/Sharkman96/nexus-manager.git nexus-node-manager"
    print_info "cd nexus-node-manager"
    print_info "Затем запустите скрипт снова"
    exit 1
fi

# Копирование файлов в /opt
run_cmd mkdir -p /opt/nexus-node-manager
if [ -d "$(pwd)/nexus-node-manager" ]; then
    cp -r $(pwd)/nexus-node-manager/* /opt/nexus-node-manager/
elif [ -d "/opt/nexus-node-manager" ]; then
    print_info "Проект уже скопирован в /opt/nexus-node-manager"
else
    print_error "Не найдена папка проекта"
    exit 1
fi

print_header "Установка зависимостей"
# Backend
cd /opt/nexus-node-manager/backend && npm install --production
print_status "Backend зависимости установлены"

# Frontend
cd /opt/nexus-node-manager/frontend && npm install && npm run build
print_status "Frontend собран"

print_header "Настройка конфигурации"
# Создание .env файла
tee /opt/nexus-node-manager/backend/.env > /dev/null <<EOF
PORT=3001
NODE_ENV=production
DB_PATH=./database/nexus-nodes.db
NEXUS_RPC_URL=https://rpc.nexus.xyz/http
NEXUS_WS_URL=wss://rpc.nexus.xyz/ws
NEXUS_EXPLORER_API=https://explorer.nexus.xyz/api/v1
NEXUS_CLI_PATH=/home/nexus/.cargo/bin/nexus-cli
METRICS_UPDATE_INTERVAL=30000
PERFORMANCE_HISTORY_DAYS=30
CORS_ORIGINS=http://$SERVER_IP
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FILE=./logs/nexus-manager.log
EOF

# Создание директорий
mkdir -p /opt/nexus-node-manager/backend/logs
mkdir -p /opt/nexus-node-manager/database
mkdir -p /opt/backups/nexus-manager

print_header "Инициализация базы данных"
cd /opt/nexus-node-manager/backend && npm run db:migrate
print_status "База данных инициализирована"

print_header "Создание systemd сервиса"
run_cmd tee /etc/systemd/system/nexus-backend.service > /dev/null <<EOF
[Unit]
Description=Nexus Node Manager Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nexus-node-manager/backend
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal
SyslogIdentifier=nexus-backend
LimitNOFILE=65535
MemoryMax=2G

[Install]
WantedBy=multi-user.target
EOF

run_cmd systemctl daemon-reload
run_cmd systemctl enable nexus-backend
run_cmd systemctl start nexus-backend
print_status "Сервис создан и запущен"

print_header "Настройка Nginx"
# Создание конфигурации Nginx
run_cmd tee /etc/nginx/sites-available/nexus-manager > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_IP _;
    
    root /opt/nexus-node-manager/frontend/build;
    index index.html;
    
    # Gzip
    gzip on;
    gzip_types text/css application/javascript application/json;
    
    # Статические файлы
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Заголовки безопасности
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
EOF

# Активация сайта
run_cmd ln -sf /etc/nginx/sites-available/nexus-manager /etc/nginx/sites-enabled/
run_cmd rm -f /etc/nginx/sites-enabled/default
run_cmd nginx -t && run_cmd systemctl restart nginx
print_status "Nginx настроен"

print_header "Настройка Firewall"
run_cmd ufw --force enable
run_cmd ufw allow ssh
run_cmd ufw allow 'Nginx HTTP'
run_cmd ufw allow 3001
print_status "Firewall настроен"

print_header "Создание скриптов управления"
# Скрипт обновления
tee /opt/nexus-node-manager/update.sh > /dev/null <<'EOF'
#!/bin/bash
set -e
echo "🔄 Обновление Nexus Node Manager..."
systemctl stop nexus-backend
cd /opt/nexus-node-manager
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install && npm run build
cd ../backend && npm run db:migrate
systemctl start nexus-backend
echo "✅ Обновление завершено!"
EOF

# Скрипт бэкапа
tee /opt/nexus-node-manager/backup.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/nexus-manager"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /opt/nexus-node-manager/database/nexus-nodes.db $BACKUP_DIR/nexus-nodes_$DATE.db
cp /opt/nexus-node-manager/backend/.env $BACKUP_DIR/env_$DATE
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "env_*" -mtime +7 -delete
echo "✅ Бэкап создан: $BACKUP_DIR"
EOF

chmod +x /opt/nexus-node-manager/update.sh
chmod +x /opt/nexus-node-manager/backup.sh

# Настройка cron для бэкапов
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/nexus-node-manager/backup.sh") | crontab -

print_status "Скрипты управления созданы"

# Автоматические обновления
if [[ $SETUP_AUTO_UPDATES =~ ^[Yy]$ ]]; then
    print_header "Настройка автоматических обновлений"
    apt install -y unattended-upgrades
    dpkg-reconfigure -plow unattended-upgrades
    print_status "Автоматические обновления настроены"
fi

print_header "Проверка установки"
# Проверка статуса сервиса
if run_cmd systemctl is-active --quiet nexus-backend; then
    print_status "Сервис запущен"
else
    print_error "Сервис не запущен"
    run_cmd systemctl status nexus-backend
fi

# Проверка портов
if netstat -tlpn | grep -q ":3001"; then
    print_status "API сервер слушает порт 3001"
else
    print_warning "API сервер не слушает порт 3001"
fi

# Проверка Nginx
if run_cmd systemctl is-active --quiet nginx; then
    print_status "Nginx запущен"
else
    print_error "Nginx не запущен"
fi

print_header "Установка завершена! 🎉"
print_info "Приложение доступно по адресу: http://$SERVER_IP"
print_info "API доступен по адресу: http://$SERVER_IP:3001"
print_info ""
print_info "Полезные команды:"
print_info "• Статус сервиса: systemctl status nexus-backend"
print_info "• Просмотр логов: journalctl -u nexus-backend -f"
print_info "• Обновление: /opt/nexus-node-manager/update.sh"
print_info "• Бэкап: /opt/nexus-node-manager/backup.sh"
print_info ""
print_info "Следующие шаги:"
print_info "1. Откройте http://$SERVER_IP в браузере"
print_info "2. Зарегистрируйтесь на https://app.nexus.xyz"
print_info "3. Получите Prover ID и добавьте узел"

# Проверка доступности
print_header "Тестирование доступности"
if curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP" | grep -q "200"; then
    print_status "Сайт доступен по HTTP"
else
    print_warning "Сайт недоступен. Проверьте настройки Nginx"
fi

print_info "Установка завершена успешно!" 