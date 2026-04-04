# Smart Product Search

MVP для хакатона Tender Hack: персонализированный поиск СТЕ с веб-интерфейсом, динамической персонализацией, дозагрузкой данных и локальным поисковым индексом на `SQLite FTS5`.

## Что умеет проект

- искать по большому каталогу СТЕ
- исправлять раскладку и опечатки в запросе
- применять синонимы
- учитывать профиль заказчика по истории контрактов
- менять выдачу в реальном времени после действий пользователя
- показывать, что именно использовалось при поиске
- загружать встроенный датасет или дозагружать новые CSV через UI

## Стек

- `FastAPI`
- `SQLite FTS5`
- `React + Vite`
- `shadcn/ui`

## Требования

- `Python 3.11+`
- `Node.js 20+`
- `npm`

## Быстрый запуск

Открой PowerShell в корне проекта:

```powershell
cd "C:\Users\Даниил\Desktop\Smart Product Search"
```

### 1. Установить backend-зависимости

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Установить frontend-зависимости и собрать UI

```powershell
cd ..\frontend
npm install
npm run build
```

### 3. Запустить backend

```powershell
cd ..\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

После этого открой:

- UI: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

## Что сделать после старта

1. Открой вкладку `Данные`
2. Нажми `Загрузить встроенный датасет`
3. Дождись завершения фоновой задачи
4. Перейди на вкладку `Поиск`
5. Попробуй запросы:
   - `aktirf smartbuy 16`
   - `конфеты`
   - `парацетамол таб 500`

## Dev-режим

Если нужен отдельный frontend с hot reload:

В одном окне:

```powershell
cd "C:\Users\Даниил\Desktop\Smart Product Search\backend"
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Во втором окне:

```powershell
cd "C:\Users\Даниил\Desktop\Smart Product Search\frontend"
npm run dev
```

Тогда:

- frontend: `http://127.0.0.1:5173`
- backend: `http://127.0.0.1:8000`

## Полезные команды

### Остановить сервер

```powershell
Ctrl + C
```

### Прогнать backend-тесты

```powershell
cd "C:\Users\Даниил\Desktop\Smart Product Search\backend"
.\.venv\Scripts\Activate.ps1
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
python -m pytest tests -q
```

### Собрать frontend

```powershell
cd "C:\Users\Даниил\Desktop\Smart Product Search\frontend"
npm run build
```

## Данные

- встроенные файлы лежат в папке [data](C:/Users/Даниил/Desktop/Smart%20Product%20Search/data)
- основной сценарий для демо: предзагрузка встроенного датасета через UI
- дополнительный сценарий: дозагрузка CSV на вкладке `Данные`

Поддерживаются режимы:

- `upsert_ste`
- `append_contracts`
- `upsert_bundle`

## Как устроен поиск

1. Запрос нормализуется
2. Исправляется раскладка и опечатки
3. Применяются синонимы
4. Поиск кандидатов идет через `SQLite FTS5`
5. Ранжирование усиливается профилем заказчика и событиями текущей сессии
6. UI показывает explanation и факторы ранжирования

## Основные экраны

- `Поиск` — запрос, профиль, фильтры, карточки результатов
- `Динамика` — как изменилась выдача после действий пользователя
- `Метрики` — baseline vs personalized
- `Данные` — предзагрузка, дозагрузка, очистка базы

## Примечание

Файл [backend/README.md](C:/Users/Даниил/Desktop/Smart%20Product%20Search/backend/README.md) содержит старые stage-описания backend и уже не является главным входом в проект. Актуальный запуск описан в этом `README.md`.

## Docker

Для Docker-режима нужен установленный `Docker Desktop`.

### Запуск через docker compose

Из корня проекта:

```powershell
cd "C:\Users\Даниил\Desktop\Smart Product Search"
docker compose up --build
```

После старта открой:

- UI: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

Если одновременно запущены и `uvicorn`, и `docker compose`, браузер может попадать в старый локальный процесс на `127.0.0.1:8000`.
Для Docker-режима открывай `http://localhost:8000` или останови локальный `uvicorn`.

Что важно:

- `backend/runtime` монтируется в контейнер и хранит текущую SQLite-базу между перезапусками
- `data` монтируется в контейнер в режиме `read-only`, поэтому кнопка `Загрузить встроенный датасет` продолжает работать

Остановить:

```powershell
docker compose down
```

### Пересборка с нуля

```powershell
docker compose down
docker compose build --no-cache
docker compose up
```

### Запуск без compose

Сборка образа:

```powershell
cd "C:\Users\Даниил\Desktop\Smart Product Search"
docker build -t smart-product-search .
```

Запуск контейнера:

```powershell
docker run --rm -p 8000:8000 -v "${PWD}/backend/runtime:/app/backend/runtime" -v "${PWD}/data:/app/data:ro" --name smart-product-search smart-product-search
```

Если запускаешь из обычного PowerShell, удобнее использовать `docker compose`, потому что он проще работает с путями и volume-монтированием на Windows.
