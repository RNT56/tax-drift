const assert = require('node:assert/strict');

function requiredGrossReturn(cashRatio, oldReturn, taxRate, includeTaxOnGain) {
  if (!Number.isFinite(cashRatio) || cashRatio <= 0) return NaN;
  const requiredNetReturn = (1 + oldReturn) / cashRatio - 1;
  if (!includeTaxOnGain || requiredNetReturn <= 0) return requiredNetReturn;
  return requiredNetReturn / (1 - taxRate);
}

function afterTaxFutureValue(cash, grossReturn, taxRate, includeTaxOnGain) {
  if (!Number.isFinite(grossReturn)) return NaN;
  if (!includeTaxOnGain || grossReturn <= 0) return cash * (1 + grossReturn);
  return cash * (1 + grossReturn * (1 - taxRate));
}

function calculate(input) {
  const currentValue = input.shares * input.currentPrice;
  const costBasis = input.shares * input.buyPrice;
  const taxableGain = Math.max(currentValue - costBasis, 0);
  const taxDue = taxableGain * input.taxRate;
  const cashAfter = Math.max(currentValue - taxDue - input.costs, 0);
  const breakEvenPrice = cashAfter / input.shares;
  const cashRatio = cashAfter / currentValue;
  const requiredNewReturn = requiredGrossReturn(
    cashRatio,
    input.oldReturn,
    input.taxRate,
    input.includeTaxOnNew
  );
  return {
    currentValue,
    costBasis,
    taxableGain,
    taxDue,
    cashAfter,
    breakEvenPrice,
    cashRatio,
    requiredNewReturn,
    futureValueNew: afterTaxFutureValue(cashAfter, input.newReturn, input.taxRate, input.includeTaxOnNew)
  };
}

function close(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} !== ${expected}`);
}

// Appreciated position, 26.375% tax, no costs.
{
  const result = calculate({
    shares: 5,
    buyPrice: 100,
    currentPrice: 200,
    taxRate: 0.26375,
    costs: 0,
    oldReturn: 0,
    newReturn: 0.20,
    includeTaxOnNew: true
  });
  close(result.currentValue, 1000);
  close(result.costBasis, 500);
  close(result.taxableGain, 500);
  close(result.taxDue, 131.875);
  close(result.cashAfter, 868.125);
  close(result.breakEvenPrice, 173.625);
  close(result.cashRatio, 0.868125);
  close(result.requiredNewReturn, ((1 / 0.868125) - 1) / (1 - 0.26375));
  close(result.futureValueNew, 868.125 * (1 + 0.20 * (1 - 0.26375)));
}

// Loss position: no realized-gain tax.
{
  const result = calculate({
    shares: 5,
    buyPrice: 200,
    currentPrice: 100,
    taxRate: 0.26375,
    costs: 0,
    oldReturn: 0,
    newReturn: -0.10,
    includeTaxOnNew: true
  });
  close(result.taxableGain, 0);
  close(result.taxDue, 0);
  close(result.cashAfter, 500);
  close(result.breakEvenPrice, 100);
  close(result.futureValueNew, 450);
}

// Required return can be negative; a negative required return should not be divided by (1-tax).
{
  const result = calculate({
    shares: 10,
    buyPrice: 100,
    currentPrice: 100,
    taxRate: 0.26375,
    costs: 0,
    oldReturn: -0.10,
    newReturn: 0,
    includeTaxOnNew: true
  });
  close(result.cashRatio, 1);
  close(result.requiredNewReturn, -0.10);
}

console.log('Math smoke tests passed.');
