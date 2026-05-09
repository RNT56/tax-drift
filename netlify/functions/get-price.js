const { getConfiguredProviders, getLatestPrice, normalizeCurrency } = require('../lib/market-data-providers');

/* ── In-memory price cache ──────────────────────────────────────────── */
const CACHE_MAX = 100;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes — acceptable for a tax calculator
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

function publicPriceResult(result) {
  const payload = {
    symbol: result.symbol,
    exchange: result.exchange,
    currency: result.currency,
    price: result.price,
    source: 'Market data',
    fetchedAt: result.fetchedAt,
    converted: Boolean(result.converted)
  };

  if (result.converted) {
    payload.originalPrice = result.originalPrice;
    payload.originalCurrency = result.originalCurrency;
    payload.fxRate = result.fxRate;
    payload.fxFromCurrency = result.fxFromCurrency;
    payload.fxToCurrency = result.fxToCurrency;
  }

  return payload;
}

/* ── Helpers ───────────────────────────────────────────────────────── */
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

/* ── Handler ───────────────────────────────────────────────────────── */
exports.handler = async (event) => {
  const symbol = String(event.queryStringParameters?.symbol || '').trim();
  const exchange = String(event.queryStringParameters?.exchange || '').trim();
  const currency = normalizeCurrency(event.queryStringParameters?.currency);
  const sourceCurrency = normalizeCurrency(event.queryStringParameters?.sourceCurrency || event.queryStringParameters?.assetCurrency || currency);

  if (!symbol) {
    return json(400, { error: 'Missing symbol.' });
  }

  const configuredProviders = getConfiguredProviders();

  if (!configuredProviders.length) {
    return json(503, {
      error: 'No market data API key configured.',
      message: 'Live prices require configured market data. Enter the current price manually.'
    });
  }

  // Check server-side cache
  const providerToken = configuredProviders.map(provider => provider.id).join(',');
  const cacheKey = `price:${symbol}:${exchange}:${sourceCurrency}:${currency}:${providerToken}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return json(200, { ...cached, cached: true }, 60);
  }

  try {
    const { result, errors, providerCount } = await getLatestPrice({
      symbol,
      exchange,
      micCode: event.queryStringParameters?.mic_code || event.queryStringParameters?.micCode || '',
      currency,
      sourceCurrency,
      type: event.queryStringParameters?.type || '',
      providerSymbol: event.queryStringParameters?.providerSymbol || '',
      twelvedataSymbol: event.queryStringParameters?.twelvedataSymbol || '',
      fmpSymbol: event.queryStringParameters?.fmpSymbol || '',
      eodhdSymbol: event.queryStringParameters?.eodhdSymbol || '',
      alphavantageSymbol: event.queryStringParameters?.alphavantageSymbol || ''
    });

    if (!result) {
      return json(422, {
        error: 'Price unavailable for this instrument.',
        message: `Price unavailable after checking configured market data. Enter the current price manually.`,
        errorCount: errors.length,
        checkedProviders: providerCount
      });
    }

    const publicResult = publicPriceResult(result);
    cacheSet(cacheKey, publicResult);
    return json(200, publicResult, 60);
  } catch (error) {
    return json(502, {
      error: 'Market data request failed.',
      message: error.message,
      source: 'Market data'
    });
  }
};
