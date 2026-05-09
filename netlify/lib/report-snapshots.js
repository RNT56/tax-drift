const crypto = require('node:crypto');
const { createSecureStore } = require('./secure-store');

function nowIso() {
  return new Date().toISOString();
}

function clean(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function snapshotKey(userId, snapshotId) {
  return `users/${userId}/report-snapshots/${snapshotId}`;
}

function normalizeSnapshotInput(input = {}) {
  const report = input.report && typeof input.report === 'object' ? input.report : input;
  return {
    title: clean(input.title || report.title, 'Tax Drift report').slice(0, 180),
    workspaceId: clean(input.workspaceId || report.workspaceId),
    baseCurrency: clean(input.baseCurrency || report.baseCurrency, 'EUR').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'EUR',
    report,
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
}

function createReportSnapshotStore(options = {}) {
  const store = options.secureStore || createSecureStore({
    env: options.env,
    namespace: options.namespace || 'tax-drift-reports',
    store: options.store
  });

  return {
    async list(userId) {
      const prefix = `users/${userId}/report-snapshots/`;
      const keys = await store.list(prefix);
      const snapshots = await Promise.all(keys.map(key => store.getJson(key)));
      return snapshots
        .filter(Boolean)
        .map(snapshot => ({
          id: snapshot.id,
          title: snapshot.title,
          workspaceId: snapshot.workspaceId,
          baseCurrency: snapshot.baseCurrency,
          createdAt: snapshot.createdAt
        }))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },
    async get(userId, snapshotId) {
      return await store.getJson(snapshotKey(userId, snapshotId));
    },
    async create(userId, input) {
      const snapshot = {
        id: `rpt_${crypto.randomUUID()}`,
        userId,
        ...normalizeSnapshotInput(input),
        createdAt: nowIso()
      };
      await store.setJson(snapshotKey(userId, snapshot.id), snapshot);
      return snapshot;
    }
  };
}

module.exports = {
  createReportSnapshotStore,
  normalizeSnapshotInput,
  snapshotKey
};
