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

function normalizeCurrency(value) {
  return String(value || 'EUR').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'EUR';
}

/* ── Handler ───────────────────────────────────────────────────────── */
exports.handler = async (event) => {
  const symbol = String(event.queryStringParameters?.symbol || '').trim();
  const exchange = String(event.queryStringParameters?.exchange || '').trim();
  const currency = normalizeCurrency(event.queryStringParameters?.currency);
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!symbol) {
    return json(400, { error: 'Missing symbol.' });
  }

  if (!apiKey) {
    return json(503, {
      error: 'No market data API key configured.',
      message: 'Live prices require TWELVE_DATA_API_KEY in Netlify. Enter the current price manually or set the environment variable.'
    });
  }

  // Check server-side cache
  const cacheKey = `price:${symbol}:${exchange}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return json(200, { ...cached, cached: true }, 60);
  }

  try {
    const url = new URL('https://api.twelvedata.com/price');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('dp', '6');
    if (exchange) url.searchParams.set('exchange', exchange);

    const response = await fetch(url, {
      headers: {
        Authorization: `apikey ${apiKey}`
      }
    });

    const payload = await response.json().catch(() => ({}));
    const price = Number(payload.price);

    if (!response.ok || payload.status === 'error' || !Number.isFinite(price)) {
      return json(response.ok ? 422 : response.status, {
        error: payload.message || 'Price unavailable for this instrument.',
        source: 'twelvedata'
      });
    }

    const result = {
      symbol,
      exchange,
      currency,
      price,
      source: 'Twelve Data',
      fetchedAt: new Date().toISOString()
    };

    // Cache the successful price lookup
    cacheSet(cacheKey, result);
    return json(200, result, 60);
  } catch (error) {
    return json(502, {
      error: 'Market data request failed.',
      message: error.message,
      source: 'twelvedata'
    });
  }
};
