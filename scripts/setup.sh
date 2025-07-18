#!/bin/bash

echo "🚀 Setting up Nexus Node Manager..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода цветного текста
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Проверка Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version must be 16 or higher. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js version: $(node --version)"

# Установка зависимостей backend
echo -e "\n📦 Installing backend dependencies..."
cd backend
if npm install; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Установка дополнительных зависимостей для Tailwind
echo -e "\n📦 Installing Tailwind CSS dependencies..."
cd ../frontend
if npm install @tailwindcss/forms @tailwindcss/typography @tailwindcss/aspect-ratio; then
    print_status "Tailwind CSS plugins installed"
else
    print_warning "Failed to install Tailwind CSS plugins (optional)"
fi

# Установка зависимостей frontend
echo -e "\n📦 Installing frontend dependencies..."
if npm install; then
    print_status "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Создание папок для логов и базы данных
echo -e "\n📁 Creating necessary directories..."
cd ..
mkdir -p backend/logs
mkdir -p database
print_status "Directories created"

# Инициализация базы данных
echo -e "\n🗄️  Initializing database..."
cd backend
if npm run db:migrate; then
    print_status "Database initialized"
else
    print_error "Failed to initialize database"
    exit 1
fi

# Проверка Nexus CLI (опционально)
echo -e "\n🔍 Checking Nexus CLI..."
if command -v nexus-cli &> /dev/null; then
    print_status "Nexus CLI is installed: $(nexus-cli --version)"
else
    print_warning "Nexus CLI is not installed"
    echo -e "To install Nexus CLI, run: ${YELLOW}curl https://cli.nexus.xyz/ | sh${NC}"
fi

# Проверка Docker (опционально)
echo -e "\n🐳 Checking Docker..."
if command -v docker &> /dev/null; then
    print_status "Docker is installed: $(docker --version)"
else
    print_warning "Docker is not installed (optional for Nexus CLI)"
fi

echo -e "\n🎉 Setup complete!"
echo -e "\n📖 Next steps:"
echo -e "1. Start the backend server: ${GREEN}cd backend && npm start${NC}"
echo -e "2. Start the frontend server: ${GREEN}cd frontend && npm start${NC}"
echo -e "3. Open http://localhost:3000 in your browser"
echo -e "4. Install Nexus CLI if not already installed"
echo -e "5. Get your Prover ID from https://app.nexus.xyz"

echo -e "\n🔧 Development commands:"
echo -e "Backend dev server: ${GREEN}cd backend && npm run dev${NC}"
echo -e "Database reset: ${GREEN}cd backend && npm run db:migrate reset${NC}"
echo -e "View logs: ${GREEN}tail -f backend/logs/nexus-manager.log${NC}" 