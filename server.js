const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

Ты — Мастер-агент (Project Manager) для профессионального Telegram-канала 
о ремонте бытовой техники в Беларуси.`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    const modelToUse = model || currentModel;
    
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ 
        error: 'OPENROUTER_API_KEY не настроен' 
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
  console.log('Модель изменена на:', model);
  
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

// Serve static files from dist folder
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ 
      status: 'API работает', 
      message: 'Фронтенд не собран',
      endpoints: ['/api/health', '/api/chat', '/api/models']
    });
  });
}

// Start server
app.listen(PORT, () => {
  console.log('Server started on port', PORT);
  console.log('OpenRouter API:', process.env.OPENROUTER_API_KEY ? 'configured' : 'not configured');
  console.log('Model:', currentModel);
});
