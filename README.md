# Nexus Node Manager

[🇬🇧 English Version](README_EN.md) | [📋 Project Management](PROJECT_MANAGEMENT.md)

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
   ./scripts/ubuntu-install.sh
   ```

3. Следуйте инструкциям установщика:
   - Выберите дополнительные опции (Nexus CLI, автообновления)
   - Дождитесь завершения установки

**Подробная инструкция**: [UBUNTU_INSTALL.md](UBUNTU_INSTALL.md)

## Доступ к приложению

После установки панель управления будет доступна по адресу:
- **Панель управления**: `http://IP_СЕРВЕРА/nexus/`
- **API**: `http://IP_СЕРВЕРА/nexus/api/`
- **Корневая страница**: `http://IP_СЕРВЕРА/` (информация о сервере)

Это позволяет иметь на сервере другие приложения по корневому адресу.

## Управление проектом

После установки используйте следующие команды для управления:

### Управление сервисом

```bash
# Проверить статус
systemctl status nexus-backend

# Остановить сервис
systemctl stop nexus-backend

# Запустить сервис
systemctl start nexus-backend

# Перезапустить сервис
systemctl restart nexus-backend

# Логи
journalctl -u nexus-backend -f
```

### Обновление проекта

```bash
# Автоматическое обновление
/opt/nexus-node-manager/update.sh

# Ручное обновление
cd /opt/nexus-node-manager
git pull origin main
systemctl restart nexus-backend
```

### Полное удаление

```bash
# Автоматическое удаление (с подтверждением)
chmod +x scripts/remove.sh
./scripts/remove.sh

# Принудительное удаление (без подтверждения)
./scripts/remove.sh --force

# Быстрое удаление только основных папок
./scripts/remove.sh --quick

# Или командой напрямую
sudo rm -rf /opt/nexus-node-manager /opt/nexus-manager ~/nexus-node-manager ~/nexus-manager

# Или полное ручное удаление:
systemctl stop nexus-backend
systemctl disable nexus-backend
rm -rf /opt/nexus-node-manager
rm /etc/systemd/system/nexus-backend.service
rm -f /etc/nginx/sites-available/nexus-manager
rm -f /etc/nginx/sites-enabled/nexus-manager
systemctl daemon-reload
systemctl restart nginx
```

**Полная документация**: [PROJECT_MANAGEMENT.md](PROJECT_MANAGEMENT.md)

## Документация

- [🇬🇧 English README](README_EN.md)
- [📋 Project Management Guide](PROJECT_MANAGEMENT.md)
- [🛠️ Ubuntu Installation Guide](UBUNTU_INSTALL.md)
- [🚀 Quick Start Guide](QUICK_START.md)

## Скрипты

- [📦 Установка](scripts/ubuntu-install.sh) - Автоматическая установка на Ubuntu
- [🔄 Обновление](scripts/setup.sh) - Локальная разработка
- [🗑️ Удаление](scripts/remove.sh) - Полное удаление проекта (`--help` для справки)
- [🔄 Миграция](scripts/migrate-to-nexus-path.sh) - Переход на путь `/nexus/` для существующих установок

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