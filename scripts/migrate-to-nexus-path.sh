#!/bin/bash

# Скрипт для миграции существующей установки Nexus Node Manager
# с корневого пути на /nexus/
# Использование: ./scripts/migrate-to-nexus-path.sh

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

print_header "Миграция Nexus Node Manager на путь /nexus/"

# Проверка что приложение установлено
if [ ! -d "/opt/nexus-node-manager" ]; then
    print_error "Nexus Node Manager не найден в /opt/nexus-node-manager"
    print_info "Этот скрипт предназначен для миграции существующей установки"
    exit 1
fi

# Проверка что сервис запущен
if ! systemctl is-active --quiet nexus-backend; then
    print_error "Сервис nexus-backend не запущен"
    print_info "Запустите сервис: systemctl start nexus-backend"
    exit 1
fi

print_info "Найдена установка Nexus Node Manager"
print_info "Сейчас приложение доступно по корневому пути"
print_info "После миграции будет доступно по /nexus/"
echo

read -p "Продолжить миграцию? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Миграция отменена"
    exit 0
fi

print_header "Остановка сервиса"
run_cmd systemctl stop nexus-backend
print_status "Сервис остановлен"

print_header "Обновление кода из репозитория"
cd /opt/nexus-node-manager
run_cmd git pull origin main
print_status "Код обновлен"

print_header "Обновление зависимостей"
# Backend
cd backend && npm install --production
print_status "Backend зависимости обновлены"

# Frontend
cd ../frontend && npm install && npm run build
print_status "Frontend пересобран с новыми настройками"

print_header "Обновление конфигурации Nginx"
# Получение IP сервера
SERVER_IP=$(ip route get 1.1.1.1 | awk '{print $7}' | head -1)
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

# Создание новой конфигурации Nginx
run_cmd tee /etc/nginx/sites-available/nexus-manager > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_IP _;
    
    # Редирект с корня на информационную страницу
    location = / {
        return 200 '<html><body><h1>Server Status: OK</h1><p>Nexus Node Manager: <a href="/nexus/">Access Panel</a></p></body></html>';
        add_header Content-Type text/html;
    }
    
    # Редирект с /nexus на /nexus/
    location = /nexus {
        return 301 \$scheme://\$server_name/nexus/;
    }
    
    # Nexus Node Manager приложение
    location /nexus/ {
        alias /opt/nexus-node-manager/frontend/build/;
        index index.html;
        
        # Gzip
        gzip on;
        gzip_types text/css application/javascript application/json;
        
        # Статические файлы React
        location /nexus/static/ {
            alias /opt/nexus-node-manager/frontend/build/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # React Router - все неизвестные пути направляем на index.html
        try_files \$uri \$uri/ /nexus/index.html;
    }
    
    # API endpoints
    location /nexus/api/ {
        rewrite ^/nexus/api/(.*) /api/\$1 break;
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
    location /nexus/ws {
        rewrite ^/nexus/ws(.*) /ws\$1 break;
        proxy_pass http://localhost:3001;
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

print_status "Конфигурация Nginx обновлена"

print_header "Перезапуск сервисов"
# Проверка конфигурации Nginx
if run_cmd nginx -t; then
    print_status "Конфигурация Nginx корректна"
else
    print_error "Ошибка в конфигурации Nginx"
    exit 1
fi

# Перезапуск Nginx
run_cmd systemctl restart nginx
print_status "Nginx перезапущен"

# Запуск сервиса
run_cmd systemctl start nexus-backend
print_status "Сервис запущен"

print_header "Проверка работоспособности"
sleep 5

# Проверка что сервис работает
if systemctl is-active --quiet nexus-backend; then
    print_status "Сервис работает"
else
    print_error "Сервис не запущен"
    exit 1
fi

# Проверка доступности
if curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/" | grep -q "200"; then
    print_status "Корневая страница доступна"
else
    print_warning "Корневая страница недоступна"
fi

if curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/nexus/" | grep -q "200"; then
    print_status "Панель управления доступна по /nexus/"
else
    print_warning "Панель управления недоступна"
fi

print_header "Миграция завершена! 🎉"
print_status "Nexus Node Manager теперь доступен по новому пути"
print_info ""
print_info "Новые адреса:"
print_info "• Панель управления: http://$SERVER_IP/nexus/"
print_info "• API: http://$SERVER_IP/nexus/api/"
print_info "• Корневая страница: http://$SERVER_IP/ (информация о сервере)"
print_info ""
print_info "Старые закладки автоматически не будут работать!"
print_info "Обновите закладки на новый адрес: http://$SERVER_IP/nexus/"
print_info ""
print_info "Для отката к старому пути используйте: ./scripts/revert-to-root-path.sh" 