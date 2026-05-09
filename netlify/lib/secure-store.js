const crypto = require('node:crypto');

const memoryStores = new Map();

function clean(value) {
  return String(value || '').trim();
}

function normalizeKey(key) {
  const normalized = clean(key).replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.includes('..') || !/^[a-zA-Z0-9._:@/-]+$/.test(normalized)) {
    throw new Error('Invalid store key.');
  }
  return normalized;
}

function createMemoryBackingStore(namespace) {
  if (!memoryStores.has(namespace)) memoryStores.set(namespace, new Map());
  const store = memoryStores.get(namespace);
  return {
    type: 'memory',
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    async list(prefix = '') {
      return [...store.keys()].filter(key => key.startsWith(prefix));
    }
  };
}

function createNetlifyBlobBackingStore(namespace) {
  try {
    const moduleName = '@netlify' + '/blobs';
    const { getStore } = require(moduleName);
    const blobStore = getStore(namespace);
    return {
      type: 'netlify-blobs',
      async get(key) {
        return await blobStore.get(key, { type: 'text' });
      },
      async set(key, value) {
        await blobStore.set(key, value);
      },
      async delete(key) {
        await blobStore.delete(key);
      },
      async list(prefix = '') {
        const result = await blobStore.list({ prefix });
        return (result.blobs || []).map(blob => blob.key);
      }
    };
  } catch {
    return null;
  }
}

function encryptionKey(env = process.env) {
  const secret = clean(env.DATA_ENCRYPTION_KEY || env.SECURE_STORE_KEY || env.PREMIUM_STORE_SECRET);
  return secret ? crypto.createHash('sha256').update(secret).digest() : null;
}

function encryptJson(value, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(value);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return JSON.stringify({
    secureStoreVersion: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64')
  });
}

function decryptJson(raw, key) {
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.secureStoreVersion !== 1) return parsed;
  if (!key) throw new Error('DATA_ENCRYPTION_KEY is required to read encrypted records.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64')),
    decipher.final()
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

function createSecureStore(options = {}) {
  const env = options.env || process.env;
  const namespace = clean(options.namespace || env.SECURE_STORE_NAMESPACE || 'tax-drift');
  const backingStore = options.store || createNetlifyBlobBackingStore(namespace) || createMemoryBackingStore(namespace);
  const key = encryptionKey(env);
  const requireEncryption = backingStore.type !== 'memory' && String(env.SECURE_STORE_ALLOW_PLAINTEXT || '').toLowerCase() !== 'true';

  if (requireEncryption && !key) {
    throw new Error('DATA_ENCRYPTION_KEY is required for persistent secure storage.');
  }

  return {
    namespace,
    backingStoreType: backingStore.type || 'custom',
    async getJson(keyName) {
      const raw = await backingStore.get(normalizeKey(keyName));
      return raw ? decryptJson(raw, key) : null;
    },
    async setJson(keyName, value) {
      const payload = key ? encryptJson(value, key) : JSON.stringify(value);
      await backingStore.set(normalizeKey(keyName), payload);
    },
    async delete(keyName) {
      await backingStore.delete(normalizeKey(keyName));
    },
    async list(prefix = '') {
      return await backingStore.list(prefix ? normalizeKey(prefix) : '');
    }
  };
}

module.exports = {
  createMemoryBackingStore,
  createSecureStore,
  normalizeKey
};
