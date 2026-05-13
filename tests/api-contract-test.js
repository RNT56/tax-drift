const assert = require('node:assert/strict');
const { ok, fail } = require('../netlify/lib/api-response');
const { READ_ONLY_METHODS, createBrokerProvider, snapTradeUserId } = require('../netlify/lib/broker-provider-adapters');

const success = ok({ value: 1 }, { requestId: 'test' });
assert.equal(success.statusCode, 200);
assert.deepEqual(JSON.parse(success.body), {
  ok: true,
  data: { value: 1 },
  error: null,
  meta: { requestId: 'test' }
});

const failure = fail(422, 'invalid_input', 'Input failed validation.');
assert.equal(failure.statusCode, 422);
assert.equal(JSON.parse(failure.body).error.code, 'invalid_input');

const provider = createBrokerProvider('snaptrade', {
  SNAPTRADE_CLIENT_ID: 'client',
  SNAPTRADE_CONSUMER_KEY: 'secret',
  SNAPTRADE_PORTAL_BASE_URL: 'https://connect.example.test'
}, {
  fetch: async (url, options) => ({
    ok: true,
    status: 200,
    text: async () => {
      if (String(url).includes('/registerUser')) return JSON.stringify({ userSecret: 'secret-1' });
      if (String(url).includes('/login')) return JSON.stringify({ redirectURI: 'https://connect.example.test/session', sessionId: 'session-1' });
      return JSON.stringify([]);
    }
  })
});

assert.equal(provider.id, 'snaptrade');
assert.deepEqual(provider.methods, READ_ONLY_METHODS);
assert.equal(provider.methods.includes('placeTrade'), false);
assert.equal(provider.methods.includes('executeOrder'), false);
assert.equal(snapTradeUserId('user:123', { SNAPTRADE_USER_PREFIX: 'taxswitch' }), 'taxswitch-user:123');

provider.startConnection('user:123').then((connection) => {
  assert.equal(connection.redirectUrl, 'https://connect.example.test/session');
  assert.equal(connection.providerUserSecret, 'secret-1');
  console.log('API contract tests passed');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
