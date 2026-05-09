const { handleApi, json, methodNotAllowed, parseJsonBody } = require('../lib/api-helpers');
const { buildResearchMemo } = require('../lib/research-sources');
const { checkRateLimit, rateLimitHeaders } = require('../lib/rate-limit');

function rateLimitConfig(env = {}, options = {}) {
  const aiConfigured = Boolean(options.aiResearchUrl || env.AI_RESEARCH_URL);
  const configuredLimit = options.rateLimit ?? env.AI_RESEARCH_RATE_LIMIT;
  const configuredWindow = options.rateLimitWindowSeconds ?? env.AI_RESEARCH_RATE_WINDOW_SECONDS;
  return {
    limit: configuredLimit || (aiConfigured ? 5 : 20),
    windowSeconds: configuredWindow || 3600,
    store: options.rateLimitStore
  };
}

async function route(event, context, options = {}) {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  const env = options.env || process.env;
  const limitResult = checkRateLimit(event, {
    prefix: 'research-memo',
    env,
    ...rateLimitConfig(env, options)
  });
  const limitHeaders = rateLimitHeaders(limitResult);
  if (!limitResult.allowed) {
    return json(429, {
      error: 'Research memo rate limit exceeded.',
      retryAfterSeconds: limitResult.retryAfterSeconds
    }, limitHeaders);
  }
  const input = parseJsonBody(event);
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
    aiResearchApiKey: options.aiResearchApiKey
  });
  return json(200, { ok: true, data: { memo }, memo }, limitHeaders);
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
