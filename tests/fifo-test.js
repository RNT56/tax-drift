const assert = require('node:assert/strict');
const Ledger = require('../app-ledger');

function close(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) < epsilon, `Expected ${expected}, got ${actual}`);
}

const lots = [
  { id: 'newer', acquiredAt: '2024-01-01', shares: 10, price: 30, fees: 3 },
  { id: 'older', acquiredAt: '2020-01-01', shares: 8, price: 20, fees: 4 },
  { id: 'middle', acquiredAt: '2022-01-01', shares: 5, price: 25, fees: 5 }
];

{
  const sale = Ledger.fifoSell(lots, { shares: 10, price: 50, fees: 10 });

  assert.deepEqual(sale.fills.map((fill) => fill.lotId), ['older', 'middle']);
  close(sale.fills[0].shares, 8);
  close(sale.fills[0].costBasis, 164);
  close(sale.fills[0].saleFees, 8);
  close(sale.fills[0].gain, 228);
  close(sale.fills[1].shares, 2);
  close(sale.fills[1].costBasis, 52);
  close(sale.totals.proceeds, 500);
  close(sale.totals.saleFees, 10);
  close(sale.totals.costBasis, 216);
  close(sale.totals.gain, 274);
  close(sale.remainingLots.find((lot) => lot.id === 'middle').shares, 3);
}

{
  assert.throws(
    () => Ledger.fifoSell(lots, { shares: 30, price: 50 }),
    /Cannot sell 30 shares/
  );
}

{
  const result = Ledger.buildOpenLotsFromTransactions([
    { id: 'b1', type: 'BUY', tradeDate: '2020-01-01', quantity: 10, price: 20, fees: 2, currency: 'EUR', sourceRow: 1 },
    { id: 'b2', type: 'BUY', tradeDate: '2021-01-01', quantity: 5, grossAmount: 150, currency: 'EUR', sourceRow: 2 },
    { id: 's1', type: 'SELL', tradeDate: '2022-01-01', quantity: 12, price: 40, currency: 'EUR', sourceRow: 3 }
  ]);

  assert.deepEqual(result.errors, []);
  assert.equal(result.lots.length, 1);
  close(result.lots[0].shares, 3);
  close(result.lots[0].price, 30);
}

console.log('FIFO tests passed');
