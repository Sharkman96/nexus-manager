#!/bin/bash

# Диагностика Nexus Node Manager
# Использование: bash scripts/diagnose.sh

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

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}==== $1 ====${NC}"
}

print_header "Диагностика Nexus Node Manager"

# 1. Проверка статуса сервиса
print_header "1. Статус сервиса"
if systemctl is-active --quiet nexus-backend; then
    print_status "Сервис nexus-backend запущен"
    systemctl status nexus-backend --no-pager -l
else
    print_error "Сервис nexus-backend не запущен"
    print_info "Попытка запуска..."
    systemctl start nexus-backend
    sleep 3
    if systemctl is-active --quiet nexus-backend; then
        print_status "Сервис успешно запущен"
    else
        print_error "Не удалось запустить сервис"
        print_info "Просмотр логов:"
        journalctl -u nexus-backend --no-pager -l -n 20
    fi
fi

# 2. Проверка портов
print_header "2. Проверка портов"
echo "Проверка порта 3002 (API сервер):"
if ss -tlpn | grep -q ":3002"; then
    print_status "Порт 3002 слушается"
    ss -tlpn | grep ":3002"
else
    print_warning "Порт 3002 не слушается"
fi

echo -e "\nПроверка порта 80 (Nginx):"
if ss -tlpn | grep -q ":80"; then
    print_status "Порт 80 слушается"
    ss -tlpn | grep ":80"
else
    print_warning "Порт 80 не слушается"
fi

# 3. Проверка Nginx
print_header "3. Статус Nginx"
if systemctl is-active --quiet nginx; then
    print_status "Nginx запущен"
    nginx -t
else
    print_error "Nginx не запущен"
    print_info "Попытка запуска..."
    systemctl start nginx
fi

# 4. Проверка конфигурации Nginx
print_header "4. Конфигурация Nginx"
if [ -f "/etc/nginx/sites-enabled/nexus-manager" ]; then
    print_status "Конфигурация nexus-manager найдена"
    echo "Содержимое конфигурации:"
    cat /etc/nginx/sites-enabled/nexus-manager
else
    print_error "Конфигурация nexus-manager не найдена"
fi

# 5. Проверка файлов приложения
print_header "5. Файлы приложения"
if [ -d "/opt/nexus-manager" ]; then
    print_status "Директория приложения найдена"
    ls -la /opt/nexus-manager/
else
    print_error "Директория приложения не найдена"
fi

if [ -d "/var/www/nexus-manager" ]; then
    print_status "Frontend файлы найдены"
    ls -la /var/www/nexus-manager/
else
    print_error "Frontend файлы не найдены"
fi

# 6. Проверка .env файла
print_header "6. Конфигурация"
if [ -f "/opt/nexus-manager/backend/.env" ]; then
    print_status ".env файл найден"
    echo "Содержимое .env:"
    cat /opt/nexus-manager/backend/.env
else
    print_error ".env файл не найден"
fi

# 7. Проверка базы данных
print_header "7. База данных"
if [ -f "/opt/nexus-manager/database/nexus-nodes.db" ]; then
    print_status "База данных найдена"
    ls -la /opt/nexus-manager/database/
else
    print_error "База данных не найдена"
fi

# 8. Проверка логов
print_header "8. Логи"
echo "Последние логи сервиса:"
journalctl -u nexus-backend --no-pager -l -n 10

echo -e "\nЛоги Nginx:"
tail -n 10 /var/log/nginx/error.log 2>/dev/null || print_warning "Логи Nginx недоступны"

# 9. Проверка сетевого доступа
print_header "9. Сетевой доступ"
SERVER_IP=$(ip route get 1.1.1.1 | awk '{print $7}' | head -1)
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

echo "IP сервера: $SERVER_IP"
echo "Проверка доступности API:"
if curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/nexus/api/" | grep -q "200"; then
    print_status "API доступен"
else
    print_warning "API недоступен"
    print_info "Попытка прямого доступа к порту 3002:"
    curl -s -o /dev/null -w "%{http_code}" "http://localhost:3002/api/" || print_error "Прямой доступ к API недоступен"
fi

echo "Проверка доступности frontend:"
if curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/nexus/" | grep -q "200"; then
    print_status "Frontend доступен"
else
    print_warning "Frontend недоступен"
fi

# 10. Проверка firewall
print_header "10. Firewall"
if ufw status | grep -q "Status: active"; then
    print_status "Firewall активен"
    ufw status
else
    print_warning "Firewall неактивен"
fi

print_header "Диагностика завершена"
print_info "Если проблемы остаются, проверьте:"
print_info "1. Логи сервиса: journalctl -u nexus-backend -f"
print_info "2. Логи Nginx: tail -f /var/log/nginx/error.log"
print_info "3. Перезапуск сервиса: systemctl restart nexus-backend"
print_info "4. Перезапуск Nginx: systemctl restart nginx" 