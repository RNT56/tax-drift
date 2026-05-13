const { ok, created, fail, methodNotAllowed, withApiHandler } = require('../lib/api-response');
const { buildResearchBundle } = require('../lib/research-pipeline');
const { createResearchRepository } = require('../lib/research-repository');
const { checkRateLimit, checkRateLimitAsync, rateLimitHeaders } = require('../lib/rate-limit');
const { assertAllowedModel } = require('../lib/ai-providers');
const { requirePremiumUserAsync } = require('../lib/premium-auth');

function readQuery(event = {}) {
  return event.queryStringParameters || {};
}

function rateLimitConfig(env = {}, input = {}) {
  const aiRequested = Boolean(input.aiProvider || env.AI_RESEARCH_URL);
  return {
    limit: aiRequested ? (env.RESEARCH_AI_RATE_LIMIT || env.AI_RESEARCH_IP_LIMIT || 5) : (env.RESEARCH_RATE_LIMIT || 20),
    windowSeconds: aiRequested ? (env.RESEARCH_AI_RATE_WINDOW_SECONDS || env.AI_RESEARCH_IP_WINDOW_SECONDS || 3600) : (env.RESEARCH_RATE_WINDOW_SECONDS || 3600)
  };
}

async function route(event, context, options = {}) {
  const env = options.env || process.env;
  let user;
  try {
    user = await requirePremiumUserAsync(event, { ...options, context });
  } catch (_error) {
    return fail(401, 'auth_required', 'Research access requires authentication.');
  }

  const repository = options.researchRepository || createResearchRepository({ env, pool: options.pool });

  if (event.httpMethod === 'GET') {
    const query = readQuery(event);
    if (query.id) {
      const run = await repository.getRun(user.userId, String(query.id));
      return run ? ok({ run }) : fail(404, 'not_found', 'Research run not found.');
    }
    const runs = await repository.listRuns(user.userId, {
      symbol: query.symbol,
      limit: query.limit
    });
    return ok({ runs });
  }

  if (event.httpMethod !== 'POST') return methodNotAllowed(event.httpMethod, ['GET', 'POST']);

  const input = options.body || (event.body ? JSON.parse(event.body) : {});
  if (input.aiProvider) {
    try {
      input.aiModel = assertAllowedModel(input.aiProvider, input.aiModel, env);
    } catch (error) {
      return fail(400, 'model_not_allowed', error.message || 'AI model is not allowed.');
    }
  }

  const aiRequested = Boolean(input.aiProvider || env.AI_RESEARCH_URL);
  const limitOptions = {
    prefix: 'research',
    keyMode: aiRequested ? 'ip' : 'auth',
    env,
    ...rateLimitConfig(env, input),
    store: options.rateLimitStore,
    namespace: options.rateLimitNamespace || env.AI_RATE_LIMIT_NAMESPACE,
    now: options.rateLimitNow
  };
  const limitResult = aiRequested
    ? await checkRateLimitAsync(event, limitOptions)
    : checkRateLimit(event, limitOptions);
  if (!limitResult.allowed) {
    return fail(429, 'rate_limited', 'Research rate limit exceeded.', {
      retryAfterSeconds: limitResult.retryAfterSeconds
    }, {}, rateLimitHeaders(limitResult));
  }

  const bundle = await buildResearchBundle(input, {
    env,
    fetchImpl: options.fetchImpl,
    companyTickers: options.companyTickers,
    secSubmissions: options.secSubmissions,
    secCompanyFacts: options.secCompanyFacts,
    secFilingHtml: options.secFilingHtml,
    fmpProfile: options.fmpProfile,
    fmpRatios: options.fmpRatios,
    fmpNews: options.fmpNews,
    fmpPeers: options.fmpPeers,
    fmpEstimates: options.fmpEstimates,
    fmpEarningsCalendar: options.fmpEarningsCalendar,
    fmpInsider: options.fmpInsider,
    fmpEtfHoldings: options.fmpEtfHoldings,
    alphaOverview: options.alphaOverview,
    alphaEtfProfile: options.alphaEtfProfile,
    alphaNews: options.alphaNews,
    rssFeeds: options.rssFeeds,
    gdeltPayload: options.gdeltPayload,
    reliefWebPayload: options.reliefWebPayload,
    ofacXml: options.ofacXml,
    fredPayload: options.fredPayload,
    aiTimeoutMs: options.aiTimeoutMs,
    maxOutputTokens: options.maxOutputTokens
  });
  const run = await repository.createRun(user.userId, bundle);
  return created({ run });
}

exports.route = route;
exports.handler = (event, context) => withApiHandler((innerEvent, innerContext) => route(innerEvent, innerContext))(event, context);
