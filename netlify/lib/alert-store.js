const crypto = require('node:crypto');
const { createSecureStore } = require('./secure-store');

const VALID_DIRECTIONS = new Set(['above', 'below', 'crosses']);

function nowIso() {
  return new Date().toISOString();
}

function clean(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function alertKey(userId, alertId) {
  return `users/${userId}/alerts/${alertId}`;
}

function normalizeAlertInput(input = {}) {
  const symbol = clean(input.symbol).toUpperCase();
  const metric = clean(input.metric || 'price').toLowerCase();
  const direction = clean(input.direction || 'above').toLowerCase();
  const threshold = Number(input.threshold);

  if (!symbol) {
    const error = new Error('Alert symbol is required.');
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(threshold)) {
    const error = new Error('Alert threshold must be numeric.');
    error.statusCode = 400;
    throw error;
  }

  return {
    symbol,
    metric,
    direction: VALID_DIRECTIONS.has(direction) ? direction : 'above',
    threshold,
    currency: clean(input.currency, 'EUR').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'EUR',
    enabled: input.enabled !== false,
    workspaceId: clean(input.workspaceId),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
}

function createAlertStore(options = {}) {
  const store = options.secureStore || createSecureStore({
    env: options.env,
    namespace: options.namespace || 'tax-drift-alerts',
    store: options.store
  });

  return {
    async list(userId) {
      const prefix = `users/${userId}/alerts/`;
      const keys = await store.list(prefix);
      const alerts = await Promise.all(keys.map(key => store.getJson(key)));
      return alerts.filter(Boolean).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    },
    async listAll() {
      const keys = await store.list('users/');
      const alertKeys = keys.filter(key => key.includes('/alerts/'));
      const alerts = await Promise.all(alertKeys.map(key => store.getJson(key)));
      return alerts.filter(Boolean).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    },
    async get(userId, alertId) {
      return await store.getJson(alertKey(userId, alertId));
    },
    async create(userId, input) {
      const timestamp = nowIso();
      const alert = {
        id: `alt_${crypto.randomUUID()}`,
        userId,
        ...normalizeAlertInput(input),
        lastCheckedAt: null,
        lastTriggeredAt: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await store.setJson(alertKey(userId, alert.id), alert);
      return alert;
    },
    async update(userId, alertId, input) {
      const existing = await store.getJson(alertKey(userId, alertId));
      if (!existing) {
        const error = new Error('Alert not found.');
        error.statusCode = 404;
        throw error;
      }
      const updated = {
        ...existing,
        ...normalizeAlertInput({ ...existing, ...input }),
        id: existing.id,
        userId: existing.userId,
        createdAt: existing.createdAt,
        updatedAt: nowIso()
      };
      await store.setJson(alertKey(userId, alertId), updated);
      return updated;
    },
    async delete(userId, alertId) {
      await store.delete(alertKey(userId, alertId));
      return { deleted: true, id: alertId };
    }
  };
}

async function runScheduledAlertCheck(options = {}) {
  const alertStore = options.alertStore;
  const alerts = Array.isArray(options.alerts)
    ? options.alerts
    : (alertStore?.listAll ? await alertStore.listAll() : []);
  const now = nowIso();
  let checkedAlerts = 0;
  let triggeredAlerts = 0;
  const events = [];

  for (const alert of alerts) {
    if (!alert || alert.enabled === false) continue;
    checkedAlerts += 1;
    const value = await resolveAlertValue(alert, options);
    const triggered = isTriggered(alert, value);
    const recentlyTriggered = alert.lastTriggeredAt && Date.now() - Date.parse(alert.lastTriggeredAt) < Number(options.minRepeatMs || 60 * 60 * 1000);
    const patch = {
      ...alert,
      lastCheckedAt: now,
      lastValue: value
    };
    if (triggered && !recentlyTriggered) {
      triggeredAlerts += 1;
      patch.lastTriggeredAt = now;
      events.push({ alertId: alert.id, userId: alert.userId, symbol: alert.symbol, metric: alert.metric, value, threshold: alert.threshold });
      if (typeof options.emailSender === 'function' && (alert.channel === 'email' || alert.metadata?.email)) {
        await options.emailSender(alert, value).catch(() => null);
      }
    }
    if (alertStore?.update && alert.userId && alert.id) {
      await alertStore.update(alert.userId, alert.id, patch).catch(() => null);
    }
  }

  return {
    checkedAt: now,
    checkedAlerts,
    triggeredAlerts,
    events,
    mode: 'evaluated'
  };
}

async function resolveAlertValue(alert, options) {
  if (options.values && Object.prototype.hasOwnProperty.call(options.values, alert.symbol)) {
    return Number(options.values[alert.symbol]);
  }
  if (typeof options.priceProvider === 'function') {
    const result = await options.priceProvider(alert);
    return Number(result?.price ?? result?.value ?? result);
  }
  return Number(alert.lastValue);
}

function isTriggered(alert, value) {
  if (!Number.isFinite(value)) return false;
  const threshold = Number(alert.threshold);
  if (!Number.isFinite(threshold)) return false;
  if (alert.direction === 'below') return value <= threshold;
  if (alert.direction === 'crosses') {
    const last = Number(alert.lastValue);
    return Number.isFinite(last) && ((last < threshold && value >= threshold) || (last > threshold && value <= threshold));
  }
  return value >= threshold;
}

module.exports = {
  alertKey,
  createAlertStore,
  normalizeAlertInput,
  runScheduledAlertCheck,
  resolveAlertValue,
  isTriggered
};
