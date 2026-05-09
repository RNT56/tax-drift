const assert = require('node:assert/strict');
const TaxCore = require('../app-core.js');

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

function blendLots(lots) {
  let totalShares = 0, totalCost = 0;
  for (const lot of lots) {
    const s = Number(lot.shares), p = Number(lot.price);
    if (Number.isFinite(s) && s > 0 && Number.isFinite(p) && p >= 0) {
      totalShares += s;
      totalCost += s * p;
    }
  }
  if (totalShares <= 0) return null;
  return { totalShares, totalCost, blendedPrice: totalCost / totalShares };
}

function calculate(input) {
  const sellFraction = input.sellFraction ?? 1;
  const sellShares = input.shares * sellFraction;
  const sellValue = sellShares * input.currentPrice;
  const sellCostBasis = sellShares * input.buyPrice;
  const currentValue = input.shares * input.currentPrice;
  const rawGain = sellValue - sellCostBasis;
  const taxableGain = Math.max(rawGain, 0);
  let fxTaxableGain = taxableGain;
  if (input.fxMode === 'manual' && Number.isFinite(input.fxRateBuy) && Number.isFinite(input.fxRateNow)) {
    fxTaxableGain = Math.max(sellValue * input.fxRateNow - sellCostBasis * input.fxRateBuy, 0);
  }
  const taxDue = fxTaxableGain * input.taxRate;
  const costsPortion = input.costs * sellFraction;
  const cashAfter = Math.max(sellValue - taxDue - costsPortion, 0);
  const breakEvenPrice = sellShares > 0 ? cashAfter / sellShares : NaN;
  const cashRatio = sellValue > 0 ? cashAfter / sellValue : NaN;
  const requiredNewReturn = requiredGrossReturn(cashRatio, input.oldReturn, input.taxRate, input.includeTaxOnNew);
  const remainingShares = input.shares - sellShares;
  const remainingValue = remainingShares * input.currentPrice;
  return {
    currentValue, sellShares, sellValue,
    taxableGain: fxTaxableGain, taxDue, cashAfter, breakEvenPrice, cashRatio,
    requiredNewReturn, remainingShares, remainingValue,
    futureValueNew: afterTaxFutureValue(cashAfter, input.newReturn, input.taxRate, input.includeTaxOnNew)
  };
}

function calculateRebalance(shares, buyPrice, currentPrice, taxRate, portfolioValue, targetWeight) {
  const currentValue = shares * currentPrice;
  const currentWeight = currentValue / portfolioValue;
  const targetValue = portfolioValue * (targetWeight / 100);
  const excessValue = currentValue - targetValue;
  if (excessValue <= 0) return { currentWeight, sharesToSell: 0, taxTriggered: 0, cashReleased: 0 };
  const sharesToSell = currentPrice > 0 ? excessValue / currentPrice : 0;
  const gainPerShare = Math.max(currentPrice - buyPrice, 0);
  const taxTriggered = sharesToSell * gainPerShare * taxRate;
  const cashReleased = excessValue - taxTriggered;
  return { currentWeight, sharesToSell, taxTriggered, cashReleased };
}

function close(actual, expected, epsilon = 1e-6) {
  assert.ok(Math.abs(actual - expected) < epsilon, `Expected ${expected}, got ${actual}`);
}

// ── Test 1: Appreciated position, 26.375% tax, no costs ──
{
  const r = calculate({ shares: 5, buyPrice: 100, currentPrice: 200, taxRate: 0.26375, costs: 0, oldReturn: 0, newReturn: 0.20, includeTaxOnNew: true });
  close(r.currentValue, 1000);
  close(r.taxableGain, 500);
  close(r.taxDue, 131.875);
  close(r.cashAfter, 868.125);
  close(r.breakEvenPrice, 173.625);
  close(r.cashRatio, 0.868125);
  close(r.requiredNewReturn, ((1 / 0.868125) - 1) / (1 - 0.26375));
  close(r.futureValueNew, 868.125 * (1 + 0.20 * (1 - 0.26375)));
}

// ── Test 2: Loss position — no realized-gain tax ──
{
  const r = calculate({ shares: 5, buyPrice: 200, currentPrice: 100, taxRate: 0.26375, costs: 0, oldReturn: 0, newReturn: -0.10, includeTaxOnNew: true });
  close(r.taxableGain, 0);
  close(r.taxDue, 0);
  close(r.cashAfter, 500);
  close(r.breakEvenPrice, 100);
  close(r.futureValueNew, 450);
}

// ── Test 3: Negative required return stays negative ──
{
  const r = calculate({ shares: 10, buyPrice: 100, currentPrice: 100, taxRate: 0.26375, costs: 0, oldReturn: -0.10, newReturn: 0, includeTaxOnNew: true });
  close(r.cashRatio, 1);
  close(r.requiredNewReturn, -0.10);
}

// ── Test 4: Partial sell (50%) ──
{
  const r = calculate({ shares: 10, buyPrice: 100, currentPrice: 200, taxRate: 0.26375, costs: 0, oldReturn: 0, newReturn: 0, includeTaxOnNew: true, sellFraction: 0.5 });
  close(r.sellShares, 5);
  close(r.sellValue, 1000);
  close(r.taxableGain, 500); // gain on sold portion
  close(r.taxDue, 131.875);
  close(r.cashAfter, 868.125);
  close(r.remainingShares, 5);
  close(r.remainingValue, 1000);
}

// ── Test 5: Multi-lot blending (3 lots) ──
{
  const blend = blendLots([
    { shares: 10, price: 50 },
    { shares: 20, price: 75 },
    { shares: 30, price: 100 }
  ]);
  assert.ok(blend !== null);
  close(blend.totalShares, 60);
  close(blend.totalCost, 10*50 + 20*75 + 30*100); // 500 + 1500 + 3000 = 5000
  close(blend.blendedPrice, 5000 / 60); // ~83.333
}

// ── Test 6: FX-adjusted gain ──
{
  // USD stock, EUR tax. Buy: 100 USD at 0.92 EUR/USD, Sell: 150 USD at 0.91 EUR/USD
  const r = calculate({
    shares: 10, buyPrice: 100, currentPrice: 150, taxRate: 0.26375, costs: 0,
    oldReturn: 0, newReturn: 0, includeTaxOnNew: true,
    fxMode: 'manual', fxRateBuy: 0.92, fxRateNow: 0.91
  });
  // FX gain: (10*150*0.91) - (10*100*0.92) = 1365 - 920 = 445
  close(r.taxableGain, 445);
  close(r.taxDue, 445 * 0.26375);
}

// ── Test 7: Rebalance — shares to sell for target weight ──
{
  // 100 shares at $50 = $5000. Portfolio = $20000. Target = 15%.
  const rb = calculateRebalance(100, 30, 50, 0.26375, 20000, 15);
  // Target value = 3000. Excess = 2000. Shares to sell = 40.
  close(rb.sharesToSell, 40);
  // Gain per share = 50-30 = 20. Tax = 40*20*0.26375 = 211
  close(rb.taxTriggered, 40 * 20 * 0.26375);
  close(rb.cashReleased, 2000 - 40 * 20 * 0.26375);
  close(rb.currentWeight, 0.25);
}

// ── Test 8: Edge — 0% sell ──
{
  const r = calculate({ shares: 10, buyPrice: 100, currentPrice: 200, taxRate: 0.26375, costs: 0, oldReturn: 0, newReturn: 0, includeTaxOnNew: true, sellFraction: 0 });
  close(r.sellShares, 0);
  close(r.cashAfter, 0);
  close(r.remainingShares, 10);
}

// ── Test 9: Edge — 100% sell ──
{
  const r = calculate({ shares: 10, buyPrice: 100, currentPrice: 200, taxRate: 0.26375, costs: 10, oldReturn: 0, newReturn: 0, includeTaxOnNew: true, sellFraction: 1 });
  close(r.sellShares, 10);
  const taxDue = (2000 - 1000) * 0.26375;
  close(r.cashAfter, 2000 - taxDue - 10);
  close(r.remainingShares, 0);
}

// ── Test 10: Loss position partial sell ──
{
  const r = calculate({ shares: 20, buyPrice: 150, currentPrice: 80, taxRate: 0.26375, costs: 0, oldReturn: 0, newReturn: 0, includeTaxOnNew: true, sellFraction: 0.5 });
  close(r.sellShares, 10);
  close(r.taxableGain, 0); // loss, no tax
  close(r.taxDue, 0);
  close(r.cashAfter, 800); // 10 * 80
  close(r.remainingShares, 10);
  close(r.remainingValue, 800);
}

// ── Test 11: Switch target with buy cost and whole-share residual ──
{
  const input = {
    shares: 5,
    buyPrice: 100,
    currentPrice: 200,
    taxRate: 0.26375,
    transactionCost: 0,
    expectedOldReturn: 0,
    expectedNewReturn: 0.20,
    includeTaxOnNew: true,
    sellFraction: 1,
    switchTargetPrice: 300,
    switchBuyCost: 10,
    switchAllowFractional: false,
    taxProfile: { mode: 'flat' }
  };
  const output = TaxCore.calculateValues(input);
  const sw = TaxCore.calculateSwitchUpgrade(input, output);
  close(output.cashAfter, 868.125);
  close(sw.investableCash, 858.125);
  close(sw.targetShares, 2);
  close(sw.targetInvested, 600);
  close(sw.residualCash, 258.125);
  close(sw.requiredTargetReturn, ((1000 - 258.125) / 600 - 1) / (1 - 0.26375));
  close(sw.futureValueNew, 600 * (1 + 0.20 * (1 - 0.26375)) + 258.125);
}

// ── Test 12: Fractional switch invests all available cash ──
{
  const input = {
    shares: 10,
    buyPrice: 80,
    currentPrice: 120,
    taxRate: 0.25,
    transactionCost: 12,
    expectedOldReturn: 0.05,
    expectedNewReturn: 0.12,
    includeTaxOnNew: false,
    sellFraction: 0.5,
    switchTargetPrice: 40,
    switchBuyCost: 4,
    switchAllowFractional: true,
    taxProfile: { mode: 'flat' }
  };
  const output = TaxCore.calculateValues(input);
  const sw = TaxCore.calculateSwitchUpgrade(input, output);
  close(output.sellValue, 600);
  close(output.taxDue, 50);
  close(output.cashAfter, 544);
  close(sw.investableCash, 540);
  close(sw.targetShares, 13.5);
  close(sw.targetInvested, 540);
  close(sw.residualCash, 0);
  close(sw.requiredTargetReturn, (600 * 1.05) / 540 - 1);
  close(sw.futureValueNew, 540 * 1.12);
}

console.log('Math smoke tests passed. (12 tests)');
