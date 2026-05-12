/* ═══════════════════════════════════════════════════════════════════
   TaxSwitch — Core Calculator Engine
   ═══════════════════════════════════════════════════════════════════ */

/* ── Locale number parsing ─────────────────────────────────────────── */
function parseLocaleNumber(value) {
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return NaN;
  let n = raw;
  const comma = n.lastIndexOf(','), dot = n.lastIndexOf('.');
  if (comma > -1 && dot > -1) {
    n = comma > dot ? n.replace(/\./g, '').replace(',', '.') : n.replace(/,/g, '');
  } else if (comma > -1) { n = n.replace(',', '.'); }
  const p = Number(n);
  return Number.isFinite(p) ? p : NaN;
}

function normalizeCurrencyCode(v) {
  const c = String(v || 'EUR').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return c || 'EUR';
}

function formatCurrency(value, code = 'EUR') {
  if (!Number.isFinite(value)) return '—';
  const cc = normalizeCurrencyCode(code);
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: cc, minimumFractionDigits: 2, maximumFractionDigits: Math.abs(value) >= 1000 ? 2 : 4 }).format(value);
  } catch { return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(value)} ${cc}`; }
}

function formatInputNumber(value) {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 6 }).format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value * 100)}%`;
}

function formatShares(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(value);
}

function finiteNumber(value, fallback = NaN) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampTaxRate(v) { return Number.isFinite(v) ? Math.min(Math.max(v, 0), 0.95) : 0; }
function clampReturn(v) { return Number.isFinite(v) ? Math.max(v, -0.9999) : NaN; }

function returnFromTargetPrice(currentPrice, targetPrice) {
  const current = finiteNumber(currentPrice, NaN);
  const target = finiteNumber(targetPrice, NaN);
  if (!Number.isFinite(current) || current <= 0 || !Number.isFinite(target) || target <= 0) return NaN;
  return clampReturn(target / current - 1);
}

/* ── Tax math ──────────────────────────────────────────────────────── */
function afterTaxFutureValue(cash, grossReturn, taxRate, includeTax) {
  if (!Number.isFinite(grossReturn)) return NaN;
  if (!includeTax || grossReturn <= 0) return cash * (1 + grossReturn);
  return cash * (1 + grossReturn * (1 - taxRate));
}

function requiredGrossReturn(cashRatio, oldReturn, taxRate, includeTax) {
  if (!Number.isFinite(cashRatio) || cashRatio <= 0) return NaN;
  const req = (1 + oldReturn) / cashRatio - 1;
  if (!includeTax || req <= 0) return req;
  return req / (1 - taxRate);
}

function hurdleTargetValue({ sellValue, oldReturn, taxRate, hurdleMode = 'beat-pretax', taxProfile } = {}) {
  if (!Number.isFinite(sellValue) || sellValue < 0) return NaN;
  const rOld = Number.isFinite(oldReturn) ? oldReturn : 0;
  if (hurdleMode === 'reduce-risk' || hurdleMode === 'recover-drag') return sellValue;
  if (hurdleMode === 'beat-posttax') {
    if (taxProfile?.mode === 'de' && typeof GermanTax !== 'undefined') {
      return GermanTax.afterGermanTaxFutureValue(sellValue, rOld, taxProfile);
    }
    return afterTaxFutureValue(sellValue, rOld, taxRate, true);
  }
  return sellValue * (1 + rOld);
}

function requiredGrossReturnForInvestment({ investmentBase, residualCash = 0, targetValue, taxRate, includeTax, taxProfile } = {}) {
  const base = Number.isFinite(investmentBase) ? investmentBase : NaN;
  const residual = Number.isFinite(residualCash) ? Math.max(residualCash, 0) : 0;
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(targetValue)) return NaN;
  const stockTargetValue = targetValue - residual;
  if (stockTargetValue <= 0) return -0.9999;
  if (taxProfile?.mode === 'de' && typeof GermanTax !== 'undefined') {
    return GermanTax.requiredGrossReturnDetailed({ cash: base, targetValue: stockTargetValue, profile: taxProfile });
  }
  const req = stockTargetValue / base - 1;
  if (!includeTax || req <= 0) return req;
  return req / (1 - taxRate);
}

function requiredReturnForMode({ cashAfter, sellValue, cashRatio, oldReturn, taxRate, includeTax, hurdleMode = 'beat-pretax', taxProfile } = {}) {
  if (!Number.isFinite(cashRatio) || cashRatio <= 0) return NaN;
  if (hurdleMode === 'reduce-risk') return 0;

  const targetValue = hurdleTargetValue({ sellValue, oldReturn, taxRate, hurdleMode, taxProfile });

  if (taxProfile?.mode === 'de' && typeof GermanTax !== 'undefined') {
    return GermanTax.requiredGrossReturnDetailed({ cash: cashAfter, targetValue, profile: taxProfile });
  }

  const req = targetValue / cashAfter - 1;
  if (!includeTax || req <= 0) return req;
  return req / (1 - taxRate);
}

/* ── Multi-lot blending ────────────────────────────────────────────── */
function blendLots(lots) {
  let totalShares = 0, totalCost = 0;
  for (const lot of lots) {
    const s = parseLocaleNumber(lot.shares), p = parseLocaleNumber(lot.price);
    if (Number.isFinite(s) && s > 0 && Number.isFinite(p) && p >= 0) {
      totalShares += s;
      totalCost += s * p;
    }
  }
  if (totalShares <= 0) return null;
  return { totalShares, totalCost, blendedPrice: totalCost / totalShares };
}

/* ── Core calculation ──────────────────────────────────────────────── */
function hasCoreInputs(i) {
  return Number.isFinite(i.shares) && i.shares > 0 && Number.isFinite(i.buyPrice) && i.buyPrice >= 0 && Number.isFinite(i.currentPrice) && i.currentPrice > 0 && Number.isFinite(i.taxRate) && i.taxRate >= 0;
}

function calculateValues(input) {
  if (!hasCoreInputs(input)) {
    return { currentValue: NaN, costBasis: NaN, rawGain: NaN, taxableGain: NaN, taxDue: NaN, cashAfter: NaN, breakEvenPrice: NaN, requiredDrop: NaN, requiredDropPct: NaN, cashRatio: NaN, requiredNewReturn: NaN, requiredExcessReturn: NaN, futureValueOld: NaN, futureValueNew: NaN, futureDifference: NaN, sellShares: NaN, sellValue: NaN, remainingShares: NaN, remainingValue: NaN };
  }
  const sellFraction = input.sellFraction ?? 1;
  const sellShares = input.shares * sellFraction;
  const fxNow = input.fxMode === 'manual' && Number.isFinite(input.fxRateNow) && input.fxRateNow > 0 ? input.fxRateNow : 1;
  const fxBuy = input.fxMode === 'manual' && Number.isFinite(input.fxRateBuy) && input.fxRateBuy > 0 ? input.fxRateBuy : fxNow;
  const usesManualFx = input.fxMode === 'manual' && Number.isFinite(fxNow) && fxNow > 0 && Number.isFinite(fxBuy) && fxBuy > 0;
  const positionCurrency = normalizeCurrencyCode(input.positionCurrency || input.instrumentCurrency || input.currencyCode);
  const valueCurrency = usesManualFx ? normalizeCurrencyCode(input.taxCurrency || input.currencyCode) : normalizeCurrencyCode(input.currencyCode);
  const sellValuePosition = sellShares * input.currentPrice;
  const sellCostBasisPosition = sellShares * input.buyPrice;
  const currentValuePosition = input.shares * input.currentPrice;
  const costBasisPosition = input.shares * input.buyPrice;
  const sellValue = usesManualFx ? sellValuePosition * fxNow : sellValuePosition;
  const sellCostBasis = usesManualFx ? sellCostBasisPosition * fxBuy : sellCostBasisPosition;
  const currentValue = usesManualFx ? currentValuePosition * fxNow : currentValuePosition;
  const costBasis = usesManualFx ? costBasisPosition * fxBuy : costBasisPosition;
  const rawGain = sellValue - sellCostBasis;
  const taxableGain = Math.max(rawGain, 0);
  let fxAdjustedTaxableGain = taxableGain;
  let taxBreakdown = null;
  if (input.lotSaleResult && !input.lotSaleResult.errors?.length) {
    fxAdjustedTaxableGain = input.lotSaleResult.taxableGain;
  }
  if (input.taxProfile?.mode === 'de' && typeof GermanTax !== 'undefined') {
    taxBreakdown = GermanTax.calculateGermanTax({
      grossGain: input.lotSaleResult?.rawGain ?? fxAdjustedTaxableGain,
      shares: sellShares,
      profile: input.taxProfile
    });
  }
  const taxDue = taxBreakdown ? taxBreakdown.taxDue : (input.lotSaleResult?.taxDue ?? fxAdjustedTaxableGain * input.taxRate);
  const costsPortionPosition = input.transactionCost * sellFraction;
  const costsPortion = usesManualFx ? costsPortionPosition * fxNow : costsPortionPosition;
  const cashAfter = Math.max(sellValue - taxDue - costsPortion, 0);
  const cashAfterPosition = usesManualFx ? cashAfter / fxNow : cashAfter;
  const breakEvenPrice = sellShares > 0 ? cashAfterPosition / sellShares : NaN;
  const breakEvenPriceValueCurrency = sellShares > 0 ? cashAfter / sellShares : NaN;
  const requiredDrop = input.currentPrice - breakEvenPrice;
  const requiredDropPct = input.currentPrice > 0 ? requiredDrop / input.currentPrice : NaN;
  const cashRatio = sellValue > 0 ? cashAfter / sellValue : NaN;
  const rNewReturn = requiredReturnForMode({
    cashAfter,
    sellValue,
    cashRatio,
    oldReturn: input.expectedOldReturn,
    taxRate: input.taxRate,
    includeTax: input.includeTaxOnNew,
    hurdleMode: input.hurdleMode,
    taxProfile: input.taxProfile
  });
  const requiredExcessReturn = rNewReturn - input.expectedOldReturn;
  const futureValueOld = sellValue * (1 + input.expectedOldReturn);
  const futureValueNew = input.taxProfile?.mode === 'de' && typeof GermanTax !== 'undefined'
    ? GermanTax.afterGermanTaxFutureValue(cashAfter, input.expectedNewReturn, input.taxProfile)
    : afterTaxFutureValue(cashAfter, input.expectedNewReturn, input.taxRate, input.includeTaxOnNew);
  const futureDifference = futureValueNew - futureValueOld;
  const remainingShares = input.shares - sellShares;
  const remainingValuePosition = remainingShares * input.currentPrice;
  const remainingValue = usesManualFx ? remainingValuePosition * fxNow : remainingValuePosition;
  const stockReturnTaxCurrency = costBasis > 0 ? (currentValue - costBasis) / costBasis : NaN;
  const stockReturnPositionCurrency = costBasisPosition > 0 ? (currentValuePosition - costBasisPosition) / costBasisPosition : NaN;
  const fxReturn = usesManualFx && fxBuy > 0 ? fxNow / fxBuy - 1 : 0;

  return {
    currentValue,
    costBasis,
    currentValuePosition,
    costBasisPosition,
    rawGain,
    taxableGain: taxBreakdown?.taxableGain ?? fxAdjustedTaxableGain,
    taxBreakdown,
    taxDue,
    taxDueValueCurrency: taxDue,
    cashAfter,
    cashAfterPosition,
    breakEvenPrice,
    breakEvenPriceValueCurrency,
    requiredDrop,
    requiredDropPct,
    cashRatio,
    requiredNewReturn: rNewReturn,
    requiredExcessReturn,
    futureValueOld,
    futureValueNew,
    futureDifference,
    sellShares,
    sellValue,
    sellValuePosition,
    sellCostBasis,
    sellCostBasisPosition,
    costsPortion,
    costsPortionPosition,
    remainingShares,
    remainingValue,
    remainingValuePosition,
    valueCurrency,
    positionCurrency,
    taxCurrency: valueCurrency,
    fxRateBuy: usesManualFx ? fxBuy : 1,
    fxRateNow: usesManualFx ? fxNow : 1,
    fxReturn,
    stockReturnTaxCurrency,
    stockReturnPositionCurrency,
    lotSaleResult: input.lotSaleResult || null
  };
}

function calculateSwitchUpgrade(input, output = calculateValues(input)) {
  if (!hasCoreInputs(input) || !Number.isFinite(output.sellValue) || output.sellValue <= 0) {
    return {
      isValid: false,
      hasBuyPrice: false,
      hasTargetPrice: false,
      hasProjection: false,
      sellCost: NaN,
      buyCost: NaN,
      investableCash: NaN,
      buyPrice: NaN,
      targetPrice: NaN,
      projectedTargetPrice: NaN,
      expectedReturn: NaN,
      targetShares: NaN,
      targetInvested: NaN,
      residualCash: NaN,
      requiredTargetReturn: NaN,
      requiredTargetPrice: NaN,
      requiredExcessReturn: NaN,
      futureValueOld: NaN,
      futureValueNew: NaN,
      futureDifference: NaN,
      returnMargin: NaN,
      expectedGainAmount: NaN
    };
  }

  const sellFraction = Number.isFinite(input.sellFraction) ? input.sellFraction : 1;
  const sellCost = Math.max(input.transactionCost || 0, 0) * sellFraction;
  const buyCost = Math.max(finiteNumber(input.switchBuyCost, 0), 0);
  const investableCash = Math.max(output.cashAfter - buyCost, 0);
  const buyPrice = finiteNumber(input.switchBuyPrice, NaN);
  const hasBuyPrice = Number.isFinite(buyPrice) && buyPrice > 0;
  const targetPrice = finiteNumber(input.switchTargetPrice, NaN);
  const hasTargetPrice = Number.isFinite(targetPrice) && targetPrice > 0;
  const expectedReturnInput = finiteNumber(input.expectedNewReturn, NaN);
  const expectedReturnFromTarget = hasBuyPrice && hasTargetPrice
    ? clampReturn(targetPrice / buyPrice - 1)
    : NaN;
  const expectedReturn = Number.isFinite(expectedReturnInput)
    ? expectedReturnInput
    : expectedReturnFromTarget;
  const hasProjection = Number.isFinite(expectedReturn);
  const projectedTargetPrice = hasBuyPrice && hasProjection
    ? buyPrice * (1 + expectedReturn)
    : (hasTargetPrice ? targetPrice : NaN);
  const allowFractional = input.switchAllowFractional !== false;
  const rawTargetShares = hasBuyPrice ? investableCash / buyPrice : NaN;
  const targetShares = hasBuyPrice
    ? (allowFractional ? rawTargetShares : Math.floor(rawTargetShares))
    : NaN;
  const targetInvested = hasBuyPrice ? Math.max(targetShares * buyPrice, 0) : NaN;
  const residualCash = hasBuyPrice ? Math.max(investableCash - targetInvested, 0) : NaN;
  const targetValue = hurdleTargetValue({
    sellValue: output.sellValue,
    oldReturn: input.expectedOldReturn,
    taxRate: input.taxRate,
    hurdleMode: input.hurdleMode,
    taxProfile: input.taxProfile
  });
  const requiredTargetReturn = input.hurdleMode === 'reduce-risk'
    ? 0
    : requiredGrossReturnForInvestment({
      investmentBase: targetInvested,
      residualCash,
      targetValue,
      taxRate: input.taxRate,
      includeTax: input.includeTaxOnNew,
      taxProfile: input.taxProfile
    });
  const requiredTargetPrice = hasBuyPrice && Number.isFinite(requiredTargetReturn)
    ? buyPrice * (1 + requiredTargetReturn)
    : NaN;
  const futureValueNew = hasBuyPrice && hasProjection
    ? (input.taxProfile?.mode === 'de' && typeof GermanTax !== 'undefined'
      ? GermanTax.afterGermanTaxFutureValue(targetInvested, expectedReturn, input.taxProfile) + residualCash
      : afterTaxFutureValue(targetInvested, expectedReturn, input.taxRate, input.includeTaxOnNew) + residualCash)
    : NaN;
  const futureDifference = futureValueNew - output.futureValueOld;
  const returnMargin = hasProjection && Number.isFinite(requiredTargetReturn)
    ? expectedReturn - requiredTargetReturn
    : NaN;
  const expectedGainAmount = Number.isFinite(futureValueNew)
    ? futureValueNew - investableCash
    : NaN;
  const requiredExcessReturn = Number.isFinite(requiredTargetReturn)
    ? requiredTargetReturn - input.expectedOldReturn
    : NaN;

  return {
    isValid: true,
    hasBuyPrice,
    hasTargetPrice,
    hasProjection,
    sellCost,
    buyCost,
    investableCash,
    buyPrice,
    targetPrice,
    projectedTargetPrice,
    expectedReturn,
    rawTargetShares,
    targetShares,
    targetInvested,
    residualCash,
    targetValue,
    requiredTargetReturn,
    requiredTargetPrice,
    requiredExcessReturn,
    futureValueOld: output.futureValueOld,
    futureValueNew,
    futureDifference,
    returnMargin,
    expectedGainAmount,
    allowFractional
  };
}

/* ── Rebalance calculation ─────────────────────────────────────────── */
function calculateRebalance(input, output) {
  const pv = input.portfolioValue, tw = input.targetWeight;
  if (!Number.isFinite(pv) || pv <= 0 || !Number.isFinite(tw) || !hasCoreInputs(input)) return null;
  const currentWeight = output.currentValue / pv;
  const targetValue = pv * (tw / 100);
  const excessValue = output.currentValue - targetValue;
  if (excessValue <= 0) return { currentWeight, sharesToSell: 0, taxTriggered: 0, cashReleased: 0 };
  const sharesToSell = input.currentPrice > 0 ? excessValue / input.currentPrice : 0;
  const gainPerShare = Math.max(input.currentPrice - input.buyPrice, 0);
  const taxTriggered = sharesToSell * gainPerShare * input.taxRate;
  const cashReleased = excessValue - taxTriggered;
  return { currentWeight, sharesToSell, taxTriggered, cashReleased };
}

function localSearchSymbols(query, limit = 10) {
  if (typeof SymbolCatalog !== 'undefined' && typeof SymbolCatalog.searchFallback === 'function') {
    return SymbolCatalog.searchFallback(query, limit);
  }
  return [];
}

/* ── URL state encoding/decoding ───────────────────────────────────── */
const STATE_KEYS = ['shares','buyPrice','currentPrice','taxRate','transactionCost','rebuyPrice','targetSellPrice','expectedOldReturn','expectedNewReturn','includeTaxOnNew','currencyCode','sellPct','portfolioValue','targetWeight','fxMode','positionCurrency','taxCurrency','fxRateBuy','fxRateNow','switchBuyPrice','switchTargetPrice','switchBuyCost','switchHorizonYears','switchAllowFractional'];

function encodeStateToURL(els) {
  const p = new URLSearchParams();
  const val = (id) => document.getElementById(id)?.value || '';
  p.set('shares', val('shares')); p.set('buy', val('buyPrice')); p.set('current', val('currentPrice'));
  p.set('tax', val('taxRate')); p.set('costs', val('transactionCost')); p.set('rebuy', val('rebuyPrice'));
  if (val('targetSellPrice')) p.set('oldTargetPrice', val('targetSellPrice'));
  if (!val('targetSellPrice')) p.set('oldRet', val('expectedOldReturn'));
  p.set('newRet', val('expectedNewReturn'));
  p.set('taxNew', document.getElementById('includeTaxOnNew')?.checked ? '1' : '0');
  p.set('ccy', val('currencyCode'));
  const activeSell = document.querySelector('.chip--sell.is-active');
  if (activeSell) p.set('sell', activeSell.dataset.sellPct);
  if (val('customSellShares')) p.set('sellShares', val('customSellShares'));
  if (val('portfolioValue')) p.set('pv', val('portfolioValue'));
  if (val('targetWeight')) p.set('tw', val('targetWeight'));
  const activeFx = document.querySelector('[data-fx-mode].is-active');
  if (activeFx) p.set('fxMode', activeFx.dataset.fxMode);
  if (val('positionCurrency')) p.set('positionCurrency', val('positionCurrency'));
  if (val('taxCurrency')) p.set('taxCurrency', val('taxCurrency'));
  if (val('fxRateBuy')) p.set('fxRateBuy', val('fxRateBuy'));
  if (val('fxRateNow')) p.set('fxRateNow', val('fxRateNow'));
  if (val('switchBuyPrice')) p.set('switchBuyPrice', val('switchBuyPrice'));
  if (val('switchTargetPrice')) p.set('targetPrice', val('switchTargetPrice'));
  if (val('switchBuyCost')) p.set('switchBuyCost', val('switchBuyCost'));
  if (val('switchHorizonYears')) p.set('horizon', val('switchHorizonYears'));
  p.set('fractional', document.getElementById('switchAllowFractional')?.checked ? '1' : '0');
  // Clean empty params
  for (const [k, v] of [...p.entries()]) { if (!v) p.delete(k); }
  return p.toString();
}

function decodeStateFromURL() {
  const p = new URLSearchParams(window.location.search);
  if (p.size === 0) return false;
  const set = (id, key) => { const v = p.get(key); if (v && document.getElementById(id)) document.getElementById(id).value = v; };
  set('shares', 'shares'); set('buyPrice', 'buy'); set('currentPrice', 'current');
  set('taxRate', 'tax'); set('transactionCost', 'costs'); set('rebuyPrice', 'rebuy');
  set('targetSellPrice', 'oldTargetPrice');
  set('expectedOldReturn', 'oldRet'); set('expectedNewReturn', 'newRet');
  set('currencyCode', 'ccy');
  const taxNew = p.get('taxNew');
  if (taxNew !== null) document.getElementById('includeTaxOnNew').checked = taxNew === '1';
  if (p.get('pv')) set('portfolioValue', 'pv');
  if (p.get('tw')) set('targetWeight', 'tw');
  if (p.get('sell') && typeof activateSellChip === 'function') activateSellChip(p.get('sell'));
  if (p.get('sellShares')) set('customSellShares', 'sellShares');
  if (p.get('fxMode') && typeof activateFxMode === 'function') activateFxMode(p.get('fxMode'));
  set('positionCurrency', 'positionCurrency');
  set('taxCurrency', 'taxCurrency');
  set('fxRateBuy', 'fxRateBuy');
  set('fxRateNow', 'fxRateNow');
  set('switchBuyPrice', 'switchBuyPrice');
  set('switchTargetPrice', 'targetPrice');
  set('switchBuyCost', 'switchBuyCost');
  set('switchHorizonYears', 'horizon');
  const fractional = p.get('fractional');
  if (fractional !== null && document.getElementById('switchAllowFractional')) {
    document.getElementById('switchAllowFractional').checked = fractional !== '0';
  }
  return true;
}

/* ── CSV Export ─────────────────────────────────────────────────────── */
function generateCSV(input, output) {
  const switchOutput = calculateSwitchUpgrade(input, output);
  const rows = [
    ['TaxSwitch Report', new Date().toLocaleString('de-DE')],
    [],
    ['Position'],
    ['Shares', input.shares], ['Buy price', input.buyPrice], ['Current price', input.currentPrice],
    ['Currency', input.currencyCode],
    ['Old target price', input.targetSellPrice],
    ['Old return', formatPercent(input.expectedOldReturn)],
    [],
    ['Tax & Costs'],
    ['Tax rate', `${(input.taxRate * 100).toFixed(3)}%`], ['Transaction costs', input.transactionCost],
    [],
    ['Results'],
    ['Taxable gain', output.taxableGain], ['Tax due', output.taxDue],
    ['Cash after sale', output.cashAfter], ['Break-even rebuy price', output.breakEvenPrice],
    ['Required drop', formatPercent(output.requiredDropPct)],
    ['Required new return', formatPercent(switchOutput.requiredTargetReturn)],
    ['Switch current buy price', input.switchBuyPrice],
    ['Switch target price', input.switchTargetPrice],
    ['Switch expected gain', formatPercent(switchOutput.expectedReturn)],
    ['Switch target shares', switchOutput.targetShares],
    ['Switch invested value', switchOutput.targetInvested],
    ['Switch residual cash', switchOutput.residualCash],
    ['Switch required target price', switchOutput.requiredTargetPrice],
    ['Switch future value', switchOutput.futureValueNew],
    ['Switch future difference', switchOutput.futureDifference],
    [],
    ['Disclaimer'],
    ['This is not financial advice. Tax calculation is simplified and may not reflect your actual tax situation.']
  ];
  if (typeof TaxWorkspace !== 'undefined' && typeof TaxWorkspace.serializeRowsCsv === 'function') {
    return TaxWorkspace.serializeRowsCsv(rows);
  }
  const esc = (value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map(r => r.map(esc).join(',')).join('\n');
}

if (typeof module === 'object' && module.exports) {
  module.exports = {
    parseLocaleNumber,
    normalizeCurrencyCode,
    formatCurrency,
    formatInputNumber,
    formatPercent,
    formatShares,
    clampTaxRate,
    clampReturn,
    returnFromTargetPrice,
    afterTaxFutureValue,
    requiredGrossReturn,
    hurdleTargetValue,
    requiredGrossReturnForInvestment,
    requiredReturnForMode,
    blendLots,
    hasCoreInputs,
    calculateValues,
    calculateSwitchUpgrade,
    calculateRebalance,
    localSearchSymbols,
    encodeStateToURL,
    decodeStateFromURL,
    generateCSV
  };
}
