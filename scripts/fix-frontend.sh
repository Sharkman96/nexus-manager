#!/bin/bash

# Быстрое исправление frontend для Nexus Node Manager
# Использование: bash fix-frontend.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_header "Исправление Frontend"

# Проверяем наличие frontend директории
if [ ! -d "/opt/nexus-manager/frontend" ]; then
    print_error "Frontend директория не найдена"
    print_info "Убедитесь, что проект установлен в /opt/nexus-manager"
    exit 1
fi

print_header "1. Очистка и пересборка frontend"
print_info "Переходим в frontend директорию..."
cd /opt/nexus-manager/frontend

print_info "Удаляем старые node_modules и package-lock.json..."
rm -rf node_modules package-lock.json

print_info "Устанавливаем зависимости..."
npm install --legacy-peer-deps --force

print_info "Собираем frontend..."
npm run build

if [ -f "build/index.html" ]; then
    print_status "Frontend успешно собран"
else
    print_error "Ошибка при сборке frontend"
    exit 1
fi

print_header "2. Копирование файлов в веб-директорию"
print_info "Создаем веб-директорию..."
mkdir -p /var/www/nexus-manager

print_info "Копируем файлы..."
cp -r build/* /var/www/nexus-manager/

print_info "Устанавливаем права доступа..."
chown -R www-data:www-data /var/www/nexus-manager/
chmod -R 755 /var/www/nexus-manager/

print_status "Файлы скопированы и права установлены"

print_header "3. Проверка файлов"
print_info "Содержимое веб-директории:"
ls -la /var/www/nexus-manager/

if [ -f "/var/www/nexus-manager/index.html" ]; then
    print_status "index.html найден"
else
    print_error "index.html не найден"
    exit 1
fi

print_header "4. Перезапуск Nginx"
print_info "Проверяем конфигурацию Nginx..."
if nginx -t; then
    print_status "Конфигурация Nginx корректна"
    
    print_info "Перезапускаем Nginx..."
    systemctl restart nginx
    
    if systemctl is-active --quiet nginx; then
        print_status "Nginx перезапущен"
    else
        print_error "Ошибка при перезапуске Nginx"
        systemctl status nginx
    fi
else
    print_error "Ошибка в конфигурации Nginx"
    nginx -t
    exit 1
fi

print_header "5. Тестирование доступности"
SERVER_IP=$(ip route get 1.1.1.1 | awk '{print $7}' | head -1)
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

print_info "Тестируем доступность: http://$SERVER_IP/nexus/"

# Ждем немного для стабилизации
sleep 2

# Тестируем с curl
if command -v curl &> /dev/null; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/nexus/" 2>/dev/null || echo "000")
    if [ "$RESPONSE" = "200" ]; then
        print_status "✅ Сайт доступен (HTTP 200)"
        print_info "Frontend успешно исправлен!"
    elif [ "$RESPONSE" = "404" ]; then
        print_error "❌ Сайт возвращает 404 - файлы не найдены"
        print_info "Проверьте конфигурацию Nginx"
    else
        print_warning "⚠️ Сайт недоступен (HTTP $RESPONSE)"
        print_info "Проверьте логи Nginx: journalctl -u nginx"
    fi
else
    print_warning "curl не установлен, пропускаем тест"
    print_info "Проверьте вручную: http://$SERVER_IP/nexus/"
fi

print_header "Исправление завершено"
print_info "Если проблемы остались, запустите диагностику:"
print_info "bash scripts/diagnose-frontend.sh" 