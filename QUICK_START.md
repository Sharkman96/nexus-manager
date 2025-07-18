# Быстрый старт Nexus Node Manager

## Локальная разработка

```bash
# Клонируйте репозиторий
git clone https://github.com/Sharkman96/nexus-manager.git
cd nexus-manager

# Установите зависимости
chmod +x scripts/setup.sh
./scripts/setup.sh

# Запустите приложение
# Терминал 1: Backend
cd backend && npm start

# Терминал 2: Frontend
cd frontend && npm start

# Откройте http://localhost:3000
```

## Production сервер (Ubuntu)

```bash
# Клонируйте репозиторий
git clone https://github.com/Sharkman96/nexus-manager.git nexus-node-manager
cd nexus-node-manager

# Автоматическая установка
chmod +x scripts/ubuntu-install.sh
./scripts/ubuntu-install.sh

# Следуйте инструкциям установщика
# Выберите дополнительные опции (Nexus CLI, автообновления)
# Приложение будет доступно по http://SERVER_IP
```

## Первые шаги

1. **Получите Prover ID**: Зарегистрируйтесь на https://app.nexus.xyz
2. **Добавьте узел**: Нажмите "Add Node" и введите Prover ID
3. **Запустите узел**: Нажмите кнопку "Start" для запуска
4. **Мониторинг**: Отслеживайте метрики на дашборде

## Полезные команды

### Локальная разработка
```bash
# Сброс базы данных
cd backend && npm run db:migrate reset

# Просмотр логов
tail -f backend/logs/nexus-manager.log
```

### Production сервер
```bash
# Управление сервисом
sudo systemctl status nexus-backend
sudo systemctl restart nexus-backend

# Просмотр логов
sudo journalctl -u nexus-backend -f

# Обновление
sudo /opt/nexus-node-manager/update.sh

# Бэкап
sudo /opt/nexus-node-manager/backup.sh
```

## Требования

- **Node.js** 16+
- **Nexus CLI** (рекомендуется)
- **Prover ID** с app.nexus.xyz
- **Ubuntu 20.04+** (для production)

## Поддержка

- 📖 **Документация**: [README.md](README.md)
- 🖥️ **Ubuntu установка**: [UBUNTU_INSTALL.md](UBUNTU_INSTALL.md)
- 🐛 **Проблемы**: Создайте issue в репозитории 