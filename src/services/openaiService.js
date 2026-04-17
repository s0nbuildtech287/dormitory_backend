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

// ── Sentiment Analysis ────────────────────────────────────────────────────────
const VALID_SENTIMENTS = ['Positive', 'Neutral', 'Negative'];
const VALID_PRIORITIES = ['High', 'Medium', 'Low'];

const ANALYZE_FEEDBACK_PROMPT = `Bạn là hệ thống phân tích cảm xúc phản ánh của sinh viên ký túc xá.
Hãy phân tích nội dung phản ánh sau và trả về JSON với đúng cấu trúc sau:
{
  "sentiment": "Positive" | "Neutral" | "Negative",
  "sentiment_score": <số thực 0.0 đến 1.0, mức độ tin cậy>,
  "priority": "High" | "Medium" | "Low",
  "suggested_category": "<danh mục gợi ý bằng tiếng Việt>",
  "summary": "<tóm tắt 1 câu ngắn gọn bằng tiếng Việt>",
  "keywords": ["<từ khóa 1>", "<từ khóa 2>", ...],
  "emotion": "<cảm xúc cụ thể bằng tiếng Việt, ví dụ: tức giận, lo lắng, hài lòng>"
}

Quy tắc xác định priority:
- High: phản ánh khẩn cấp, ảnh hưởng sức khỏe/an toàn, hoặc sentiment Negative với điểm cao
- Medium: phản ánh cần xử lý trong thời gian hợp lý
- Low: phản ánh thông thường, góp ý nhỏ

Chỉ trả về JSON, không có text thêm.`;

/**
 * Phân tích cảm xúc phản ánh bằng OpenAI
 * @param {string} feedbackId
 * @param {string} content - Nội dung phản ánh
 * @returns {Promise<AI_Result|null>} null nếu lỗi
 */
async function analyzeFeedback(feedbackId, content) {
  try {
    const response = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ANALYZE_FEEDBACK_PROMPT },
          { role: 'user', content: `Nội dung phản ánh:\n${content}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_completion_tokens: 500,
      },
      { signal: AbortSignal.timeout(30000) }
    );

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      console.warn(`[AI SENTIMENT] feedbackId=${feedbackId}: Không có content trong response`);
      return null;
    }

    let result;
    try {
      result = JSON.parse(raw);
    } catch (parseErr) {
      console.warn(`[AI SENTIMENT] feedbackId=${feedbackId}: JSON parse lỗi - ${parseErr.message}`);
      return null;
    }

    // Validate sentiment
    if (!VALID_SENTIMENTS.includes(result.sentiment)) {
      console.warn(`[AI SENTIMENT] feedbackId=${feedbackId}: sentiment không hợp lệ - "${result.sentiment}"`);
      return null;
    }

    // Validate priority (nếu thiếu thì dùng Medium)
    if (!VALID_PRIORITIES.includes(result.priority)) {
      result.priority = 'Medium';
    }

    // Validate sentiment_score
    if (typeof result.sentiment_score !== 'number' || result.sentiment_score < 0 || result.sentiment_score > 1) {
      result.sentiment_score = 0.5;
    }

    // Đảm bảo keywords là mảng
    if (!Array.isArray(result.keywords)) {
      result.keywords = [];
    }

    console.log(`[AI SENTIMENT] feedbackId=${feedbackId}: ${result.sentiment} (score=${result.sentiment_score}, priority=${result.priority})`);

    return {
      sentiment: result.sentiment,
      sentiment_score: result.sentiment_score,
      priority: result.priority,
      suggested_category: result.suggested_category || '',
      summary: result.summary || '',
      keywords: result.keywords,
      emotion: result.emotion || '',
    };
  } catch (err) {
    console.error(`[AI SENTIMENT] feedbackId=${feedbackId}: Lỗi - ${err.message}`);
    return null;
  }
}

module.exports = { getAvailableModels, getDefaultModel, isValidModel, createChatCompletion, analyzeFeedback };
