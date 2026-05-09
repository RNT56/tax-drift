const assert = require('node:assert/strict');
const TaxCore = require('../app-core');
const TaxDecision = require('../app-decision');
const TaxGermany = require('../tax-germany');

function close(actual, expected, epsilon = 1e-6) {
  assert.ok(Math.abs(actual - expected) < epsilon, `Expected ${expected}, got ${actual}`);
}

{
  const input = {
    shares: 10,
    buyPrice: 100,
    currentPrice: 150,
    taxRate: 0.26375,
    transactionCost: 0,
    expectedOldReturn: 0,
    expectedNewReturn: 0.12,
    includeTaxOnNew: true,
    sellFraction: 1,
    fxMode: 'manual',
    positionCurrency: 'USD',
    taxCurrency: 'EUR',
    fxRateBuy: 0.92,
    fxRateNow: 0.91,
    taxProfile: { mode: 'flat' }
  };
  const output = TaxCore.calculateValues(input);
  close(output.sellValue, 1365);
  close(output.costBasis, 920);
  close(output.taxableGain, 445);
  close(output.taxDue, 445 * 0.26375);
  close(output.cashAfter, 1365 - 445 * 0.26375);
  close(output.breakEvenPrice, (1365 - 445 * 0.26375) / 0.91 / 10);
  assert.equal(output.valueCurrency, 'EUR');
  assert.equal(output.positionCurrency, 'USD');
}

{
  const tax = TaxGermany.calculateGermanCapitalGainsTax(1000, {
    saverAllowance: 0,
    churchTaxRate: 0.09
  });
  close(tax.churchTax, 1000 * 0.25 * 0.09);
  close(tax.taxDue, 1000 * 0.25 * 1.055 + 1000 * 0.25 * 0.09);
}

{
  const input = {
    shares: 5,
    buyPrice: 100,
    currentPrice: 200,
    taxRate: 0.26375,
    transactionCost: 0,
    expectedOldReturn: 0.08,
    expectedNewReturn: 0.16,
    includeTaxOnNew: true,
    sellFraction: 1,
    switchTargetPrice: 100,
    switchBuyCost: 0,
    switchAllowFractional: true,
    portfolioValue: 2500,
    currentVolatility: 0.35,
    newVolatility: 0.28,
    portfolioVolatility: 0.16,
    correlationToPortfolio: 0.55,
    maxTolerableLoss: 0.25,
    targetSellPrice: 260,
    targetReachProbability: 0.5,
    taxProfile: { mode: 'flat' }
  };
  const output = TaxCore.calculateValues(input);
  const sw = TaxCore.calculateSwitchUpgrade(input, output);
  const cases = [
    { id: 'bull', name: 'Bull', probability: 0.25, oldReturn: 0.2, newReturn: 0.24 },
    { id: 'base', name: 'Base', probability: 0.5, oldReturn: 0.08, newReturn: 0.16 },
    { id: 'bear', name: 'Bear', probability: 0.25, oldReturn: -0.25, newReturn: -0.15 }
  ];
  const decision = TaxDecision.calculateDecision(input, output, sw, { scenarioCases: cases, customScenarioCases: true });
  assert.equal(decision.tradeScenarios.length, 7);
  assert.ok(decision.scenarioAnalysis.expectedNewValue > 0);
  assert.equal(decision.scenarioAnalysis.cases.length, 3);
  assert.ok(Number.isFinite(decision.scenarioAnalysis.monteCarlo.averageMargin));
  const repeat = TaxDecision.runMonteCarlo(input, output, sw, decision.scenarioAnalysis.cases, { seed: 42, runs: 20 });
  const repeat2 = TaxDecision.runMonteCarlo(input, output, sw, decision.scenarioAnalysis.cases, { seed: 42, runs: 20 });
  assert.deepEqual(repeat, repeat2);
  assert.ok(decision.riskFlags.some(flag => flag.label === 'Concentration risk'));
  assert.ok(decision.assumptionQuality.some(item => item.assumption === 'New-stock return'));
  assert.ok(Number.isFinite(decision.portfolioRisk.riskAdjustedMargin));
  assert.equal(decision.portfolioRisk.correlationToPortfolio, 0.55);
}

{
  const input = {
    shares: 10,
    buyPrice: 150,
    currentPrice: 100,
    taxRate: 0.26375,
    transactionCost: 0,
    expectedOldReturn: 0.03,
    expectedNewReturn: 0.05,
    includeTaxOnNew: true,
    sellFraction: 1,
    taxProfile: { mode: 'de', instrumentTaxClass: 'stock', stockLossPot: 200, churchTaxRate: 0.08 },
    switchTargetInstrument: { symbol: 'VTI', name: 'Vanguard Total Market ETF', currency: 'USD' },
    sectorExposure: 'Broad market'
  };
  const output = TaxCore.calculateValues(input);
  const sw = TaxCore.calculateSwitchUpgrade(input, output);
  const decision = TaxDecision.calculateDecision(input, output, sw);
  const harvest = decision.tradeScenarios.find(item => item.id === 'tax-loss-harvest');
  assert.ok(harvest);
  close(decision.taxLossHarvesting.realizedLoss, 500);
  assert.equal(decision.taxLossHarvesting.lossPotType, 'stock-loss pot');
  assert.equal(decision.taxLossHarvesting.replacementCandidates[0].symbol, 'VTI');
  assert.ok(decision.riskFlags.some(flag => flag.label === 'Tax-loss harvesting candidate'));
}

{
  const input = {
    shares: 10,
    buyPrice: 100,
    currentPrice: 120,
    taxRate: 0.26375,
    transactionCost: 0,
    expectedOldReturn: 0.08,
    expectedNewReturn: 0.1,
    includeTaxOnNew: true,
    sellFraction: 1,
    taxProfile: {
      mode: 'de',
      instrumentTaxClass: 'etf-equity',
      totalExpenseRatio: 0.002,
      trackingDifference: 0.001,
      fundDomicile: 'Ireland',
      distributionPolicy: 'accumulating'
    }
  };
  const output = TaxCore.calculateValues(input);
  const sw = TaxCore.calculateSwitchUpgrade(input, output);
  const decision = TaxDecision.calculateDecision(input, output, sw);
  assert.equal(decision.fundAssumptions.fundDomicile, 'Ireland');
  assert.ok(decision.assumptionQuality.some(item => item.assumption === 'ETF/fund assumptions'));
}

console.log('Decision tests passed');
