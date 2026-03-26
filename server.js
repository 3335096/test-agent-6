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
  'SMM_MANAGER': {
    name: 'SMM Agent',
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
  SM_MANAGER: 'SMM_MANAGER',
  SM_AGENT: 'SMM_MANAGER',
  SOCIAL_MEDIA_MANAGER: 'SMM_MANAGER',
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
  SMM_MANAGER: {
    signals: ['контент-план', 'публикац', 'расписани', 'телеграм', 'соцсет', 'smm', 'охват', 'вовлеч'],
    reason: 'Задача относится к публикациям, контент-плану и управлению соцсетями.'
  },
  MASTER_AGENT: {
    signals: [],
    reason: 'Задача комплексная или без явной специализации, поэтому ответ формирует Master Agent.'
  }
};

const AGENT_KEYS = Object.keys(AGENTS_INFO);

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
  const agentsSettings = db.getAllAgentSettings();
  const settingsByAgent = agentsSettings.reduce((acc, setting) => {
    acc[setting.agent_key] = setting;
    return acc;
  }, {});
  const agentsPromptBlock = AGENT_KEYS
    .map((key) => {
      const info = AGENTS_INFO[key];
      const setting = settingsByAgent[key];
      if (!setting) {
        return `- ${key} (${info.name}): пользовательские настройки не заданы`;
      }
      return [
        `- ${key} (${info.name}):`,
        `  • custom_prompt: ${setting.custom_prompt || 'не задан'}`,
        `  • clarifications: ${setting.clarifications || 'не заданы'}`,
        `  • goals: ${setting.goals || 'не заданы'}`,
        `  • constraints: ${setting.constraints || 'не заданы'}`,
        `  • post_mode: ${setting.post_mode || 'long'}`
      ].join('\n');
    })
    .join('\n');
  
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
3. SMM_MANAGER — публикации, контент-план, модерация

Алгоритм работы:
1) Проанализируй задачу пользователя.
2) Выбери, кому делегировать задачу (одному из 3 агентов).
3) Дай ответ от выбранного агента.
4) Если задача затрагивает несколько ролей, можешь ответить как MASTER_AGENT и кратко указать вклад каждого.

═══════════════════════════════════════════════════════════════
ПОЛЬЗОВАТЕЛЬСКИЕ НАСТРОЙКИ АГЕНТОВ
═══════════════════════════════════════════════════════════════
${agentsPromptBlock}

═══════════════════════════════════════════════════════════════
СТАНДАРТ ВЫДАЧИ ДЛЯ EDITOR (TELEGRAM-READY)
═══════════════════════════════════════════════════════════════

Если выбран агент EDITOR, итог должен быть СРАЗУ готов к публикации в Telegram.

Требования:
1) Выдавай финальный вариант как цельный, аккуратно структурированный пост,
   который можно скопировать одним действием и сразу отправить в канал.
2) Не добавляй служебные комментарии, мета-описания, технические пояснения,
   JSON, markdown-таблицы, код-блоки и фразы вроде «вариант поста ниже».
3) Сохраняй читаемую структуру для Telegram:
   - цепляющий заголовок/первая строка,
   - основной текст с короткими абзацами,
   - при необходимости список пунктов,
   - короткий CTA в конце.
4) Хэштеги, эмодзи и форматирование используй умеренно и уместно,
   без визуального шума.
5) Если пользователь просит несколько вариантов — каждый вариант давай
   как отдельный, полностью готовый к публикации Telegram-пост.
6) Для EDITOR учитывай настройку post_mode:
   - short: короткий пост (обычно 3–5 коротких абзацев, фокус на сути)
   - long: развернутый пост (обычно 6–10 абзацев, с более полным раскрытием темы)

═══════════════════════════════════════════════════════════════
ВАЖНО: ФОРМАТ ОТВЕТА
═══════════════════════════════════════════════════════════════

В НАЧАЛЕ КАЖДОГО ОТВЕТА ОБЯЗАТЕЛЬНО УКАЖИ:

🤖 АГЕНТ: [ИМЯ_АГЕНТА]

Где [ИМЯ_АГЕНТА] — одно из:
- CONTENT_CREATOR
- EDITOR
- SMM_MANAGER
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
    lower.includes('smm manager') ||
    lower.includes('smm agent') ||
    lower.includes('smm') ||
    lower.includes('соцсет') ||
    lower.includes('контент-план') ||
    lower.includes('публикац')
  ) {
    return {
      agent: { key: 'SMM_MANAGER', ...AGENTS_INFO['SMM_MANAGER'] },
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

    // Сохраняем только новую пару сообщений, чтобы не терять метаданные агентов
    if (latestUserMessage) {
      db.addChatMessage({
        role: 'user',
        content: latestUserMessage
      });
    }
    db.addChatMessage({
      role: 'assistant',
      content,
      agent_key: agent.key,
      agent,
      routing
    });
    
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

app.get('/api/agents/settings', (req, res) => {
  try {
    const settings = db.getAllAgentSettings();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get agent settings', details: error.message });
  }
});

app.get('/api/agents/:agentKey/settings', (req, res) => {
  try {
    const rawKey = String(req.params.agentKey || '').toUpperCase();
    const agentKey = AGENT_ALIASES[rawKey] || rawKey;
    if (!AGENTS_INFO[agentKey]) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const setting = db.getAgentSetting(agentKey) || {
      agent_key: agentKey,
      custom_prompt: '',
      clarifications: '',
      goals: '',
      constraints: '',
      post_mode: 'long',
      is_active: true
    };
    res.json({ setting });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get agent setting', details: error.message });
  }
});

app.put('/api/agents/:agentKey/settings', (req, res) => {
  try {
    const rawKey = String(req.params.agentKey || '').toUpperCase();
    const agentKey = AGENT_ALIASES[rawKey] || rawKey;
    if (!AGENTS_INFO[agentKey]) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { custom_prompt, clarifications, goals, constraints, post_mode, is_active } = req.body || {};
    const normalizedPostMode = post_mode === 'short' ? 'short' : 'long';
    const setting = db.upsertAgentSetting(agentKey, {
      custom_prompt: custom_prompt ?? '',
      clarifications: clarifications ?? '',
      goals: goals ?? '',
      constraints: constraints ?? '',
      post_mode: normalizedPostMode,
      is_active: is_active ?? true
    });
    res.json({ success: true, setting });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update agent setting', details: error.message });
  }
});

app.get('/api/chat/history', (req, res) => {
  try {
    const limit = Number(req.query.limit || 200);
    const messages = db.getChatHistory(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 200);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chat history', details: error.message });
  }
});

app.post('/api/chat/history', (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }

    messages.forEach((message) => {
      if (!message || !message.role || !message.content) return;
      db.addChatMessage({
        role: message.role,
        content: message.content,
        agent_key: message.agent_key || message.agent?.key,
        agent: message.agent,
        routing: message.routing,
        created_at: message.created_at
      });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save chat history', details: error.message });
  }
});

app.delete('/api/chat/history', (req, res) => {
  try {
    const deleted = db.clearChatHistory();
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear chat history', details: error.message });
  }
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
