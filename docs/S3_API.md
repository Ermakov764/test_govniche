# S3 API (по ТЗ и спецификации)

Сервис реализует S3-подобное хранилище с HTTP API: метаданные в SQLite, файлы на диске. Авторизация выполняется на уровне API Gateway (заголовки `X-User-Id`, `X-User-Roles`).

## Включение

- **Сервер:** при `USE_LOCAL_STORAGE=true` (или при отсутствии AWS-ключей) поднимается S3 API по адресу `/api/s3`.
- **Клиент:** чтобы использовать S3 API, задайте `REACT_APP_API_URL=http://localhost:5000/api/s3` и при необходимости `REACT_APP_USER_ID=<uuid>` (если шлюз не передаёт `X-User-Id`).

## Эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/s3/files` | Список файлов |
| POST | `/api/s3/files` | Загрузка файла |
| GET | `/api/s3/files/:file_id` | Скачивание файла |
| DELETE | `/api/s3/files/:file_id` | Удаление (мягкое) |

### GET /api/s3/files

**Параметры (query):** `user_id`, `task_id`, `limit` (по умолчанию 100), `offset` (по умолчанию 0).

**Ответ:** `200 OK`, массив объектов:
```json
[
  {
    "file_id": "uuid",
    "filename": "name.pdf",
    "created_at": "2025-02-09T12:00:00.000Z",
    "size": 1024,
    "owner_id": "uuid",
    "task_id": "uuid или null"
  }
]
```

### POST /api/s3/files

**Тело:** `multipart/form-data`: поле `file` (обязательно), `owner_id` (обязательно, или передаётся через `X-User-Id`), `task_id` (опционально).

**Ответ:** `201 Created`, один объект с полями `file_id`, `filename`, `created_at`, `size`, `owner_id`, `task_id`.

### GET /api/s3/files/:file_id

**Ответ:** `200 OK`, тело — бинарное содержимое файла, заголовок `Content-Type` — MIME-тип файла.

### DELETE /api/s3/files/:file_id

**Ответ:** `204 No Content`. Файл помечается как удалённый (`is_deleted`), запись в БД остаётся.

## Ошибки

- `400` — некорректный запрос (нет файла, нет owner_id).
- `401` — не авторизован (при проверке через шлюз).
- `403` — нет прав (при проверке через шлюз).
- `404` — файл не найден или уже удалён.
- `500` — внутренняя ошибка сервера.

## Хранилище

- **Файлы:** `storage/s3_files/` (вложенная структура по UUID).
- **Метаданные:** SQLite `storage/s3_metadata.db`.
- **Временная загрузка:** `storage/s3_temp/`.

Переменные окружения (опционально): `S3_STORAGE_DIR`, `S3_DB_DIR`.
