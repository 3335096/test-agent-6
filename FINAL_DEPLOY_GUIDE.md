# 🚀 ФИНАЛЬНАЯ ИНСТРУКЦИЯ: Деплой Мастер-агента на Railway

## ✅ Что сделано

Проект полностью готов к деплою! Все файлы настроены правильно.

**Новые возможности:**
- ✅ Выбор модели ИИ прямо в интерфейсе (Claude, GPT-4, Llama, etc.)
- ✅ Работает на Railway без Docker
- ✅ CommonJS (нет проблем с `require`)

---

## 📁 Файлы проекта

```
app/
├── package.json          # ⚙️ Настройки проекта (без "type": "module")
├── package-lock.json     # 🔒 Зависимости
├── server.js             # 🖥️ Бэкенд сервер (CommonJS)
├── railway.json          # 🚂 Конфиг Railway
├── Procfile              # ▶️ Команда запуска
├── .gitignore            # 🙈 Что не загружать
├── .env.example          # 📋 Пример переменных
├── tsconfig.json         # ⚙️ TypeScript config
├── vite.config.ts        # ⚙️ Vite config
├── tailwind.config.js    # 🎨 Tailwind config
├── postcss.config.js     # ⚙️ PostCSS config
├── index.html            # 📄 HTML шаблон
├── components.json       # ⚙️ shadcn/ui config
├── src/
│   ├── App.tsx           # 🎯 Главный компонент (с выбором модели!)
│   ├── App.css           # 🎨 Стили
│   ├── index.css         # 🎨 Глобальные стили
│   ├── main.tsx          # 🚀 Точка входа
│   ├── components/ui/    # 🧩 UI компоненты
│   ├── hooks/            # 🪝 React хуки
│   └── lib/              # 📚 Утилиты
└── dist/                 # 📦 Собранный фронтенд
```

---

## 🚀 БЫСТРЫЙ ДЕПЛОЙ (5 шагов)

### Шаг 1: Получите API ключ OpenRouter

1. Перейдите на https://openrouter.ai
2. Войдите через Google
3. Перейдите в **Keys** → **Create Key**
4. Скопируйте ключ (начинается на `sk-or-v1-`)

---

### Шаг 2: Создайте репозиторий на GitHub

1. Перейдите на https://github.com/new
2. **Repository name:** `master-agent-serviceby`
3. **Description:** `Мастер-агент для Telegram-канала service.by`
4. Выберите **Public**
5. **СНИМИТЕ** галочку "Add a README file"
6. Нажмите **Create repository**

---

### Шаг 3: Загрузите файлы на GitHub

**Вариант А — Через браузер (проще):**

1. На странице репозитория нажмите **"Add file" → "Upload files"**
2. Перетащите ВСЕ файлы из папки `/mnt/okcomputer/output/app/` **кроме:**
   - ❌ `node_modules/` (папка)
   - ❌ `dist/` (папка)
   - ❌ `.env` (файл)
3. Напишите комментарий: `Initial commit`
4. Нажмите **"Commit changes"**

**Важно:** Файл `package.json` должен быть в корне репозитория!

---

### Шаг 4: Создайте проект на Railway

1. Перейдите на https://railway.app
2. Нажмите **"New Project"** → **"Deploy from GitHub repo"**
3. Нажмите **"Configure GitHub App"**
4. Выберите **"Only select repositories"**
5. Выберите `master-agent-serviceby`
6. Нажмите **"Install & Authorize"**
7. Выберите ваш репозиторий в Railway

---

### Шаг 5: Добавьте переменные окружения

1. В Railway перейдите в **"Variables"**
2. Добавьте 3 переменные:

| KEY | VALUE |
|-----|-------|
| `OPENROUTER_API_KEY` | `sk-or-v1-ВАШ-КЛЮЧ` |
| `OPENROUTER_MODEL` | `anthropic/claude-3.5-sonnet` |
| `NODE_ENV` | `production` |

3. Нажмите **"Deploy"**
4. Ждите 3-5 минут

---

## 🎉 Готово!

1. Перейдите в **Settings** → **Public Domain**
2. Откройте ссылку — ваш агент работает!

---

## 🎛️ Выбор модели ИИ

В интерфейсе (в левой панели) есть выпадающий список моделей:

- **Claude 3.5 Sonnet** (рекомендуется) — умный, но дороже
- **GPT-4o** — от OpenAI, хороший баланс
- **GPT-4o Mini** — дешевле, быстрее
- **Llama 3.1 70B** — бесплатный вариант
- **Gemini Flash 1.5** — от Google
- **DeepSeek V3** — китайская модель, дешёвая

**Как менять:**
1. В левой панели найдите раздел "Модель ИИ"
2. Выберите модель из списка
3. Готово! Следующие сообщения будут использовать новую модель

---

## 💰 Стоимость

**Railway:**
- Бесплатно: $5/месяц
- Хватит для небольшого проекта

**OpenRouter:**
- Плата за использование ИИ
- Claude: ~$0.003-0.015 за запрос
- Llama: бесплатно!
- Пополнить: https://openrouter.ai/credits

---

## 🆘 Если не работает

### Ошибка "Build failed"

1. Проверьте что `package.json` в корне репозитория
2. Проверьте что добавили переменную `OPENROUTER_API_KEY`
3. Посмотрите логи в Railway → Deployments → Logs

### Ошибка "Cannot GET /"

1. Подождите 2-3 минуты
2. Перезагрузите страницу
3. Проверьте что деплой успешен (зелёная галочка)

### Агент не отвечает

1. Проверьте баланс на OpenRouter
2. Проверьте что ключ правильный
3. Посмотрите логи в Railway

---

## 📞 Поддержка

- Railway Discord: https://discord.gg/railway
- OpenRouter Docs: https://openrouter.ai/docs

---

**Удачного деплоя! 🚀**
