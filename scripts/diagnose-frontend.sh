#!/bin/bash

# Диагностика frontend и Nginx для Nexus Node Manager
# Использование: bash diagnose-frontend.sh

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

print_header "Диагностика Frontend и Nginx"

print_header "1. Проверка frontend файлов"
print_info "Проверяем наличие frontend файлов..."

if [ -d "/opt/nexus-manager/frontend" ]; then
    print_status "Frontend директория найдена"
    ls -la /opt/nexus-manager/frontend/
    
    if [ -d "/opt/nexus-manager/frontend/build" ]; then
        print_status "Build директория найдена"
        ls -la /opt/nexus-manager/frontend/build/
        
        if [ -f "/opt/nexus-manager/frontend/build/index.html" ]; then
            print_status "index.html найден"
        else
            print_error "index.html не найден в build директории"
        fi
    else
        print_error "Build директория не найдена"
        print_info "Frontend не собран. Запустите:"
        print_info "cd /opt/nexus-manager/frontend && npm run build"
    fi
else
    print_error "Frontend директория не найдена"
fi

print_header "2. Проверка файлов в /var/www/nexus-manager"
print_info "Проверяем файлы в веб-директории..."

if [ -d "/var/www/nexus-manager" ]; then
    print_status "Веб-директория найдена"
    ls -la /var/www/nexus-manager/
    
    if [ -f "/var/www/nexus-manager/index.html" ]; then
        print_status "index.html найден в веб-директории"
    else
        print_error "index.html не найден в веб-директории"
        print_info "Файлы не скопированы. Запустите:"
        print_info "cp -r /opt/nexus-manager/frontend/build/* /var/www/nexus-manager/"
    fi
else
    print_error "Веб-директория не найдена"
    print_info "Создайте директорию:"
    print_info "mkdir -p /var/www/nexus-manager"
fi

print_header "3. Проверка прав доступа"
print_info "Проверяем права доступа к веб-директории..."

if [ -d "/var/www/nexus-manager" ]; then
    print_info "Права доступа к /var/www/nexus-manager:"
    ls -ld /var/www/nexus-manager/
    
    print_info "Права доступа к файлам:"
    ls -la /var/www/nexus-manager/ | head -10
    
    # Проверяем владельца
    OWNER=$(stat -c '%U' /var/www/nexus-manager)
    if [ "$OWNER" = "www-data" ]; then
        print_status "Права доступа корректны (www-data)"
    else
        print_warning "Владелец: $OWNER (ожидается www-data)"
        print_info "Исправьте права:"
        print_info "chown -R www-data:www-data /var/www/nexus-manager/"
    fi
fi

print_header "4. Проверка Nginx конфигурации"
print_info "Проверяем Nginx конфигурацию..."

if [ -f "/etc/nginx/sites-available/nexus-manager" ]; then
    print_status "Конфигурация Nginx найдена"
    
    print_info "Содержимое конфигурации:"
    cat /etc/nginx/sites-available/nexus-manager
    
    # Проверяем синтаксис
    if nginx -t 2>/dev/null; then
        print_status "Синтаксис Nginx корректен"
    else
        print_error "Ошибка в синтаксисе Nginx"
        nginx -t
    fi
else
    print_error "Конфигурация Nginx не найдена"
fi

print_header "5. Проверка статуса Nginx"
print_info "Проверяем статус Nginx..."

if systemctl is-active --quiet nginx; then
    print_status "Nginx запущен"
    
    # Проверяем порты
    if netstat -tlnp 2>/dev/null | grep :80 > /dev/null; then
        print_status "Nginx слушает на порту 80"
    else
        print_error "Nginx не слушает на порту 80"
    fi
else
    print_error "Nginx не запущен"
    print_info "Запустите: systemctl start nginx"
fi

print_header "6. Проверка доступности сайта"
print_info "Проверяем доступность сайта..."

SERVER_IP=$(ip route get 1.1.1.1 | awk '{print $7}' | head -1)
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

print_info "Тестируем доступность: http://$SERVER_IP/nexus/"

# Тестируем с curl
if command -v curl &> /dev/null; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/nexus/" 2>/dev/null || echo "000")
    if [ "$RESPONSE" = "200" ]; then
        print_status "Сайт доступен (HTTP 200)"
    elif [ "$RESPONSE" = "404" ]; then
        print_error "Сайт возвращает 404 - файлы не найдены"
    else
        print_warning "Сайт недоступен (HTTP $RESPONSE)"
    fi
else
    print_warning "curl не установлен, пропускаем тест доступности"
fi

print_header "7. Рекомендации по исправлению"

if [ ! -f "/var/www/nexus-manager/index.html" ]; then
    print_info "Для исправления выполните:"
    print_info "1. Соберите frontend:"
    print_info "   cd /opt/nexus-manager/frontend && npm run build"
    print_info "2. Скопируйте файлы:"
    print_info "   cp -r /opt/nexus-manager/frontend/build/* /var/www/nexus-manager/"
    print_info "3. Установите права:"
    print_info "   chown -R www-data:www-data /var/www/nexus-manager/"
    print_info "   chmod -R 755 /var/www/nexus-manager/"
    print_info "4. Перезапустите Nginx:"
    print_info "   systemctl restart nginx"
fi

print_header "Диагностика завершена" 