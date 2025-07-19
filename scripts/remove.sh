#!/bin/bash

# Скрипт для полного удаления Nexus Node Manager
# 
# Использование: 
#   ./scripts/remove.sh        - Интерактивное удаление с подтверждением
#   ./scripts/remove.sh --force - Принудительное удаление без подтверждения
#   ./scripts/remove.sh -f      - Принудительное удаление (короткая форма)
#   ./scripts/remove.sh --quick - Быстрое удаление только основных папок
#   ./scripts/remove.sh -q      - Быстрое удаление (короткая форма)
#
# Что удаляется:
#   - Системный сервис nexus-backend
#   - Конфигурация Nginx
#   - Файлы проекта в /opt/nexus-manager
#   - Локальные копии проекта (во всех домашних папках)
#   - Правила firewall
#   - Резервные копии (опционально)
#   - Запущенные процессы

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

# Функция для удаления папки с проверкой force флага
remove_directory() {
    local dir="$1"
    local description="$2"
    local use_sudo="${3:-false}"
    
    if [ -d "$dir" ]; then
        if [ "$FORCE_REMOVE" = true ]; then
            if [ "$use_sudo" = true ]; then
                run_cmd rm -rf "$dir"
            else
                rm -rf "$dir"
            fi
            print_status "$description удалена: $dir"
            FOUND_LOCAL=true
        else
            echo
            print_info "Найдена $description: $dir"
            read -p "Удалить $description? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if [ "$use_sudo" = true ]; then
                    run_cmd rm -rf "$dir"
                else
                    rm -rf "$dir"
                fi
                print_status "$description удалена"
                FOUND_LOCAL=true
            else
                print_info "$description сохранена"
            fi
        fi
    fi
}

print_header "Удаление Nexus Node Manager"

# Проверка на флаг принудительного удаления
FORCE_REMOVE=false
QUICK_MODE=false
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    FORCE_REMOVE=true
    print_warning "Режим принудительного удаления активирован!"
elif [ "$1" = "--quick" ] || [ "$1" = "-q" ]; then
    QUICK_MODE=true
    print_info "Режим быстрого удаления активирован!"
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Nexus Node Manager - Скрипт удаления"
    echo ""
    echo "Использование:"
    echo "  ./scripts/remove.sh        - Интерактивное удаление с подтверждением"
    echo "  ./scripts/remove.sh --force - Принудительное удаление без подтверждения"
    echo "  ./scripts/remove.sh -f      - Принудительное удаление (короткая форма)"
    echo "  ./scripts/remove.sh --quick - Быстрое удаление только основных папок"
    echo "  ./scripts/remove.sh -q      - Быстрое удаление (короткая форма)"
    echo "  ./scripts/remove.sh --help  - Показать эту справку"
    echo ""
    echo "Что удаляется:"
    echo "  • Системный сервис nexus-backend"
    echo "  • Конфигурация Nginx"
    echo "  • Файлы проекта в /opt/nexus-manager"
    echo "  • Локальные копии проекта (во всех домашних папках)"
    echo "  • Правила firewall"
    echo "  • Резервные копии (опционально)"
    echo "  • Запущенные процессы"
    echo ""
    echo "Примеры:"
    echo "  ./scripts/remove.sh                    # Интерактивное удаление"
    echo "  ./scripts/remove.sh --force            # Удалить всё без вопросов"
    echo "  ./scripts/remove.sh --quick            # Быстро удалить только папки"
    echo ""
    exit 0
elif [ -n "$1" ]; then
    print_error "Неизвестный параметр: $1"
    print_info "Используйте --help для справки"
    exit 1
fi

if [ "$FORCE_REMOVE" = false ]; then
    print_warning "Это действие нельзя отменить!"
    print_info "Будут удалены:"
    print_info "- Системный сервис nexus-backend"
    print_info "- Конфигурация Nginx"
    print_info "- Файлы проекта в /opt/nexus-manager"
    print_info "- Локальные копии проекта"
    print_info "- Правила firewall"
    print_info "- Резервные копии (опционально)"
    echo

    read -p "Продолжить удаление? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Отменено пользователем"
        exit 0
    fi
else
    print_info "Принудительное удаление всех файлов..."
fi

# Режим быстрого удаления
if [ "$QUICK_MODE" = true ]; then
    print_header "Быстрое удаление основных папок"
    print_info "Удаление только основных папок проекта..."
    
    # Удаление основных папок
    run_cmd rm -rf /opt/nexus-manager ~/nexus-manager 2>/dev/null || true
    
    # Остановка сервиса (если есть)
    if systemctl is-active --quiet nexus-backend 2>/dev/null; then
        run_cmd systemctl stop nexus-backend
        print_status "Сервис остановлен"
    fi
    
    print_status "Основные папки удалены"
    print_info ""
    print_info "Для полного удаления (включая сервисы, nginx, firewall) используйте:"
    print_info "  ./scripts/remove.sh --force"
    print_info ""
    print_info "Вручную проверьте оставшиеся файлы:"
    print_info "  find / -name '*nexus*' -type d 2>/dev/null"
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

# Быстрое удаление основных папок
print_info "Удаление основных папок проекта..."
run_cmd rm -rf /opt/nexus-manager ~/nexus-manager 2>/dev/null || true
print_status "Основные папки проекта удалены"

# Дополнительная проверка и удаление
if [ -d "/opt/nexus-manager" ]; then
    run_cmd rm -rf /opt/nexus-manager
    print_status "Файлы проекта в /opt/nexus-manager удалены"
fi

if [ -d "/opt/nexus-manager" ]; then
    run_cmd rm -rf /opt/nexus-manager  
    print_status "Файлы проекта в /opt/nexus-manager удалены"
fi

# Поиск и удаление локальных копий проекта
print_header "Поиск локальных копий проекта"
FOUND_LOCAL=false

# Проверка текущей директории
remove_directory "$(pwd)/nexus-node-manager" "локальная копия" false

# Проверка если скрипт запущен из папки проекта
if [[ "$(pwd)" == *"nexus-node-manager"* ]] || [[ "$(pwd)" == *"nexus-manager"* ]]; then
    if [ "$FORCE_REMOVE" = true ]; then
        PROJECT_DIR="$(pwd)"
        cd ..
        rm -rf "$PROJECT_DIR"
        print_status "Папка проекта удалена: $PROJECT_DIR"
        print_info "Текущая директория: $(pwd)"
        FOUND_LOCAL=true
    else
        echo
        print_warning "Скрипт запущен из папки проекта!"
        print_info "Текущая директория: $(pwd)"
        read -p "Удалить всю папку проекта? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            PROJECT_DIR="$(pwd)"
            cd ..
            rm -rf "$PROJECT_DIR"
            print_status "Папка проекта удалена: $PROJECT_DIR"
            print_info "Текущая директория: $(pwd)"
            FOUND_LOCAL=true
        else
            print_info "Папка проекта сохранена"
        fi
    fi
fi

# Поиск в домашних папках
for home_dir in /home/*; do
    if [ -d "$home_dir" ]; then
        remove_directory "$home_dir/nexus-node-manager" "копия" false
        remove_directory "$home_dir/nexus-manager" "копия" false
    fi
done

# Поиск в /root
remove_directory "/root/nexus-node-manager" "копия в /root" true
remove_directory "/root/nexus-manager" "копия в /root" true

if [ "$FOUND_LOCAL" = false ]; then
    print_info "Локальные копии не найдены"
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
    if [ "$FORCE_REMOVE" = true ]; then
        run_cmd rm -rf /opt/backups/nexus-manager*
        print_status "Резервные копии удалены принудительно"
    else
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

# Проверка системных файлов
if [ -f "/etc/systemd/system/nexus-backend.service" ]; then
    REMAINING_FILES+=("/etc/systemd/system/nexus-backend.service")
fi

if [ -f "/etc/nginx/sites-available/nexus-manager" ]; then
    REMAINING_FILES+=("/etc/nginx/sites-available/nexus-manager")
fi

if [ -L "/etc/nginx/sites-enabled/nexus-manager" ]; then
    REMAINING_FILES+=("/etc/nginx/sites-enabled/nexus-manager")
fi

# Проверка файлов проекта
if [ -d "/opt/nexus-node-manager" ]; then
    REMAINING_FILES+=("/opt/nexus-node-manager")
fi

if [ -d "/opt/nexus-manager" ]; then
    REMAINING_FILES+=("/opt/nexus-manager")
fi

# Проверка локальных копий
if [ -d "$(pwd)/nexus-node-manager" ]; then
    REMAINING_FILES+=("$(pwd)/nexus-node-manager")
fi

if [ -d "$(pwd)/nexus-manager" ]; then
    REMAINING_FILES+=("$(pwd)/nexus-manager")
fi

# Проверка в домашних папках
for home_dir in /home/*; do
    if [ -d "$home_dir/nexus-node-manager" ]; then
        REMAINING_FILES+=("$home_dir/nexus-node-manager")
    fi
    if [ -d "$home_dir/nexus-manager" ]; then
        REMAINING_FILES+=("$home_dir/nexus-manager")
    fi
done

# Проверка в /root
if [ -d "/root/nexus-node-manager" ]; then
    REMAINING_FILES+=("/root/nexus-node-manager")
fi

if [ -d "/root/nexus-manager" ]; then
    REMAINING_FILES+=("/root/nexus-manager")
fi

# Проверка резервных копий
if [ -d "/opt/backups" ] && [ "$(ls -A /opt/backups/nexus-manager* 2>/dev/null)" ]; then
    REMAINING_FILES+=("/opt/backups/nexus-manager* (backup files)")
fi

if [ ${#REMAINING_FILES[@]} -gt 0 ]; then
    print_warning "Некоторые файлы не были удалены:"
    for file in "${REMAINING_FILES[@]}"; do
        echo "  - $file"
    done
    echo
    if [ "$FORCE_REMOVE" = false ]; then
        print_info "Для принудительного удаления всех файлов выполните:"
        echo "  ./scripts/remove.sh --force"
        echo ""
        print_info "Или удалите файлы вручную:"
        for file in "${REMAINING_FILES[@]}"; do
            if [[ "$file" == *"backup files"* ]]; then
                echo "  sudo rm -rf /opt/backups/nexus-manager*"
            else
                echo "  sudo rm -rf \"$file\""
            fi
        done
    else
        print_warning "Не удалось удалить некоторые файлы даже в принудительном режиме"
        print_info "Возможно, файлы используются процессами или нет прав доступа"
    fi
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
print_info "Полезные команды:"
print_info "• Принудительное удаление всех файлов: ./scripts/remove.sh --force"
print_info "• Быстрое удаление основных папок: ./scripts/remove.sh --quick"
print_info "• Прямая команда удаления: sudo rm -rf /opt/nexus-*manager ~/nexus-*manager"
print_info "• Проверка оставшихся файлов: find / -name '*nexus*' -type d 2>/dev/null"
print_info ""
print_info "Для технической поддержки: https://github.com/Sharkman96/nexus-manager/issues" 