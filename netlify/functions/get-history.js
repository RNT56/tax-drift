const { getConfiguredProviders, getHistoricalPrices, normalizeCurrency } = require('../lib/market-data-providers');

const CACHE_MAX = 80;
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function cacheSet(key, value) {
  cache.delete(key);
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { value, ts: Date.now() });
}

function publicHistoryResult(result) {
  const payload = {
    symbol: result.symbol,
    exchange: result.exchange,
    currency: result.currency,
    range: result.range,
    source: 'Market data',
    fetchedAt: result.fetchedAt,
    converted: Boolean(result.converted),
    points: Array.isArray(result.points)
      ? result.points.map(point => ({
        date: point.date,
        close: point.close,
        open: point.open,
        high: point.high,
        low: point.low,
        volume: point.volume
      }))
      : []
  };

  if (result.converted) {
    payload.originalCurrency = result.originalCurrency;
    payload.fxRate = result.fxRate;
    payload.fxFromCurrency = result.fxFromCurrency;
    payload.fxToCurrency = result.fxToCurrency;
  }

  return payload;
}

const json = (statusCode, payload, cacheSeconds = 0) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheSeconds > 0
      ? `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`
      : 'no-store'
  },
  body: JSON.stringify(payload)
});

exports.handler = async (event) => {
  const symbol = String(event.queryStringParameters?.symbol || '').trim();
  const exchange = String(event.queryStringParameters?.exchange || '').trim();
  const range = String(event.queryStringParameters?.range || '1Y').trim().toUpperCase();
  const currency = normalizeCurrency(event.queryStringParameters?.currency);
  const sourceCurrency = normalizeCurrency(event.queryStringParameters?.sourceCurrency || event.queryStringParameters?.assetCurrency || currency);

  if (!symbol) {
    return json(400, { error: 'Missing symbol.' });
  }

  const configuredProviders = getConfiguredProviders();

  if (!configuredProviders.length) {
    return json(503, {
      error: 'No market data API key configured.',
      message: 'Historical prices require configured market data.'
    });
  }

  const providerToken = configuredProviders.map(provider => provider.id).join(',');
  const cacheKey = [
    'history',
    symbol,
    exchange,
    sourceCurrency,
    currency,
    range,
    event.queryStringParameters?.providerSymbol || '',
    event.queryStringParameters?.twelvedataSymbol || '',
    event.queryStringParameters?.fmpSymbol || '',
    event.queryStringParameters?.eodhdSymbol || '',
    event.queryStringParameters?.alphavantageSymbol || '',
    providerToken
  ].join(':');
  const cached = cacheGet(cacheKey);
  if (cached) {
    return json(200, { ...cached, cached: true }, 300);
  }

  try {
    const { result, errors, providerCount } = await getHistoricalPrices({
      symbol,
      exchange,
      micCode: event.queryStringParameters?.mic_code || event.queryStringParameters?.micCode || '',
      currency,
      sourceCurrency,
      range,
      type: event.queryStringParameters?.type || '',
      providerSymbol: event.queryStringParameters?.providerSymbol || '',
      twelvedataSymbol: event.queryStringParameters?.twelvedataSymbol || '',
      fmpSymbol: event.queryStringParameters?.fmpSymbol || '',
      eodhdSymbol: event.queryStringParameters?.eodhdSymbol || '',
      alphavantageSymbol: event.queryStringParameters?.alphavantageSymbol || ''
    });

    if (!result || !Array.isArray(result.points) || !result.points.length) {
      return json(422, {
        error: 'Historical prices unavailable for this instrument.',
        message: 'History unavailable after checking configured market data.',
        errorCount: errors.length,
        checkedProviders: providerCount
      });
    }

    const publicResult = publicHistoryResult(result);
    cacheSet(cacheKey, publicResult);
    return json(200, publicResult, 300);
  } catch (error) {
    return json(502, {
      error: 'Historical market data request failed.',
      message: error.message,
      source: 'Market data'
    });
  }
};
