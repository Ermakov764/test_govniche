# C++ Backend - Storage API

Бэкенд на C++ с тем же API, что и Node.js версия. Совместим с существующим React фронтендом.

## Требования

- CMake 3.14+ (`sudo apt install cmake` или `sudo snap install cmake`)
- Компилятор C++17 (g++, clang++)
- Git (для загрузки зависимостей через FetchContent)

## Сборка

```bash
cd cpp
mkdir build
cd build
cmake ..
make
```

## Запуск

```bash
./storage_server
```

Сервер запустится на `http://localhost:5000`. Фронтенд (React) на порту 3000 будет работать с этим бэкендом без изменений.

## API

Полностью совместим с [IDF документацией](../docs/IDF.md):

- POST /api/storage/upload
- POST /api/storage/upload-multiple
- GET /api/storage/files
- GET /api/storage/files/:key
- GET /api/storage/download/:key
- GET /api/storage/preview/:key
- GET /api/storage/files/:key/view
- DELETE /api/storage/files/:key
- DELETE /api/storage/files

## Зависимости

Используются header-only библиотеки (загружаются автоматически через CMake FetchContent):

- **cpp-httplib** — HTTP сервер
- **nlohmann/json** — JSON парсинг

## Структура

```
cpp/
├── CMakeLists.txt
├── README.md
├── include/
│   └── storage.hpp
└── src/
    ├── main.cpp      # HTTP сервер и маршруты
    └── storage.cpp   # Локальное хранилище
```
