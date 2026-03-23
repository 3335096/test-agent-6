# 🚂 Деплой на Railway

Пошаговая инструкция по развёртыванию Мастер-агента на Railway.

## 📋 Подготовка

### 1. Создайте аккаунт на Railway

1. Перейдите на [railway.app](https://railway.app)
2. Зарегистрируйтесь (можно через GitHub)
3. При необходимости добавьте платёжную карту (есть бесплатный тариф $5/мес)

### 2. Получите API ключ OpenRouter

1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai)
2. Перейдите в [Keys](https://openrouter.ai/keys)
3. Создайте новый ключ и скопируйте его

---

## 🚀 Способ 1: Деплой через GitHub (Рекомендуется)

### Шаг 1: Создайте репозиторий на GitHub

```bash
# Инициализируйте git (если ещё не сделано)
cd /mnt/okcomputer/output/app
git init

# Добавьте файлы
git add .
git commit -m "Initial commit"

# Создайте репозиторий на GitHub и привяжите его
git remote add origin https://github.com/ВАШ_ЮЗЕРНЕЙМ/master-agent-serviceby.git
git push -u origin main
```

### Шаг 2: Подключите проект к Railway

1. В Railway нажмите **"New Project"**
2. Выберите **"Deploy from GitHub repo"**
3. Выберите ваш репозиторий
4. Railway автоматически определит тип проекта и начнёт деплой

### Шаг 3: Настройте переменные окружения

1. Перейдите в раздел **"Variables"** вашего проекта
2. Добавьте переменные:

| Ключ | Значение |
|------|----------|
| `OPENROUTER_API_KEY` | `sk-or-v1-ваш-ключ-здесь` |
| `OPENROUTER_MODEL` | `anthropic/claude-3.5-sonnet` |
| `NODE_ENV` | `production` |

3. Railway автоматически перезапустит проект

### Шаг 4: Проверьте деплой

1. Перейдите в раздел **"Deployments"**
2. Дождитесь статуса **"Success"**
3. Перейдите по URL из раздела **"Settings" → "Public Domain"**

---

## 🚀 Способ 2: Деплой через CLI

### Шаг 1: Установите Railway CLI

```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Windows (PowerShell)
iwr https://railway.app/install.ps1 -useb | iex
```

### Шаг 2: Авторизуйтесь

```bash
railway login
```

### Шаг 3: Инициализируйте проект

```bash
cd /mnt/okcomputer/output/app
railway init
```

Выберите:
- **"Create a new project"**
- Дайте имя проекту: `master-agent-serviceby`

### Шаг 4: Добавьте переменные окружения

```bash
railway variables set OPENROUTER_API_KEY="sk-or-v1-ваш-ключ-здесь"
railway variables set OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"
railway variables set NODE_ENV="production"
```

### Шаг 5: Задеплойте

```bash
railway up
```

### Шаг 6: Откройте приложение

```bash
railway open
```

---

## 🔧 Настройка домена

### Используйте свой домен (опционально)

1. В Railway перейдите в **"Settings"**
2. В разделе **"Public Domain"** нажмите **"Custom Domain"**
3. Введите ваш домен (например, `agent.service.by`)
4. Следуйте инструкциям по настройке DNS

---

## 📊 Мониторинг

### Логи

```bash
# Через CLI
railway logs

# Или в веб-интерфейсе: Deployments → [Выберите деплой] → Logs
```

### Метрики

В Railway Dashboard доступны метрики:
- CPU usage
- Memory usage
- Network
- Disk usage

---

## 🔄 Обновление приложения

### Через GitHub

```bash
# Внесите изменения
git add .
git commit -m "Update"
git push

# Railway автоматически перезапустит приложение
```

### Через CLI

```bash
railway up
```

---

## 🛠️ Устранение неполадок

### Проблема: "Build failed"

**Решение:**
1. Проверьте логи сборки
2. Убедитесь, что все зависимости указаны в `package.json`
3. Проверьте версию Node.js в `package.json` → `engines`

### Проблема: "OPENROUTER_API_KEY not configured"

**Решение:**
1. Перейдите в Variables
2. Убедитесь, что `OPENROUTER_API_KEY` добавлен
3. Перезапустите деплой (Redeploy)

### Проблема: "Cannot GET /"

**Решение:**
1. Убедитесь, что `dist` папка создаётся при сборке
2. Проверьте, что `railway.json` настроен правильно

---

## 💰 Стоимость

Railway предоставляет **$5 бесплатных кредитов в месяц**:

| Ресурс | Примерное использование |
|--------|------------------------|
| 512 MB RAM + 1 vCPU | ~$2-3/мес |
| Трафик | ~$0.10/GB |

Для небольшого проекта бесплатного тарифа хватит.

---

## 📞 Поддержка

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- OpenRouter Docs: https://openrouter.ai/docs

---

## ✅ Чеклист деплоя

- [ ] Создан аккаунт на Railway
- [ ] Получен API ключ OpenRouter
- [ ] Проект загружен на GitHub (или CLI)
- [ ] Добавлены переменные окружения
- [ ] Деплой успешен (статус "Success")
- [ ] Приложение открывается по URL
- [ ] Чат с агентом работает
