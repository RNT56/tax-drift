const { handleApi, json, methodNotAllowed, parseJsonBody } = require('../lib/api-helpers');
const { requirePremiumUser } = require('../lib/premium-auth');
const { createWorkspaceStore } = require('../lib/workspace-store');
const Ledger = require('../../app-ledger');

async function route(event, context, options = {}) {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  const user = requirePremiumUser(event, options);
  const body = parseJsonBody(event);
  const workspaceId = String(body.workspaceId || '').trim();
  if (!workspaceId) return json(400, { ok: false, error: { code: 'missing_workspace', message: 'Missing workspaceId.' } });
  const store = options.workspaceStore || createWorkspaceStore({ env: options.env });
  const workspace = await store.get(user.userId, workspaceId);
  if (!workspace) return json(404, { ok: false, error: { code: 'not_found', message: 'Workspace not found.' } });
  const incoming = Array.isArray(body.transactions) ? body.transactions : [];
  const existingImports = Array.isArray(workspace.imports) ? workspace.imports : [];
  const existingHashes = new Set(existingImports.flatMap(item => (item.transactions || []).map(tx => tx.id).filter(Boolean)));
  const deduped = incoming.filter(tx => !tx.id || !existingHashes.has(tx.id));
  const committed = {
    id: body.importId || `imp_${Date.now().toString(36)}`,
    committedAt: new Date().toISOString(),
    transactions: deduped
  };
  const allTransactions = existingImports
    .filter(item => item.id !== committed.id)
    .flatMap(item => item.transactions || [])
    .concat(deduped);
  const ledgerResult = Ledger.buildOpenLotsFromTransactions(allTransactions);
  const positions = Array.isArray(workspace.positions) && workspace.positions.length
    ? workspace.positions.slice()
    : [{ id: 'imported-position', name: 'Imported position', lots: [] }];
  positions[0] = {
    ...positions[0],
    lots: ledgerResult.lots || [],
    importedTransactionCount: allTransactions.length
  };
  const updated = await store.update(user.userId, workspaceId, {
    ...workspace,
    positions,
    imports: [...existingImports.filter(item => item.id !== committed.id), committed]
  });
  return json(200, {
    ok: true,
    data: { workspace: updated, committedTransactions: deduped.length, skippedDuplicates: incoming.length - deduped.length, warnings: ledgerResult.errors || [] },
    workspace: updated,
    committedTransactions: deduped.length,
    skippedDuplicates: incoming.length - deduped.length,
    warnings: ledgerResult.errors || []
  });
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
