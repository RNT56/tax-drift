const crypto = require('node:crypto');
const { createSecureStore } = require('./secure-store');

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clean(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function workspaceKey(userId, workspaceId) {
  return `users/${userId}/workspaces/${workspaceId}`;
}

function sanitizeWorkspaceInput(input = {}) {
  const name = clean(input.name || input.title, 'Untitled workspace').slice(0, 160);
  return {
    schemaVersion: Number(input.schemaVersion) || 1,
    name,
    baseCurrency: clean(input.baseCurrency, 'EUR').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'EUR',
    taxCurrency: clean(input.taxCurrency, input.baseCurrency || 'EUR').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'EUR',
    activeScenarioId: clean(input.activeScenarioId),
    taxProfile: input.taxProfile && typeof input.taxProfile === 'object' ? input.taxProfile : { mode: 'flat' },
    positions: Array.isArray(input.positions) ? input.positions : [],
    scenarios: Array.isArray(input.scenarios) ? input.scenarios : [],
    imports: Array.isArray(input.imports) ? input.imports : [],
    alertIds: Array.isArray(input.alertIds) ? input.alertIds : [],
    reportIds: Array.isArray(input.reportIds) ? input.reportIds : [],
    assumptions: input.assumptions && typeof input.assumptions === 'object' ? input.assumptions : {},
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
}

function createWorkspaceStore(options = {}) {
  const store = options.secureStore || createSecureStore({
    env: options.env,
    namespace: options.namespace || 'tax-drift-workspaces',
    store: options.store
  });

  return {
    async list(userId) {
      const prefix = `users/${userId}/workspaces/`;
      const keys = await store.list(prefix);
      const records = await Promise.all(keys.map(key => store.getJson(key)));
      return records
        .filter(Boolean)
        .map(record => ({
          id: record.id,
          name: record.name,
          baseCurrency: record.baseCurrency,
          updatedAt: record.updatedAt,
          createdAt: record.createdAt
        }))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    },
    async get(userId, workspaceId) {
      return await store.getJson(workspaceKey(userId, workspaceId));
    },
    async create(userId, input) {
      const timestamp = nowIso();
      const workspace = {
        id: id('wsp'),
        userId,
        ...sanitizeWorkspaceInput(input),
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await store.setJson(workspaceKey(userId, workspace.id), workspace);
      return workspace;
    },
    async update(userId, workspaceId, input) {
      const existing = await store.getJson(workspaceKey(userId, workspaceId));
      if (!existing) {
        const error = new Error('Workspace not found.');
        error.statusCode = 404;
        throw error;
      }
      const updated = {
        ...existing,
        ...sanitizeWorkspaceInput({ ...existing, ...input }),
        id: existing.id,
        userId: existing.userId,
        createdAt: existing.createdAt,
        updatedAt: nowIso()
      };
      await store.setJson(workspaceKey(userId, workspaceId), updated);
      return updated;
    },
    async delete(userId, workspaceId) {
      await store.delete(workspaceKey(userId, workspaceId));
      return { deleted: true, id: workspaceId };
    }
  };
}

module.exports = {
  createWorkspaceStore,
  sanitizeWorkspaceInput,
  workspaceKey
};
