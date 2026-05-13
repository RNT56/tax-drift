const { handleApi, json, methodNotAllowed, parseJsonBody } = require('../lib/api-helpers');
const { buildResearchMemo } = require('../lib/research-sources');
const { checkRateLimit, checkRateLimitAsync, rateLimitHeaders } = require('../lib/rate-limit');
const { assertAllowedModel } = require('../lib/ai-providers');
const { requirePremiumUserAsync } = require('../lib/premium-auth');

function rateLimitConfig(env = {}, options = {}, input = {}) {
  const aiRequested = Boolean(input.aiProvider || options.aiResearchUrl || env.AI_RESEARCH_URL);
  const configuredLimit = options.rateLimit
    ?? (aiRequested ? (options.aiRateLimit ?? env.AI_RESEARCH_IP_LIMIT ?? env.AI_RESEARCH_RATE_LIMIT) : env.AI_RESEARCH_RATE_LIMIT);
  const configuredWindow = options.rateLimitWindowSeconds
    ?? (aiRequested ? (options.aiRateLimitWindowSeconds ?? env.AI_RESEARCH_IP_WINDOW_SECONDS ?? env.AI_RESEARCH_RATE_WINDOW_SECONDS) : env.AI_RESEARCH_RATE_WINDOW_SECONDS);
  return {
    limit: configuredLimit || (aiRequested ? 5 : 20),
    windowSeconds: configuredWindow || 3600,
    store: options.rateLimitStore,
    namespace: options.rateLimitNamespace || env.AI_RATE_LIMIT_NAMESPACE
  };
}

async function route(event, context, options = {}) {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  let user;
  try {
    user = await requirePremiumUserAsync(event, { ...options, context });
  } catch (_error) {
    return json(401, { ok: false, error: 'Research memo access requires authentication.' });
  }
  const env = options.env || process.env;
  const input = parseJsonBody(event);
  if (input.aiProvider) {
    try {
      input.aiModel = assertAllowedModel(input.aiProvider, input.aiModel, env);
    } catch (error) {
      return json(400, { error: error.message || 'AI model is not allowed.' });
    }
  }
  const aiRequested = Boolean(input.aiProvider || options.aiResearchUrl || env.AI_RESEARCH_URL);
  const limitOptions = {
    prefix: 'research-memo',
    keyMode: aiRequested ? 'ip' : 'auth',
    env,
    ...rateLimitConfig(env, options, input),
    now: options.rateLimitNow
  };
  const limitResult = aiRequested
    ? await checkRateLimitAsync(event, limitOptions)
    : checkRateLimit(event, limitOptions);
  const limitHeaders = rateLimitHeaders(limitResult);
  if (limitResult.storeType) limitHeaders['X-RateLimit-Store'] = limitResult.storeType;
  if (!limitResult.allowed) {
    return json(429, {
      error: 'Research memo rate limit exceeded.',
      retryAfterSeconds: limitResult.retryAfterSeconds
    }, limitHeaders);
  }
  const memo = await buildResearchMemo(input, {
    env,
    userAgent: options.userAgent,
    companyTickers: options.companyTickers,
    secSubmissions: options.secSubmissions,
    secCompanyFacts: options.secCompanyFacts,
    fredPayload: options.fredPayload,
    ecbPayload: options.ecbPayload,
    fmpProfile: options.fmpProfile,
    fmpRatios: options.fmpRatios,
    fmpNews: options.fmpNews,
    aiResearchUrl: options.aiResearchUrl,
    aiResearchApiKey: options.aiResearchApiKey,
    fetchImpl: options.fetchImpl,
    aiTimeoutMs: options.aiTimeoutMs,
    maxOutputTokens: options.maxOutputTokens,
    userId: user.userId
  });
  return json(200, { ok: true, data: { memo }, memo }, limitHeaders);
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
