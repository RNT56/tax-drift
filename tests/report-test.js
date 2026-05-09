const assert = require('node:assert/strict');
const Ledger = require('../app-ledger');
const Workspace = require('../app-workspace');

const sale = Ledger.taxableFifoSale(
  [{ id: 'a', acquiredAt: '2020-01-01', shares: 4, price: 100 }],
  { shares: 4, price: 150, fees: 4 },
  { saverAllowance: 0 }
);

const report = Workspace.generateTaxReport(sale, {
  title: 'Example report',
  currency: 'EUR'
});

assert.equal(report.rows[0][1], 'Example report');
assert.equal(report.rows.find((row) => row[0] === 'Shares sold')[1], 4);
assert.equal(report.rows.find((row) => row[0] === 'Realized gain')[1], 196);
assert.match(report.csv, /Example report/);
assert.match(report.csv, /Tax due/);
assert.equal(report.fills.length, 1);

console.log('Report tests passed');
