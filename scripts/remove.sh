#!/bin/bash

# Скрипт для полного удаления Nexus Node Manager
# Использование: ./scripts/remove.sh

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

print_header "Удаление Nexus Node Manager"
print_warning "Это действие нельзя отменить!"
print_info "Будут удалены:"
print_info "- Системный сервис nexus-backend"
print_info "- Конфигурация Nginx"
print_info "- Файлы проекта в /opt/nexus-node-manager"
print_info "- Правила firewall"
print_info "- Резервные копии (опционально)"
echo

read -p "Продолжить удаление? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Отменено пользователем"
    exit 0
fi

print_header "Остановка сервиса"
# Остановка и отключение сервиса
if systemctl is-active --quiet nexus-backend 2>/dev/null; then
    run_cmd systemctl stop nexus-backend
    print_status "Сервис остановлен"
else
    print_info "Сервис уже остановлен"
fi

if systemctl is-enabled --quiet nexus-backend 2>/dev/null; then
    run_cmd systemctl disable nexus-backend
    print_status "Автозапуск сервиса отключен"
else
    print_info "Автозапуск сервиса уже отключен"
fi

print_header "Удаление файлов сервиса"
# Удаление файла сервиса
if [ -f "/etc/systemd/system/nexus-backend.service" ]; then
    run_cmd rm /etc/systemd/system/nexus-backend.service
    print_status "Файл сервиса удален"
else
    print_info "Файл сервиса не найден"
fi

print_header "Удаление конфигурации Nginx"
# Удаление конфигурации Nginx
if [ -f "/etc/nginx/sites-available/nexus-manager" ]; then
    run_cmd rm /etc/nginx/sites-available/nexus-manager
    print_status "Конфигурация Nginx удалена"
else
    print_info "Конфигурация Nginx не найдена"
fi

if [ -L "/etc/nginx/sites-enabled/nexus-manager" ]; then
    run_cmd rm /etc/nginx/sites-enabled/nexus-manager
    print_status "Символическая ссылка Nginx удалена"
else
    print_info "Символическая ссылка Nginx не найдена"
fi

print_header "Удаление файлов проекта"
# Удаление файлов проекта
if [ -d "/opt/nexus-node-manager" ]; then
    run_cmd rm -rf /opt/nexus-node-manager
    print_status "Файлы проекта удалены"
else
    print_info "Файлы проекта не найдены"
fi

print_header "Удаление правил firewall"
# Удаление правил firewall
if ufw status | grep -q "3001"; then
    run_cmd ufw delete allow 3001 2>/dev/null || true
    print_status "Правило firewall для порта 3001 удалено"
else
    print_info "Правило firewall для порта 3001 не найдено"
fi

if ufw status | grep -q "Nginx HTTP"; then
    run_cmd ufw delete allow 'Nginx HTTP' 2>/dev/null || true
    print_status "Правило firewall для Nginx HTTP удалено"
else
    print_info "Правило firewall для Nginx HTTP не найдено"
fi

print_header "Перезагрузка системных сервисов"
# Перезагрузка systemd
run_cmd systemctl daemon-reload
print_status "systemd перезагружен"

# Проверка и перезагрузка nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    if run_cmd nginx -t 2>/dev/null; then
        run_cmd systemctl restart nginx
        print_status "Nginx перезагружен"
    else
        print_warning "Ошибка в конфигурации Nginx"
    fi
else
    print_info "Nginx не запущен"
fi

print_header "Удаление резервных копий"
# Опциональное удаление резервных копий
if [ -d "/opt/backups" ] && [ "$(ls -A /opt/backups/nexus-manager* 2>/dev/null)" ]; then
    echo
    print_info "Найдены резервные копии в /opt/backups/"
    ls -la /opt/backups/nexus-manager* 2>/dev/null || true
    echo
    read -p "Удалить резервные копии? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_cmd rm -rf /opt/backups/nexus-manager*
        print_status "Резервные копии удалены"
    else
        print_info "Резервные копии сохранены"
    fi
else
    print_info "Резервные копии не найдены"
fi

print_header "Очистка системы"
# Очистка процессов
NEXUS_PIDS=$(pgrep -f "node.*nexus" 2>/dev/null || true)
if [ -n "$NEXUS_PIDS" ]; then
    print_info "Завершение процессов Nexus..."
    kill $NEXUS_PIDS 2>/dev/null || true
    sleep 2
    # Принудительное завершение если процессы все еще работают
    NEXUS_PIDS=$(pgrep -f "node.*nexus" 2>/dev/null || true)
    if [ -n "$NEXUS_PIDS" ]; then
        kill -9 $NEXUS_PIDS 2>/dev/null || true
        print_status "Процессы Nexus завершены принудительно"
    else
        print_status "Процессы Nexus завершены"
    fi
else
    print_info "Процессы Nexus не найдены"
fi

print_header "Проверка удаления"
# Проверка что все удалено
REMAINING_FILES=()

if [ -f "/etc/systemd/system/nexus-backend.service" ]; then
    REMAINING_FILES+=("/etc/systemd/system/nexus-backend.service")
fi

if [ -f "/etc/nginx/sites-available/nexus-manager" ]; then
    REMAINING_FILES+=("/etc/nginx/sites-available/nexus-manager")
fi

if [ -L "/etc/nginx/sites-enabled/nexus-manager" ]; then
    REMAINING_FILES+=("/etc/nginx/sites-enabled/nexus-manager")
fi

if [ -d "/opt/nexus-node-manager" ]; then
    REMAINING_FILES+=("/opt/nexus-node-manager")
fi

if [ ${#REMAINING_FILES[@]} -gt 0 ]; then
    print_warning "Некоторые файлы не были удалены:"
    for file in "${REMAINING_FILES[@]}"; do
        echo "  - $file"
    done
else
    print_status "Все файлы удалены успешно"
fi

print_header "Удаление завершено! 🎉"
print_status "Nexus Node Manager полностью удален с сервера"
print_info ""
print_info "Если вы хотите установить заново:"
print_info "1. Клонируйте репозиторий: git clone https://github.com/Sharkman96/nexus-manager.git"
print_info "2. Запустите установку: ./scripts/ubuntu-install.sh"
print_info ""
print_info "Для технической поддержки: https://github.com/Sharkman96/nexus-manager/issues" 