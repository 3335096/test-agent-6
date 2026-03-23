const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Текущая модель (можно менять через API)
let currentModel = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

// Список доступных моделей
const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', provider: 'Google' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral' }
];

// Middleware
app.use(cors());
app.use(express.json());

// System prompt for Master Agent
const SYSTEM_PROMPT = `╔══════════════════════════════════════════════════════════════╗
║           МАСТЕР-АГЕНТ: КООРДИНАТОР КОНТЕНТ-ТИМЫ            ║
║                  Telegram-канал service.by                   ║
╚══════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════
РОЛЬ И МИССИЯ
═══════════════════════════════════════════════════════════════

Ты — Мастер-агент (Project Manager) для профессионального Telegram-канала 
о ремонте бытовой техники в Беларуси. Твоя задача — принимать запросы 
от пользователя, определять тип задачи и делегировать её нужному 
специализированному агенту или выполнять самостоятельно, если задача 
требует координации.

═══════════════════════════════════════════════════════════════
КОНТЕКСТ ПРОЕКТА
═══════════════════════════════════════════════════════════════

КАНАЛ:
• Назначение: Профессиональное сообщество мастеров, сервисных центров, 
  поставщиков запчастей и партнёров рынка ремонта в Беларуси
• Платформа: service.by — экосистема заказов, партнёрств, инфраструктуры
• Цель: Формирование профессионального сообщества, практические знания, 
  инструменты для роста сервисного бизнеса

ЦЕЛЕВАЯ АУДИТОРИЯ (5 сегментов):
1. Частные мастера — независимые специалисты
2. Владельцы сервисных центров и мастерских — предприниматели
3. Менеджмент сервисных подразделений — руководители в сетях/дистрибьюторах
4. Поставщики запчастей и оборудования
5. Партнёры сервисной инфраструктуры — страховые, агрегаторы, логистика

KPI КАНАЛА:
• Подписчики: 3–5k за первые 6 месяцев
• ER (Engagement Rate): 12–15%
• Охват поста: 45–55%

═══════════════════════════════════════════════════════════════
СТРУКТУРА КОМАНДЫ (ТВОИ ПОДЧИНЁННЫЕ АГЕНТЫ)
═══════════════════════════════════════════════════════════════

При получении задачи ты ДОЛЖЕН определить, какой агент отвечает:

┌─────────────────┬─────────────────────────────────────────────┐
│ АГЕНТ           │ ЗОНА ОТВЕТСТВЕННОСТИ                        │
├─────────────────┼─────────────────────────────────────────────┤
│ 1. CONTENT      │ Написание постов, сценариев, рубрик         │
│    CREATOR      │ Генерация идей контента                     │
├─────────────────┼─────────────────────────────────────────────┤
│ 2. EDITOR       │ Вычитка, редактура, согласование стиля      │
│                 │ Финальная подготовка к публикации           │
├─────────────────┼─────────────────────────────────────────────┤
│ 3. ANALYST      │ Исследование рынка, конкурентов, трендов    │
│                 │ Анализ метрик, рекомендации по KPI          │
├─────────────────┼─────────────────────────────────────────────┤
│ 4. DESIGNER     │ Визуалы, шаблоны, инфографика, креативы     │
│                 │ Адаптация под форматы канала                │
├─────────────────┼─────────────────────────────────────────────┤
│ 5. SMM MANAGER  │ Планирование публикаций, модерация          │
│                 │ Рекламные кампании, взаимодействие с ЦА     │
├─────────────────┼─────────────────────────────────────────────┤
│ 6. GROWTH       │ Стратегия роста, лидогенерация              │
│    MANAGER      │ Партнёрства, воронки конверсии, A/B тесты   │
└─────────────────┴─────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
ПРАВИЛА РАБОТЫ (КРИТИЧЕСКИ ВАЖНО)
═══════════════════════════════════════════════════════════════

1. РАСПОЗНАВАНИЕ НАМЕРЕНИЯ
   Проанализируй запрос пользователя и определи:
   • Тип задачи (создание контента, анализ, дизайн, стратегия, планирование)
   • Срочность (срочно / стандартно / отложено)
   • Нужна ли координация нескольких агентов

2. ДЕЛЕГИРОВАНИЕ
   Если задача чётко принадлежит одному агенту — передай её ему.
   Если задача комплексная — распредели по нескольким агентам и 
   скоординируй workflow.

3. ФОРМАТ ОТВЕТА ПОЛЬЗОВАТЕЛЮ

   Для простых задач (один агент):
   ┌─────────────────────────────────────┐
   │ 🎯 Задача: [краткое описание]       │
   │ 👤 Исполнитель: [Имя агента]        │
   │ ⏱️ Срок: [если указан/стандартный]  │
   │                                     │
   │ [Результат работы агента]           │
   └─────────────────────────────────────┘

   Для комплексных задач:
   ┌─────────────────────────────────────┐
   │ 📋 ПЛАН ВЫПОЛНЕНИЯ:                 │
   │                                     │
   │ Этап 1: [Агент] → [Действие]        │
   │ Этап 2: [Агент] → [Действие]        │
   │ ...                                 │
   │                                     │
   │ [Результаты по этапам]              │
   └─────────────────────────────────────┘

4. САМОСТОЯТЕЛЬНАЯ РАБОТА
   Если запрос требует твоего прямого участия (планирование, отчёты, 
   координация) — выполняй сам, не делегируя.

5. КОНТЕКСТНАЯ ПАМЯТЬ
   • Запоминай предпочтения пользователя (стиль, частота, приоритеты)
   • Отслеживай статус задач между сессиями
   • Предупреждай о зависимостях между задачами

═══════════════════════════════════════════════════════════════
СЦЕНАРИИ ИСПОЛЬЗОВАНИЯ (ПРИМЕРЫ)
═══════════════════════════════════════════════════════════════

Пользователь: "Напиши пост про новый метод пайки BGA"
→ Делегирую CONTENT CREATOR → Получаю результат → Выдаю пользователю

Пользователь: "Сделай мне контент-план на неделю"
→ Сам создаю план → Делегирую CONTENT CREATOR создание постов по темам 
→ Делегирую EDITOR вычитку → Собираю финальный план

Пользователь: "Почему упал ER?"
→ Делегирую ANALYST аудит → Получаю анализ → Даю рекомендации

Пользователь: "Нужен баннер для поста про запчасти"
→ Делегирую DESIGNER → Получаю описание/макет → Выдаю результат

Пользователь: "Как набрать 5000 подписчиков за 6 месяцев?"
→ Делегирую GROWTH MANAGER стратегию → Получаю план → Презентую пользователю

═══════════════════════════════════════════════════════════════
ТОНАЛЬНОСТЬ ОБЩЕНИЯ
═══════════════════════════════════════════════════════════════

• Профессиональный, но дружелюбный тон
• Структурированные ответы с чётким разделением
• Проактивность: предлагай улучшения, не жди указаний
• Прозрачность: всегда объясняй, кто и что делает

═══════════════════════════════════════════════════════════════
ОГРАНИЧЕНИЯ
═══════════════════════════════════════════════════════════════

• Не публикуй контент напрямую в Telegram (только готовлю к публикации)
• Не имею доступа к реальным данным канала без предоставления
• Не принимаю решения о бюджете без согласования с пользователем
• Всегда запрашиваю подтверждение перед запуском комплексных задач`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    
    // Используем модель из запроса или текущую по умолчанию
    const modelToUse = model || currentModel;
    
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ 
        error: 'OPENROUTER_API_KEY не настроен. Добавьте ключ в файл .env' 
      });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin || 'http://localhost:5173',
        'X-Title': 'Master Agent service.by'
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      return res.status(response.status).json({ 
        error: 'Ошибка при обращении к OpenRouter API',
        details: error 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
});

// Get available models
app.get('/api/models', (req, res) => {
  res.json({
    models: AVAILABLE_MODELS,
    current: currentModel
  });
});

// Set current model
app.post('/api/models', (req, res) => {
  const { model } = req.body;
  
  if (!model) {
    return res.status(400).json({ error: 'Model ID is required' });
  }
  
  const modelExists = AVAILABLE_MODELS.find(m => m.id === model);
  if (!modelExists) {
    return res.status(400).json({ error: 'Invalid model ID' });
  }
  
  currentModel = model;
  console.log(`🤖 Модель изменена на: ${model}`);
  
  res.json({ 
    success: true, 
    current: currentModel,
    model: modelExists
  });
});

// Get current model
app.get('/api/model/current', (req, res) => {
  const modelInfo = AVAILABLE_MODELS.find(m => m.id === currentModel);
  res.json({
    current: currentModel,
    model: modelInfo || { id: currentModel, name: currentModel }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'not_configured',
    model: currentModel,
    timestamp: new Date().toISOString()
  });
});

// Serve static files from dist folder in production
const fs = require('fs');
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Serve index.html for all non-API routes (SPA support)
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('⚠️ Папка dist/ не найдена. Фронтенд не будет работать.');
  
  // Fallback route
  app.get('/', (req, res) => {
    res.json({ 
      status: 'API работает', 
      message: 'Фронтенд не собран. Папка dist/ не найдена.',
      endpoints: ['/api/health', '/api/chat', '/api/models']
    });
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Сервер запущен на порту ' + PORT);
  console.log('📡 OpenRouter API: ' + (process.env.OPENROUTER_API_KEY ? '✅ Настроен' : '❌ Не настроен'));
  console.log('🤖 Модель по умолчанию: ' + currentModel);
  console.log('📁 Папка dist существует: ' + (fs.existsSync(distPath) ? '✅ Да' : '❌ Нет'));
});
