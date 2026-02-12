#!/bin/bash
# Запуск сервера и клиента (использует Node из ./nodejs, если нет в PATH)
cd "$(dirname "$0")"
if [ -d "nodejs/bin" ]; then
  export PATH="$PWD/nodejs/bin:$PATH"
fi
exec npm run dev
