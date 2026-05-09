const { handleApi, json, methodNotAllowed, readQuery } = require('../lib/api-helpers');
const { getConfiguredProviders, getFxRate, normalizeCurrency } = require('../lib/market-data-providers');

const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, ts: Date.now() });
}

async function route(event, context, options = {}) {
  if (event.httpMethod && event.httpMethod !== 'GET') {
    return methodNotAllowed(['GET']);
  }

  const env = options.env || process.env;
  const query = readQuery(event);
  const from = normalizeCurrency(query.from || query.fromCurrency || query.base);
  const to = normalizeCurrency(query.to || query.toCurrency || query.quote);
  const requestedDate = String(query.date || '').trim();

  if (!from || !to) return json(400, { error: 'Missing from/to currency.' });
  if (from === to) {
    return json(200, {
      fromCurrency: from,
      toCurrency: to,
      requestedDate: requestedDate || null,
      effectiveDate: requestedDate || null,
      rate: 1,
      provider: 'same-currency',
      source: 'Same currency',
      fetchedAt: new Date().toISOString()
    }, { 'Cache-Control': 'public, max-age=3600' });
  }

  const configured = getConfiguredProviders(env);
  if (!configured.length) {
    return json(503, {
      error: 'No market data API key configured.',
      message: 'FX rates require configured market data.'
    });
  }

  const cacheKey = `${from}:${to}:${requestedDate}:${configured.map(provider => provider.id).join(',')}`;
  const cached = cacheGet(cacheKey);
  if (cached) return json(200, { ...cached, cached: true }, { 'Cache-Control': 'public, max-age=300' });

  const fx = await getFxRate(from, to, env);
  const payload = {
    fromCurrency: fx.fromCurrency,
    toCurrency: fx.toCurrency,
    requestedDate: requestedDate || null,
    effectiveDate: fx.effectiveDate || requestedDate || null,
    rate: fx.rate,
    provider: fx.provider,
    source: fx.source,
    fetchedAt: new Date().toISOString()
  };
  cacheSet(cacheKey, payload);
  return json(200, payload, { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=300' });
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
