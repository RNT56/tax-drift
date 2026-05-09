const assert = require('node:assert/strict');
const Workspace = require('../app-workspace');
const { resolveDecisionMetric, runScheduledAlertCheck } = require('../netlify/lib/alert-store');

{
  const alerts = Workspace.buildAlerts({
    lots: [{ shares: 2, price: 10 }],
    price: 0,
    saleShares: 3,
    taxConfig: { saverAllowance: 1000, saverAllowanceUsed: 1000 },
    expectChurchTax: true
  });

  assert.deepEqual(alerts.map((alert) => alert.code), [
    'missing-price',
    'oversell',
    'church-tax-disabled'
  ]);
}

{
  const alerts = Workspace.buildAlerts({
    lots: [
      { acquiredAt: '2020-01-01', shares: 1, price: 10 },
      { acquiredAt: '2021-01-01', shares: 1, price: 20 }
    ],
    price: 30,
    saleShares: 1,
    taxConfig: { saverAllowance: 1000, saverAllowanceUsed: 1200 }
  });

  assert.deepEqual(alerts.map((alert) => alert.code), [
    'allowance-exhausted',
    'fifo-applies'
  ]);
}

(async () => {
  const updates = [];
  const result = await runScheduledAlertCheck({
    alerts: [
      { id: 'a1', userId: 'u1', symbol: 'SAP', metric: 'price', direction: 'above', threshold: 100, enabled: true },
      { id: 'a2', userId: 'u1', symbol: 'MSFT', metric: 'price', direction: 'below', threshold: 300, enabled: true }
    ],
    values: { SAP: 120, MSFT: 350 },
    alertStore: { update: async (userId, id, patch) => updates.push({ userId, id, patch }) }
  });

  assert.equal(result.checkedAlerts, 2);
  assert.equal(result.triggeredAlerts, 1);
  assert.equal(result.events[0].symbol, 'SAP');
  assert.equal(updates.length, 2);

  const decisionSnapshot = {
    scenarioAnalysis: { expectedMargin: 1250 },
    tradeScenarios: [{ id: 'sell-switch', requiredNewReturn: 0.12 }],
    taxLossHarvesting: { estimatedTaxValue: 275 }
  };
  assert.equal(resolveDecisionMetric('scenario-margin', { decisionSnapshot }), 1250);
  assert.equal(resolveDecisionMetric('switch-hurdle', { decisionSnapshot }), 0.12);
  assert.equal(resolveDecisionMetric('tax-loss-value', { decisionSnapshot }), 275);

  const decisionResult = await runScheduledAlertCheck({
    alerts: [
      {
        id: 'a3',
        userId: 'u1',
        symbol: 'TSLA',
        metric: 'scenario-margin',
        direction: 'above',
        threshold: 1000,
        enabled: true,
        metadata: { decisionSnapshot }
      },
      {
        id: 'a4',
        userId: 'u1',
        symbol: 'TSLA',
        metric: 'position-weight',
        direction: 'above',
        threshold: 0.3,
        enabled: true,
        workspaceId: 'w1'
      }
    ],
    workspaceProvider: async () => ({
      inputs: { portfolioValue: 10000 },
      output: { currentValue: 4200 },
      decisionResult: decisionSnapshot
    }),
    alertStore: { update: async () => null }
  });
  assert.equal(decisionResult.triggeredAlerts, 2);
  assert.equal(decisionResult.events[0].metric, 'scenario-margin');
  console.log('Alert tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
