const els = {
  instrumentSearch: document.getElementById('instrumentSearch'),
  clearInstrumentSearch: document.getElementById('clearInstrumentSearch'),
  instrumentResults: document.getElementById('instrumentResults'),
  selectedInstrument: document.getElementById('selectedInstrument'),
  selectedAvatar: document.getElementById('selectedAvatar'),
  selectedName: document.getElementById('selectedName'),
  selectedMeta: document.getElementById('selectedMeta'),
  useLatestPriceBtn: document.getElementById('useLatestPriceBtn'),
  clearInstrumentBtn: document.getElementById('clearInstrumentBtn'),
  marketDataStatus: document.getElementById('marketDataStatus'),
  shares: document.getElementById('shares'),
  currencyCode: document.getElementById('currencyCode'),
  currencyUnits: [...document.querySelectorAll('.currencyUnit')],
  buyPrice: document.getElementById('buyPrice'),
  currentPrice: document.getElementById('currentPrice'),
  taxRate: document.getElementById('taxRate'),
  transactionCost: document.getElementById('transactionCost'),
  rebuyPrice: document.getElementById('rebuyPrice'),
  expectedOldReturn: document.getElementById('expectedOldReturn'),
  expectedNewReturn: document.getElementById('expectedNewReturn'),
  includeTaxOnNew: document.getElementById('includeTaxOnNew'),
  resetBtn: document.getElementById('resetBtn'),
  chips: [...document.querySelectorAll('[data-tax-preset]')],
  tabs: [...document.querySelectorAll('[data-mode]')],
  sameResult: document.getElementById('sameResult'),
  switchResult: document.getElementById('switchResult'),
  heroBreakEven: document.getElementById('heroBreakEven'),
  heroDrop: document.getElementById('heroDrop'),
  heroRequiredNew: document.getElementById('heroRequiredNew'),
  stickyBreakEven: document.getElementById('stickyBreakEven'),
  stickyRequiredNew: document.getElementById('stickyRequiredNew'),
  sameVerdict: document.getElementById('sameVerdict'),
  breakEvenPrice: document.getElementById('breakEvenPrice'),
  sameExplanation: document.getElementById('sameExplanation'),
  requiredDrop: document.getElementById('requiredDrop'),
  taxDue: document.getElementById('taxDue'),
  cashAfter: document.getElementById('cashAfter'),
  taxableGain: document.getElementById('taxableGain'),
  rebuySection: document.getElementById('rebuySection'),
  newShareCount: document.getElementById('newShareCount'),
  shareDifference: document.getElementById('shareDifference'),
  switchVerdict: document.getElementById('switchVerdict'),
  requiredNewReturn: document.getElementById('requiredNewReturn'),
  switchExplanation: document.getElementById('switchExplanation'),
  cashRatio: document.getElementById('cashRatio'),
  requiredExcessReturn: document.getElementById('requiredExcessReturn'),
  fvOld: document.getElementById('fvOld'),
  fvNew: document.getElementById('fvNew'),
  futureComparison: document.getElementById('futureComparison'),
  fvDifference: document.getElementById('fvDifference'),
  chart: document.getElementById('returnChart')
};

const FALLBACK_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc Class A', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'META', name: 'Meta Platforms Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc Class B', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'V', name: 'Visa Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'VT', name: 'Vanguard Total World Stock ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'BMW', name: 'Bayerische Motoren Werke AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'MBG', name: 'Mercedes-Benz Group AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'VOW3', name: 'Volkswagen AG Preference Shares', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Preferred Stock' },
  { symbol: 'SAP', name: 'SAP SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'SIE', name: 'Siemens AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'ALV', name: 'Allianz SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'DTE', name: 'Deutsche Telekom AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'AIR', name: 'Airbus SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'ASML', name: 'ASML Holding NV', exchange: 'Euronext Amsterdam', country: 'Netherlands', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'NESN', name: 'Nestlé SA', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock' },
  { symbol: 'NOVN', name: 'Novartis AG', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock' },
  { symbol: 'ROG', name: 'Roche Holding AG', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock' },
  { symbol: '7203', name: 'Toyota Motor Corporation', exchange: 'Tokyo Stock Exchange', country: 'Japan', currency: 'JPY', type: 'Common Stock' },
  { symbol: '6758', name: 'Sony Group Corporation', exchange: 'Tokyo Stock Exchange', country: 'Japan', currency: 'JPY', type: 'Common Stock' },
  { symbol: '0700', name: 'Tencent Holdings Ltd', exchange: 'Hong Kong Exchange', country: 'Hong Kong', currency: 'HKD', type: 'Common Stock' },
  { symbol: '005930', name: 'Samsung Electronics Co Ltd', exchange: 'Korea Exchange', country: 'South Korea', currency: 'KRW', type: 'Common Stock' },
  { symbol: 'DAX', name: 'DAX Performance Index', exchange: 'Deutsche Börse', country: 'Germany', currency: 'EUR', type: 'Index' },
  { symbol: 'SPX', name: 'S&P 500 Index', exchange: 'CBOE', country: 'United States', currency: 'USD', type: 'Index' },
  { symbol: 'NDX', name: 'NASDAQ 100 Index', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Index' },
  { symbol: 'DJI', name: 'Dow Jones Industrial Average', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Index' },
  { symbol: 'SX5E', name: 'EURO STOXX 50 Index', exchange: 'STOXX', country: 'Europe', currency: 'EUR', type: 'Index' },
  { symbol: 'IWDA', name: 'iShares Core MSCI World UCITS ETF', exchange: 'Euronext Amsterdam', country: 'Netherlands', currency: 'EUR', type: 'ETF' },
  { symbol: 'EUNL', name: 'iShares Core MSCI World UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
  { symbol: 'VWCE', name: 'Vanguard FTSE All-World UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
  { symbol: 'SXR8', name: 'iShares Core S&P 500 UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
  { symbol: 'EXS1', name: 'iShares Core DAX UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' }
];

let activeMode = 'same';
let lastSignature = '';
let selectedInstrument = null;
let searchTimer = null;
let searchAbort = null;

function parseLocaleNumber(value) {
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return NaN;

  let normalized = raw;
  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');

  if (comma > -1 && dot > -1) {
    normalized = comma > dot
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else if (comma > -1) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeCurrencyCode(value) {
  const code = String(value || 'EUR').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return code || 'EUR';
}

function formatCurrency(value, code = 'EUR') {
  if (!Number.isFinite(value)) return '—';
  const currencyCode = normalizeCurrencyCode(code);
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.abs(value) >= 1000 ? 2 : 4
    }).format(value);
  } catch {
    return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(value)} ${currencyCode}`;
  }
}

function formatInputNumber(value) {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  }).format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value * 100)}%`;
}

function formatShares(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  }).format(value);
}

function clampTaxRate(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 0.95);
}

function clampReturn(value) {
  if (!Number.isFinite(value)) return NaN;
  return Math.max(value, -0.9999);
}

function setCurrency(code) {
  const normalized = normalizeCurrencyCode(code);
  if (els.currencyCode.value !== normalized) {
    els.currencyCode.value = normalized;
  }
  els.currencyUnits.forEach((unit) => {
    unit.textContent = normalized;
  });
}

function getInputs() {
  const shares = parseLocaleNumber(els.shares.value);
  const buyPrice = parseLocaleNumber(els.buyPrice.value);
  const currentPrice = parseLocaleNumber(els.currentPrice.value);
  const taxRateParsed = parseLocaleNumber(els.taxRate.value);
  const taxRate = Number.isFinite(taxRateParsed) ? clampTaxRate(taxRateParsed / 100) : NaN;
  const transactionCost = Math.max(parseLocaleNumber(els.transactionCost.value) || 0, 0);
  const rebuyPrice = parseLocaleNumber(els.rebuyPrice.value);
  const expectedOldParsed = parseLocaleNumber(els.expectedOldReturn.value);
  const expectedOldReturn = Number.isFinite(expectedOldParsed) ? clampReturn(expectedOldParsed / 100) : 0;
  const expectedNewReturnParsed = parseLocaleNumber(els.expectedNewReturn.value);
  const expectedNewReturn = Number.isFinite(expectedNewReturnParsed) ? clampReturn(expectedNewReturnParsed / 100) : NaN;
  const currencyCode = normalizeCurrencyCode(els.currencyCode.value);

  return {
    shares: Number.isFinite(shares) ? Math.max(shares, 0) : NaN,
    buyPrice: Number.isFinite(buyPrice) ? Math.max(buyPrice, 0) : NaN,
    currentPrice: Number.isFinite(currentPrice) ? Math.max(currentPrice, 0) : NaN,
    taxRate,
    transactionCost,
    rebuyPrice,
    expectedOldReturn,
    expectedNewReturn,
    includeTaxOnNew: els.includeTaxOnNew.checked,
    currencyCode
  };
}

function hasCoreInputs(input) {
  return Number.isFinite(input.shares)
    && input.shares > 0
    && Number.isFinite(input.buyPrice)
    && input.buyPrice >= 0
    && Number.isFinite(input.currentPrice)
    && input.currentPrice > 0
    && Number.isFinite(input.taxRate)
    && input.taxRate >= 0;
}

function afterTaxFutureValue(cash, grossReturn, taxRate, includeTaxOnGain) {
  if (!Number.isFinite(grossReturn)) return NaN;
  if (!includeTaxOnGain || grossReturn <= 0) return cash * (1 + grossReturn);
  return cash * (1 + grossReturn * (1 - taxRate));
}

function requiredGrossReturn(cashRatio, oldReturn, taxRate, includeTaxOnGain) {
  if (!Number.isFinite(cashRatio) || cashRatio <= 0) return NaN;
  const requiredNetReturn = (1 + oldReturn) / cashRatio - 1;
  if (!includeTaxOnGain || requiredNetReturn <= 0) return requiredNetReturn;
  return requiredNetReturn / (1 - taxRate);
}

function calculateValues(input) {
  if (!hasCoreInputs(input)) {
    return {
      currentValue: NaN,
      costBasis: NaN,
      rawGain: NaN,
      taxableGain: NaN,
      taxDue: NaN,
      cashAfter: NaN,
      breakEvenPrice: NaN,
      requiredDrop: NaN,
      requiredDropPct: NaN,
      cashRatio: NaN,
      requiredNewReturn: NaN,
      requiredExcessReturn: NaN,
      futureValueOld: NaN,
      futureValueNew: NaN,
      futureDifference: NaN
    };
  }

  const currentValue = input.shares * input.currentPrice;
  const costBasis = input.shares * input.buyPrice;
  const rawGain = currentValue - costBasis;
  const taxableGain = Math.max(rawGain, 0);
  const taxDue = taxableGain * input.taxRate;
  const cashAfter = Math.max(currentValue - taxDue - input.transactionCost, 0);
  const breakEvenPrice = input.shares > 0 ? cashAfter / input.shares : NaN;
  const requiredDrop = input.currentPrice - breakEvenPrice;
  const requiredDropPct = input.currentPrice > 0 ? requiredDrop / input.currentPrice : NaN;
  const cashRatio = currentValue > 0 ? cashAfter / currentValue : NaN;
  const requiredNewReturn = requiredGrossReturn(
    cashRatio,
    input.expectedOldReturn,
    input.taxRate,
    input.includeTaxOnNew
  );
  const requiredExcessReturn = requiredNewReturn - input.expectedOldReturn;
  const futureValueOld = currentValue * (1 + input.expectedOldReturn);
  const futureValueNew = afterTaxFutureValue(
    cashAfter,
    input.expectedNewReturn,
    input.taxRate,
    input.includeTaxOnNew
  );
  const futureDifference = futureValueNew - futureValueOld;

  return {
    currentValue,
    costBasis,
    rawGain,
    taxableGain,
    taxDue,
    cashAfter,
    breakEvenPrice,
    requiredDrop,
    requiredDropPct,
    cashRatio,
    requiredNewReturn,
    requiredExcessReturn,
    futureValueOld,
    futureValueNew,
    futureDifference
  };
}

function setText(element, value) {
  if (!element) return;
  if (element.textContent !== value) {
    element.textContent = value;
    element.classList.remove('pulse');
    void element.offsetWidth;
    element.classList.add('pulse');
  }
}

function setSignedClass(element, value) {
  element.classList.remove('is-positive', 'is-negative');
  if (!Number.isFinite(value) || value === 0) return;
  element.classList.add(value > 0 ? 'is-positive' : 'is-negative');
}

function updateChipState() {
  const tax = parseLocaleNumber(els.taxRate.value);
  els.chips.forEach((chip) => {
    const preset = parseLocaleNumber(chip.dataset.taxPreset);
    chip.classList.toggle('is-active', Math.abs(tax - preset) < 0.0001);
  });
}

function clearChart() {
  if (!els.chart || !els.chart.getContext) return;
  const ctx = els.chart.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, els.chart.width || 0, els.chart.height || 0);
}

function showEmptyState() {
  setText(els.heroBreakEven, 'Enter data');
  setText(els.heroRequiredNew, '—');
  setText(els.stickyBreakEven, '—');
  setText(els.stickyRequiredNew, '—');
  setText(els.heroDrop, 'shares + prices');

  els.sameVerdict.textContent = 'Waiting';
  els.sameExplanation.textContent = 'Enter shares, buy price and current price to calculate the tax hurdle.';
  setText(els.breakEvenPrice, '—');
  setText(els.requiredDrop, '—');
  setText(els.taxDue, '—');
  setText(els.cashAfter, '—');
  setText(els.taxableGain, '—');
  els.rebuySection.hidden = true;
  setText(els.newShareCount, '—');
  setText(els.shareDifference, '—');
  els.shareDifference.classList.remove('is-positive', 'is-negative');

  els.switchVerdict.textContent = 'Waiting';
  els.switchExplanation.textContent = 'The switch hurdle appears once the current position is entered.';
  setText(els.requiredNewReturn, '—');
  setText(els.cashRatio, '—');
  setText(els.requiredExcessReturn, '—');
  setText(els.fvOld, '—');
  setText(els.fvNew, '—');
  setText(els.fvDifference, '—');
  els.futureComparison.hidden = true;
  els.fvDifference.classList.remove('is-positive', 'is-negative');
  clearChart();
}

function updateResults(input, output) {
  if (!hasCoreInputs(input)) {
    showEmptyState();
    return;
  }

  const money = (value) => formatCurrency(value, input.currencyCode);
  const breakEvenText = money(output.breakEvenPrice);
  const requiredNewText = formatPercent(output.requiredNewReturn);

  setText(els.heroBreakEven, breakEvenText);
  setText(els.stickyBreakEven, breakEvenText);
  setText(els.heroRequiredNew, requiredNewText);
  setText(els.stickyRequiredNew, requiredNewText);
  setText(els.heroDrop, `${formatPercent(output.requiredDropPct)} drop needed`);

  setText(els.breakEvenPrice, breakEvenText);
  setText(els.requiredDrop, `${money(output.requiredDrop)} · ${formatPercent(output.requiredDropPct)}`);
  setText(els.taxDue, money(output.taxDue));
  setText(els.cashAfter, money(output.cashAfter));
  setText(els.taxableGain, money(output.taxableGain));

  if (Number.isFinite(input.rebuyPrice) && input.rebuyPrice > 0) {
    const newShares = output.cashAfter / input.rebuyPrice;
    const shareDifference = newShares - input.shares;
    els.rebuySection.hidden = false;
    setText(els.newShareCount, `${formatShares(newShares)} shares`);
    setText(els.shareDifference, `${shareDifference >= 0 ? '+' : ''}${formatShares(shareDifference)}`);
    setSignedClass(els.shareDifference, shareDifference);

    if (input.rebuyPrice < output.breakEvenPrice) {
      els.sameVerdict.textContent = 'Adds shares';
      els.sameExplanation.textContent = `At ${money(input.rebuyPrice)}, you buy back more than your original ${formatShares(input.shares)} shares.`;
    } else if (Math.abs(input.rebuyPrice - output.breakEvenPrice) < 0.005) {
      els.sameVerdict.textContent = 'Break-even';
      els.sameExplanation.textContent = `At ${breakEvenText}, you buy back roughly the same number of shares.`;
    } else {
      els.sameVerdict.textContent = 'Loses shares';
      els.sameExplanation.textContent = `Above ${breakEvenText}, the tax drag leaves you with fewer shares.`;
    }
  } else {
    els.rebuySection.hidden = true;
    els.sameVerdict.textContent = 'Price hurdle';
    els.sameExplanation.textContent = `A rebuy must be below ${breakEvenText} to improve your share count.`;
  }

  setText(els.requiredNewReturn, requiredNewText);
  setText(els.cashRatio, formatPercent(output.cashRatio));
  setText(els.requiredExcessReturn, formatPercent(output.requiredExcessReturn));
  setText(els.fvOld, money(output.futureValueOld));

  const taxPhrase = input.includeTaxOnNew ? 'after tax on future positive gains' : 'without taxing future gains';
  els.switchVerdict.textContent = 'Hurdle rate';
  els.switchExplanation.textContent = `The new stock must reach ${requiredNewText} gross return to match holding the old stock, ${taxPhrase}.`;

  if (Number.isFinite(input.expectedNewReturn)) {
    els.futureComparison.hidden = false;
    setText(els.fvNew, money(output.futureValueNew));
    setText(els.fvDifference, `${output.futureDifference >= 0 ? '+' : ''}${money(output.futureDifference)}`);
    setSignedClass(els.fvDifference, output.futureDifference);
    els.switchVerdict.textContent = output.futureDifference >= 0 ? 'Beats hold' : 'Trails hold';
  } else {
    els.futureComparison.hidden = true;
    setText(els.fvNew, '—');
    setText(els.fvDifference, '—');
    els.fvDifference.classList.remove('is-positive', 'is-negative');
  }
}

function drawChart(input, output) {
  const canvas = els.chart;
  if (!canvas || els.switchResult.classList.contains('is-hidden') || !hasCoreInputs(input)) return;

  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(rect.width, 280);
  const cssHeight = 240;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = cssWidth;
  const height = cssHeight;
  const pad = { top: 18, right: 12, bottom: 32, left: 42 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const oldReturns = [-0.2, -0.1, 0, 0.1, 0.2];
  const required = oldReturns.map((oldReturn) => requiredGrossReturn(
    output.cashRatio,
    oldReturn,
    input.taxRate,
    input.includeTaxOnNew
  ));

  const values = [...oldReturns, ...required].filter(Number.isFinite);
  let minY = Math.min(...values, -0.05);
  let maxY = Math.max(...values, 0.25);
  const spread = maxY - minY || 1;
  minY -= spread * 0.08;
  maxY += spread * 0.08;

  const xFor = (i) => pad.left + (chartW * i) / (oldReturns.length - 1);
  const yFor = (v) => pad.top + chartH - ((v - minY) / (maxY - minY)) * chartH;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0)';
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(16, 24, 40, 0.08)';
  ctx.fillStyle = '#667085';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= 4; i += 1) {
    const value = minY + ((maxY - minY) * i) / 4;
    const y = yFor(value);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(`${Math.round(value * 100)}%`, pad.left - 7, y);
  }

  const drawLine = (points, color, widthPx) => {
    ctx.beginPath();
    points.forEach((value, index) => {
      const x = xFor(index);
      const y = yFor(value);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  drawLine(oldReturns, '#98a2b3', 2);
  drawLine(required, '#2b63ff', 3);

  oldReturns.forEach((value, index) => {
    const x = xFor(index);
    const yOld = yFor(value);
    const yReq = yFor(required[index]);

    ctx.fillStyle = '#98a2b3';
    ctx.beginPath();
    ctx.arc(x, yOld, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2b63ff';
    ctx.beginPath();
    ctx.arc(x, yReq, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#667085';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.round(value * 100)}%`, x, pad.top + chartH + 9);
  });
}

function calculate() {
  setCurrency(els.currencyCode.value);
  const input = getInputs();
  const output = calculateValues(input);
  const signature = JSON.stringify(input);

  updateChipState();
  updateResults(input, output);
  if (signature !== lastSignature || activeMode === 'switch') {
    drawChart(input, output);
    lastSignature = signature;
  }
}

function setMode(mode) {
  activeMode = mode;
  els.tabs.forEach((tab) => {
    const selected = tab.dataset.mode === mode;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  els.sameResult.classList.toggle('is-hidden', mode !== 'same');
  els.switchResult.classList.toggle('is-hidden', mode !== 'switch');
  requestAnimationFrame(calculate);
}

function localSearchSymbols(query, limit = 10) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  return FALLBACK_SYMBOLS
    .map((item) => {
      const symbol = item.symbol.toLowerCase();
      const name = item.name.toLowerCase();
      const exchange = item.exchange.toLowerCase();
      const type = item.type.toLowerCase();
      let score = 0;
      if (symbol === q) score += 100;
      if (symbol.startsWith(q)) score += 55;
      if (name.startsWith(q)) score += 40;
      if (symbol.includes(q)) score += 24;
      if (name.includes(q)) score += 18;
      if (exchange.includes(q) || type.includes(q)) score += 8;
      return { ...item, score, source: 'fallback' };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ score, ...item }) => item);
}

function setMarketStatus(text, tone = '') {
  els.marketDataStatus.textContent = text;
  els.marketDataStatus.classList.remove('is-success', 'is-warning', 'is-error');
  if (tone) els.marketDataStatus.classList.add(`is-${tone}`);
}

function instrumentInitials(item) {
  const symbol = String(item?.symbol || '?').replace(/[^A-Za-z0-9]/g, '');
  return symbol.slice(0, 2).toUpperCase() || '?';
}

function instrumentSubtitle(item) {
  return [item.symbol, item.exchange, item.currency, item.type].filter(Boolean).join(' · ');
}

function renderInstrumentResults(results, sourceLabel = '') {
  els.instrumentResults.innerHTML = '';

  if (!results.length) {
    const empty = document.createElement('div');
    empty.className = 'instrument-option';
    empty.setAttribute('aria-disabled', 'true');
    empty.innerHTML = '<span class="asset-avatar">?</span><div class="instrument-option__text"><strong>No matches found</strong><span>Try a symbol, company name, ETF name or index.</span></div><code>—</code>';
    els.instrumentResults.appendChild(empty);
    els.instrumentResults.hidden = false;
    return;
  }

  results.forEach((item, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'instrument-option';
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.dataset.index = String(index);

    const avatar = document.createElement('span');
    avatar.className = 'asset-avatar';
    avatar.textContent = instrumentInitials(item);

    const text = document.createElement('div');
    text.className = 'instrument-option__text';
    const name = document.createElement('strong');
    name.textContent = item.name || item.symbol || 'Unknown instrument';
    const meta = document.createElement('span');
    meta.textContent = instrumentSubtitle(item);
    text.append(name, meta);

    const code = document.createElement('code');
    code.textContent = item.currency || sourceLabel || '—';

    option.append(avatar, text, code);
    option.addEventListener('click', () => selectInstrument(item));
    els.instrumentResults.appendChild(option);
  });

  els.instrumentResults.hidden = false;
}

function renderInstrumentLoading(text) {
  els.instrumentResults.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'instrument-option';
  row.setAttribute('aria-disabled', 'true');
  row.innerHTML = `<span class="asset-avatar">…</span><div class="instrument-option__text"><strong>${text}</strong><span>Searching available instruments…</span></div><code>API</code>`;
  els.instrumentResults.appendChild(row);
  els.instrumentResults.hidden = false;
}

async function searchSymbols(query) {
  const q = String(query || '').trim();
  if (q.length < 2) {
    els.instrumentResults.hidden = true;
    return;
  }

  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();
  renderInstrumentLoading('Searching');

  try {
    const response = await fetch(`/.netlify/functions/search-symbols?q=${encodeURIComponent(q)}`, {
      signal: searchAbort.signal
    });

    if (!response.ok) throw new Error(`Search failed with ${response.status}`);
    const payload = await response.json();
    const apiResults = Array.isArray(payload.results) ? payload.results : [];
    const results = apiResults.length ? apiResults : localSearchSymbols(q);
    renderInstrumentResults(results, payload.source || 'search');
  } catch (error) {
    if (error.name === 'AbortError') return;
    renderInstrumentResults(localSearchSymbols(q), 'local');
  }
}

function queueSymbolSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchSymbols(els.instrumentSearch.value), 260);
}

function selectInstrument(item) {
  selectedInstrument = { ...item };
  els.selectedInstrument.hidden = false;
  els.instrumentResults.hidden = true;
  els.instrumentSearch.value = item.name || item.symbol || '';
  els.selectedAvatar.textContent = instrumentInitials(item);
  els.selectedName.textContent = item.name || item.symbol || 'Selected instrument';
  els.selectedMeta.textContent = instrumentSubtitle(item);
  if (item.currency) setCurrency(item.currency);
  setMarketStatus('Selected instrument metadata only. Use latest price or enter your current price manually.');
  calculate();
}

function clearSelectedInstrument({ clearSearch = true } = {}) {
  selectedInstrument = null;
  els.selectedInstrument.hidden = true;
  els.instrumentResults.hidden = true;
  if (clearSearch) els.instrumentSearch.value = '';
  setMarketStatus('Selected instruments are metadata only until you fill or fetch a current price.');
}

async function useLatestPrice() {
  if (!selectedInstrument?.symbol) return;

  const params = new URLSearchParams({
    symbol: selectedInstrument.symbol,
    exchange: selectedInstrument.exchange || '',
    mic_code: selectedInstrument.micCode || selectedInstrument.mic_code || '',
    currency: selectedInstrument.currency || normalizeCurrencyCode(els.currencyCode.value),
    type: selectedInstrument.type || ''
  });

  els.useLatestPriceBtn.disabled = true;
  setMarketStatus('Fetching latest price…');

  try {
    const response = await fetch(`/.netlify/functions/get-price?${params.toString()}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !Number.isFinite(Number(payload.price))) {
      const message = payload.message || payload.error || 'Live price unavailable. Enter the current price manually.';
      setMarketStatus(message, response.status === 503 ? 'warning' : 'error');
      return;
    }

    const price = Number(payload.price);
    const returnedCurrency = normalizeCurrencyCode(payload.currency || selectedInstrument.currency || els.currencyCode.value);
    els.currentPrice.value = formatInputNumber(price);
    setCurrency(returnedCurrency);
    selectedInstrument.currency = returnedCurrency;
    const tone = returnedCurrency === 'EUR' ? 'success' : 'warning';
    setMarketStatus(`Filled latest ${returnedCurrency} price from ${payload.source || 'market data'}. Verify that your buy price and costs use ${returnedCurrency}.`, tone);
    calculate();
  } catch (error) {
    setMarketStatus('Live price unavailable in this environment. Enter the current price manually.', 'warning');
  } finally {
    els.useLatestPriceBtn.disabled = false;
  }
}

function clearInputs() {
  els.shares.value = '';
  els.buyPrice.value = '';
  els.currentPrice.value = '';
  els.currencyCode.value = 'EUR';
  els.taxRate.value = '26,375';
  els.transactionCost.value = '';
  els.rebuyPrice.value = '';
  els.expectedOldReturn.value = '';
  els.expectedNewReturn.value = '';
  els.includeTaxOnNew.checked = true;
  clearSelectedInstrument({ clearSearch: true });
  setCurrency('EUR');
  setMode('same');
  calculate();
}

[
  els.shares,
  els.buyPrice,
  els.currentPrice,
  els.currencyCode,
  els.taxRate,
  els.transactionCost,
  els.rebuyPrice,
  els.expectedOldReturn,
  els.expectedNewReturn
].forEach((input) => {
  input.addEventListener('input', calculate);
  input.addEventListener('focus', () => input.select());
});

els.currencyCode.addEventListener('blur', () => {
  setCurrency(els.currencyCode.value);
  calculate();
});

els.instrumentSearch.addEventListener('input', queueSymbolSearch);
els.instrumentSearch.addEventListener('focus', () => {
  if (els.instrumentSearch.value.trim().length >= 2) queueSymbolSearch();
});
els.clearInstrumentSearch.addEventListener('click', () => {
  els.instrumentSearch.value = '';
  els.instrumentResults.hidden = true;
});
els.clearInstrumentBtn.addEventListener('click', () => clearSelectedInstrument({ clearSearch: true }));
els.useLatestPriceBtn.addEventListener('click', useLatestPrice);

els.includeTaxOnNew.addEventListener('change', calculate);
els.resetBtn.addEventListener('click', clearInputs);

els.chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    els.taxRate.value = chip.dataset.taxPreset;
    calculate();
  });
});

els.tabs.forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

window.addEventListener('resize', () => requestAnimationFrame(calculate));
document.addEventListener('click', (event) => {
  if (!event.target.closest('.panel--instrument')) {
    els.instrumentResults.hidden = true;
  }
});

setCurrency(els.currencyCode.value);
calculate();
