# Мастер-агент service.by

Координатор команды контент-маркетинга для Telegram-канала о ремонте бытовой техники в Беларуси.

## 🚀 Быстрый старт

### 1. Настройка OpenRouter

1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai)
2. Получите API ключ в [личном кабинете](https://openrouter.ai/keys)
3. Скопируйте файл `.env.example` в `.env`:
   ```bash
   cp .env.example .env
   ```
4. Вставьте ваш ключ в файл `.env`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-ваш-ключ-здесь
   ```

### 2. Запуск бэкенда

```bash
# Установка зависимостей (если еще не установлены)
npm install

# Запуск сервера
npm run server
```

Сервер запустится на порту `3001` (или указанном в `PORT`).

### 3. Запуск фронтенда (режим разработки)

```bash
# В новом терминале
npm run dev
```

Откройте `http://localhost:5173` в браузере.

### 4. Сборка для продакшена

```bash
npm run build
```

Статические файлы будут в папке `dist/`.

## 📁 Структура проекта

```
├── server.js           # Express сервер (OpenRouter API)
├── src/
│   ├── App.tsx        # Главный компонент React
│   └── ...
├── .env               # Переменные окружения (не коммитить!)
├── .env.example       # Пример переменных окружения
└── package.json
```

## 🔧 Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `OPENROUTER_API_KEY` | API ключ OpenRouter | - |
| `OPENROUTER_MODEL` | Модель ИИ | `anthropic/claude-3.5-sonnet` |
| `PORT` | Порт сервера | `3001` |
| `VITE_API_URL` | URL бэкенда (фронтенд) | `http://localhost:3001` |

## 🤖 Доступные модели

- `anthropic/claude-3.5-sonnet` (рекомендуется)
- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `meta-llama/llama-3.1-70b-instruct`
- `google/gemini-flash-1.5`

Полный список: https://openrouter.ai/models

## 📝 API Endpoints

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/health` | GET | Проверка статуса |
| `/api/chat` | POST | Отправка сообщения в чат |
| `/api/models` | GET | Список доступных моделей |

## 👥 Команда агентов

| Агент | Зона ответственности |
|-------|---------------------|
| **Master Agent** | Координация и распределение задач |
| **Content Agent** | Посты, сценарии, рубрики |
| **Editor Agent** | Вычитка, редактура |
| **SM Agent** | Контент-план, публикации, модерация |

## 🛠️ Разработка

### Запуск в режиме разработки

```bash
# Терминал 1 - бэкенд
npm run server

# Терминал 2 - фронтенд
npm run dev
```

### Пересборка после изменений

```bash
npm run build
```

## 🚂 Деплой на Railway

Смотрите подробную инструкцию в [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

### Быстрый деплой:

1. Зарегистрируйтесь на [Railway](https://railway.app)
2. Создайте проект из GitHub репозитория
3. Добавьте переменные окружения:
   - `OPENROUTER_API_KEY=sk-or-v1-ваш-ключ`
   - `OPENROUTER_MODEL=anthropic/claude-3.5-sonnet`
   - `NODE_ENV=production`
4. Готово! Railway автоматически задеплоит приложение.

## 📄 Лицензия

MIT
