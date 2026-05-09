const { handleApi, json, methodNotAllowed, parseJsonBody, readQuery } = require('../lib/api-helpers');
const { requirePremiumUser } = require('../lib/premium-auth');
const { createWorkspaceStore } = require('../lib/workspace-store');

async function route(event, context, options = {}) {
  const user = requirePremiumUser(event, options);
  const store = options.workspaceStore || createWorkspaceStore({ env: options.env });
  const query = readQuery(event);
  const workspaceId = String(query.id || '').trim();

  if (event.httpMethod === 'GET') {
    if (workspaceId) {
      const workspace = await store.get(user.userId, workspaceId);
      return workspace ? json(200, { ok: true, data: { workspace }, workspace }) : json(404, { ok: false, error: { code: 'not_found', message: 'Workspace not found.' } });
    }
    const workspaces = await store.list(user.userId);
    return json(200, { ok: true, data: { workspaces }, workspaces });
  }

  if (event.httpMethod === 'POST') {
    const workspace = await store.create(user.userId, parseJsonBody(event));
    return json(201, { ok: true, data: { workspace }, workspace });
  }

  if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
    if (!workspaceId) return json(400, { error: 'Missing workspace id.' });
    const workspace = await store.update(user.userId, workspaceId, parseJsonBody(event));
    return json(200, { ok: true, data: { workspace }, workspace });
  }

  if (event.httpMethod === 'DELETE') {
    if (!workspaceId) return json(400, { error: 'Missing workspace id.' });
    const result = await store.delete(user.userId, workspaceId);
    return json(200, { ok: true, data: result, ...result });
  }

  return methodNotAllowed(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
