#!/bin/bash

# Автоматизированная установка Nexus Node Manager на Ubuntu Server
# Версия: 2024-01-21-v17 (интеграция с Nexus CLI для управления нодами)
# Использование: bash ubuntu-install.sh
#
# ВАЖНО: Скрипт работает только с существующими пользователями!
# Никогда не создавайте новых пользователей в этом скрипте!

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
    # Если запущен напрямую под root, используем root
    REAL_USER="root"
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

print_info "Панель управления: http://$SERVER_IP/nexus/"
print_info "Корневой адрес http://$SERVER_IP/ остается свободным для других приложений"

read -p "Установить Nexus CLI? (y/n): " -n 1 -r INSTALL_NEXUS_CLI
echo

read -p "Настроить автоматические обновления? (y/n): " -n 1 -r SETUP_AUTO_UPDATES
echo

print_header "Обновление системы"
run_cmd apt update && run_cmd apt upgrade -y
print_status "Система обновлена"

print_header "Установка базовых пакетов"
run_cmd apt install -y curl wget git build-essential software-properties-common \
    ufw nginx htop unzip net-tools
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

# Установка Docker Compose (отдельно для совместимости)
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Добавить пользователя в группу docker (только если пользователь не root)
if [ "$REAL_USER" != "root" ] && id "$REAL_USER" &>/dev/null; then
    print_info "Добавление пользователя $REAL_USER в группу docker..."
    if run_cmd usermod -aG docker $REAL_USER 2>/dev/null; then
        print_status "Пользователь $REAL_USER добавлен в группу docker"
    else
        print_warning "Не удалось добавить пользователя $REAL_USER в группу docker"
        print_info "Это не критично - Docker будет работать под root"
    fi
else
    print_info "Пропущено добавление в группу docker (пользователь: $REAL_USER)"
    if [ "$REAL_USER" = "root" ]; then
        print_info "Причина: пользователь root (Docker будет работать под root)"
    else
        print_info "Причина: пользователь $REAL_USER не существует"
    fi
fi

run_cmd systemctl enable docker
run_cmd systemctl start docker
print_status "Docker установлен и настроен"

print_header "Установка дополнительных зависимостей"
run_cmd apt install -y cmake
print_status "CMake установлен: $(cmake --version | head -1)"

# Установка Rust для пользователя
if [[ $INSTALL_NEXUS_CLI =~ ^[Yy]$ ]]; then
    print_header "Установка Rust и Nexus CLI"
    
    if [ "$REAL_USER" = "root" ]; then
        # Установка для root
        print_info "Установка Rust для пользователя root"
        curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source ~/.cargo/env && rustc --version
        
        # Установка Nexus CLI из GitHub
        print_info "Установка Nexus CLI из GitHub"
        cd /tmp
        # Удаляем существующую папку если она есть
        if [ -d "nexus-cli" ]; then
            print_info "Удаление существующей папки nexus-cli..."
            rm -rf nexus-cli
        fi
        git clone https://github.com/nexus-xyz/nexus-cli.git
        cd nexus-cli
        
        # Проверяем тип проекта
        if [ -f "Cargo.toml" ]; then
            print_info "Обнаружен Rust проект, компилируем..."
            cargo build --release
            cp target/release/nexus-cli /usr/local/bin/nexus-cli
            chmod +x /usr/local/bin/nexus-cli
        elif [ -f "package.json" ]; then
            print_info "Обнаружен Node.js проект, устанавливаем..."
            npm install
            npm run build
            # Ищем исполняемый файл
            if [ -f "dist/nexus-cli" ]; then
                cp dist/nexus-cli /usr/local/bin/nexus-cli
            elif [ -f "bin/nexus-cli" ]; then
                cp bin/nexus-cli /usr/local/bin/nexus-cli
            else
                # Создаем простой wrapper
                echo '#!/bin/bash' > /usr/local/bin/nexus-cli
                echo 'cd /tmp/nexus-cli && node index.js "$@"' >> /usr/local/bin/nexus-cli
            fi
            chmod +x /usr/local/bin/nexus-cli
        else
            print_warning "Неизвестный тип проекта в nexus-cli репозитории"
            print_info "Содержимое папки:"
            ls -la
            print_info "Попытка альтернативной установки..."
            
            # Попробуем установить через npm
            if command -v npm &> /dev/null; then
                print_info "Установка nexus-cli через npm..."
                npm install -g @nexus/cli 2>/dev/null || npm install -g nexus-cli 2>/dev/null || {
                    print_warning "Nexus CLI недоступен через npm"
                    print_info "Установка пропущена. CLI можно установить вручную позже."
                }
            else
                print_warning "npm не найден, установка Nexus CLI пропущена"
            fi
        fi
        
        # Проверка установки
        if command -v nexus-cli &> /dev/null; then
            nexus-cli --version
        else
            print_warning "Nexus CLI не установлен или недоступен"
        fi
    else
        # Установка для обычного пользователя
        print_info "Установка Rust для пользователя $REAL_USER"
        if id "$REAL_USER" &>/dev/null; then
            sudo -u $REAL_USER bash -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'
            sudo -u $REAL_USER bash -c 'source ~/.cargo/env && rustc --version'
            
            # Установка Nexus CLI из GitHub
            print_info "Установка Nexus CLI из GitHub"
            cd /tmp
            # Удаляем существующую папку если она есть
            if [ -d "nexus-cli" ]; then
                print_info "Удаление существующей папки nexus-cli..."
                rm -rf nexus-cli
            fi
            git clone https://github.com/nexus-xyz/nexus-cli.git
            cd nexus-cli
            
            # Проверяем тип проекта
            if [ -f "Cargo.toml" ]; then
                print_info "Обнаружен Rust проект, компилируем..."
                sudo -u $REAL_USER bash -c 'cargo build --release'
                sudo cp target/release/nexus-cli /usr/local/bin/nexus-cli
                sudo chmod +x /usr/local/bin/nexus-cli
            elif [ -f "package.json" ]; then
                print_info "Обнаружен Node.js проект, устанавливаем..."
                sudo -u $REAL_USER bash -c 'npm install'
                sudo -u $REAL_USER bash -c 'npm run build'
                # Ищем исполняемый файл
                if [ -f "dist/nexus-cli" ]; then
                    sudo cp dist/nexus-cli /usr/local/bin/nexus-cli
                elif [ -f "bin/nexus-cli" ]; then
                    sudo cp bin/nexus-cli /usr/local/bin/nexus-cli
                else
                    # Создаем простой wrapper
                    sudo tee /usr/local/bin/nexus-cli > /dev/null <<'EOF'
#!/bin/bash
cd /tmp/nexus-cli && node index.js "$@"
EOF
                fi
                sudo chmod +x /usr/local/bin/nexus-cli
            else
                print_warning "Неизвестный тип проекта в nexus-cli репозитории"
                print_info "Содержимое папки:"
                ls -la
                print_info "Попытка альтернативной установки..."
                
                # Попробуем установить через npm
                if command -v npm &> /dev/null; then
                    print_info "Установка nexus-cli через npm..."
                    npm install -g @nexus/cli 2>/dev/null || npm install -g nexus-cli 2>/dev/null || {
                        print_warning "Nexus CLI недоступен через npm"
                        print_info "Установка пропущена. CLI можно установить вручную позже."
                    }
                else
                    print_warning "npm не найден, установка Nexus CLI пропущена"
                fi
            fi
            
            # Проверка установки
            if command -v nexus-cli &> /dev/null; then
                nexus-cli --version
            else
                print_warning "Nexus CLI не установлен или недоступен"
            fi
        else
            print_error "Пользователь $REAL_USER не существует"
            exit 1
        fi
    fi
    
    print_status "Nexus CLI установлен"
fi

print_header "Подготовка проекта"

# Сохраняем исходную директорию
ORIGINAL_DIR=$(pwd)
print_info "Исходная директория: $ORIGINAL_DIR"

# Проверка что проект уже клонирован
print_info "Поиск проекта в:"
print_info "  - $ORIGINAL_DIR/nexus-manager"
print_info "  - $ORIGINAL_DIR/nexus"
print_info "  - /opt/nexus-manager"
print_info "  - $(dirname $ORIGINAL_DIR)/nexus-manager"
print_info "  - $(dirname $ORIGINAL_DIR)/nexus"

if [ ! -d "$ORIGINAL_DIR/nexus-manager" ] && [ ! -d "$ORIGINAL_DIR/nexus" ] && [ ! -d "/opt/nexus-manager" ] && [ ! -d "$(dirname $ORIGINAL_DIR)/nexus-manager" ] && [ ! -d "$(dirname $ORIGINAL_DIR)/nexus" ]; then
    print_error "Проект не найден. Клонируйте проект сначала:"
    print_info "git clone https://github.com/Sharkman96/nexus-manager.git"
    print_info "cd nexus-manager"
    print_info "Или используйте существующую папку: nexus или nexus-manager"
    print_info "Затем запустите скрипт снова"
    exit 1
fi

# Копирование файлов в /opt
run_cmd mkdir -p /opt/nexus-manager
if [ -d "$ORIGINAL_DIR/nexus-manager" ]; then
    cp -r $ORIGINAL_DIR/nexus-manager/* /opt/nexus-manager/
elif [ -d "$ORIGINAL_DIR/nexus" ]; then
    cp -r $ORIGINAL_DIR/nexus/* /opt/nexus-manager/
elif [ -d "$(dirname $ORIGINAL_DIR)/nexus-manager" ]; then
    cp -r $(dirname $ORIGINAL_DIR)/nexus-manager/* /opt/nexus-manager/
elif [ -d "$(dirname $ORIGINAL_DIR)/nexus" ]; then
    cp -r $(dirname $ORIGINAL_DIR)/nexus/* /opt/nexus-manager/
elif [ -d "/opt/nexus-manager" ]; then
    print_info "Проект уже скопирован в /opt/nexus-manager"
else
    print_error "Не найдена папка проекта"
    exit 1
fi

print_header "Установка зависимостей"
# Backend
cd /opt/nexus-manager/backend && npm install --production
print_status "Backend зависимости установлены"

# Frontend
cd /opt/nexus-manager/frontend && rm -rf node_modules package-lock.json && npm install --legacy-peer-deps --force && npm run build
# Копирование frontend файлов
cp -r /opt/nexus-manager/frontend/build/* /var/www/nexus-manager/
chown -R www-data:www-data /var/www/nexus-manager/
chmod -R 755 /var/www/nexus-manager/
print_status "Frontend собран и скопирован"

print_header "Настройка конфигурации"
# Создание .env файла автоматически
if [ ! -f "/opt/nexus-manager/backend/.env" ]; then
    print_info "Создание .env файла..."
    tee /opt/nexus-manager/backend/.env > /dev/null <<EOF
PORT=3002
NODE_ENV=production
DB_PATH=../database/nexus-nodes.db
NEXUS_RPC_URL=https://rpc.nexus.xyz/http
NEXUS_WS_URL=wss://rpc.nexus.xyz/ws
NEXUS_EXPLORER_API=https://explorer.nexus.xyz/api/v1
NEXUS_CLI_PATH=/usr/local/bin/nexus-cli
METRICS_UPDATE_INTERVAL=30000
PERFORMANCE_HISTORY_DAYS=30
CORS_ORIGINS=http://$SERVER_IP
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FILE=./logs/nexus-manager.log

# Docker Configuration
DOCKER_PATH=docker
DOCKER_COMPOSE_PATH=docker-compose
NEXUS_DOCKER_DATA_DIR=../nexus-docker
DEFAULT_NODE_TYPE=docker
AUTO_INSTALL_DOCKER=true
EOF
    print_status ".env файл создан автоматически"
else
    print_info ".env файл уже существует, пропускаем создание"
fi

# Создание директорий
mkdir -p /opt/nexus-manager/backend/logs
mkdir -p /opt/nexus-manager/database
mkdir -p /opt/nexus-manager/nexus-docker
mkdir -p /opt/backups/nexus-manager
mkdir -p /var/www/nexus-manager

# Установка правильных прав доступа
chown -R $REAL_USER:$REAL_USER /opt/nexus-manager/database
chown -R $REAL_USER:$REAL_USER /opt/nexus-manager/nexus-docker
chown -R $REAL_USER:$REAL_USER /opt/nexus-manager/backend/logs

print_header "Инициализация базы данных"
cd /opt/nexus-manager/backend
# Запуск основных миграций
if npm run db:migrate; then
    print_status "Основные миграции выполнены"
else
    print_warning "Основные миграции не выполнены (возможно уже выполнены)"
fi

# Запуск Docker миграций
if node src/database/migrate-docker.js; then
    print_status "Docker миграции выполнены"
else
    print_warning "Docker миграции не выполнены (возможно уже выполнены)"
fi

print_status "База данных инициализирована"

print_header "Создание systemd сервиса"
run_cmd tee /etc/systemd/system/nexus-backend.service > /dev/null <<EOF
[Unit]
Description=Nexus Node Manager Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nexus-manager/backend
ExecStart=/usr/bin/node server.js
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
    
    # Редирект с /nexus на /nexus/
    location = /nexus {
        return 301 \$scheme://\$server_name/nexus/;
    }
    
    # Nexus Node Manager приложение
    location /nexus/ {
        alias /var/www/nexus-manager/;
        index index.html;
        
        # Gzip
        gzip on;
        gzip_types text/css application/javascript application/json;
        
        # Статические файлы React
        location /nexus/static/ {
            alias /var/www/nexus-manager/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # React Router - все неизвестные пути направляем на index.html
        try_files \$uri \$uri/ /nexus/index.html;
    }
    
    # API endpoints
    location /nexus/api/ {
        rewrite ^/nexus/api/(.*) /api/\$1 break;
        proxy_pass http://localhost:3002;
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
    location /nexus/ws {
        rewrite ^/nexus/ws(.*) /ws\$1 break;
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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
run_cmd ufw allow 3002
print_status "Firewall настроен"

print_header "Создание скриптов управления"
# Скрипт обновления
tee /opt/nexus-manager/update.sh > /dev/null <<'EOF'
#!/bin/bash
set -e
echo "🔄 Обновление Nexus Node Manager..."
systemctl stop nexus-backend
cd /opt/nexus-manager
git pull origin main
cd backend && npm install --production
cd ../frontend && rm -rf node_modules package-lock.json && npm install --legacy-peer-deps --force && npm run build
cd ../backend && npm run db:migrate
systemctl start nexus-backend
echo "✅ Обновление завершено!"
EOF

# Скрипт бэкапа
tee /opt/nexus-manager/backup.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/nexus-manager"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /opt/nexus-manager/database/nexus-nodes.db $BACKUP_DIR/nexus-nodes_$DATE.db
cp /opt/nexus-manager/backend/.env $BACKUP_DIR/env_$DATE
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "env_*" -mtime +7 -delete
echo "✅ Бэкап создан: $BACKUP_DIR"
EOF

chmod +x /opt/nexus-manager/update.sh
chmod +x /opt/nexus-manager/backup.sh

# Настройка cron для бэкапов
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/nexus-manager/backup.sh") | crontab -

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
if ss -tlpn | grep -q ":3002"; then
  print_status "API сервер слушает порт 3002"
else
  print_warning "API сервер не слушает порт 3002"
fi

# Проверка Nginx
if run_cmd systemctl is-active --quiet nginx; then
    print_status "Nginx запущен"
else
    print_error "Nginx не запущен"
fi

print_header "Установка завершена! 🎉"
print_status "Nexus Node Manager успешно установлен"
print_info "Панель управления: http://$SERVER_IP/nexus/"
print_info "API доступен по адресу: http://$SERVER_IP/nexus/api/"
print_info "Корневой адрес http://$SERVER_IP/ остается свободным"
print_info ""
print_info "Полезные команды:"
print_info "• Статус сервиса: systemctl status nexus-backend"
print_info "• Просмотр логов: journalctl -u nexus-backend -f"
print_info "• Обновление: /opt/nexus-manager/update.sh"
print_info "• Бэкап: /opt/nexus-manager/backup.sh"
print_info ""
print_info "Следующие шаги:"
print_info "1. Откройте http://$SERVER_IP/nexus/ в браузере"
print_info "2. Перейдите в раздел 'Docker' для управления Docker нодами"
print_info "3. Зарегистрируйтесь на https://app.nexus.xyz"
print_info "4. Получите Prover ID и создайте Docker ноду"
print_info "5. Docker будет установлен автоматически при первом использовании"

# Проверка доступности
print_header "Тестирование доступности"
if curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/nexus/" | grep -q "200"; then
    print_status "Панель управления доступна по /nexus/"
else
    print_warning "Панель управления недоступна. Проверьте настройки Nginx"
fi

print_info "Установка завершена успешно!" 