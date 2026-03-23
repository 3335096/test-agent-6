const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

let currentModel = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', provider: 'Google' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' }
];

// Информация об агентах для отображения в UI
const AGENTS_INFO = {
  'CONTENT_CREATOR': {
    name: 'Content Creator',
    role: 'Контент',
    description: 'Создание постов, сценариев, рубрик',
    color: '#3b82f6', // blue
    icon: 'PenTool'
  },
  'EDITOR': {
    name: 'Editor',
    role: 'Редактура',
    description: 'Вычитка, редактура, стиль',
    color: '#8b5cf6', // purple
    icon: 'Edit3'
  },
  'ANALYST': {
    name: 'Analyst',
    role: 'Аналитика',
    description: 'Исследования, метрики, тренды',
    color: '#22c55e', // green
    icon: 'Search'
  },
  'DESIGNER': {
    name: 'Designer',
    role: 'Дизайн',
    description: 'Визуалы, инфографика, креативы',
    color: '#ec4899', // pink
    icon: 'Palette'
  },
  'SMM_MANAGER': {
    name: 'SMM Manager',
    role: 'SMM',
    description: 'Планирование, модерация, реклама',
    color: '#f97316', // orange
    icon: 'Calendar'
  },
  'GROWTH_MANAGER': {
    name: 'Growth Manager',
    role: 'Рост',
    description: 'Стратегия, лидогенерация',
    color: '#ef4444', // red
    icon: 'TrendingUp'
  },
  'MASTER_AGENT': {
    name: 'Master Agent',
    role: 'Координатор',
    description: 'Координация команды',
    color: '#6366f1', // indigo
    icon: 'Bot'
  }
};

app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `╔══════════════════════════════════════════════════════════════╗
║           МАСТЕР-АГЕНТ: КООРДИНАТОР КОНТЕНТ-ТИМЫ            ║
║                  Telegram-канал service.by                   ║
╚══════════════════════════════════════════════════════════════╝

Ты — Мастер-агент (Project Manager) для профессионального Telegram-канала 
о ремонте бытовой техники в Беларуси.

═══════════════════════════════════════════════════════════════
СТРУКТУРА КОМАНДЫ
═══════════════════════════════════════════════════════════════

У тебя есть 6 специализированных агентов:

1. CONTENT_CREATOR — создание постов, сценариев, рубрик
2. EDITOR — вычитка, редактура, согласование стиля  
3. ANALYST — исследование рынка, конкурентов, трендов
4. DESIGNER — визуалы, шаблоны, инфографика, креативы
5. SMM_MANAGER — планирование публикаций, модерация
6. GROWTH_MANAGER — стратегия роста, лидогенерация

═══════════════════════════════════════════════════════════════
ВАЖНО: ФОРМАТ ОТВЕТА
═══════════════════════════════════════════════════════════════

В НАЧАЛЕ КАЖДОГО ОТВЕТА ОБЯЗАТЕЛЬНО УКАЖИ:

🤖 АГЕНТ: [ИМЯ_АГЕНТА]

Где [ИМЯ_АГЕНТА] — одно из:
- CONTENT_CREATOR
- EDITOR
- ANALYST
- DESIGNER
- SMM_MANAGER
- GROWTH_MANAGER
- MASTER_AGENT (если отвечаешь сам)

Пример:
🤖 АГЕНТ: CONTENT_CREATOR

Затем пиши ответ на задачу.

═══════════════════════════════════════════════════════════════
ПРИМЕРЫ ЗАДАЧ
═══════════════════════════════════════════════════════════════

"Напиши пост" → CONTENT_CREATOR
"Проанализируй конкурентов" → ANALYST
"Сделай баннер" → DESIGNER
"Контент-план" → SMM_MANAGER
"Как набрать подписчиков" → GROWTH_MANAGER
"Вычитай текст" → EDITOR`;

// Функция для определения агента из ответа
function detectAgent(content) {
  // Ищем тег 🤖 АГЕНТ: XXX
  const match = content.match(/🤖\s*АГЕНТ:\s*(\w+)/i);
  if (match) {
    const agentKey = match[1].toUpperCase();
    if (AGENTS_INFO[agentKey]) {
      return {
        key: agentKey,
        ...AGENTS_INFO[agentKey]
      };
    }
  }
  
  // Fallback: ищем по ключевым словам
  const lower = content.toLowerCase();
  if (lower.includes('content creator') || lower.includes('пост') || lower.includes('текст')) {
    return { key: 'CONTENT_CREATOR', ...AGENTS_INFO['CONTENT_CREATOR'] };
  }
  if (lower.includes('analyst') || lower.includes('аналитик') || lower.includes('метрик')) {
    return { key: 'ANALYST', ...AGENTS_INFO['ANALYST'] };
  }
  if (lower.includes('designer') || lower.includes('дизайн') || lower.includes('баннер')) {
    return { key: 'DESIGNER', ...AGENTS_INFO['DESIGNER'] };
  }
  if (lower.includes('smm manager') || lower.includes('smm') || lower.includes('план')) {
    return { key: 'SMM_MANAGER', ...AGENTS_INFO['SMM_MANAGER'] };
  }
  if (lower.includes('growth manager') || lower.includes('growth') || lower.includes('подписчик')) {
    return { key: 'GROWTH_MANAGER', ...AGENTS_INFO['GROWTH_MANAGER'] };
  }
  if (lower.includes('editor') || lower.includes('редактор') || lower.includes('вычитка')) {
    return { key: 'EDITOR', ...AGENTS_INFO['EDITOR'] };
  }
  
  return { key: 'MASTER_AGENT', ...AGENTS_INFO['MASTER_AGENT'] };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    const modelToUse = model || currentModel;
    
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
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
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: 'OpenRouter API error', details: error });
    }

    const data = await response.json();
    
    // Определяем агента из ответа
    const content = data.choices?.[0]?.message?.content || '';
    const agent = detectAgent(content);
    
    // Добавляем информацию об агенте в ответ
    data.agent = agent;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.get('/api/models', (req, res) => {
  res.json({ models: AVAILABLE_MODELS, current: currentModel });
});

app.post('/api/models', (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'Model ID required' });
  
  const modelExists = AVAILABLE_MODELS.find(m => m.id === model);
  if (!modelExists) return res.status(400).json({ error: 'Invalid model ID' });
  
  currentModel = model;
  res.json({ success: true, current: currentModel, model: modelExists });
});

// Endpoint для получения информации об агентах
app.get('/api/agents', (req, res) => {
  res.json(AGENTS_INFO);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'not_configured', model: currentModel });
});

// Static files
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.get('/', (req, res) => res.json({ status: 'API ready', endpoints: ['/api/health', '/api/chat', '/api/models'] }));
}

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
