const { handleApi, json, methodNotAllowed, parseJsonBody, readQuery } = require('../lib/api-helpers');
const { requirePremiumUserAsync } = require('../lib/premium-auth');
const { createReportSnapshotStore } = require('../lib/report-snapshots');

async function route(event, context, options = {}) {
  const user = await requirePremiumUserAsync(event, { ...options, context });
  const store = options.reportSnapshotStore || createReportSnapshotStore({ env: options.env });
  const query = readQuery(event);
  const snapshotId = String(query.id || '').trim();

  if (event.httpMethod === 'GET') {
    if (snapshotId) {
      const snapshot = await store.get(user.userId, snapshotId);
      return snapshot ? json(200, { snapshot }) : json(404, { error: 'Report snapshot not found.' });
    }
    return json(200, { snapshots: await store.list(user.userId) });
  }

  if (event.httpMethod === 'POST') {
    const snapshot = await store.create(user.userId, parseJsonBody(event));
    return json(201, { snapshot });
  }

  return methodNotAllowed(['GET', 'POST']);
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
