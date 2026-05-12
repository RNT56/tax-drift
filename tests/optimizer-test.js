const assert = require('node:assert/strict');
const Workspace = require('../app-workspace');

function close(actual, expected, epsilon = 0.01) {
  assert.ok(Math.abs(actual - expected) < epsilon, `Expected ${expected}, got ${actual}`);
}

const lots = [
  { id: 'a', acquiredAt: '2020-01-01', shares: 10, price: 50 },
  { id: 'b', acquiredAt: '2021-01-01', shares: 10, price: 90 }
];

{
  const plan = Workspace.optimizeSaleForTarget(lots, {
    price: 100,
    targetGrossValue: 500,
    taxConfig: { saverAllowance: 0 }
  });

  close(plan.shares, 5);
  close(plan.gross, 500);
  close(plan.result.tax.taxDue, 5 * (100 - 50) * 0.25 * 1.055);
  assert.equal(plan.feasible, true);
}

{
  const plan = Workspace.optimizeSaleForTarget(lots, {
    price: 100,
    targetCash: 300,
    taxConfig: { saverAllowance: 0 }
  });

  close(plan.cash, 300, 0.001);
  assert.equal(plan.feasible, true);
}

{
  const preview = Workspace.parseBrokerCsv('Date;Type;Symbol;Quantity;Price;Currency\n2020-01-01;BUY;SAP;10;100,50;EUR\n2024-01-01;SELL;SAP;2;130,00;EUR');
  assert.equal(preview.rowCount, 2);
  assert.equal(preview.transactions[0].type, 'BUY');
  assert.equal(preview.transactions[0].quantity, 10);
  assert.equal(preview.transactions[0].price, 100.5);
  assert.deepEqual(preview.symbols, ['SAP']);
}

{
  const preview = Workspace.parseBrokerCsv('Name;ISIN;WKN;Stück;Einstandskurs;Aktueller Kurs;Einstandswert;Marktwert;Währung;Depotnummer\nSAP SE;DE0007164600;716460;6;100,00;120,00;600,00;720,00;EUR;12345\n', {
    fileName: 'consorsbank-depot.csv'
  });
  assert.equal(preview.detectedBroker, 'consorsbank');
  assert.equal(preview.importKind, 'positions');
  assert.equal(preview.mappingRequired, false);
  assert.equal(preview.transactions.length, 0);
  assert.equal(preview.positions[0].shares, 6);
  assert.equal(preview.positions[0].currentPrice, 120);
}

{
  const result = Workspace.optimizePortfolio([
    { id: 'sap', symbol: 'SAP', shares: 20, buyPrice: 80, currentPrice: 120, targetWeight: 40, lots: [{ id: 'sap-l1', shares: 20, price: 80 }] },
    { id: 'msft', symbol: 'MSFT', shares: 5, buyPrice: 100, currentPrice: 100, targetWeight: 60, lots: [{ id: 'msft-l1', shares: 5, price: 100 }] }
  ], {
    objective: 'balanced',
    targetTolerancePct: 1,
    minTradeValue: 10,
    taxRate: 0.26375
  });

  assert.ok(result.trades.some(trade => trade.action === 'SELL' && trade.symbol === 'SAP'));
  assert.ok(result.trackingErrorAfter < result.trackingErrorBefore);
}

{
  const depot = Workspace.buildDepotFromTransactions([
    { id: 'sap-buy-1', broker: 'trade-republic', accountId: 'main', type: 'BUY', tradeDate: '2020-01-01', symbol: 'SAP', isin: 'DE0007164600', quantity: 10, price: 80, currency: 'EUR' },
    { id: 'sap-sell-1', broker: 'trade-republic', accountId: 'main', type: 'SELL', tradeDate: '2021-01-01', symbol: 'SAP', isin: 'DE0007164600', quantity: 4, price: 110, currency: 'EUR' },
    { id: 'msft-buy-1', broker: 'interactive-brokers', accountId: 'usd', type: 'BUY', tradeDate: '2020-02-01', symbol: 'MSFT', isin: 'US5949181045', quantity: 2, price: 200, currency: 'USD' },
    { id: 'msft-div-1', broker: 'interactive-brokers', accountId: 'usd', type: 'DIVIDEND', tradeDate: '2020-03-01', symbol: 'MSFT', isin: 'US5949181045', grossAmount: 5, currency: 'USD' }
  ]);

  assert.equal(depot.positions.length, 2);
  assert.equal(depot.accounts.length, 2);
  assert.equal(depot.positions.find(position => position.symbol === 'SAP').shares, 6);
  assert.equal(depot.positions.find(position => position.symbol === 'MSFT').shares, 2);
  assert.equal(depot.cashEvents.length, 1);
}

{
  const depot = Workspace.buildDepotFromImport({
    transactions: [
      { id: 'sap-buy-1', broker: 'trade-republic', accountId: 'main', type: 'BUY', tradeDate: '2020-01-01', symbol: 'SAP', isin: 'DE0007164600', quantity: 10, price: 80, currency: 'EUR' }
    ],
    positions: [
      { id: 'sap-snapshot', broker: 'trade-republic', accountId: 'main', symbol: 'SAP', isin: 'DE0007164600', shares: 8, buyPrice: 80, currentPrice: 130, currency: 'EUR' },
      { id: 'msft-snapshot', broker: 'interactive-brokers', accountId: 'usd', symbol: 'MSFT', isin: 'US5949181045', shares: 2, buyPrice: 200, currentPrice: 300, currency: 'USD' }
    ]
  });
  assert.equal(depot.positions.length, 2);
  assert.equal(depot.positionSnapshotCount, 2);
  assert.equal(depot.positions.find(position => position.symbol === 'SAP').shares, 8);
  assert.equal(depot.positions.find(position => position.symbol === 'SAP').lots.length, 1);
  assert.equal(depot.positions.find(position => position.symbol === 'MSFT').sourceKind, 'snapshot');
}

console.log('Optimizer tests passed');
