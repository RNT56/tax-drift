const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_OUTPUT_TOKENS = 3200;
const MAX_RESPONSE_CHARS = 120000;

const PROVIDERS = Object.freeze({
  openai: {
    id: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-5.5',
    docs: 'https://platform.openai.com/docs/api-reference'
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-4.6-sonnet',
    docs: 'https://docs.anthropic.com/en/api/messages'
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-3.1-pro',
    docs: 'https://ai.google.dev/api/generate-content'
  },
  xai: {
    id: 'xai',
    label: 'xAI Grok',
    envKey: 'XAI_API_KEY',
    defaultModel: 'grok-4.2',
    docs: 'https://docs.x.ai/developers/rest-api-reference'
  },
  perplexity: {
    id: 'perplexity',
    label: 'Perplexity',
    envKey: 'PERPLEXITY_API_KEY',
    defaultModel: 'sonar-pro',
    docs: 'https://docs.perplexity.ai/docs/sonar/openai-compatibility'
  }
});

const DEFAULT_ALLOWED_MODELS = Object.freeze({
  openai: ['gpt-5.5'],
  anthropic: ['claude-4.6-sonnet'],
  gemini: ['gemini-3.1-pro'],
  xai: ['grok-4.2'],
  perplexity: []
});

const TEXT_MODEL_EXCLUDE = /(embedding|audio|tts|transcribe|whisper|image|dall|sora|moderation|vision|realtime|search-preview|computer-use)/i;

function clean(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function providerConfig(provider) {
  return PROVIDERS[clean(provider).toLowerCase()] || null;
}

function apiKeyFor(provider, env = {}) {
  const config = providerConfig(provider);
  return config ? clean(env[config.envKey]) : '';
}

function allowedModelsFor(provider, env = {}) {
  const id = clean(provider).toLowerCase();
  const configured = clean(env.AI_ALLOWED_MODELS);
  if (configured) {
    const map = configured.split(',').reduce((acc, item) => {
      const [rawProvider, rawModel] = item.split(':');
      const providerId = clean(rawProvider).toLowerCase();
      const model = clean(rawModel);
      if (providerId && model) acc[providerId] = [...(acc[providerId] || []), model];
      return acc;
    }, {});
    if (map[id]) return map[id];
  }
  return DEFAULT_ALLOWED_MODELS[id] || [];
}

function isModelAllowed(provider, model, env = {}) {
  const allowed = allowedModelsFor(provider, env);
  const selected = clean(model);
  return allowed.length > 0 && allowed.includes(selected);
}

function assertAllowedModel(provider, model, env = {}) {
  const config = providerConfig(provider);
  if (!config) throw new Error('Unknown AI provider.');
  const selected = clean(model) || config.defaultModel;
  const allowed = allowedModelsFor(config.id, env);
  if (!allowed.length) throw new Error(`${config.label} is not enabled for AI research.`);
  if (!allowed.includes(selected)) {
    throw new Error(`${selected} is not allowed for ${config.label}. Allowed model: ${allowed.join(', ')}.`);
  }
  return selected;
}

function getConfiguredAiProviders(env = {}) {
  return Object.values(PROVIDERS).filter(provider => apiKeyFor(provider.id, env) && allowedModelsFor(provider.id, env).length);
}

function abortSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(Number(timeoutMs) || DEFAULT_TIMEOUT_MS, 1000));
  return { controller, timer };
}

async function fetchJson(url, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const { controller, timer } = abortSignal(options.timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
      signal: controller.signal
    });
    const text = await response.text();
    if (text.length > (options.maxChars || MAX_RESPONSE_CHARS)) {
      const error = new Error('AI provider response exceeded size limit.');
      error.statusCode = 502;
      throw error;
    }
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error = new Error(payload?.error?.message || payload?.message || `${response.status} from ${url}`);
      error.statusCode = response.status;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeout = new Error('AI provider request timed out.');
      timeout.statusCode = 504;
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeModel(id, label = id, metadata = {}) {
  const modelId = clean(id);
  if (!modelId) return null;
  return {
    id: modelId,
    label: clean(label, modelId),
    created: Number.isFinite(Number(metadata.created)) ? Number(metadata.created) : undefined,
    owner: clean(metadata.owner || metadata.owned_by || metadata.publisher || ''),
    input: Array.isArray(metadata.input) ? metadata.input : undefined,
    output: Array.isArray(metadata.output) ? metadata.output : undefined
  };
}

function sortModels(models = []) {
  return models
    .filter(Boolean)
    .filter((model, index, all) => all.findIndex(item => item.id === model.id) === index)
    .sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id)));
}

function fallbackModels(provider, env = {}) {
  const config = providerConfig(provider);
  if (!config) return [];
  return allowedModelsFor(config.id, env).map(model => normalizeModel(model, model, { owner: config.id })).filter(Boolean);
}

function filterAllowedModels(provider, models = [], env = {}) {
  const allowed = allowedModelsFor(provider, env);
  if (!allowed.length) return [];
  const byId = new Map(models.map(model => [model.id, model]));
  return allowed.map(id => byId.get(id) || normalizeModel(id, id, { owner: provider })).filter(Boolean);
}

function isLikelyTextModel(id) {
  const model = clean(id);
  return model && !TEXT_MODEL_EXCLUDE.test(model);
}

async function listOpenAiModels(config, env, options) {
  const payload = await fetchJson('https://api.openai.com/v1/models', {
    ...options,
    headers: { Authorization: `Bearer ${apiKeyFor(config.id, env)}` }
  });
  return sortModels((payload.data || [])
    .filter(item => isLikelyTextModel(item.id))
    .map(item => normalizeModel(item.id, item.id, item)));
}

async function listAnthropicModels(config, env, options) {
  const payload = await fetchJson('https://api.anthropic.com/v1/models', {
    ...options,
    headers: {
      'x-api-key': apiKeyFor(config.id, env),
      'anthropic-version': '2023-06-01'
    }
  });
  return sortModels((payload.data || []).map(item => normalizeModel(item.id, item.display_name || item.id, item)));
}

async function listGeminiModels(config, env, options) {
  const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
  url.searchParams.set('key', apiKeyFor(config.id, env));
  const payload = await fetchJson(url.toString(), options);
  return sortModels((payload.models || [])
    .filter(item => (item.supportedGenerationMethods || item.supportedActions || []).includes('generateContent'))
    .map(item => normalizeModel(String(item.name || '').replace(/^models\//, ''), item.displayName || item.name, item)));
}

async function listXaiModels(config, env, options) {
  try {
    const payload = await fetchJson('https://api.x.ai/v1/language-models', {
      ...options,
      headers: { Authorization: `Bearer ${apiKeyFor(config.id, env)}` }
    });
    return sortModels((payload.models || payload.data || [])
      .map(item => normalizeModel(item.id || item.model_id, item.name || item.id || item.model_id, item)));
  } catch {
    const payload = await fetchJson('https://api.x.ai/v1/models', {
      ...options,
      headers: { Authorization: `Bearer ${apiKeyFor(config.id, env)}` }
    });
    return sortModels((payload.data || []).map(item => normalizeModel(item.id, item.id, item)));
  }
}

async function listPerplexityModels(config, env, options) {
  const payload = await fetchJson('https://api.perplexity.ai/v1/models', {
    ...options,
    headers: { Authorization: `Bearer ${apiKeyFor(config.id, env)}` }
  });
  return sortModels((payload.data || [])
    .filter(item => isLikelyTextModel(item.id))
    .map(item => normalizeModel(item.id, item.id, item)));
}

async function listProviderModels(provider, options = {}) {
  const env = options.env || process.env;
  const config = providerConfig(provider);
  if (!config) return { provider, configured: false, models: [], error: 'Unknown AI provider.' };
  if (!apiKeyFor(config.id, env)) {
    return { ...config, configured: false, models: fallbackModels(config.id, env), allowedModels: allowedModelsFor(config.id, env), error: `${config.envKey} is not configured.` };
  }
  try {
    const byProvider = {
      openai: listOpenAiModels,
      anthropic: listAnthropicModels,
      gemini: listGeminiModels,
      xai: listXaiModels,
      perplexity: listPerplexityModels
    };
    const models = await byProvider[config.id](config, env, options);
    const allowedModels = filterAllowedModels(config.id, models, env);
    return { ...config, configured: true, models: allowedModels, allowedModels: allowedModelsFor(config.id, env) };
  } catch (error) {
    return { ...config, configured: true, models: fallbackModels(config.id, env), allowedModels: allowedModelsFor(config.id, env), error: error.message || 'Could not list models.' };
  }
}

async function listAiProviders(options = {}) {
  const providers = [];
  for (const config of Object.values(PROVIDERS)) {
    providers.push(await listProviderModels(config.id, options));
  }
  return providers;
}

function selectedModel(provider, model) {
  const config = providerConfig(provider);
  return clean(model) || config?.defaultModel || '';
}

function extractOpenAiText(payload = {}) {
  return clean(payload.choices?.[0]?.message?.content || payload.output_text);
}

function extractAnthropicText(payload = {}) {
  return (payload.content || [])
    .map(part => part?.type === 'text' ? part.text : '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractGeminiText(payload = {}) {
  return (payload.candidates?.[0]?.content?.parts || [])
    .map(part => part.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function callOpenAiCompatible(config, env, request, options, baseUrl) {
  const payload = await fetchJson(`${baseUrl}/chat/completions`, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKeyFor(config.id, env)}`
    },
    body: JSON.stringify({
      model: selectedModel(config.id, request.model),
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user }
      ],
      temperature: 0.2,
      max_tokens: request.maxOutputTokens || DEFAULT_OUTPUT_TOKENS,
      response_format: { type: 'json_object' }
    })
  });
  return {
    provider: config.id,
    model: selectedModel(config.id, request.model),
    text: extractOpenAiText(payload),
    usage: payload.usage || null
  };
}

async function callAnthropic(config, env, request, options) {
  const payload = await fetchJson('https://api.anthropic.com/v1/messages', {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKeyFor(config.id, env),
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: selectedModel(config.id, request.model),
      system: request.system,
      messages: [{ role: 'user', content: request.user }],
      max_tokens: request.maxOutputTokens || DEFAULT_OUTPUT_TOKENS,
      temperature: 0.2
    })
  });
  return {
    provider: config.id,
    model: selectedModel(config.id, request.model),
    text: extractAnthropicText(payload),
    usage: payload.usage || null
  };
}

async function callGemini(config, env, request, options) {
  const model = selectedModel(config.id, request.model).replace(/^models\//, '');
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`);
  url.searchParams.set('key', apiKeyFor(config.id, env));
  const payload = await fetchJson(url.toString(), {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: [{ text: request.user }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: request.maxOutputTokens || DEFAULT_OUTPUT_TOKENS,
        responseMimeType: 'application/json'
      }
    })
  });
  return {
    provider: config.id,
    model,
    text: extractGeminiText(payload),
    usage: payload.usageMetadata || null
  };
}

async function callAiProviderJson(request = {}, options = {}) {
  const env = options.env || process.env;
  const config = providerConfig(request.provider);
  if (!config) throw new Error('Unknown AI provider.');
  if (!apiKeyFor(config.id, env)) throw new Error(`${config.envKey} is not configured.`);
  request = { ...request, model: assertAllowedModel(config.id, request.model, env) };
  if (config.id === 'openai') return callOpenAiCompatible(config, env, request, options, 'https://api.openai.com/v1');
  if (config.id === 'xai') return callOpenAiCompatible(config, env, request, options, 'https://api.x.ai/v1');
  if (config.id === 'perplexity') return callOpenAiCompatible(config, env, request, options, 'https://api.perplexity.ai');
  if (config.id === 'anthropic') return callAnthropic(config, env, request, options);
  if (config.id === 'gemini') return callGemini(config, env, request, options);
  throw new Error('Unsupported AI provider.');
}

module.exports = {
  PROVIDERS,
  DEFAULT_TIMEOUT_MS,
  getConfiguredAiProviders,
  listAiProviders,
  listProviderModels,
  callAiProviderJson,
  providerConfig,
  apiKeyFor,
  allowedModelsFor,
  isModelAllowed,
  assertAllowedModel
};
