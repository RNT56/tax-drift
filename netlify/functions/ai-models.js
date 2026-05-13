const { handleApi, json, methodNotAllowed } = require('../lib/api-helpers');
const { listAiProviders } = require('../lib/ai-providers');
const { requirePremiumUserAsync } = require('../lib/premium-auth');

async function route(event, context, options = {}) {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  try {
    await requirePremiumUserAsync(event, { ...options, context });
  } catch (_error) {
    return json(401, { ok: false, error: 'AI model access requires authentication.' });
  }
  const providers = await listAiProviders({
    env: options.env || process.env,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs || 8000
  });
  return json(200, {
    ok: true,
    providers,
    configuredProviderCount: providers.filter(provider => provider.configured).length
  }, { 'Cache-Control': 'private, max-age=300' });
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
