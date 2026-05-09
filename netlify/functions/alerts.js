const { handleApi, json, methodNotAllowed, parseJsonBody, readQuery } = require('../lib/api-helpers');
const { requirePremiumUser } = require('../lib/premium-auth');
const { createAlertStore } = require('../lib/alert-store');

async function route(event, context, options = {}) {
  const user = requirePremiumUser(event, options);
  const store = options.alertStore || createAlertStore({ env: options.env });
  const query = readQuery(event);
  const alertId = String(query.id || '').trim();

  if (event.httpMethod === 'GET') {
    if (alertId) {
      const alert = await store.get(user.userId, alertId);
      return alert ? json(200, { ok: true, data: { alert }, alert }) : json(404, { ok: false, error: { code: 'not_found', message: 'Alert not found.' } });
    }
    const alerts = await store.list(user.userId);
    return json(200, { ok: true, data: { alerts }, alerts });
  }

  if (event.httpMethod === 'POST') {
    const alert = await store.create(user.userId, parseJsonBody(event));
    return json(201, { ok: true, data: { alert }, alert });
  }

  if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
    if (!alertId) return json(400, { error: 'Missing alert id.' });
    const alert = await store.update(user.userId, alertId, parseJsonBody(event));
    return json(200, { ok: true, data: { alert }, alert });
  }

  if (event.httpMethod === 'DELETE') {
    if (!alertId) return json(400, { error: 'Missing alert id.' });
    const result = await store.delete(user.userId, alertId);
    return json(200, { ok: true, data: result, ...result });
  }

  return methodNotAllowed(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
