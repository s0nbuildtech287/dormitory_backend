// src/services/openaiService.js
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Model config ──────────────────────────────────────────────────────────────
const MODELS_LIMIT = 5;
const CACHE_TTL = 5 * 60 * 1000;

const MODEL_METADATA = {
  'gpt-4o':        { label: 'GPT-4o',        badge: 'Smart' },
  'gpt-4o-mini':   { label: 'GPT-4o Mini',   badge: 'Fast'  },
  'gpt-4-turbo':   { label: 'GPT-4 Turbo',   badge: null    },
  'gpt-4':         { label: 'GPT-4',         badge: null    },
  'gpt-3.5-turbo': { label: 'GPT-3.5 Turbo', badge: null    },
};

const FALLBACK_MODELS = [
  { id: 'gpt-4o',        label: 'GPT-4o',        badge: 'Smart' },
  { id: 'gpt-4o-mini',   label: 'GPT-4o Mini',   badge: 'Fast'  },
  { id: 'gpt-4-turbo',   label: 'GPT-4 Turbo',   badge: null    },
  { id: 'gpt-4',         label: 'GPT-4',         badge: null    },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', badge: null    },
];

const modelsCache = { data: null, timestamp: 0 };

function isChatModel(id) {
  const lower = id.toLowerCase();
  const excluded = ['embedding', 'moderation', 'audio', 'tts', 'whisper', 'dall', 'image', 'realtime', 'omni-moderation'];
  if (excluded.some((k) => lower.includes(k))) return false;
  return lower.startsWith('gpt-') || /^o\d/.test(lower) || lower.startsWith('chatgpt');
}

function formatLabel(id) {
  return id.replace(/^gpt-/, 'GPT-').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getAvailableModels() {
  const isFresh = Date.now() - modelsCache.timestamp < CACHE_TTL;
  if (isFresh && modelsCache.data && modelsCache.data.length) {
    console.log('[MODELS] Cache hit -', modelsCache.data.map((m) => m.id).join(', '));
    return modelsCache.data;
  }

  console.log('[MODELS] Fetching tu OpenAI API...');
  try {
    const list = await openai.models.list();
    const all = list && list.data ? list.data : [];
    console.log('[MODELS] OpenAI tra ve ' + all.length + ' models tong');

    const filtered = all.filter((m) => isChatModel(m.id));
    console.log('[MODELS] Sau filter chat models: ' + filtered.length + ' -', filtered.map((m) => m.id).join(', '));

    const models = filtered
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, MODELS_LIMIT)
      .map((m, i) => ({
        id: m.id,
        label: MODEL_METADATA[m.id] ? MODEL_METADATA[m.id].label : formatLabel(m.id),
        badge: MODEL_METADATA[m.id] ? MODEL_METADATA[m.id].badge : (i === 0 ? 'Newest' : null),
      }));

    console.log('[MODELS] Top ' + models.length + ' models:', models.map((m) => m.id + ' (' + (m.badge || '-') + ')').join(', '));

    if (!models.length) throw new Error('No models returned');
    modelsCache.data = models;
    modelsCache.timestamp = Date.now();
    return models;
  } catch (err) {
    console.error('[MODELS] Loi fetch OpenAI, dung fallback:', err.message);
    modelsCache.data = FALLBACK_MODELS;
    modelsCache.timestamp = Date.now();
    return FALLBACK_MODELS;
  }
}

function getDefaultModel() {
  return modelsCache.data && modelsCache.data[0] ? modelsCache.data[0].id : 'gpt-4o';
}

function isValidModel(modelId, models) {
  if (!models) models = [];
  return models.some((m) => m.id === modelId);
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map();
const MAX_RPM = parseInt(process.env.CHAT_RATE_LIMIT || '15');

function checkRateLimit(userId) {
  const key = 'rl_' + userId;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + 60000 });
    return { allowed: true };
  }
  if (entry.count >= MAX_RPM) {
    const retry = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, message: 'Rate limit: thu lai sau ' + retry + 's' };
  }
  entry.count++;
  return { allowed: true };
}

// ── Cost calculation ──────────────────────────────────────────────────────────
const PRICING = {
  'gpt-4o':        { input: 0.0025  / 1000, output: 0.01   / 1000 },
  'gpt-4o-mini':   { input: 0.00015 / 1000, output: 0.0006 / 1000 },
  'gpt-4-turbo':   { input: 0.01    / 1000, output: 0.03   / 1000 },
  'gpt-4':         { input: 0.03    / 1000, output: 0.06   / 1000 },
  'gpt-3.5-turbo': { input: 0.0005  / 1000, output: 0.0015 / 1000 },
};

function calcCost(model, inputTok, outputTok) {
  const p = PRICING[model] || PRICING['gpt-4o'];
  return inputTok * p.input + outputTok * p.output;
}

// ── Chat completion ───────────────────────────────────────────────────────────
async function createChatCompletion(messages, model, userId) {
  if (!model) model = 'gpt-4o';
  if (!userId) userId = 'anon';

  const rate = checkRateLimit(userId);
  if (!rate.allowed) throw new Error(rate.message);

  const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '2000');
  const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');

  console.log('[AI CHAT] Goi model: ' + model + ' | ' + messages.length + ' messages | maxTokens: ' + maxTokens);

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_completion_tokens: maxTokens,
  }).catch((err) => {
    if (err.status === 429) throw new Error('OpenAI rate limit. Vui long thu lai sau.');
    if (err.status === 401) throw new Error('API key khong hop le.');
    throw new Error('OpenAI error: ' + err.message);
  });

  const choice = response.choices[0];
  const usage  = response.usage;
  const cost   = calcCost(model, usage.prompt_tokens, usage.completion_tokens);
  const costVND = (cost * 25000).toFixed(2);

  console.log('[AI CHAT] Model: ' + model);
  console.log('[AI CHAT] Tokens - prompt: ' + usage.prompt_tokens + ' | completion: ' + usage.completion_tokens + ' | total: ' + usage.total_tokens);
  console.log('[AI CHAT] Chi phi: $' + cost.toFixed(6) + ' USD (~' + costVND + ' VND)');

  return {
    content:    choice.message.content,
    tokensUsed: usage.total_tokens,
    cost,
  };
}

module.exports = { getAvailableModels, getDefaultModel, isValidModel, createChatCompletion };
