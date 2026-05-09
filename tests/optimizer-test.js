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

console.log('Optimizer tests passed');
