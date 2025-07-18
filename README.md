# Nexus Node Manager

Приложение для управления вычислительными узлами (prover nodes) в сети Nexus с мониторингом производительности.

## Функциональность

- **Управление узлами**: Запуск, остановка, настройка узлов через Nexus CLI
- **Мониторинг производительности**: Отслеживание NEX Points, выполненных задач, системных ресурсов
- **Дашборд**: Интерактивные графики и метрики в реальном времени
- **Уведомления**: Оповещения о сбоях и изменениях статуса
- **Аналитика**: Исторические данные и тренды производительности

## Архитектура

```
nexus/
├── backend/          # Node.js + Express API
├── frontend/         # React веб-интерфейс  
├── database/         # SQLite схема
└── scripts/          # Утилиты установки
```

## Документация

- 🚀 **[Быстрый старт](QUICK_START.md)** - Начните за 5 минут
- 🖥️ **[Установка на Ubuntu](UBUNTU_INSTALL.md)** - Production развертывание
- 📖 **[Документация API](API.md)** - Справочник API
- 🔧 **[Конфигурация](CONFIG.md)** - Настройки приложения

## Технологии

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, Chart.js, WebSocket, Tailwind CSS
- **Integration**: Nexus CLI, Nexus RPC, Blockscout API
- **Monitoring**: systeminformation, real-time metrics
- **Deployment**: Docker, Nginx, Let's Encrypt, systemd

## Установка

### Предварительные требования

1. **Node.js** (v16+) - [Скачать](https://nodejs.org/)
2. **Nexus CLI** (рекомендуется):
   ```bash
   curl https://cli.nexus.xyz/ | sh
   ```
3. **Дополнительно для Nexus CLI**:
   - Rust
   - Docker
   - CMake

### Быстрая установка (локальная разработка)

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/Sharkman96/nexus-manager.git
   cd nexus-manager
   ```

2. Запустите скрипт установки:
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

### Установка на Ubuntu сервер

Для production установки на Ubuntu сервер:

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/Sharkman96/nexus-manager.git nexus-node-manager
   cd nexus-node-manager
   ```

2. Запустите автоматизированный скрипт:
   ```bash
   chmod +x scripts/ubuntu-install.sh
   sudo ./scripts/ubuntu-install.sh
   ```

3. Следуйте инструкциям установщика:
   - Введите домен для SSL сертификата
   - Укажите email для Let's Encrypt
   - Выберите дополнительные опции

**Подробная инструкция**: [UBUNTU_INSTALL.md](UBUNTU_INSTALL.md)

### Ручная установка

1. Установите зависимости:
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. Инициализируйте базу данных:
   ```bash
   cd backend
   npm run db:migrate
   ```

3. Запустите приложение:
   ```bash
   # Backend (порт 3001)
   cd backend
   npm start
   
   # Frontend (порт 3000)
   cd frontend
   npm start
   ```

4. Откройте http://localhost:3000 в браузере

### Получение Prover ID

1. Зарегистрируйтесь на https://app.nexus.xyz
2. Получите ваш уникальный Prover ID
3. Добавьте узел в приложении с этим ID

## Использование

1. **Добавление узла**: Кликните "Add Node" и введите ваш Prover ID
2. **Управление узлами**: Запускайте и останавливайте узлы одним кликом
3. **Мониторинг**: Отслеживайте производительность в реальном времени
4. **Аналитика**: Просматривайте исторические данные и графики
5. **Уведомления**: Получайте оповещения о важных событиях

### Основные возможности

- 🚀 **Управление узлами**: Простое добавление, запуск и остановка узлов
- 📊 **Мониторинг производительности**: CPU, память, NEX Points, выполненные задачи
- 📈 **Аналитика**: Интерактивные графики и исторические данные
- 🔔 **Уведомления**: Real-time оповещения о состоянии узлов
- 💻 **Современный UI**: Адаптивный дизайн с Tailwind CSS
- 🔌 **WebSocket**: Обновления в реальном времени
- 🗄️ **SQLite**: Локальное хранение данных
- 🔧 **System Health**: Мониторинг системных ресурсов

## API Endpoints

- `POST /api/nodes/start` - Запуск узла
- `POST /api/nodes/stop` - Остановка узла
- `GET /api/nodes/status` - Статус узла
- `GET /api/metrics` - Метрики производительности
- `GET /api/points` - NEX Points информация

## Разработка

### Структура проекта

- `backend/src/` - Исходный код сервера
- `frontend/src/` - Исходный код React приложения
- `database/migrations/` - Миграции базы данных
- `scripts/` - Утилиты и скрипты

### Тестирование

```bash
# Backend тесты
cd backend
npm test

# Frontend тесты
cd frontend
npm test
```

## Лицензия

MIT License 