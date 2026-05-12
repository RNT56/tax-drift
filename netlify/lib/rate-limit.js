const crypto = require('node:crypto');
const { createSecureStore } = require('./secure-store');

const memoryStore = new Map();

function clean(value) {
  return String(value || '').trim();
}

function getHeader(event, name) {
  const headers = event?.headers || {};
  const wanted = name.toLowerCase();
  const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === wanted);
  return key ? clean(headers[key]) : '';
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

function parsePositiveInteger(value, fallback) {
  const number = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function isMapLikeStore(store) {
  return store && typeof store.get === 'function' && typeof store.set === 'function';
}

function clientKey(event = {}, prefix = 'default') {
  const identityUser = event.clientContext?.user;
  const identityId = clean(identityUser?.sub || identityUser?.id || identityUser?.user_id);
  if (identityId) return `${prefix}:identity:${hash(identityId)}`;

  const auth = getHeader(event, 'authorization') || getHeader(event, 'x-api-key');
  if (auth) return `${prefix}:auth:${hash(auth)}`;

  const forwarded = getHeader(event, 'x-forwarded-for').split(',')[0];
  const ip = forwarded || getHeader(event, 'x-nf-client-connection-ip') || getHeader(event, 'client-ip') || 'anonymous';
  return `${prefix}:ip:${hash(ip)}`;
}

function clientIpKey(event = {}, prefix = 'default') {
  const forwarded = getHeader(event, 'x-forwarded-for').split(',')[0];
  const ip = forwarded || getHeader(event, 'x-nf-client-connection-ip') || getHeader(event, 'client-ip') || 'anonymous';
  return `${prefix}:ip:${hash(ip)}`;
}

function checkRateLimit(event = {}, options = {}) {
  const env = options.env || process.env;
  const limit = parsePositiveInteger(options.limit ?? env.RATE_LIMIT_LIMIT, 10);
  const windowSeconds = parsePositiveInteger(options.windowSeconds ?? env.RATE_LIMIT_WINDOW_SECONDS, 3600);
  const store = options.store || memoryStore;
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const windowMs = windowSeconds * 1000;
  const key = options.keyMode === 'ip' ? clientIpKey(event, options.prefix || 'default') : clientKey(event, options.prefix || 'default');
  const bucket = (store.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  const oldest = bucket[0] || now;

  if (bucket.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    store.set(key, bucket);
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds,
      resetSeconds: retryAfterSeconds
    };
  }

  bucket.push(now);
  store.set(key, bucket);
  return {
    allowed: true,
    limit,
    remaining: Math.max(limit - bucket.length, 0),
    retryAfterSeconds: 0,
    resetSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000))
  };
}

function createPersistentRateLimitStore(options = {}) {
  const env = options.env || process.env;
  try {
    return createSecureStore({
      env,
      namespace: options.namespace || env.AI_RATE_LIMIT_NAMESPACE || 'tax-drift-ai-rate-limits',
      store: options.store
    });
  } catch {
    return null;
  }
}

async function checkRateLimitAsync(event = {}, options = {}) {
  const env = options.env || process.env;
  const limit = parsePositiveInteger(options.limit ?? env.RATE_LIMIT_LIMIT, 10);
  const windowSeconds = parsePositiveInteger(options.windowSeconds ?? env.RATE_LIMIT_WINDOW_SECONDS, 3600);
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const windowMs = windowSeconds * 1000;
  const key = options.keyMode === 'ip' ? clientIpKey(event, options.prefix || 'default') : clientKey(event, options.prefix || 'default');
  const store = options.store || createPersistentRateLimitStore({ env, namespace: options.namespace });
  const memoryFallback = options.memoryStore || memoryStore;
  const recordKey = `rate/${key}`;
  let bucket;
  let storeType = 'memory';

  if (store?.getJson && store?.setJson) {
    const record = await store.getJson(recordKey).catch(() => null);
    bucket = Array.isArray(record?.timestamps) ? record.timestamps : [];
    storeType = store.backingStoreType || 'persistent';
  } else if (isMapLikeStore(store)) {
    bucket = store.get(key) || [];
    storeType = store.type || 'memory';
  } else {
    bucket = memoryFallback.get(key) || [];
  }

  bucket = bucket.filter(timestamp => now - Number(timestamp) < windowMs);
  const oldest = bucket[0] || now;
  const saveBucket = async (nextBucket) => {
    if (store?.getJson && store?.setJson) {
      await store.setJson(recordKey, { timestamps: nextBucket, updatedAt: new Date(now).toISOString() }).catch(() => {
        memoryFallback.set(key, nextBucket);
        storeType = 'memory';
      });
    } else if (isMapLikeStore(store)) {
      store.set(key, nextBucket);
    } else {
      memoryFallback.set(key, nextBucket);
    }
  };

  if (bucket.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    await saveBucket(bucket);
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds,
      resetSeconds: retryAfterSeconds,
      storeType
    };
  }

  bucket.push(now);
  await saveBucket(bucket);
  return {
    allowed: true,
    limit,
    remaining: Math.max(limit - bucket.length, 0),
    retryAfterSeconds: 0,
    resetSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    storeType
  };
}

function rateLimitHeaders(result = {}) {
  const headers = {
    'X-RateLimit-Limit': String(result.limit ?? ''),
    'X-RateLimit-Remaining': String(result.remaining ?? ''),
    'X-RateLimit-Reset': String(result.resetSeconds ?? '')
  };
  if (!result.allowed && result.retryAfterSeconds) headers['Retry-After'] = String(result.retryAfterSeconds);
  return headers;
}

module.exports = {
  checkRateLimit,
  checkRateLimitAsync,
  createPersistentRateLimitStore,
  clientKey,
  clientIpKey,
  rateLimitHeaders
};
