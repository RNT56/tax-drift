const { ok, fail, methodNotAllowed, withApiHandler } = require('../lib/api-response');
const { generateResearchCopilotResponse } = require('../lib/research-pipeline');
const { createResearchRepository } = require('../lib/research-repository');
const { checkRateLimitAsync, rateLimitHeaders } = require('../lib/rate-limit');
const { assertAllowedModel } = require('../lib/ai-providers');
const { requirePremiumUserAsync } = require('../lib/premium-auth');

async function route(event, context, options = {}) {
  if (event.httpMethod !== 'POST') return methodNotAllowed(event.httpMethod, ['POST']);
  const env = options.env || process.env;
  let user;
  try {
    user = await requirePremiumUserAsync(event, { ...options, context });
  } catch (_error) {
    return fail(401, 'auth_required', 'Research copilot access requires authentication.');
  }
  const input = options.body || (event.body ? JSON.parse(event.body) : {});
  if (!String(input.message || '').trim()) return fail(400, 'missing_message', 'Copilot message is required.');
  if (input.aiProvider) {
    try {
      input.aiModel = assertAllowedModel(input.aiProvider, input.aiModel, env);
    } catch (error) {
      return fail(400, 'model_not_allowed', error.message || 'AI model is not allowed.');
    }
  }
  const limitResult = await checkRateLimitAsync(event, {
    prefix: 'research-copilot',
    keyMode: 'ip',
    env,
    limit: env.RESEARCH_COPILOT_RATE_LIMIT || env.AI_RESEARCH_IP_LIMIT || 10,
    windowSeconds: env.RESEARCH_COPILOT_RATE_WINDOW_SECONDS || env.AI_RESEARCH_IP_WINDOW_SECONDS || 3600,
    store: options.rateLimitStore,
    namespace: options.rateLimitNamespace || env.AI_RATE_LIMIT_NAMESPACE,
    now: options.rateLimitNow
  });
  if (!limitResult.allowed) {
    return fail(429, 'rate_limited', 'Research copilot rate limit exceeded.', {
      retryAfterSeconds: limitResult.retryAfterSeconds
    }, {}, rateLimitHeaders(limitResult));
  }

  const repository = options.researchRepository || createResearchRepository({ env, pool: options.pool });
  let run = null;
  if (input.runId) {
    run = await repository.getRun(user.userId, input.runId);
    if (!run) return fail(404, 'not_found', 'Research run not found.');
  } else if (input.symbol) {
    const runs = await repository.listRuns(user.userId, { symbol: input.symbol, limit: 1 });
    run = runs[0] || { subject: { symbol: input.symbol }, evidence: [], events: [] };
  }
  const response = await generateResearchCopilotResponse(input, run || {}, {
    env,
    fetchImpl: options.fetchImpl,
    aiTimeoutMs: options.aiTimeoutMs,
    maxOutputTokens: options.maxOutputTokens
  });
  const exchange = await repository.appendCopilotExchange(user.userId, input, response);
  return ok({ ...exchange, response });
}

exports.route = route;
exports.handler = (event, context) => withApiHandler((innerEvent, innerContext) => route(innerEvent, innerContext))(event, context);
