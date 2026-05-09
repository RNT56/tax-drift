const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const TaxGermany = require('../tax-germany');

function close(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) < epsilon, `Expected ${expected}, got ${actual}`);
}

{
  const tax = TaxGermany.calculateGermanCapitalGainsTax(2000, {
    saverAllowance: 1000,
    saverAllowanceUsed: 250
  });

  close(tax.allowanceUsed, 750);
  close(tax.taxableGain, 1250);
  close(tax.capitalGainsTax, 312.5);
  close(tax.solidaritySurcharge, 17.1875);
  close(tax.taxDue, 329.6875);
}

{
  const tax = TaxGermany.calculateGermanCapitalGainsTax(1000, {
    fundType: 'stock',
    saverAllowance: 0
  });

  close(tax.exemptGain, 300);
  close(tax.taxableGain, 700);
  close(tax.taxDue, 700 * 0.25 * 1.055);
}

{
  const tax = TaxGermany.calculateGermanCapitalGainsTax(500, {
    saverAllowance: 0,
    carriedForwardLoss: 200,
    withholdingTaxCredit: 100
  });

  close(tax.lossUsed, 200);
  close(tax.taxableGain, 300);
  close(tax.grossTax, 300 * 0.25 * 1.055);
  close(tax.taxDue, 0);
}

{
  const tax = TaxGermany.calculateGermanCapitalGainsTax(1000, {
    saverAllowance: 0,
    churchTaxRate: 0.08
  });

  close(tax.churchTax, 1000 * 0.25 * 0.08);
  close(tax.taxDue, 1000 * 0.25 * 1.055 + 1000 * 0.25 * 0.08);
}

{
  const context = { globalThis: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'tax-germany.js'), 'utf8'), context);
  assert.equal(typeof context.globalThis.TaxGermany.calculateGermanCapitalGainsTax, 'function');
}

console.log('German tax tests passed');
