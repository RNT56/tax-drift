const { normalizeSymbol, searchFallback } = require('../lib/fallback-symbols');

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

function normalizeTwelveDataPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.values)) return payload.values;
  return [];
}

/* ── Handler ───────────────────────────────────────────────────────── */
exports.handler = async (event) => {
  const query = String(event.queryStringParameters?.q || '').trim();
  const limit = Math.min(Math.max(Number(event.queryStringParameters?.limit || 10), 1), 20);

  if (query.length < 2) {
    return json(200, { results: [], source: 'none', hasLiveProvider: Boolean(process.env.TWELVE_DATA_API_KEY) }, 60);
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  const cacheKey = `search:${query.toLowerCase()}:${limit}`;

  if (!apiKey) {
    return json(200, {
      results: searchFallback(query, limit),
      source: 'fallback',
      hasLiveProvider: false,
      message: 'Set TWELVE_DATA_API_KEY in Netlify to enable live symbol search.'
    }, 300);
  }

  // Check server-side cache first
  const cached = cacheGet(cacheKey);
  if (cached) {
    return json(200, { ...cached, cached: true }, 600);
  }

  try {
    const url = new URL('https://api.twelvedata.com/symbol_search');
    url.searchParams.set('symbol', query);
    url.searchParams.set('outputsize', String(limit));

    const response = await fetch(url, {
      headers: {
        Authorization: `apikey ${apiKey}`
      }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status === 'error') {
      const fallbackResult = {
        results: searchFallback(query, limit),
        source: 'fallback',
        hasLiveProvider: true,
        providerError: payload.message || `Twelve Data returned ${response.status}`
      };
      return json(200, fallbackResult, 180);
    }

    const normalized = normalizeTwelveDataPayload(payload)
      .map((item) => normalizeSymbol(item, 'twelvedata'))
      .filter((item) => item.symbol)
      .slice(0, limit);

    const result = {
      results: normalized.length ? normalized : searchFallback(query, limit),
      source: normalized.length ? 'twelvedata' : 'fallback',
      hasLiveProvider: true
    };

    // Cache successful live results
    cacheSet(cacheKey, result);
    return json(200, result, 600);
  } catch (error) {
    return json(200, {
      results: searchFallback(query, limit),
      source: 'fallback',
      hasLiveProvider: true,
      providerError: error.message
    }, 180);
  }
};
