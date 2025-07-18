# Быстрый старт Nexus Node Manager

Содержание:
- [Локальная разработка](#локальная-разработка)
- [Production сервер (Ubuntu)](#production-сервер-ubuntu)
- [Первые шаги](#первые-шаги)
- [Полезные команды](#полезные-команды)
- [Удаление сервиса](#удаление-сервиса)
- [Требования](#требования)

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
# Приложение будет доступно по http://SERVER_IP/nexus/
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

# Удаление проекта
rm -rf nexus-manager
```

### Production сервер
```bash
# Управление сервисом
sudo systemctl status nexus-backend
sudo systemctl restart nexus-backend
sudo systemctl stop nexus-backend

# Просмотр логов
sudo journalctl -u nexus-backend -f

# Обновление
sudo /opt/nexus-node-manager/update.sh

# Бэкап
sudo /opt/nexus-node-manager/backup.sh

# Удаление сервиса
sudo ./scripts/remove.sh --help    # Справка по удалению
sudo ./scripts/remove.sh           # Интерактивное удаление
sudo ./scripts/remove.sh --force   # Удаление без подтверждения
sudo ./scripts/remove.sh --quick   # Быстрое удаление основных папок
```

## Удаление сервиса

> ⚠️ **Внимание**: Удаление необратимо! Сделайте резервные копии важных данных перед удалением.

### Резервное копирование данных
```bash
# Создайте резервную копию базы данных
sudo /opt/nexus-node-manager/backup.sh

# Или вручную скопируйте важные файлы
sudo cp /opt/nexus-node-manager/database/nexus-nodes.db ~/nexus-backup.db
sudo cp /opt/nexus-node-manager/backend/.env ~/nexus-config.env
```

### Автоматическое удаление
```bash
# Перейдите в папку проекта
cd /opt/nexus-node-manager

# Интерактивное удаление (с подтверждением)
sudo ./scripts/remove.sh

# Принудительное удаление (без подтверждения)
sudo ./scripts/remove.sh --force

# Быстрое удаление (только основные папки)
sudo ./scripts/remove.sh --quick

# Справка по всем опциям
sudo ./scripts/remove.sh --help
```

### Ручное удаление
```bash
# Остановка и удаление сервиса
sudo systemctl stop nexus-backend
sudo systemctl disable nexus-backend
sudo rm /etc/systemd/system/nexus-backend.service

# Удаление конфигурации Nginx
sudo rm -f /etc/nginx/sites-available/nexus-manager
sudo rm -f /etc/nginx/sites-enabled/nexus-manager

# Удаление файлов проекта
sudo rm -rf /opt/nexus-node-manager

# Обновление systemd и Nginx
sudo systemctl daemon-reload
sudo systemctl restart nginx
```

### Быстрое удаление
```bash
# Удаление основных папок одной командой
sudo rm -rf /opt/nexus-node-manager /opt/nexus-manager ~/nexus-node-manager ~/nexus-manager
```

### Проверка полного удаления
```bash
# Проверка что сервис удален
sudo systemctl status nexus-backend
# Должно показать "Unit nexus-backend.service could not be found."

# Проверка что файлы удалены
sudo find / -name "*nexus*" -type d 2>/dev/null | grep -v "/proc\|/sys"
# Не должно показать папки проекта

# Проверка конфигурации Nginx
sudo nginx -t
# Должно показать "syntax is ok" и "test is successful"

# Проверка статуса Nginx
sudo systemctl status nginx
# Должно показать "active (running)"

# Проверка что порт свободен
sudo netstat -tlnp | grep :3001
# Не должно показать активных соединений

# Если остались файлы проекта, удалите их принудительно
sudo find / -name "*nexus-manager*" -type d 2>/dev/null | xargs -I {} sudo rm -rf {}

# Очистка логов и временных файлов
sudo journalctl --vacuum-time=1d
sudo rm -f /var/log/nexus-*
sudo rm -f /tmp/nexus-*

# Проверка что другие приложения не затронуты
sudo systemctl status nginx
sudo systemctl status docker

# Освобождение дискового пространства
sudo apt autoremove -y
sudo apt autoclean
sudo docker system prune -af

# Проверка освобожденного места
df -h
# Покажет текущее использование дискового пространства

# Проверка что все зависимости в порядке
sudo systemctl list-failed
# Не должно показать failed сервисов

# Полная очистка всех следов приложения
sudo grep -r "nexus-manager\|nexus-node-manager" /etc/ 2>/dev/null | wc -l
# Должно вернуть 0 (ноль) - нет упоминаний в конфигурациях

# Проверка что все процессы завершены
ps aux | grep -i nexus | grep -v grep
# Не должно показать активных процессов

# Проверка что все сетевые соединения закрыты
sudo ss -tlnp | grep -E ":(3001|3000)"
# Не должно показать открытых портов приложения

# Проверка что все файлы конфигурации удалены
sudo find /etc -name "*nexus*" 2>/dev/null
# Не должно показать файлов конфигурации

# Проверка сохранения резервных копий (если нужно)
ls -la ~/*nexus*
# Должно показать только резервные копии, если они были созданы

# Полная очистка системы (если нужно удалить и резервные копии)
sudo find /home -name "*nexus*" -type f -exec rm -f {} \; 2>/dev/null
sudo find /root -name "*nexus*" -type f -exec rm -f {} \; 2>/dev/null
echo "Система полностью очищена от всех следов приложения"

# Проверка что Node.js пакеты не остались в глобальном кеше
npm cache verify
# Очистка кеша npm (если нужно)
npm cache clean --force

# Финальная проверка работоспособности системы
sudo systemctl status nginx
sudo systemctl status docker
sudo systemctl status ssh
echo "Все основные сервисы работают корректно"

# Проверка правил файрволла
sudo ufw status
# Должно показать только необходимые правила (SSH, HTTP, HTTPS)

# Проверка задач cron
sudo crontab -l | grep -i nexus
# Не должно показать задач, связанных с приложением

# Проверка переменных окружения
env | grep -i nexus
# Не должно показать переменных окружения приложения
```

### Переустановка после удаления
```bash
# Если нужно переустановить приложение
git clone https://github.com/Sharkman96/nexus-manager.git nexus-node-manager
cd nexus-node-manager
chmod +x scripts/ubuntu-install.sh
sudo ./scripts/ubuntu-install.sh

# Если установка была прервана, сначала выполните полное удаление
sudo ./scripts/remove.sh --force
# Затем установите заново
sudo ./scripts/ubuntu-install.sh

# Восстановление данных из резервных копий
sudo systemctl stop nexus-backend
sudo cp ~/nexus-backup.db /opt/nexus-node-manager/database/nexus-nodes.db
sudo cp ~/nexus-config.env /opt/nexus-node-manager/backend/.env
sudo systemctl start nexus-backend
```

## Требования

- **Node.js** 16+
- **Nexus CLI** (рекомендуется)
- **Prover ID** с app.nexus.xyz
- **Ubuntu 20.04+** (для production)

## Поддержка

- 📖 **Документация**: [README.md](README.md)
- 🖥️ **Ubuntu установка**: [UBUNTU_INSTALL.md](UBUNTU_INSTALL.md)
- 🗑️ **Удаление проекта**: [PROJECT_MANAGEMENT.md](PROJECT_MANAGEMENT.md#полное-удаление)
- 🔧 **Управление проектом**: [PROJECT_MANAGEMENT.md](PROJECT_MANAGEMENT.md)
- 🐛 **Проблемы**: Создайте issue в репозитории 