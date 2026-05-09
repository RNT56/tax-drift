const { handleApi, json } = require('../lib/api-helpers');
const { createAlertStore, runScheduledAlertCheck } = require('../lib/alert-store');
const { getLatestPrice } = require('../lib/market-data-providers');
const { createWorkspaceStore } = require('../lib/workspace-store');

exports.config = {
  schedule: '@hourly'
};

async function route(event, context, options = {}) {
  const env = options.env || process.env;
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
