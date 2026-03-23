const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

let currentModel = process.env.OPENROUTER_API_KEY || 'anthropic/claude-3.5-sonnet';

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', provider: 'Google' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' }
];

app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `Ты — Мастер-агент для Telegram-канала service.by о ремонте бытовой техники в Беларуси.`;

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'not_configured', model: currentModel });
});

// Static files
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Express 5: используем регулярное выражение вместо *
  app.get(/.*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.get('/', (req, res) => res.json({ status: 'API ready', endpoints: ['/api/health', '/api/chat', '/api/models'] }));
}

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
