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
  const sellFraction = input.sellFraction || 1;
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
  const taxDue = fxAdjustedTaxableGain * input.taxRate;
  const costsPortion = input.transactionCost * sellFraction;
  const cashAfter = Math.max(sellValue - taxDue - costsPortion, 0);
  const breakEvenPrice = sellShares > 0 ? cashAfter / sellShares : NaN;
  const requiredDrop = input.currentPrice - breakEvenPrice;
  const requiredDropPct = input.currentPrice > 0 ? requiredDrop / input.currentPrice : NaN;
  const cashRatio = sellValue > 0 ? cashAfter / sellValue : NaN;
  const rNewReturn = requiredGrossReturn(cashRatio, input.expectedOldReturn, input.taxRate, input.includeTaxOnNew);
  const requiredExcessReturn = rNewReturn - input.expectedOldReturn;
  const futureValueOld = sellValue * (1 + input.expectedOldReturn);
  const futureValueNew = afterTaxFutureValue(cashAfter, input.expectedNewReturn, input.taxRate, input.includeTaxOnNew);
  const futureDifference = futureValueNew - futureValueOld;
  const remainingShares = input.shares - sellShares;
  const remainingValue = remainingShares * input.currentPrice;

  return { currentValue, costBasis, rawGain, taxableGain: fxAdjustedTaxableGain, taxDue, cashAfter, breakEvenPrice, requiredDrop, requiredDropPct, cashRatio, requiredNewReturn: rNewReturn, requiredExcessReturn, futureValueOld, futureValueNew, futureDifference, sellShares, sellValue, remainingShares, remainingValue };
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

/* ── Fallback symbols ──────────────────────────────────────────────── */
const FALLBACK_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc Class A', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'META', name: 'Meta Platforms Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'BMW', name: 'Bayerische Motoren Werke AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'SAP', name: 'SAP SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'SIE', name: 'Siemens AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'ALV', name: 'Allianz SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'DTE', name: 'Deutsche Telekom AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'ASML', name: 'ASML Holding NV', exchange: 'Euronext Amsterdam', country: 'Netherlands', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'DAX', name: 'DAX Performance Index', exchange: 'Deutsche Börse', country: 'Germany', currency: 'EUR', type: 'Index' },
  { symbol: 'IWDA', name: 'iShares Core MSCI World UCITS ETF', exchange: 'Euronext Amsterdam', country: 'Netherlands', currency: 'EUR', type: 'ETF' },
  { symbol: 'VWCE', name: 'Vanguard FTSE All-World UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
  { symbol: 'SXR8', name: 'iShares Core S&P 500 UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
];

function localSearchSymbols(query, limit = 10) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  return FALLBACK_SYMBOLS.map(item => {
    const sym = item.symbol.toLowerCase(), nm = item.name.toLowerCase();
    let score = 0;
    if (sym === q) score += 100;
    if (sym.startsWith(q)) score += 55;
    if (nm.startsWith(q)) score += 40;
    if (sym.includes(q)) score += 24;
    if (nm.includes(q)) score += 18;
    if (item.exchange.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)) score += 8;
    return { ...item, score, source: 'fallback' };
  }).filter(i => i.score > 0).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit).map(({ score, ...i }) => i);
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
  return rows.map(r => r.join(',')).join('\n');
}
