# Структура проекта Nexus Node Manager

## Обзор структуры

```
nexus/
├── backend/                 # Node.js сервер
│   ├── src/                # Исходный код
│   ├── logs/               # Логи приложения
│   ├── .env                # Конфигурация (создается автоматически)
│   ├── env.example         # Пример конфигурации
│   └── server.js           # Точка входа сервера
├── frontend/               # React приложение
│   ├── src/                # Исходный код
│   ├── build/              # Собранные файлы (production)
│   └── public/             # Статические файлы
├── database/               # База данных SQLite
│   └── nexus-nodes.db      # Файл базы данных
├── nexus-docker/           # Docker файлы и данные
│   ├── Dockerfile          # Автоматически создается
│   └── docker-compose-*.yml # Автоматически создается
├── scripts/                # Скрипты установки и управления
└── docs/                   # Документация
```

## Пути в конфигурации

### Разработка (Development)
- **База данных**: `../database/nexus-nodes.db` (относительно backend/)
- **Docker данные**: `../nexus-docker` (относительно backend/)
- **Логи**: `./logs/nexus-manager.log` (относительно backend/)

### Production (Ubuntu Server)
- **База данных**: `/opt/nexus-node-manager/database/nexus-nodes.db`
- **Docker данные**: `/opt/nexus-node-manager/nexus-docker`
- **Логи**: `/opt/nexus-node-manager/backend/logs/nexus-manager.log`
- **Frontend**: `/var/www/nexus-manager/`

## Конфигурационные файлы

### .env файл (создается автоматически)

#### Разработка
```env
# Server Configuration
PORT=3002
NODE_ENV=development

# Database
DB_PATH=../database/nexus-nodes.db

# Docker Configuration
NEXUS_DOCKER_DATA_DIR=../nexus-docker

# Logging
LOG_FILE=./logs/nexus-manager.log
```

#### Production
```env
# Server Configuration
PORT=3002
NODE_ENV=production

# Database
DB_PATH=../database/nexus-nodes.db

# Docker Configuration
NEXUS_DOCKER_DATA_DIR=../nexus-docker

# Logging
LOG_FILE=./logs/nexus-manager.log
```

## Структура директорий

### Backend (`/backend/`)
```
backend/
├── src/
│   ├── database/           # Работа с базой данных
│   │   ├── db.js          # Основной класс базы данных
│   │   ├── migrate.js     # Основные миграции
│   │   └── migrate-docker.js # Docker миграции
│   ├── routes/            # API маршруты
│   │   ├── nodes.js       # Управление нодами
│   │   ├── docker.js      # Docker API
│   │   ├── metrics.js     # Метрики
│   │   └── system.js      # Системная информация
│   ├── services/          # Бизнес-логика
│   │   ├── nexus-cli.js   # Работа с Nexus CLI
│   │   ├── nexus-docker.js # Работа с Docker
│   │   └── system-monitor.js # Мониторинг системы
│   └── server.js          # Основной сервер
├── logs/                  # Логи приложения
├── .env                   # Конфигурация (не в git)
├── env.example            # Пример конфигурации
└── package.json
```

### Frontend (`/frontend/`)
```
frontend/
├── src/
│   ├── components/        # React компоненты
│   │   ├── NodeCard.js    # Карточка ноды
│   │   ├── DockerNodeCard.js # Карточка Docker ноды
│   │   ├── DockerNodeForm.js # Форма создания Docker ноды
│   │   └── Layout.js      # Макет приложения
│   ├── pages/             # Страницы приложения
│   │   ├── Dashboard.js   # Главная страница
│   │   ├── NodesPage.js   # Страница нод
│   │   ├── DockerPage.js  # Страница Docker нод
│   │   └── MetricsPage.js # Страница метрик
│   ├── contexts/          # React контексты
│   └── utils/             # Утилиты
├── build/                 # Собранные файлы (production)
├── public/                # Статические файлы
└── package.json
```

### Database (`/database/`)
```
database/
├── schema.sql            # Схема базы данных
└── nexus-nodes.db        # Файл базы данных (создается автоматически)
```

### Docker (`/nexus-docker/`)
```
nexus-docker/
├── Dockerfile            # Автоматически создается для каждой ноды
├── docker-compose-*.yml  # Автоматически создается для каждой ноды
└── volumes/              # Docker volumes (создаются автоматически)
```

## Скрипты установки

### Development (`scripts/setup.sh`)
- Создает структуру директорий в корне проекта
- Устанавливает зависимости
- Создает `.env` файл из `env.example`
- Запускает миграции базы данных

### Production (`scripts/ubuntu-install.sh`)
- Копирует проект в `/opt/nexus-node-manager/`
- Устанавливает зависимости
- Создает systemd сервис
- Настраивает Nginx
- Создает `.env` файл с production настройками

## Переменные окружения

### Обязательные
- `PORT` - Порт сервера (по умолчанию: 3002)
- `NODE_ENV` - Окружение (development/production)
- `DB_PATH` - Путь к базе данных
- `NEXUS_DOCKER_DATA_DIR` - Путь к Docker данным

### Опциональные
- `NEXUS_CLI_PATH` - Путь к Nexus CLI
- `DOCKER_PATH` - Путь к Docker
- `DOCKER_COMPOSE_PATH` - Путь к Docker Compose
- `DEFAULT_NODE_TYPE` - Тип ноды по умолчанию (docker/cli)

## Права доступа

### Development
- Все файлы принадлежат пользователю разработчика
- Права на запись в директории database/, nexus-docker/, backend/logs/

### Production
- Backend файлы: `$REAL_USER:$REAL_USER`
- Database и Docker данные: `$REAL_USER:$REAL_USER`
- Frontend файлы: `www-data:www-data`
- Логи: `$REAL_USER:$REAL_USER`

## Миграции

### Основные миграции
- Запускаются через `npm run db:migrate`
- Создают основные таблицы

### Docker миграции
- Запускаются через `node src/database/migrate-docker.js`
- Добавляют Docker-специфичные поля

## Безопасность

### Файлы конфигурации
- `.env` файлы не попадают в git
- `env.example` содержит примеры без секретов
- Production конфигурация создается автоматически

### Права доступа
- Минимальные необходимые права
- Изоляция между пользователями
- Безопасные пути для Docker

## Мониторинг

### Логи
- Backend логи: `backend/logs/nexus-manager.log`
- Systemd логи: `journalctl -u nexus-backend`
- Docker логи: через веб-интерфейс

### Метрики
- Системные метрики: CPU, память, диск
- Docker метрики: контейнеры, образы, volumes
- Nexus метрики: NEX Points, задачи

## Резервное копирование

### Автоматические бэкапы
- База данных: `/opt/backups/nexus-manager/`
- Конфигурация: `/opt/backups/nexus-manager/`
- Ротация: 7 дней

### Ручные бэкапы
```bash
# База данных
cp /opt/nexus-node-manager/database/nexus-nodes.db backup/

# Конфигурация
cp /opt/nexus-node-manager/backend/.env backup/
``` 