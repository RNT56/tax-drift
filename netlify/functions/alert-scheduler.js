const { handleApi, json } = require('../lib/api-helpers');
const { createAlertStore, runScheduledAlertCheck } = require('../lib/alert-store');
const { getLatestPrice } = require('../lib/market-data-providers');
const { createWorkspaceStore } = require('../lib/workspace-store');
const crypto = require('node:crypto');

exports.config = {
  schedule: '@hourly'
};

function clean(value) {
  return String(value || '').trim();
}

function getHeader(event, name) {
  const headers = event?.headers || {};
  const wanted = name.toLowerCase();
  const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === wanted);
  return key ? headers[key] : '';
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function bearerToken(event) {
  const authorization = clean(getHeader(event, 'authorization'));
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return clean(match ? match[1] : '');
}

function isNetlifyScheduledEvent(event, context) {
  const markers = [
    getHeader(event, 'x-nf-event'),
    getHeader(event, 'x-netlify-event'),
    getHeader(event, 'x-netlify-scheduled'),
    event?.triggeredBy,
    context?.eventName
  ].map(clean).join(' ').toLowerCase();
  return /\bschedule(?:d)?\b/.test(markers);
}

function assertSchedulerAuthorized(event, context, env) {
  if (env.NODE_ENV === 'test' || isNetlifyScheduledEvent(event, context)) return;
  const secret = clean(env.ALERT_SCHEDULER_SECRET || env.SCHEDULE_SECRET);
  if (!secret) {
    const error = new Error('Alert scheduler is disabled for direct HTTP calls.');
    error.statusCode = 403;
    throw error;
  }
  const provided = clean(getHeader(event, 'x-alert-scheduler-secret') || bearerToken(event));
  if (!provided || !safeEqual(provided, secret)) {
    const error = new Error('Alert scheduler authorization failed.');
    error.statusCode = 401;
    throw error;
  }
}

async function route(event, context, options = {}) {
  const env = options.env || process.env;
  assertSchedulerAuthorized(event, context, env);
  const alertStore = options.alertStore || createAlertStore({ env });
  const workspaceStore = options.workspaceStore || createWorkspaceStore({ env });
  const result = await runScheduledAlertCheck({
    env,
    alertStore,
    workspaceProvider: async (alert) => {
      if (!alert.userId || !alert.workspaceId) return null;
      return workspaceStore.get(alert.userId, alert.workspaceId);
    },
    priceProvider: async (alert) => {
      const { result: quote } = await getLatestPrice({
        symbol: alert.symbol,
        currency: alert.currency,
        sourceCurrency: alert.metadata?.sourceCurrency || alert.currency,
        exchange: alert.metadata?.exchange || ''
      }, env);
      return quote;
    }
  });
  return json(200, result);
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
