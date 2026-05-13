const crypto = require('node:crypto');

function clean(value) {
  return String(value || '').trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getHeader(event, name) {
  const headers = event?.headers || {};
  const wanted = name.toLowerCase();
  const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === wanted);
  return key ? headers[key] : '';
}

function getBearerToken(event) {
  const authorization = clean(getHeader(event, 'authorization'));
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return clean(match ? match[1] : getHeader(event, 'x-api-key'));
}

function parseTokenEntries(value) {
  return clean(value)
    .split(',')
    .map(item => clean(item))
    .filter(Boolean)
    .map(item => {
      const [tokenOrHash, userId] = item.split(':').map(clean);
      return { tokenOrHash, userId: userId || '' };
    });
}

function verifyToken(token, env = process.env) {
  if (!token) return null;
  const tokenHash = sha256(token);

  for (const entry of parseTokenEntries(env.PREMIUM_API_TOKEN_HASHES)) {
    if (safeEqual(tokenHash, entry.tokenOrHash)) {
      return { userId: entry.userId || `api:${tokenHash.slice(0, 16)}`, tokenHash };
    }
  }

  for (const entry of parseTokenEntries(env.PREMIUM_API_TOKENS)) {
    if (safeEqual(token, entry.tokenOrHash)) {
      return { userId: entry.userId || `api:${tokenHash.slice(0, 16)}`, tokenHash };
    }
  }

  return null;
}

function normalizeUserId(value) {
  return clean(value).replace(/[^a-zA-Z0-9._:@-]/g, '').slice(0, 120);
}

async function verifySupabaseToken(token, env = process.env) {
  if (!token || !env.SUPABASE_URL || !(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)) {
    return null;
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;

  return {
    userId: normalizeUserId(data.user.id),
    email: clean(data.user.email),
    authType: 'supabase'
  };
}

function requirePremiumUser(event, options = {}) {
  const env = options.env || process.env;
  const identityUser = event?.clientContext?.user || options.context?.clientContext?.user;
  const identityId = normalizeUserId(identityUser?.sub || identityUser?.id || identityUser?.user_id);
  if (identityId) return { userId: identityId, authType: 'netlify-identity' };

  const mockUser = normalizeUserId(env.PREMIUM_TEST_USER_ID);
  if (mockUser && (env.NODE_ENV === 'test' || env.PREMIUM_AUTH_MODE === 'mock')) {
    return { userId: mockUser, authType: 'mock' };
  }

  const token = getBearerToken(event);
  const verified = verifyToken(token, env);
  if (!verified) {
    const error = new Error('Premium authorization required.');
    error.statusCode = 401;
    throw error;
  }

  const trustedHeader = String(env.PREMIUM_TRUST_USER_HEADER || '').toLowerCase() === 'true';
  const headerUserId = trustedHeader ? normalizeUserId(getHeader(event, 'x-user-id')) : '';
  return {
    userId: headerUserId || normalizeUserId(verified.userId),
    authType: 'api-token'
  };
}

async function requirePremiumUserAsync(event, options = {}) {
  const env = options.env || process.env;
  const token = getBearerToken(event);

  if (token) {
    const supabaseUser = await verifySupabaseToken(token, env);
    if (supabaseUser) return supabaseUser;
  }

  return requirePremiumUser(event, options);
}

module.exports = {
  getBearerToken,
  requirePremiumUser,
  requirePremiumUserAsync,
  sha256,
  verifySupabaseToken,
  verifyToken
};
