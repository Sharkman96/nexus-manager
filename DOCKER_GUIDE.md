# Docker Guide - Nexus Node Manager

## Обзор

Панель управления Nexus Node Manager теперь поддерживает запуск нод в Docker контейнерах, что обеспечивает лучшую изоляцию, управляемость и отслеживание работы нод.

## Преимущества Docker нод

- **Изоляция**: Каждая нода работает в отдельном контейнере
- **Простота развертывания**: Автоматическая сборка образов
- **Мониторинг**: Детальные метрики контейнеров (CPU, память, сеть)
- **Логи**: Централизованный сбор логов
- **Масштабируемость**: Легкое добавление новых нод
- **Восстановление**: Автоматический перезапуск при сбоях

## Требования

### Системные требования
- Ubuntu 20.04+ или Debian 10+
- Минимум 4GB RAM
- 20GB свободного места на диске
- Поддержка Docker (автоматическая установка)

### Программные требования
- Node.js 16+
- Docker (устанавливается автоматически)
- Docker Compose (устанавливается автоматически)

## Установка Docker

### Автоматическая установка
Docker устанавливается автоматически при первом запуске панели:

```bash
# Запуск панели (Docker будет установлен автоматически)
cd nexus
npm run start
```

### Ручная установка
Если нужно установить Docker вручную:

```bash
# Обновление пакетов
sudo apt update

# Установка зависимостей
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Добавление GPG ключа Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Добавление репозитория Docker
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"

# Обновление и установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Запуск и включение Docker
sudo systemctl start docker
sudo systemctl enable docker

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker --version
docker-compose --version
```

## Использование Docker нод

### 1. Создание Docker ноды

1. Откройте панель управления
2. Перейдите в раздел "Docker"
3. Нажмите "Add Docker Node"
4. Заполните форму:
   - **Node Name**: Имя ноды (например, "My Docker Node")
   - **Prover ID**: ID провайдера (можно сгенерировать автоматически)
   - **Container Name**: Имя контейнера (опционально)
   - **Build Options**: Настройки сборки образа

### 2. Управление нодами

#### Запуск ноды
- Нажмите кнопку "Start" на карточке ноды
- Нода будет запущена в Docker контейнере
- Статус изменится на "Running"

#### Остановка ноды
- Нажмите кнопку "Stop" на карточке ноды
- Контейнер будет остановлен
- Статус изменится на "Stopped"

#### Пересборка ноды
- Нажмите кнопку "Rebuild" (иконка обновления)
- Выберите настройки пересборки
- Нода будет остановлена, образ пересобран, нода перезапущена

#### Просмотр логов
- Нажмите кнопку "Logs" (иконка документа)
- Откроется модальное окно с логами контейнера
- Можно обновить логи кнопкой "Refresh Logs"

### 3. Мониторинг

#### Метрики контейнера
- **CPU Usage**: Использование процессора
- **Memory Usage**: Использование памяти
- **Network I/O**: Сетевая активность
- **Disk I/O**: Дисковая активность
- **Uptime**: Время работы контейнера

#### Статус контейнера
- **Running**: Контейнер запущен и работает
- **Stopped**: Контейнер остановлен
- **Starting**: Контейнер запускается
- **Error**: Ошибка в работе контейнера

## Структура Docker файлов

### Dockerfile
Автоматически создается для каждой ноды:

```dockerfile
FROM rust:latest

RUN apt update && apt install -y protobuf-compiler git

RUN git clone https://github.com/nexus-xyz/nexus-cli.git /nexus

WORKDIR /nexus/clients/cli
RUN cargo build --release

ENTRYPOINT ["./target/release/nexus-network"]
CMD ["start", "--node-id", "NODE_ID"]
```

### Docker Compose
Создается отдельный файл для каждой ноды:

```yaml
services:
  nexus-node-NODE_ID:
    image: nexus-node-NODE_ID
    container_name: nexus-node-NODE_ID
    volumes:
      - nexus_data_NODE_ID:/nexus-data
    command: ["start", "--node-id", "NODE_ID"]
    restart: unless-stopped
    stdin_open: true
    tty: true
    environment:
      - NODE_ID=NODE_ID
    ports:
      - "0:8080"

volumes:
  nexus_data_NODE_ID:
```

## API Endpoints

### Docker Status
```http
GET /api/docker/status
```

### Install Docker
```http
POST /api/docker/install
```

### List Containers
```http
GET /api/docker/containers
```

### Docker Node Management
```http
POST /api/docker/nodes/:id/start
POST /api/docker/nodes/:id/stop
GET /api/docker/nodes/:id/status
GET /api/docker/nodes/:id/logs
GET /api/docker/nodes/:id/metrics
POST /api/docker/nodes/:id/build
POST /api/docker/nodes/:id/rebuild
```

## Конфигурация

### Переменные окружения
Добавьте в `.env` файл:

```env
# Docker Configuration
DOCKER_PATH=docker
DOCKER_COMPOSE_PATH=docker-compose
NEXUS_DOCKER_DATA_DIR=./nexus-docker
DEFAULT_NODE_TYPE=docker
AUTO_INSTALL_DOCKER=true
```

### Настройки по умолчанию
- **Docker Path**: `docker`
- **Docker Compose Path**: `docker-compose`
- **Data Directory**: `./nexus-docker`
- **Default Node Type**: `docker`
- **Auto Install Docker**: `true`

## Устранение неполадок

### Docker не установлен
```bash
# Проверка статуса Docker
docker --version

# Если не установлен, запустите установку
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Контейнер не запускается
1. Проверьте логи контейнера
2. Убедитесь, что порт не занят
3. Проверьте права доступа к Docker
4. Проверьте свободное место на диске

### Ошибки сборки образа
1. Проверьте интернет-соединение
2. Убедитесь, что репозиторий nexus-cli доступен
3. Проверьте свободное место на диске
4. Попробуйте пересобрать образ

### Проблемы с правами доступа
```bash
# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Перезагрузка системы
sudo reboot
```

## Безопасность

### Рекомендации
- Используйте отдельного пользователя для Docker
- Ограничьте доступ к Docker socket
- Регулярно обновляйте Docker
- Мониторьте использование ресурсов
- Настройте логирование

### Ограничения
- Контейнеры изолированы друг от друга
- Каждая нода имеет свой volume для данных
- Автоматический перезапуск при сбоях
- Ограничение ресурсов через Docker

## Производительность

### Оптимизация
- Используйте SSD для хранения данных
- Настройте лимиты ресурсов
- Мониторьте использование CPU и памяти
- Регулярно очищайте неиспользуемые образы

### Мониторинг
```bash
# Просмотр статистики контейнеров
docker stats

# Просмотр использования диска
docker system df

# Очистка неиспользуемых ресурсов
docker system prune
```

## Миграция с CLI нод

### Автоматическая миграция
1. Существующие CLI ноды остаются без изменений
2. Новые ноды создаются как Docker по умолчанию
3. Можно переключаться между типами нод

### Ручная миграция
1. Остановите CLI ноду
2. Создайте новую Docker ноду с тем же Prover ID
3. Удалите старую CLI ноду

## Поддержка

### Логи
- Логи контейнеров доступны через веб-интерфейс
- Логи сохраняются в volumes
- Автоматическая ротация логов

### Отладка
- Подключение к контейнеру: `docker exec -it CONTAINER_NAME bash`
- Просмотр логов: `docker logs CONTAINER_NAME`
- Проверка статуса: `docker ps`

### Обновления
- Обновления Docker нод через веб-интерфейс
- Автоматическое обновление образов
- Откат к предыдущим версиям

## Заключение

Docker функциональность значительно улучшает управление Nexus нодами, обеспечивая:
- Лучшую изоляцию и безопасность
- Упрощенное развертывание и масштабирование
- Детальный мониторинг и логирование
- Автоматическое восстановление при сбоях

Для получения дополнительной помощи обратитесь к документации или создайте issue в репозитории проекта. 