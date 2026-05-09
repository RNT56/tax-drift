const { searchFallback } = require('../lib/fallback-symbols');
const { mergeResults, searchLiveProviders } = require('../lib/market-data-providers');

/* ── In-memory LRU cache ───────────────────────────────────────────── */
const CACHE_MAX = 200;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // Move to end (LRU refresh)
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

function publicSymbolResult(item) {
  return {
    id: item.id,
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchange,
    micCode: item.micCode || item.mic_code || '',
    country: item.country,
    currency: item.currency,
    type: item.type,
    provider: item.provider,
    providerSymbol: item.providerSymbol,
    twelvedataSymbol: item.twelvedataSymbol,
    fmpSymbol: item.fmpSymbol,
    eodhdSymbol: item.eodhdSymbol,
    alphavantageSymbol: item.alphavantageSymbol
  };
}

function assetMatchesFilter(item, typeFilter, countryFilter) {
  const type = String(item.type || '').toLowerCase();
  const country = String(item.country || '').toLowerCase();
  const exchange = String(item.exchange || '').toLowerCase();
  const requestedType = String(typeFilter || 'all').toLowerCase();
  const requestedCountry = String(countryFilter || 'all').toLowerCase();

  const typeOk = requestedType === 'all'
    || (requestedType === 'stock' && (type.includes('stock') || type.includes('adr') || type.includes('reit')))
    || (requestedType === 'etf' && type.includes('etf'))
    || (requestedType === 'index' && type.includes('index'))
    || (requestedType === 'fx' && (type.includes('forex') || type.includes('physical currency')))
    || (requestedType === 'crypto' && (type.includes('crypto') || type.includes('digital currency')));

  const countryOk = requestedCountry === 'all'
    || country === requestedCountry
    || exchange.includes(requestedCountry);

  return typeOk && countryOk;
}

/* ── Handler ───────────────────────────────────────────────────────── */
exports.handler = async (event) => {
  const query = String(event.queryStringParameters?.q || '').trim();
  const limit = Math.min(Math.max(Number(event.queryStringParameters?.limit || 10), 1), 20);
  const typeFilter = String(event.queryStringParameters?.type || 'all').trim();
  const countryFilter = String(event.queryStringParameters?.country || 'all').trim();

  if (query.length < 2) {
    return json(200, {
      results: [],
      source: 'none',
      hasLiveProvider: Boolean(process.env.TWELVE_DATA_API_KEY || process.env.FMP_API_KEY || process.env.EODHD_API_KEY || process.env.ALPHA_VANTAGE_API_KEY)
    }, 60);
  }

  const cacheKey = `search:${query.toLowerCase()}:${typeFilter.toLowerCase()}:${countryFilter.toLowerCase()}:${limit}`;

  // Check server-side cache first
  const cached = cacheGet(cacheKey);
  if (cached) {
    return json(200, { ...cached, cached: true }, 600);
  }

  try {
    const resultLimit = Math.min(limit * 3, 60);
    const fallbackResults = searchFallback(query, resultLimit);
    const live = await searchLiveProviders(query, resultLimit);
    const hasLiveProvider = live.configured.length > 0;
    const mergedResults = mergeResults([fallbackResults, live.results], resultLimit)
      .filter(item => assetMatchesFilter(item, typeFilter, countryFilter))
      .slice(0, limit)
      .map(publicSymbolResult);
    const liveSources = live.attempts.filter(attempt => attempt.ok && attempt.results.length).map(attempt => attempt.provider);

    const result = {
      results: mergedResults,
      source: liveSources.length && fallbackResults.length ? 'live+fallback' : liveSources.length ? 'live' : 'fallback',
      hasLiveProvider,
      checkedLiveProviders: live.configured.length
    };

    cacheSet(cacheKey, result);
    return json(200, result, hasLiveProvider ? 600 : 300);
  } catch (error) {
    return json(200, {
      results: searchFallback(query, Math.min(limit * 3, 60))
        .filter(item => assetMatchesFilter(item, typeFilter, countryFilter))
        .slice(0, limit)
        .map(publicSymbolResult),
      source: 'fallback',
      hasLiveProvider: Boolean(process.env.TWELVE_DATA_API_KEY || process.env.FMP_API_KEY || process.env.EODHD_API_KEY || process.env.ALPHA_VANTAGE_API_KEY)
    }, 180);
  }
};
