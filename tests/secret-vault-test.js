const assert = require('node:assert/strict');
const {
  decryptSecret,
  encryptSecret,
  secretFingerprint
} = require('../netlify/lib/secret-vault');

const env = { DATA_ENCRYPTION_KEY: 'test-encryption-key-with-enough-entropy' };
const encrypted = encryptSecret('broker-refresh-token', env);

assert.ok(Buffer.isBuffer(encrypted));
assert.notEqual(encrypted.toString('utf8').includes('broker-refresh-token'), true);
assert.equal(decryptSecret(encrypted, env), 'broker-refresh-token');
assert.equal(encryptSecret('', env), null);
assert.equal(secretFingerprint('token').length, 16);
assert.equal(secretFingerprint('token'), secretFingerprint('token'));

assert.throws(
  () => encryptSecret('secret', {}),
  /DATA_ENCRYPTION_KEY/
);

console.log('Secret vault tests passed');
