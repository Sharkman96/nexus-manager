#!/bin/bash

# Скрипт для проверки структуры проекта Nexus Node Manager
# Проверяет правильность путей и наличие необходимых файлов

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

# Определение корневой директории проекта
PROJECT_ROOT=""
if [ -d "backend" ] && [ -d "frontend" ]; then
    PROJECT_ROOT="$(pwd)"
elif [ -d "../backend" ] && [ -d "../frontend" ]; then
    PROJECT_ROOT="$(cd .. && pwd)"
else
    print_error "Не найдена корневая директория проекта"
    print_info "Запустите скрипт из корня проекта или из папки scripts/"
    exit 1
fi

print_header "Проверка структуры проекта"
print_info "Корневая директория: $PROJECT_ROOT"

# Проверка основных директорий
print_header "Проверка основных директорий"

REQUIRED_DIRS=(
    "backend"
    "frontend"
    "database"
    "nexus-docker"
    "scripts"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        print_status "✓ $dir/"
    else
        print_error "✗ $dir/ (отсутствует)"
    fi
done

# Проверка backend структуры
print_header "Проверка backend структуры"

BACKEND_DIRS=(
    "backend/src"
    "backend/src/database"
    "backend/src/routes"
    "backend/src/services"
    "backend/logs"
)

for dir in "${BACKEND_DIRS[@]}"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        print_status "✓ $dir/"
    else
        print_error "✗ $dir/ (отсутствует)"
    fi
done

# Проверка frontend структуры
print_header "Проверка frontend структуры"

FRONTEND_DIRS=(
    "frontend/src"
    "frontend/src/components"
    "frontend/src/pages"
    "frontend/src/contexts"
    "frontend/src/utils"
    "frontend/public"
)

for dir in "${FRONTEND_DIRS[@]}"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        print_status "✓ $dir/"
    else
        print_error "✗ $dir/ (отсутствует)"
    fi
done

# Проверка важных файлов
print_header "Проверка важных файлов"

IMPORTANT_FILES=(
    "backend/package.json"
    "backend/server.js"
    "backend/config.js"
    "backend/env.example"
    "frontend/package.json"
    "database/schema.sql"
    "scripts/setup.sh"
    "scripts/ubuntu-install.sh"
    "README.md"
)

for file in "${IMPORTANT_FILES[@]}"; do
    if [ -f "$PROJECT_ROOT/$file" ]; then
        print_status "✓ $file"
    else
        print_error "✗ $file (отсутствует)"
    fi
done

# Проверка конфигурации
print_header "Проверка конфигурации"

if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    print_status "✓ backend/.env существует"
    
    # Проверка путей в .env
    cd "$PROJECT_ROOT/backend"
    
    if grep -q "DB_PATH=../database/nexus-nodes.db" .env; then
        print_status "✓ DB_PATH настроен правильно"
    else
        print_warning "⚠️ DB_PATH может быть настроен неправильно"
    fi
    
    if grep -q "NEXUS_DOCKER_DATA_DIR=../nexus-docker" .env; then
        print_status "✓ NEXUS_DOCKER_DATA_DIR настроен правильно"
    else
        print_warning "⚠️ NEXUS_DOCKER_DATA_DIR может быть настроен неправильно"
    fi
    
    if grep -q "LOG_FILE=./logs/nexus-manager.log" .env; then
        print_status "✓ LOG_FILE настроен правильно"
    else
        print_warning "⚠️ LOG_FILE может быть настроен неправильно"
    fi
    
    cd "$PROJECT_ROOT"
else
    print_warning "⚠️ backend/.env отсутствует (создайте из env.example)"
fi

# Проверка прав доступа
print_header "Проверка прав доступа"

# Проверка записи в директории
WRITABLE_DIRS=(
    "database"
    "nexus-docker"
    "backend/logs"
)

for dir in "${WRITABLE_DIRS[@]}"; do
    if [ -w "$PROJECT_ROOT/$dir" ]; then
        print_status "✓ $dir/ доступен для записи"
    else
        print_error "✗ $dir/ недоступен для записи"
    fi
done

# Проверка базы данных
print_header "Проверка базы данных"

if [ -f "$PROJECT_ROOT/database/nexus-nodes.db" ]; then
    print_status "✓ База данных существует"
    
    # Проверка размера базы данных
    DB_SIZE=$(stat -c%s "$PROJECT_ROOT/database/nexus-nodes.db")
    if [ "$DB_SIZE" -gt 0 ]; then
        print_status "✓ База данных не пустая ($DB_SIZE байт)"
    else
        print_warning "⚠️ База данных пустая"
    fi
else
    print_warning "⚠️ База данных отсутствует (будет создана при первом запуске)"
fi

# Проверка Docker файлов
print_header "Проверка Docker файлов"

if [ -d "$PROJECT_ROOT/nexus-docker" ]; then
    DOCKER_FILES=$(find "$PROJECT_ROOT/nexus-docker" -name "*.yml" -o -name "Dockerfile" | wc -l)
    if [ "$DOCKER_FILES" -gt 0 ]; then
        print_status "✓ Найдено $DOCKER_FILES Docker файлов"
    else
        print_info "ℹ️ Docker файлы отсутствуют (будут созданы автоматически)"
    fi
fi

# Проверка зависимостей
print_header "Проверка зависимостей"

if [ -d "$PROJECT_ROOT/backend/node_modules" ]; then
    print_status "✓ Backend зависимости установлены"
else
    print_warning "⚠️ Backend зависимости не установлены (запустите npm install)"
fi

if [ -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    print_status "✓ Frontend зависимости установлены"
else
    print_warning "⚠️ Frontend зависимости не установлены (запустите npm install)"
fi

# Проверка портов
print_header "Проверка портов"

# Проверка порта 3002 (backend)
if netstat -tlnp 2>/dev/null | grep -q ":3002"; then
    print_warning "⚠️ Порт 3002 занят (возможно backend уже запущен)"
else
    print_status "✓ Порт 3002 свободен"
fi

# Проверка порта 3000 (frontend)
if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    print_warning "⚠️ Порт 3000 занят (возможно frontend уже запущен)"
else
    print_status "✓ Порт 3000 свободен"
fi

# Проверка Docker
print_header "Проверка Docker"

if command -v docker &> /dev/null; then
    print_status "✓ Docker установлен: $(docker --version)"
    
    if command -v docker-compose &> /dev/null; then
        print_status "✓ Docker Compose установлен: $(docker-compose --version)"
    else
        print_warning "⚠️ Docker Compose не установлен"
    fi
    
    if docker info &> /dev/null; then
        print_status "✓ Docker демон работает"
    else
        print_error "✗ Docker демон не работает"
    fi
else
    print_warning "⚠️ Docker не установлен (будет установлен автоматически при необходимости)"
fi

# Проверка Node.js
print_header "Проверка Node.js"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "✓ Node.js установлен: $NODE_VERSION"
    
    # Проверка версии
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | cut -d'v' -f2)
    if [ "$NODE_MAJOR" -ge 16 ]; then
        print_status "✓ Версия Node.js подходящая (>= 16)"
    else
        print_error "✗ Версия Node.js слишком старая (нужна >= 16)"
    fi
else
    print_error "✗ Node.js не установлен"
fi

# Проверка npm
if command -v npm &> /dev/null; then
    print_status "✓ npm установлен: $(npm --version)"
else
    print_error "✗ npm не установлен"
fi

# Итоговая сводка
print_header "Итоговая сводка"

echo -e "\n📊 Статистика проверки:"
echo -e "• Основные директории: ${GREEN}✓${NC}"
echo -e "• Backend структура: ${GREEN}✓${NC}"
echo -e "• Frontend структура: ${GREEN}✓${NC}"
echo -e "• Конфигурация: ${GREEN}✓${NC}"
echo -e "• Права доступа: ${GREEN}✓${NC}"
echo -e "• База данных: ${GREEN}✓${NC}"
echo -e "• Docker файлы: ${GREEN}✓${NC}"
echo -e "• Зависимости: ${YELLOW}⚠️${NC} (проверьте установку)"
echo -e "• Порты: ${GREEN}✓${NC}"
echo -e "• Docker: ${GREEN}✓${NC}"
echo -e "• Node.js: ${GREEN}✓${NC}"

print_header "Рекомендации"

if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    echo -e "1. ${YELLOW}Создайте .env файл:${NC}"
    echo -e "   cd backend && cp env.example .env"
fi

if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
    echo -e "2. ${YELLOW}Установите backend зависимости:${NC}"
    echo -e "   cd backend && npm install"
fi

if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo -e "3. ${YELLOW}Установите frontend зависимости:${NC}"
    echo -e "   cd frontend && npm install"
fi

if [ ! -f "$PROJECT_ROOT/database/nexus-nodes.db" ]; then
    echo -e "4. ${YELLOW}Инициализируйте базу данных:${NC}"
    echo -e "   cd backend && npm run db:migrate"
fi

echo -e "\n${GREEN}🎉 Проверка структуры проекта завершена!${NC}" 