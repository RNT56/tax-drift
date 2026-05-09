/* Risk-aware decision helpers. Pure JS, browser and Node compatible. */
(function initTaxDecision(root, factory) {
  const coreApi = root.TaxCore || (typeof require === 'function' ? require('./app-core') : root);
  const taxApi = root.TaxGermany || (typeof require === 'function' ? require('./tax-germany') : null);
  const api = factory(coreApi, taxApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TaxDecision = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function taxDecisionFactory(Core, TaxGermany) {
  /**
   * @typedef {Object} ScenarioCase
   * @property {string} id
   * @property {string} name
   * @property {number} probability Probability as 0..1.
   * @property {number} oldReturn Current holding price return assumption.
   * @property {number} newReturn Target instrument price return assumption.
   * @property {number} oldDividendYield Current holding dividend yield assumption.
   * @property {number} newDividendYield Target instrument dividend yield assumption.
   * @property {number} fxReturn Currency impact assumption for foreign holdings.
   * @property {number} targetReachProbability Probability that a target sale is reached.
   */

  /**
   * @typedef {Object} TradeScenario
   * @property {string} id
   * @property {string} label
   * @property {number} taxNow
   * @property {number} investableCash
   * @property {number} requiredNewReturn
   * @property {number} requiredDelta
   * @property {number} expectedValue
   * @property {number} downsideValue
   * @property {number} opportunityCost
   * @property {number} concentrationAfter
   * @property {number} marginVsHurdle
   * @property {string[]} notes
   */

  /**
   * @typedef {Object} RiskFlag
   * @property {string} category
   * @property {string} label
   * @property {string} message
   * @property {'low'|'medium'|'high'} severity
   * @property {'low'|'medium'|'high'} confidence
   */

  /**
   * @typedef {Object} AssumptionQuality
   * @property {string} assumption
   * @property {'low'|'medium'|'high'} confidence
   * @property {string} reason
   */

  /**
   * @typedef {Object} DecisionResult
   * @property {TradeScenario[]} tradeScenarios
   * @property {Object} scenarioAnalysis
   * @property {RiskFlag[]} riskFlags
   * @property {AssumptionQuality[]} assumptionQuality
   */

  const RISK_CATALOG = Object.freeze({
    stockSpecific: ['valuation risk', 'earnings miss risk', 'margin compression', 'revenue slowdown', 'management risk', 'product risk', 'competitive pressure', 'regulatory/legal risk', 'debt/refinancing risk', 'dilution risk', 'capital allocation risk', 'customer concentration', 'supply-chain risk'],
    market: ['recession risk', 'interest-rate risk', 'inflation risk', 'liquidity risk', 'market multiple compression', 'sector rotation', 'credit stress', 'volatility regime', 'drawdown risk'],
    tradeExecution: ['price gaps', 'bid/ask spread', 'delayed quotes', 'slippage', 'order type risk', 'low liquidity', 'after-hours movement', 'tax-year timing'],
    timing: ['sell too early', 'target never reached', 'stock rises after sale', 'new stock underperforms', 'cash drag', 'missed dividend', 'earnings event surprise'],
    tax: ['wrong cost basis', 'ignored lot order', 'unused allowance', 'church tax', 'loss offset availability', 'ETF partial exemption', 'foreign withholding tax', 'tax-law changes', 'foreign broker reporting issues'],
    behavioral: ['panic selling', 'anchoring to price targets', 'overconfidence', 'confirmation bias', 'revenge trading', 'refusing to realize loss', 'chasing recent winners'],
    dataModel: ['stale prices', 'wrong symbol', 'wrong currency', 'delayed market data', 'bad API data', 'hallucinated AI research', 'outdated filings', 'analyst estimate errors', 'hidden assumptions']
  });

  function finiteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function finiteOrNaN(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function pct(value, fallback = 0) {
    return clamp(finiteNumber(value, fallback), -0.9999, 10);
  }

  function normalizeScenarioCases(cases) {
    const source = Array.isArray(cases) && cases.length ? cases : defaultScenarioCases();
    const normalized = source.map((item, index) => ({
      id: String(item.id || `case-${index + 1}`),
      name: String(item.name || `Case ${index + 1}`),
      probability: Math.max(finiteNumber(item.probability, 0), 0),
      oldReturn: pct(item.oldReturn),
      newReturn: pct(item.newReturn),
      oldDividendYield: Math.max(finiteNumber(item.oldDividendYield, 0), 0),
      newDividendYield: Math.max(finiteNumber(item.newDividendYield, 0), 0),
      fxReturn: pct(item.fxReturn, 0),
      targetReachProbability: clamp(finiteNumber(item.targetReachProbability, 1), 0, 1)
    }));
    const total = normalized.reduce((sum, item) => sum + item.probability, 0);
    if (total <= 0) return normalized.map(item => ({ ...item, probability: 1 / normalized.length }));
    return normalized.map(item => ({ ...item, probability: item.probability / total }));
  }

  function defaultScenarioCases(input = {}) {
    const oldBase = Number.isFinite(input.expectedOldReturn) ? input.expectedOldReturn : 0.06;
    const newBase = Number.isFinite(input.expectedNewReturn) ? input.expectedNewReturn : 0.08;
    return [
      { id: 'bull', name: 'Bull', probability: 0.15, oldReturn: oldBase + 0.18, newReturn: newBase + 0.16, oldDividendYield: 0, newDividendYield: 0, fxReturn: 0.02, targetReachProbability: 0.8 },
      { id: 'base', name: 'Base', probability: 0.35, oldReturn: oldBase, newReturn: newBase, oldDividendYield: 0, newDividendYield: 0, fxReturn: 0, targetReachProbability: 0.55 },
      { id: 'bear', name: 'Bear', probability: 0.18, oldReturn: oldBase - 0.22, newReturn: newBase - 0.18, oldDividendYield: 0, newDividendYield: 0, fxReturn: -0.03, targetReachProbability: 0.2 },
      { id: 'recession', name: 'Recession', probability: 0.12, oldReturn: oldBase - 0.32, newReturn: newBase - 0.28, oldDividendYield: 0, newDividendYield: 0, fxReturn: -0.04, targetReachProbability: 0.12 },
      { id: 'rate-cut', name: 'Rate cut', probability: 0.08, oldReturn: oldBase + 0.08, newReturn: newBase + 0.10, oldDividendYield: 0, newDividendYield: 0, fxReturn: -0.01, targetReachProbability: 0.6 },
      { id: 'no-growth', name: 'No growth', probability: 0.07, oldReturn: 0, newReturn: 0, oldDividendYield: 0, newDividendYield: 0, fxReturn: 0, targetReachProbability: 0.25 },
      { id: 'multiple-compression', name: 'Multiple compression', probability: 0.05, oldReturn: oldBase - 0.18, newReturn: newBase - 0.22, oldDividendYield: 0, newDividendYield: 0, fxReturn: 0, targetReachProbability: 0.18 }
    ];
  }

  function afterTaxFutureValue(input, cash, grossReturn) {
    if (input?.taxProfile?.mode === 'de' && TaxGermany?.afterGermanTaxFutureValue) {
      return TaxGermany.afterGermanTaxFutureValue(cash, grossReturn, input.taxProfile);
    }
    return Core.afterTaxFutureValue(cash, grossReturn, finiteNumber(input.taxRate, 0), input.includeTaxOnNew !== false);
  }

  function dividendAfterTax(input, value, dividendYield) {
    const gross = Math.max(finiteNumber(value, 0) * Math.max(finiteNumber(dividendYield, 0), 0), 0);
    if (!gross) return 0;
    if (input?.taxProfile?.mode === 'de' && TaxGermany?.calculateGermanTax) {
      return gross - TaxGermany.calculateGermanTax({ grossGain: gross, profile: input.taxProfile }).taxDue;
    }
    return gross * (1 - finiteNumber(input.taxRate, 0));
  }

  function calculateScenarioValues(input, output, switchOutput, scenarioCase) {
    const fundDrag = getFundReturnDrag(input);
    const oldReturn = scenarioCase.oldReturn + (output.fxReturn || 0) + scenarioCase.fxReturn - fundDrag.old;
    const newReturn = scenarioCase.newReturn + scenarioCase.fxReturn - fundDrag.new;
    const oldValue = afterTaxFutureValue(input, output.sellValue, oldReturn) + dividendAfterTax(input, output.sellValue, scenarioCase.oldDividendYield);
    const newBase = Number.isFinite(switchOutput.targetInvested) ? switchOutput.targetInvested : switchOutput.investableCash;
    const newValue = afterTaxFutureValue(input, newBase, newReturn) + finiteNumber(switchOutput.residualCash, 0) + dividendAfterTax(input, newBase, scenarioCase.newDividendYield);
    const cashValue = finiteNumber(output.cashAfter, 0);
    const winner = newValue > oldValue && newValue > cashValue ? 'switch' : oldValue >= cashValue ? 'hold' : 'cash';
    return {
      ...scenarioCase,
      oldValue,
      newValue,
      cashValue,
      decisionMargin: newValue - oldValue,
      maximumLoss: Math.min(oldValue, newValue, cashValue) - output.sellValue,
      winner
    };
  }

  function summarizeScenarioAnalysis(input, output, switchOutput, cases) {
    const normalized = normalizeScenarioCases(cases);
    const rows = normalized.map(item => calculateScenarioValues(input, output, switchOutput, item));
    const expectedOldValue = rows.reduce((sum, row) => sum + row.oldValue * row.probability, 0);
    const expectedNewValue = rows.reduce((sum, row) => sum + row.newValue * row.probability, 0);
    const expectedCashValue = rows.reduce((sum, row) => sum + row.cashValue * row.probability, 0);
    const winnerCounts = rows.reduce((acc, row) => {
      acc[row.winner] = (acc[row.winner] || 0) + 1;
      return acc;
    }, { hold: 0, switch: 0, cash: 0 });
    return {
      cases: rows,
      expectedOldValue,
      expectedNewValue,
      expectedCashValue,
      expectedMargin: expectedNewValue - expectedOldValue,
      worstCaseValue: Math.min(...rows.flatMap(row => [row.oldValue, row.newValue, row.cashValue])),
      maximumLoss: Math.min(...rows.map(row => row.maximumLoss)),
      winnerCounts,
      monteCarlo: runMonteCarlo(input, output, switchOutput, rows, { seed: finiteNumber(input.monteCarloSeed, 42), runs: 500 })
    };
  }

  function weightedMean(rows, key) {
    return rows.reduce((sum, row) => sum + finiteNumber(row[key], 0) * finiteNumber(row.probability, 0), 0);
  }

  function weightedStd(rows, key, fallback = NaN) {
    if (!Array.isArray(rows) || !rows.length) return fallback;
    const mean = weightedMean(rows, key);
    const variance = rows.reduce((sum, row) => {
      const diff = finiteNumber(row[key], mean) - mean;
      return sum + diff * diff * finiteNumber(row.probability, 0);
    }, 0);
    return Math.sqrt(Math.max(variance, 0));
  }

  function lcg(seed) {
    let state = (Math.trunc(seed) >>> 0) || 1;
    return () => {
      state = Math.imul(1664525, state) + 1013904223 >>> 0;
      return state / 4294967296;
    };
  }

  function runMonteCarlo(input, output, switchOutput, rows, options = {}) {
    const rand = lcg(options.seed || 42);
    const runs = Math.max(Math.trunc(finiteNumber(options.runs, 500)), 1);
    const cumulative = [];
    rows.reduce((sum, row) => {
      const next = sum + row.probability;
      cumulative.push({ row, threshold: next });
      return next;
    }, 0);
    const margins = [];
    let switchWins = 0;
    for (let i = 0; i < runs; i += 1) {
      const r = rand();
      const picked = (cumulative.find(item => r <= item.threshold) || cumulative[cumulative.length - 1]).row;
      const noiseOld = (rand() - 0.5) * 0.08;
      const noiseNew = (rand() - 0.5) * 0.08;
      const oldValue = afterTaxFutureValue(input, output.sellValue, picked.oldReturn + noiseOld);
      const newValue = afterTaxFutureValue(input, switchOutput.targetInvested || switchOutput.investableCash, picked.newReturn + noiseNew) + finiteNumber(switchOutput.residualCash, 0);
      const margin = newValue - oldValue;
      margins.push(margin);
      if (margin > 0) switchWins += 1;
    }
    margins.sort((a, b) => a - b);
    const quantile = (q) => margins[Math.min(margins.length - 1, Math.max(0, Math.floor(q * (margins.length - 1))))];
    return {
      runs,
      seed: options.seed || 42,
      averageMargin: margins.reduce((sum, value) => sum + value, 0) / margins.length,
      switchWinRate: switchWins / runs,
      p10Margin: quantile(0.10),
      p50Margin: quantile(0.50),
      p90Margin: quantile(0.90)
    };
  }

  function scenarioNote(text, condition = true) {
    return condition ? [text] : [];
  }

  function getFundReturnDrag(input = {}) {
    const profile = input.taxProfile || {};
    const isFund = /etf|fund/i.test(profile.instrumentTaxClass || input.instrumentTaxClass || '');
    if (!isFund) return { old: 0, new: 0 };
    const ter = Math.max(finiteNumber(profile.totalExpenseRatio ?? input.totalExpenseRatio, 0), 0);
    const tracking = finiteNumber(profile.trackingDifference ?? input.trackingDifference, 0);
    const drag = Math.max(ter + tracking, -0.10);
    return { old: drag, new: drag };
  }

  function buildReplacementCandidates(input = {}) {
    const candidates = [];
    const target = input.switchTargetInstrument;
    if (target?.symbol || target?.name) {
      candidates.push({
        symbol: target.symbol || '',
        name: target.name || target.symbol || 'Selected target instrument',
        currency: target.currency || input.currencyCode || '',
        source: 'selected target instrument',
        caveat: 'Review exposure similarity, tax classification, FX and concentration before treating this as a replacement.'
      });
    }
    if (input.sectorExposure || input.countryExposure) {
      candidates.push({
        symbol: '',
        name: 'Manual replacement basket',
        currency: input.currencyCode || '',
        source: 'portfolio exposure assumptions',
        caveat: `Maintain intended exposure while avoiding excess concentration in ${[input.sectorExposure, input.countryExposure].filter(Boolean).join(' / ') || 'the same risk bucket'}.`
      });
    }
    return candidates;
  }

  function evaluateTaxLossHarvesting(input, output) {
    const rawGain = finiteNumber(output.rawGain, NaN);
    const realizedLoss = Number.isFinite(rawGain) ? Math.max(-rawGain, 0) : 0;
    const profile = input.taxProfile || {};
    const taxClass = profile.instrumentTaxClass || 'stock';
    const isStockLoss = taxClass === 'stock';
    const existingPot = isStockLoss ? finiteNumber(profile.stockLossPot, 0) : finiteNumber(profile.otherLossPot, 0);
    const effectiveTaxRate = input.taxProfile?.mode === 'de'
      ? 0.25 * (1 + 0.055 + finiteNumber(profile.churchTaxRate, 0))
      : finiteNumber(input.taxRate, 0);
    const estimatedTaxValue = realizedLoss * Math.max(effectiveTaxRate, 0);
    return {
      applicable: realizedLoss > 0,
      realizedLoss,
      lossPotType: isStockLoss ? 'stock-loss pot' : 'other capital-income loss pot',
      estimatedTaxValue,
      lossPotAfterSale: existingPot + realizedLoss,
      replacementCandidates: buildReplacementCandidates(input),
      caveat: isStockLoss
        ? 'German stock losses are modeled separately from other capital income; verify broker and tax-office handling.'
        : 'Replacement exposure and fund classification should be checked before relying on the offset.'
    };
  }

  function getFundAssumptions(input = {}) {
    const profile = input.taxProfile || {};
    const taxClass = profile.instrumentTaxClass || input.instrumentTaxClass || 'stock';
    const isFund = /etf|fund/i.test(taxClass);
    if (!isFund) return null;
    return {
      taxClass,
      distributionPolicy: profile.distributionPolicy || 'unknown',
      fundDomicile: profile.fundDomicile || '',
      annualDistributionYield: Math.max(finiteNumber(profile.annualDistributionYield, 0), 0),
      withholdingTaxRate: Math.max(finiteNumber(profile.withholdingTaxRate, 0), 0),
      totalExpenseRatio: Math.max(finiteNumber(profile.totalExpenseRatio, 0), 0),
      trackingDifference: finiteNumber(profile.trackingDifference, 0),
      currencyExposure: profile.currencyExposure || input.positionCurrency || input.currencyCode || '',
      indexMethodology: profile.indexMethodology || ''
    };
  }

  function evaluateTradeScenarios(input, output, switchOutput) {
    const targetSellPrice = finiteOrNaN(input.targetSellPrice);
    const targetReachProbability = clamp(finiteNumber(input.targetReachProbability, 0.5), 0, 1);
    const freshCashAmount = Math.max(finiteNumber(input.freshCashAmount, 0), 0);
    const portfolioValue = finiteNumber(input.portfolioValue, NaN);
    const concentrationBefore = Number.isFinite(portfolioValue) && portfolioValue > 0 ? output.currentValue / portfolioValue : NaN;
    const switchConcentration = Number.isFinite(portfolioValue) && portfolioValue > 0 ? finiteNumber(switchOutput.targetInvested, 0) / portfolioValue : NaN;
    const holdFuture = afterTaxFutureValue(input, output.sellValue, finiteNumber(input.expectedOldReturn, 0));
    const switchFuture = finiteNumber(switchOutput.futureValueNew, NaN);
    const cashFuture = finiteNumber(output.cashAfter, NaN);

    const targetOutput = Number.isFinite(targetSellPrice) && targetSellPrice > 0
      ? Core.calculateValues({ ...input, currentPrice: targetSellPrice })
      : null;
    const targetExpected = targetOutput
      ? targetReachProbability * targetOutput.cashAfter + (1 - targetReachProbability) * holdFuture
      : NaN;
    const rebuyShares = Number.isFinite(input.rebuyPrice) && input.rebuyPrice > 0 ? output.cashAfterPosition / input.rebuyPrice : NaN;
    const taxDrag = output.sellValue > 0 ? output.taxDue / output.sellValue : NaN;

    const taxLoss = evaluateTaxLossHarvesting(input, output);
    const scenarios = [
      {
        id: 'hold',
        label: 'Hold current position scenario',
        taxNow: 0,
        investableCash: 0,
        requiredNewReturn: NaN,
        requiredDelta: NaN,
        expectedValue: holdFuture,
        downsideValue: output.sellValue * (1 + Math.min(finiteNumber(input.expectedOldReturn, 0), -Math.abs(finiteNumber(input.maxTolerableLoss, 0.2)))),
        opportunityCost: Number.isFinite(switchFuture) ? switchFuture - holdFuture : NaN,
        concentrationAfter: concentrationBefore,
        marginVsHurdle: NaN,
        notes: ['No tax is triggered now; tax deferral remains part of the outcome.']
      },
      {
        id: 'sell-switch',
        label: 'Sell now and switch scenario',
        taxNow: output.taxDue,
        investableCash: switchOutput.investableCash,
        requiredNewReturn: switchOutput.requiredTargetReturn,
        requiredDelta: switchOutput.requiredExcessReturn,
        expectedValue: switchFuture,
        downsideValue: afterTaxFutureValue(input, switchOutput.targetInvested || switchOutput.investableCash, -Math.abs(finiteNumber(input.maxTolerableLoss, 0.2))) + finiteNumber(switchOutput.residualCash, 0),
        opportunityCost: switchFuture - holdFuture,
        concentrationAfter: switchConcentration,
        marginVsHurdle: switchOutput.returnMargin,
        notes: ['This is a hurdle comparison, not a personal recommendation.']
      },
      {
        id: 'sell-target',
        label: 'Sell at target scenario',
        taxNow: targetOutput?.taxDue ?? NaN,
        investableCash: targetOutput?.cashAfter ?? NaN,
        requiredNewReturn: targetOutput ? Core.requiredReturnForMode({ cashAfter: targetOutput.cashAfter, sellValue: targetOutput.sellValue, cashRatio: targetOutput.cashRatio, oldReturn: input.expectedOldReturn, taxRate: input.taxRate, includeTax: input.includeTaxOnNew, hurdleMode: input.hurdleMode, taxProfile: input.taxProfile }) : NaN,
        requiredDelta: NaN,
        expectedValue: targetExpected,
        downsideValue: holdFuture,
        opportunityCost: targetExpected - holdFuture,
        concentrationAfter: concentrationBefore,
        marginVsHurdle: targetOutput && holdFuture ? (targetExpected - holdFuture) / holdFuture : NaN,
        notes: scenarioNote(`Target-reach probability is ${Math.round(targetReachProbability * 100)}%.`, !!targetOutput).concat(scenarioNote('Add a target sell price to evaluate this workflow.', !targetOutput))
      },
      {
        id: 'sell-rebuy',
        label: 'Sell and rebuy same stock scenario',
        taxNow: output.taxDue,
        investableCash: output.cashAfter,
        requiredNewReturn: NaN,
        requiredDelta: NaN,
        expectedValue: Number.isFinite(rebuyShares) ? rebuyShares * input.currentPrice * (1 + finiteNumber(input.expectedOldReturn, 0)) : NaN,
        downsideValue: Number.isFinite(rebuyShares) ? rebuyShares * input.currentPrice * (1 - Math.abs(finiteNumber(input.maxTolerableLoss, 0.2))) : NaN,
        opportunityCost: Number.isFinite(rebuyShares) ? rebuyShares - input.shares : NaN,
        concentrationAfter: concentrationBefore,
        marginVsHurdle: Number.isFinite(input.rebuyPrice) ? output.breakEvenPrice - input.rebuyPrice : NaN,
        notes: Number.isFinite(rebuyShares) ? [`Break-even rebuy price is ${output.breakEvenPrice}.`] : ['Add a rebuy price to estimate share-count gain or loss.']
      },
      {
        id: 'partial-trim',
        label: 'Partial trim scenario',
        taxNow: output.taxDue,
        investableCash: output.cashAfter,
        requiredNewReturn: switchOutput.requiredTargetReturn,
        requiredDelta: switchOutput.requiredExcessReturn,
        expectedValue: output.cashAfter + output.remainingValue * (1 + finiteNumber(input.expectedOldReturn, 0)),
        downsideValue: output.cashAfter + output.remainingValue * (1 - Math.abs(finiteNumber(input.maxTolerableLoss, 0.2))),
        opportunityCost: taxDrag,
        concentrationAfter: Number.isFinite(portfolioValue) && portfolioValue > 0 ? output.remainingValue / portfolioValue : NaN,
        marginVsHurdle: switchOutput.returnMargin,
        notes: [`Selling ${Math.round((input.sellFraction || 1) * 100)}% frees cash while retaining exposure.`]
      },
      {
        id: 'cash',
        label: 'Move to cash scenario',
        taxNow: output.taxDue,
        investableCash: output.cashAfter,
        requiredNewReturn: 0,
        requiredDelta: -finiteNumber(input.expectedOldReturn, 0),
        expectedValue: cashFuture,
        downsideValue: cashFuture,
        opportunityCost: holdFuture - cashFuture,
        concentrationAfter: 0,
        marginVsHurdle: -finiteNumber(input.expectedOldReturn, 0),
        notes: ['Cash reduces market downside but creates cash-drag if the position rises.']
      },
      {
        id: 'fresh-cash',
        label: 'Use fresh cash instead scenario',
        taxNow: 0,
        investableCash: freshCashAmount,
        requiredNewReturn: 0,
        requiredDelta: NaN,
        expectedValue: holdFuture + afterTaxFutureValue(input, freshCashAmount, finiteNumber(input.expectedNewReturn, 0)),
        downsideValue: holdFuture + freshCashAmount * (1 - Math.abs(finiteNumber(input.maxTolerableLoss, 0.2))),
        opportunityCost: output.taxDue,
        concentrationAfter: Number.isFinite(portfolioValue) && portfolioValue > 0 ? (output.currentValue + freshCashAmount) / (portfolioValue + freshCashAmount) : NaN,
        marginVsHurdle: Number.isFinite(input.expectedNewReturn) ? input.expectedNewReturn : NaN,
        notes: freshCashAmount > 0 ? ['Avoids current tax realization while adding the new idea.'] : ['Add fresh cash to compare buying without selling.']
      }
    ];
    if (taxLoss.applicable) {
      scenarios.push({
        id: 'tax-loss-harvest',
        label: 'Tax-loss harvesting scenario',
        taxNow: 0,
        investableCash: output.cashAfter,
        requiredNewReturn: switchOutput.requiredTargetReturn,
        requiredDelta: switchOutput.requiredExcessReturn,
        expectedValue: output.cashAfter + taxLoss.estimatedTaxValue,
        downsideValue: output.cashAfter,
        opportunityCost: taxLoss.estimatedTaxValue,
        concentrationAfter: switchConcentration,
        marginVsHurdle: switchOutput.returnMargin,
        taxLossHarvesting: taxLoss,
        notes: [`Realizes a ${taxLoss.lossPotType} loss; estimated tax value depends on future offsetable gains.`]
          .concat(taxLoss.replacementCandidates.length
            ? [`Replacement candidate context: ${taxLoss.replacementCandidates.map(item => item.name || item.symbol).join(', ')}.`]
            : ['Add or select a target instrument to document replacement-candidate exposure.'])
      });
    }
    return scenarios;
  }

  function evaluateRiskFlags(input, output, switchOutput, scenarioAnalysis) {
    const flags = [];
    const portfolioValue = finiteNumber(input.portfolioValue, NaN);
    const currentWeight = Number.isFinite(portfolioValue) && portfolioValue > 0 ? output.currentValue / portfolioValue : NaN;
    const taxDrag = output.sellValue > 0 ? output.taxDue / output.sellValue : NaN;
    const maxLoss = Math.abs(finiteNumber(input.maxTolerableLoss, NaN));
    if (Number.isFinite(currentWeight) && currentWeight >= 0.30) {
      flags.push({ category: 'portfolio', label: 'Concentration risk', message: `Current position is ${(currentWeight * 100).toFixed(1)}% of portfolio.`, severity: 'high', confidence: 'high' });
    } else if (Number.isFinite(currentWeight) && currentWeight >= 0.20) {
      flags.push({ category: 'portfolio', label: 'Concentration risk', message: `Current position is ${(currentWeight * 100).toFixed(1)}% of portfolio.`, severity: 'medium', confidence: 'high' });
    }
    if (Number.isFinite(taxDrag) && taxDrag >= 0.10) flags.push({ category: 'tax', label: 'High tax drag', message: `Tax consumes ${(taxDrag * 100).toFixed(1)}% of sale value.`, severity: 'high', confidence: 'high' });
    else if (Number.isFinite(taxDrag) && taxDrag >= 0.05) flags.push({ category: 'tax', label: 'Material tax drag', message: `Tax consumes ${(taxDrag * 100).toFixed(1)}% of sale value.`, severity: 'medium', confidence: 'high' });
    if (input.fxMode === 'manual' && input.positionCurrency !== input.taxCurrency) flags.push({ category: 'data/model', label: 'FX risk', message: 'Stock return and EUR outcome differ because FX is active.', severity: 'medium', confidence: Number.isFinite(input.fxRateNow) ? 'medium' : 'low' });
    if (output.rawGain < 0) flags.push({ category: 'tax', label: 'Tax-loss harvesting candidate', message: 'The selected sale realizes a loss; offset rules and replacement exposure matter.', severity: 'medium', confidence: 'high' });
    const fund = getFundAssumptions(input);
    if (fund) {
      if (!fund.fundDomicile || !fund.indexMethodology) flags.push({ category: 'tax', label: 'ETF/fund metadata incomplete', message: 'Fund domicile, distribution policy, TER, tracking difference and index methodology can affect after-tax review.', severity: 'medium', confidence: 'medium' });
      if (fund.totalExpenseRatio + fund.trackingDifference > 0.01) flags.push({ category: 'market', label: 'Fund cost drag', message: `TER plus tracking difference is ${((fund.totalExpenseRatio + fund.trackingDifference) * 100).toFixed(2)} percentage points.`, severity: 'medium', confidence: 'medium' });
    }
    if (Number.isFinite(maxLoss) && scenarioAnalysis.maximumLoss < -Math.abs(output.sellValue * maxLoss)) flags.push({ category: 'behavioral', label: 'Loss tolerance breach', message: 'At least one scenario exceeds the max tolerable loss assumption.', severity: 'high', confidence: 'medium' });
    if (Number.isFinite(switchOutput.returnMargin) && Math.abs(switchOutput.returnMargin) < 0.02) flags.push({ category: 'model', label: 'Thin hurdle margin', message: 'The assumed new return is within 2 percentage points of the hurdle.', severity: 'medium', confidence: 'medium' });
    const portfolioRisk = evaluatePortfolioRisk(input, output, switchOutput, scenarioAnalysis);
    if (Number.isFinite(portfolioRisk.portfolioVolatilityChange) && portfolioRisk.portfolioVolatilityChange > 0.02) flags.push({ category: 'portfolio', label: 'Correlation-adjusted risk rises', message: `Estimated portfolio volatility rises by ${(portfolioRisk.portfolioVolatilityChange * 100).toFixed(1)} percentage points.`, severity: 'medium', confidence: portfolioRisk.usesScenarioEstimatedVolatility ? 'medium' : 'high' });
    if (Number.isFinite(portfolioRisk.riskAdjustedMargin) && portfolioRisk.riskAdjustedMargin < 0) flags.push({ category: 'portfolio', label: 'Negative risk-adjusted margin', message: 'Scenario margin is negative after scaling by estimated volatility.', severity: 'medium', confidence: 'medium' });
    if (output.lotSaleResult?.errors?.length) flags.push({ category: 'tax', label: 'Lot sale issue', message: output.lotSaleResult.errors[0], severity: 'high', confidence: 'high' });
    return flags;
  }

  function combineVolatility(weight, assetVol, restVol, correlation) {
    if (!Number.isFinite(weight) || !Number.isFinite(assetVol) || !Number.isFinite(restVol)) return NaN;
    const w = clamp(weight, 0, 1);
    const restWeight = 1 - w;
    const rho = clamp(Number.isFinite(correlation) ? correlation : 0.6, -1, 1);
    return Math.sqrt(Math.max(
      (w * assetVol) ** 2 + (restWeight * restVol) ** 2 + 2 * w * restWeight * assetVol * restVol * rho,
      0
    ));
  }

  function evaluatePortfolioRisk(input, output, switchOutput, scenarioAnalysis = {}) {
    const portfolioValue = finiteNumber(input.portfolioValue, NaN);
    const currentWeight = portfolioValue > 0 ? finiteNumber(output.currentValue, 0) / portfolioValue : NaN;
    const switchWeight = portfolioValue > 0 ? finiteNumber(switchOutput.targetInvested || switchOutput.investableCash, 0) / portfolioValue : NaN;
    const rows = scenarioAnalysis.cases || [];
    const scenarioOldVol = weightedStd(rows, 'oldReturn', NaN);
    const scenarioNewVol = weightedStd(rows, 'newReturn', NaN);
    const currentVolatility = Number.isFinite(input.currentVolatility) ? input.currentVolatility : scenarioOldVol;
    const newVolatility = Number.isFinite(input.newVolatility) ? input.newVolatility : scenarioNewVol;
    const restVolatility = Number.isFinite(input.portfolioVolatility) ? input.portfolioVolatility : Math.max(currentVolatility || 0, newVolatility || 0, 0.15);
    const correlationToPortfolio = Number.isFinite(input.correlationToPortfolio) ? input.correlationToPortfolio : 0.6;
    const beforeVolatility = combineVolatility(currentWeight, currentVolatility, restVolatility, correlationToPortfolio);
    const afterVolatility = combineVolatility(switchWeight, newVolatility, restVolatility, correlationToPortfolio);
    const expectedBase = Math.max(finiteNumber(output.sellValue, 0), 1);
    const expectedMarginReturn = finiteNumber(scenarioAnalysis.expectedMargin, 0) / expectedBase;
    const riskAdjustedMargin = Number.isFinite(afterVolatility) && afterVolatility > 0 ? expectedMarginReturn / afterVolatility : NaN;
    const maxLossReturn = expectedBase > 0 ? Math.abs(Math.min(finiteNumber(scenarioAnalysis.maximumLoss, 0), 0)) / expectedBase : NaN;
    const tolerance = Math.max(finiteNumber(input.maxTolerableLoss, 0.25), 1e-9);
    return {
      currentWeight,
      switchWeight,
      concentrationChange: Number.isFinite(switchWeight) && Number.isFinite(currentWeight) ? switchWeight - currentWeight : NaN,
      currentVolatility,
      newVolatility,
      restVolatility,
      correlationToPortfolio,
      beforeVolatility,
      afterVolatility,
      portfolioVolatilityChange: Number.isFinite(afterVolatility) && Number.isFinite(beforeVolatility) ? afterVolatility - beforeVolatility : NaN,
      expectedMarginReturn,
      riskAdjustedMargin,
      maxLossReturn,
      drawdownVsTolerance: Number.isFinite(maxLossReturn) ? maxLossReturn / tolerance : NaN,
      usesScenarioEstimatedVolatility: !Number.isFinite(input.currentVolatility) || !Number.isFinite(input.newVolatility)
    };
  }

  function evaluateAssumptionQuality(input, output, metadata = {}) {
    const hasLots = Boolean(output.lotSaleResult?.matches?.length || metadata.hasLots);
    const livePrice = Boolean(metadata.marketData?.fetchedAt || metadata.pendingPrice?.fetchedAt);
    return [
      { assumption: 'Tax rate/profile', confidence: input.taxProfile?.mode === 'de' ? 'medium' : 'high', reason: input.taxProfile?.mode === 'de' ? 'Detailed inputs are modeled, but broker/tax-office handling can differ.' : 'Flat preset is deterministic but simplified.' },
      { assumption: 'Cost basis', confidence: hasLots ? 'high' : 'medium', reason: hasLots ? 'Lot-level basis is available.' : 'Average cost basis is user-entered.' },
      { assumption: 'Current price', confidence: livePrice ? 'high' : 'medium', reason: livePrice ? 'Latest provider price was applied.' : 'Manual or restored price.' },
      { assumption: 'Old-stock return', confidence: 'low', reason: 'Forward return is a forecast, not a deterministic input.' },
      { assumption: 'New-stock return', confidence: Number.isFinite(input.expectedNewReturn) ? 'low' : 'low', reason: 'Switch result is highly sensitive to this forecast.' },
      { assumption: 'Scenario probabilities', confidence: metadata.customScenarioCases ? 'medium' : 'low', reason: metadata.customScenarioCases ? 'User supplied probability weights.' : 'Default probabilities are placeholders.' },
      { assumption: 'FX rate', confidence: input.fxMode === 'manual' ? 'medium' : 'high', reason: input.fxMode === 'manual' ? 'Manual/live FX can move before execution and future sale.' : 'No cross-currency conversion modeled.' }
    ].concat(getFundAssumptions(input) ? [{
      assumption: 'ETF/fund assumptions',
      confidence: input.taxProfile?.fundDomicile && Number.isFinite(input.taxProfile?.totalExpenseRatio) ? 'medium' : 'low',
      reason: 'Fund domicile, distributions, TER, tracking difference and methodology are user-entered and should be checked against issuer documents.'
    }] : []);
  }

  function calculateDecision(input, output, switchOutput, options = {}) {
    const coreOutput = output || Core.calculateValues(input);
    const coreSwitch = switchOutput || Core.calculateSwitchUpgrade(input, coreOutput);
    const scenarioAnalysis = summarizeScenarioAnalysis(input, coreOutput, coreSwitch, options.scenarioCases || input.scenarioCases);
    const tradeScenarios = evaluateTradeScenarios(input, coreOutput, coreSwitch);
    return {
      generatedAt: new Date().toISOString(),
      valueCurrency: coreOutput.valueCurrency || input.currencyCode || 'EUR',
      positionCurrency: coreOutput.positionCurrency || input.positionCurrency || input.currencyCode || 'EUR',
      nonAdvisoryLabel: 'Under your assumptions',
      tradeScenarios,
      scenarioAnalysis,
      riskFlags: evaluateRiskFlags(input, coreOutput, coreSwitch, scenarioAnalysis),
      assumptionQuality: evaluateAssumptionQuality(input, coreOutput, options),
      riskCatalog: RISK_CATALOG,
      taxLossHarvesting: evaluateTaxLossHarvesting(input, coreOutput),
      fundAssumptions: getFundAssumptions(input),
      portfolioRisk: evaluatePortfolioRisk(input, coreOutput, coreSwitch, scenarioAnalysis)
    };
  }

  function serializeDecisionReport(decision, input = {}) {
    return {
      title: 'TaxSwitch Risk-Aware Decision Report',
      generatedAt: decision.generatedAt,
      valueCurrency: decision.valueCurrency,
      nonAdvisory: 'This report presents scenario analysis under user assumptions and is not a recommendation to buy, sell, or hold.',
      summary: {
        expectedMargin: decision.scenarioAnalysis.expectedMargin,
        winnerCounts: decision.scenarioAnalysis.winnerCounts,
        monteCarlo: decision.scenarioAnalysis.monteCarlo
      },
      assumptions: decision.assumptionQuality,
      fundAssumptions: decision.fundAssumptions,
      taxLossHarvesting: decision.taxLossHarvesting,
      portfolioRisk: decision.portfolioRisk,
      riskFlags: decision.riskFlags,
      tradeScenarios: decision.tradeScenarios,
      scenarioCases: decision.scenarioAnalysis.cases,
      inputs: input
    };
  }

  return {
    RISK_CATALOG,
    defaultScenarioCases,
    normalizeScenarioCases,
    calculateScenarioValues,
    summarizeScenarioAnalysis,
    runMonteCarlo,
    evaluateTradeScenarios,
    evaluateRiskFlags,
    evaluateAssumptionQuality,
    evaluateTaxLossHarvesting,
    getFundAssumptions,
    evaluatePortfolioRisk,
    calculateDecision,
    serializeDecisionReport
  };
});
