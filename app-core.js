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

function clampTaxRate(v) { return Number.isFinite(v) ? Math.min(Math.max(v, 0), 0.95) : 0; }
function clampReturn(v) { return Number.isFinite(v) ? Math.max(v, -0.9999) : NaN; }

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

function requiredReturnForMode({ cashAfter, sellValue, cashRatio, oldReturn, taxRate, includeTax, hurdleMode = 'beat-pretax', taxProfile } = {}) {
  if (!Number.isFinite(cashRatio) || cashRatio <= 0) return NaN;
  if (hurdleMode === 'reduce-risk') return 0;

  let targetValue = sellValue * (1 + oldReturn);
  if (hurdleMode === 'recover-drag') {
    targetValue = sellValue;
  } else if (hurdleMode === 'beat-posttax') {
    if (taxProfile?.mode === 'de' && typeof GermanTax !== 'undefined') {
      targetValue = GermanTax.afterGermanTaxFutureValue(sellValue, oldReturn, taxProfile);
    } else {
      targetValue = afterTaxFutureValue(sellValue, oldReturn, taxRate, true);
    }
  }

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
  const sellValue = sellShares * input.currentPrice;
  const sellCostBasis = sellShares * input.buyPrice;
  const currentValue = input.shares * input.currentPrice;
  const costBasis = input.shares * input.buyPrice;
  const rawGain = sellValue - sellCostBasis;
  const taxableGain = Math.max(rawGain, 0);
  // FX adjustment
  let fxAdjustedTaxableGain = taxableGain;
  if (input.fxMode === 'manual' && Number.isFinite(input.fxRateBuy) && Number.isFinite(input.fxRateNow)) {
    const sellValueTax = sellValue * input.fxRateNow;
    const sellCostTax = sellCostBasis * input.fxRateBuy;
    fxAdjustedTaxableGain = Math.max(sellValueTax - sellCostTax, 0);
  }
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
  const costsPortion = input.transactionCost * sellFraction;
  const cashAfter = Math.max(sellValue - taxDue - costsPortion, 0);
  const breakEvenPrice = sellShares > 0 ? cashAfter / sellShares : NaN;
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
  const remainingValue = remainingShares * input.currentPrice;

  return { currentValue, costBasis, rawGain, taxableGain: taxBreakdown?.taxableGain ?? fxAdjustedTaxableGain, taxBreakdown, taxDue, cashAfter, breakEvenPrice, requiredDrop, requiredDropPct, cashRatio, requiredNewReturn: rNewReturn, requiredExcessReturn, futureValueOld, futureValueNew, futureDifference, sellShares, sellValue, remainingShares, remainingValue, lotSaleResult: input.lotSaleResult || null };
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
const STATE_KEYS = ['shares','buyPrice','currentPrice','taxRate','transactionCost','rebuyPrice','expectedOldReturn','expectedNewReturn','includeTaxOnNew','currencyCode','sellPct','portfolioValue','targetWeight','fxMode','positionCurrency','taxCurrency','fxRateBuy','fxRateNow'];

function encodeStateToURL(els) {
  const p = new URLSearchParams();
  const val = (id) => document.getElementById(id)?.value || '';
  p.set('shares', val('shares')); p.set('buy', val('buyPrice')); p.set('current', val('currentPrice'));
  p.set('tax', val('taxRate')); p.set('costs', val('transactionCost')); p.set('rebuy', val('rebuyPrice'));
  p.set('oldRet', val('expectedOldReturn')); p.set('newRet', val('expectedNewReturn'));
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
  return true;
}

/* ── CSV Export ─────────────────────────────────────────────────────── */
function generateCSV(input, output) {
  const rows = [
    ['TaxSwitch Report', new Date().toLocaleString('de-DE')],
    [],
    ['Position'],
    ['Shares', input.shares], ['Buy price', input.buyPrice], ['Current price', input.currentPrice],
    ['Currency', input.currencyCode],
    [],
    ['Tax & Costs'],
    ['Tax rate', `${(input.taxRate * 100).toFixed(3)}%`], ['Transaction costs', input.transactionCost],
    [],
    ['Results'],
    ['Taxable gain', output.taxableGain], ['Tax due', output.taxDue],
    ['Cash after sale', output.cashAfter], ['Break-even rebuy price', output.breakEvenPrice],
    ['Required drop', formatPercent(output.requiredDropPct)],
    ['Required new return', formatPercent(output.requiredNewReturn)],
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
    afterTaxFutureValue,
    requiredGrossReturn,
    requiredReturnForMode,
    blendLots,
    hasCoreInputs,
    calculateValues,
    calculateRebalance,
    localSearchSymbols,
    encodeStateToURL,
    decodeStateFromURL,
    generateCSV
  };
}
