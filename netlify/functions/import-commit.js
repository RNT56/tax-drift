const { handleApi, json, methodNotAllowed, parseJsonBody } = require('../lib/api-helpers');
const { requirePremiumUser } = require('../lib/premium-auth');
const { createWorkspaceStore } = require('../lib/workspace-store');
const Workspace = require('../../app-workspace');

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
  const incomingPositions = Array.isArray(body.positions) ? body.positions : (Array.isArray(body.snapshotPositions) ? body.snapshotPositions : []);
  const existingImports = Array.isArray(workspace.imports) ? workspace.imports : [];
  const existingHashes = new Set(existingImports.flatMap(item => (item.transactions || []).map(tx => tx.id).filter(Boolean)));
  const existingPositionHashes = new Set(existingImports.flatMap(item => (item.positions || item.snapshotPositions || []).map(position => position.id).filter(Boolean)));
  const deduped = incoming.filter(tx => !tx.id || !existingHashes.has(tx.id));
  const dedupedPositions = incomingPositions.filter(position => !position.id || !existingPositionHashes.has(position.id));
  const committed = {
    id: body.importId || `imp_${Date.now().toString(36)}`,
    committedAt: new Date().toISOString(),
    transactions: deduped,
    positions: dedupedPositions
  };
  const allTransactions = existingImports
    .filter(item => item.id !== committed.id)
    .flatMap(item => item.transactions || [])
    .concat(deduped);
  const allPositions = existingImports
    .filter(item => item.id !== committed.id)
    .flatMap(item => item.positions || item.snapshotPositions || [])
    .concat(dedupedPositions);
  const depotResult = Workspace.buildDepotFromImport
    ? Workspace.buildDepotFromImport({ transactions: allTransactions, positions: allPositions }, { existingPositions: workspace.positions || [] })
    : Workspace.buildDepotFromTransactions
      ? Workspace.buildDepotFromTransactions(allTransactions, { existingPositions: workspace.positions || [] })
    : null;
  const manualPositions = Array.isArray(workspace.positions)
    ? workspace.positions.filter(position => position.source !== 'import' && !position.importedTransactionCount && !position.importedPositionCount)
    : [];
  const ledgerResult = depotResult || { positions: [], errors: [] };
  const positions = [...manualPositions, ...(ledgerResult.positions || [])];
  const updated = await store.update(user.userId, workspaceId, {
    ...workspace,
    positions,
    imports: [...existingImports.filter(item => item.id !== committed.id), committed]
  });
  return json(200, {
    ok: true,
    data: {
      workspace: updated,
      committedTransactions: deduped.length,
      committedPositions: dedupedPositions.length,
      skippedDuplicates: incoming.length - deduped.length,
      skippedPositionDuplicates: incomingPositions.length - dedupedPositions.length,
      warnings: [...(ledgerResult.warnings || []), ...(ledgerResult.errors || [])]
    },
    workspace: updated,
    committedTransactions: deduped.length,
    committedPositions: dedupedPositions.length,
    skippedDuplicates: incoming.length - deduped.length,
    skippedPositionDuplicates: incomingPositions.length - dedupedPositions.length,
    warnings: [...(ledgerResult.warnings || []), ...(ledgerResult.errors || [])]
  });
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
