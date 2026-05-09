const { handleApi, json, methodNotAllowed, parseJsonBody } = require('../lib/api-helpers');
const { requirePremiumUser } = require('../lib/premium-auth');
const { parseImportBuffer } = require('../lib/import-parser');
const { createSecureStore } = require('../lib/secure-store');

async function route(event, context, options = {}) {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  const user = requirePremiumUser(event, options);
  const body = parseJsonBody(event);
  const content = body.contentBase64
    ? Buffer.from(body.contentBase64, 'base64')
    : Buffer.from(String(body.text || ''), 'utf8');
  const preview = await parseImportBuffer(content, {
    fileName: body.fileName,
    contentType: body.contentType,
    mapping: body.mapping,
    broker: body.broker,
    accountId: body.accountId,
    currency: body.currency
  });
  const importId = `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  if (content.length) {
    const store = options.importStore || createSecureStore({
      env: options.env || process.env,
      namespace: 'tax-drift-imports',
      store: options.store
    });
    await store.setJson(`users/${user.userId}/imports/${importId}`, {
      id: importId,
      ownerId: user.userId,
      fileName: body.fileName || '',
      contentType: body.contentType || 'text/plain',
      originalBase64: content.toString('base64'),
      preview: { ...preview, rawText: undefined },
      createdAt: new Date().toISOString()
    });
  }
  return json(200, { ok: true, data: { importId, ownerId: user.userId, ...preview }, importId, ...preview });
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
