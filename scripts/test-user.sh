#!/bin/bash

# Простой тест для проверки пользователя
echo "=== Тест определения пользователя ==="
echo "SUDO_USER: $SUDO_USER"
echo "USER: $USER"
echo "whoami: $(whoami)"
echo "EUID: $EUID"
echo "id: $(id)"
echo ""

# Логика из скрипта
REAL_USER=${SUDO_USER:-$(whoami)}
echo "REAL_USER (начальное): $REAL_USER"

if [ "$REAL_USER" = "root" ]; then
    REAL_USER="root"
    echo "REAL_USER изменен на: $REAL_USER"
fi

echo "REAL_USER (финальное): $REAL_USER"
echo ""

# Проверка существования пользователя
if id "$REAL_USER" &>/dev/null; then
    echo "✅ Пользователь $REAL_USER существует"
else
    echo "❌ Пользователь $REAL_USER НЕ существует"
fi
echo ""

# Проверка логики docker
if [ "$REAL_USER" != "root" ] && id "$REAL_USER" &>/dev/null; then
    echo "✅ Будет выполнена команда: usermod -aG docker $REAL_USER"
else
    echo "⚠️  Добавление в группу docker будет пропущено"
    if [ "$REAL_USER" = "root" ]; then
        echo "   Причина: пользователь root"
    else
        echo "   Причина: пользователь $REAL_USER не существует"
    fi
fi
echo ""

# Проверка версии скрипта установки
if [ -f "scripts/ubuntu-install.sh" ]; then
    if grep -q "Версия: 2024-01-21-v15" scripts/ubuntu-install.sh; then
        echo "✅ Скрипт установки имеет правильную версию"
    else
        echo "❌ Скрипт установки имеет старую версию"
        echo "   Выполните: git pull origin main"
    fi
else
    echo "⚠️  Скрипт установки не найден"
fi 