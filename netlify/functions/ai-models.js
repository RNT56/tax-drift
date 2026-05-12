const { handleApi, json, methodNotAllowed } = require('../lib/api-helpers');
const { listAiProviders } = require('../lib/ai-providers');

async function route(event, context, options = {}) {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
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
