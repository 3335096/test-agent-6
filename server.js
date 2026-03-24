const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Подключаем базу данных
const db = require('./database/db');

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

// Информация об агентах (мастер + 3 специализированных)
const AGENTS_INFO = {
  'CONTENT_CREATOR': {
    name: 'Content Agent',
    role: 'Контент',
    description: 'Создание постов, сценариев, рубрик',
    color: '#3b82f6',
    icon: 'PenTool'
  },
  'EDITOR': {
    name: 'Editor Agent',
    role: 'Редактура',
    description: 'Вычитка, редактура, стиль',
    color: '#8b5cf6',
    icon: 'Edit3'
  },
  'SM_MANAGER': {
    name: 'SM Agent',
    role: 'Social Media',
    description: 'Публикации, контент-план, модерация',
    color: '#f97316',
    icon: 'Calendar'
  },
  'MASTER_AGENT': {
    name: 'Master Agent',
    role: 'Координатор',
    description: 'Распределяет задачи между агентами',
    color: '#6366f1',
    icon: 'Bot'
  }
};

const AGENT_ALIASES = {
  SMM_MANAGER: 'SM_MANAGER',
  SM_AGENT: 'SM_MANAGER',
  SOCIAL_MEDIA_MANAGER: 'SM_MANAGER',
  CONTENT: 'CONTENT_CREATOR'
};

const ROUTING_RULES = {
  CONTENT_CREATOR: {
    signals: ['пост', 'контент', 'текст', 'сценар', 'рубрик', 'идея', 'заголовок', 'описани'],
    reason: 'Задача связана с созданием контента и подготовкой материалов.'
  },
  EDITOR: {
    signals: ['редакт', 'вычит', 'исправ', 'граммат', 'стиль', 'перепиши', 'улучши текст', 'коррект'],
    reason: 'Задача требует редакторской обработки, вычитки или улучшения стиля.'
  },
  SM_MANAGER: {
    signals: ['контент-план', 'публикац', 'расписани', 'телеграм', 'соцсет', 'smm', 'охват', 'вовлеч'],
    reason: 'Задача относится к публикациям, контент-плану и управлению соцсетями.'
  },
  MASTER_AGENT: {
    signals: [],
    reason: 'Задача комплексная или без явной специализации, поэтому ответ формирует Master Agent.'
  }
};

app.use(cors());
app.use(express.json());

// Функция для получения информации об источниках
function getSourcesContext() {
  const activeSources = db.getActiveSources();
  if (activeSources.length === 0) {
    return 'Источники не настроены.';
  }
  
  return activeSources.map(s => `- ${s.name} (${s.type}): ${s.url}${s.description ? ' - ' + s.description : ''}`).join('\n');
}

// Обновлённый системный промпт с источниками
function getSystemPrompt() {
  const sourcesContext = getSourcesContext();
  
  return `╔══════════════════════════════════════════════════════════════╗
║           МАСТЕР-АГЕНТ: КООРДИНАТОР КОНТЕНТ-ТИМЫ            ║
║                  Telegram-канал service.by                   ║
╚══════════════════════════════════════════════════════════════╝

Ты — Мастер-агент (Project Manager) для профессионального Telegram-канала 
о ремонте бытовой техники в Беларуси.

═══════════════════════════════════════════════════════════════
ИСТОЧНИКИ ИНФОРМАЦИИ
═══════════════════════════════════════════════════════════════

При создании контента используй информацию из этих источников:

${sourcesContext}

ВАЖНО:
- Если источники указаны — ОБЯЗАТЕЛЬНО используй информацию из них
- Не выдумывай факты — используй только данные из источников
- Если нужной информации нет в источниках — скажи об этом

═══════════════════════════════════════════════════════════════
СТРУКТУРА КОМАНДЫ
═══════════════════════════════════════════════════════════════

У тебя есть 3 специализированных агента:

1. CONTENT_CREATOR — создание постов, сценариев, рубрик
2. EDITOR — вычитка, редактура, согласование стиля
3. SM_MANAGER — публикации, контент-план, модерация

Алгоритм работы:
1) Проанализируй задачу пользователя.
2) Выбери, кому делегировать задачу (одному из 3 агентов).
3) Дай ответ от выбранного агента.
4) Если задача затрагивает несколько ролей, можешь ответить как MASTER_AGENT и кратко указать вклад каждого.

═══════════════════════════════════════════════════════════════
ВАЖНО: ФОРМАТ ОТВЕТА
═══════════════════════════════════════════════════════════════

В НАЧАЛЕ КАЖДОГО ОТВЕТА ОБЯЗАТЕЛЬНО УКАЖИ:

🤖 АГЕНТ: [ИМЯ_АГЕНТА]

Где [ИМЯ_АГЕНТА] — одно из:
- CONTENT_CREATOR
- EDITOR
- SM_MANAGER
- MASTER_AGENT (если отвечаешь сам)

Пример:
🤖 АГЕНТ: CONTENT_CREATOR

Затем пиши ответ на задачу.`;
}

// Функция для определения агента из ответа
function detectAgent(content) {
  const match = content.match(/🤖\s*АГЕНТ:\s*(\w+)/i);
  if (match) {
    const rawKey = match[1].toUpperCase();
    const agentKey = AGENT_ALIASES[rawKey] || rawKey;
    if (AGENTS_INFO[agentKey]) {
      return {
        agent: {
          key: agentKey,
          ...AGENTS_INFO[agentKey]
        },
        method: 'header_tag'
      };
    }
  }
  
  // Fallback: ищем по ключевым словам
  const lower = content.toLowerCase();
  if (lower.includes('content creator') || lower.includes('content agent') || lower.includes('пост') || lower.includes('текст')) {
    return {
      agent: { key: 'CONTENT_CREATOR', ...AGENTS_INFO['CONTENT_CREATOR'] },
      method: 'keyword_fallback'
    };
  }
  if (lower.includes('editor') || lower.includes('редактор') || lower.includes('вычитка') || lower.includes('редактура')) {
    return {
      agent: { key: 'EDITOR', ...AGENTS_INFO['EDITOR'] },
      method: 'keyword_fallback'
    };
  }
  if (
    lower.includes('sm manager') ||
    lower.includes('sm agent') ||
    lower.includes('smm') ||
    lower.includes('соцсет') ||
    lower.includes('контент-план') ||
    lower.includes('публикац')
  ) {
    return {
      agent: { key: 'SM_MANAGER', ...AGENTS_INFO['SM_MANAGER'] },
      method: 'keyword_fallback'
    };
  }
  
  return {
    agent: { key: 'MASTER_AGENT', ...AGENTS_INFO['MASTER_AGENT'] },
    method: 'master_fallback'
  };
}

function buildRoutingInfo(userMessage, selectedAgentKey, detectionMethod) {
  const normalized = (userMessage || '').toLowerCase();
  const rule = ROUTING_RULES[selectedAgentKey] || ROUTING_RULES.MASTER_AGENT;
  const matchedSignals = [...new Set(
    (rule.signals || []).filter(signal => normalized.includes(signal))
  )].slice(0, 4);

  let confidence = 'low';
  if (detectionMethod === 'header_tag' || matchedSignals.length >= 2) {
    confidence = 'high';
  } else if (matchedSignals.length === 1) {
    confidence = 'medium';
  }

  const reason = matchedSignals.length > 0
    ? `${rule.reason} Триггеры: ${matchedSignals.join(', ')}.`
    : rule.reason;

  return {
    masterAgentKey: 'MASTER_AGENT',
    selectedAgent: selectedAgentKey,
    selectedAgentKey,
    selectedAgentName: AGENTS_INFO[selectedAgentKey]?.name || selectedAgentKey,
    reason,
    confidence,
    detectionMethod,
    matchedSignals
  };
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    const modelToUse = model || currentModel;
    const latestUserMessage = Array.isArray(messages)
      ? [...messages].reverse().find(message => message.role === 'user')?.content || ''
      : '';
    
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
        messages: [{ role: 'system', content: getSystemPrompt() }, ...messages],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: 'OpenRouter API error', details: error });
    }

    const data = await response.json();
    
    const content = data.choices?.[0]?.message?.content || '';
    const { agent, method } = detectAgent(content);
    const routing = buildRoutingInfo(latestUserMessage, agent.key, method);
    
    data.agent = agent;
    data.routing = routing;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ============ API ИСТОЧНИКОВ ============

// Получить все источники
app.get('/api/sources', (req, res) => {
  try {
    const sources = db.getSourcesWithTags();
    res.json({ sources });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sources', details: error.message });
  }
});

// Получить активные источники
app.get('/api/sources/active', (req, res) => {
  try {
    const sources = db.getActiveSources();
    res.json({ sources });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get active sources', details: error.message });
  }
});

// Получить один источник
app.get('/api/sources/:id', (req, res) => {
  try {
    const source = db.getSourceById(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }
    const tags = db.getSourceTags(req.params.id);
    res.json({ source: { ...source, tags } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get source', details: error.message });
  }
});

// Создать источник
app.post('/api/sources', (req, res) => {
  try {
    const { name, url, type, category, description, tags, is_active } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }
    
    const id = db.createSource({
      name,
      url,
      type: type || 'website',
      category: category || '',
      description: description || '',
      tags: tags || [],
      is_active: is_active !== undefined ? is_active : true
    });
    
    res.json({ success: true, id, message: 'Source created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create source', details: error.message });
  }
});

// Обновить источник
app.put('/api/sources/:id', (req, res) => {
  try {
    const { name, url, type, category, description, tags, is_active } = req.body;
    
    const success = db.updateSource(req.params.id, {
      name,
      url,
      type,
      category,
      description,
      tags,
      is_active
    });
    
    if (!success) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    res.json({ success: true, message: 'Source updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update source', details: error.message });
  }
});

// Удалить источник
app.delete('/api/sources/:id', (req, res) => {
  try {
    const success = db.deleteSource(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Source not found' });
    }
    res.json({ success: true, message: 'Source deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete source', details: error.message });
  }
});

// Переключить активность источника
app.patch('/api/sources/:id/toggle', (req, res) => {
  try {
    const success = db.toggleSourceActive(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Source not found' });
    }
    res.json({ success: true, message: 'Source toggled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle source', details: error.message });
  }
});

// ============ API МОДЕЛЕЙ ============

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

app.get('/api/model/current', (req, res) => {
  const modelInfo = AVAILABLE_MODELS.find(m => m.id === currentModel);
  res.json({
    current: currentModel,
    model: modelInfo || { id: currentModel, name: currentModel }
  });
});

// ============ API АГЕНТОВ ============

app.get('/api/agents', (req, res) => {
  res.json(AGENTS_INFO);
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'not_configured',
    model: currentModel,
    sources: db.getAllSources().length,
    timestamp: new Date().toISOString()
  });
});

// Static files
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.get('/', (req, res) => res.json({ status: 'API ready', endpoints: ['/api/health', '/api/chat', '/api/sources'] }));
}

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
