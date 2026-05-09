const els = {
  instrumentSearch: document.getElementById('instrumentSearch'),
  assetTypeFilter: document.getElementById('assetTypeFilter'),
  assetCountryFilter: document.getElementById('assetCountryFilter'),
  clearInstrumentSearch: document.getElementById('clearInstrumentSearch'),
  instrumentResults: document.getElementById('instrumentResults'),
  selectedInstrument: document.getElementById('selectedInstrument'),
  selectedAvatar: document.getElementById('selectedAvatar'),
  selectedName: document.getElementById('selectedName'),
  selectedMeta: document.getElementById('selectedMeta'),
  useLatestPriceBtn: document.getElementById('useLatestPriceBtn'),
  refreshPriceBtn: document.getElementById('refreshPriceBtn'),
  clearInstrumentBtn: document.getElementById('clearInstrumentBtn'),
  marketDataStatus: document.getElementById('marketDataStatus'),
  targetInstrumentSearch: document.getElementById('targetInstrumentSearch'),
  targetAssetTypeFilter: document.getElementById('targetAssetTypeFilter'),
  targetAssetCountryFilter: document.getElementById('targetAssetCountryFilter'),
  clearTargetInstrumentSearch: document.getElementById('clearTargetInstrumentSearch'),
  targetInstrumentResults: document.getElementById('targetInstrumentResults'),
  selectedTargetInstrument: document.getElementById('selectedTargetInstrument'),
  selectedTargetAvatar: document.getElementById('selectedTargetAvatar'),
  selectedTargetName: document.getElementById('selectedTargetName'),
  selectedTargetMeta: document.getElementById('selectedTargetMeta'),
  useLatestTargetPriceBtn: document.getElementById('useLatestTargetPriceBtn'),
  refreshTargetPriceBtn: document.getElementById('refreshTargetPriceBtn'),
  clearTargetInstrumentBtn: document.getElementById('clearTargetInstrumentBtn'),
  targetPriceTimestamp: document.getElementById('targetPriceTimestamp'),
  targetPriceSourceLabel: document.getElementById('targetPriceSourceLabel'),
  targetPriceTimeLabel: document.getElementById('targetPriceTimeLabel'),
  targetMarketDataStatus: document.getElementById('targetMarketDataStatus'),
  switchTargetReadiness: document.getElementById('switchTargetReadiness'),
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
  switchTargetPrice: document.getElementById('switchTargetPrice'),
  switchBuyCost: document.getElementById('switchBuyCost'),
  switchHorizonYears: document.getElementById('switchHorizonYears'),
  switchAllowFractional: document.getElementById('switchAllowFractional'),
  includeTaxOnNew: document.getElementById('includeTaxOnNew'),
  resetBtn: document.getElementById('resetBtn'),
  chips: [...document.querySelectorAll('[data-tax-preset]')],
  tabs: [...document.querySelectorAll('[data-mode]')],
  sameResult: document.getElementById('sameResult'),
  switchResult: document.getElementById('switchResult'),
  heroBreakEven: document.getElementById('heroBreakEven'),
  heroDrop: document.getElementById('heroDrop'),
  heroRequiredNew: document.getElementById('heroRequiredNew'),
  pageHero: document.querySelector('.hero'),
  resultsPanel: document.querySelector('.results-panel'),
  stickySummary: document.querySelector('.sticky-summary'),
  stickyBreakEven: document.getElementById('stickyBreakEven'),
  stickyRequiredNew: document.getElementById('stickyRequiredNew'),
  sameVerdict: document.getElementById('sameVerdict'),
  breakEvenPrice: document.getElementById('breakEvenPrice'),
  sameExplanation: document.getElementById('sameExplanation'),
  requiredDrop: document.getElementById('requiredDrop'),
  requiredDropAmount: document.getElementById('requiredDropAmount'),
  requiredDropPct: document.getElementById('requiredDropPct'),
  taxDue: document.getElementById('taxDue'),
  cashAfter: document.getElementById('cashAfter'),
  taxableGain: document.getElementById('taxableGain'),
  taxBreakdownPanel: document.getElementById('taxBreakdownPanel'),
  taxBreakdownMode: document.getElementById('taxBreakdownMode'),
  taxIncomeTax: document.getElementById('taxIncomeTax'),
  taxSolidarity: document.getElementById('taxSolidarity'),
  taxChurch: document.getElementById('taxChurch'),
  taxAllowanceUsed: document.getElementById('taxAllowanceUsed'),
  taxLossOffset: document.getElementById('taxLossOffset'),
  taxExemption: document.getElementById('taxExemption'),
  taxForeignCredit: document.getElementById('taxForeignCredit'),
  taxRemainingAllowance: document.getElementById('taxRemainingAllowance'),
  fifoPanel: document.getElementById('fifoPanel'),
  fifoSummary: document.getElementById('fifoSummary'),
  fifoRows: document.getElementById('fifoRows'),
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
  switchAssetData: document.getElementById('switchAssetData'),
  switchTicket: document.getElementById('switchTicket'),
  switchComparisonTable: document.getElementById('switchComparisonTable'),
  switchMapping: document.getElementById('switchMapping'),
  switchHeatmap: document.getElementById('switchHeatmap'),
  assetPerformanceChart: document.getElementById('assetPerformanceChart'),
  assetPerformanceStatus: document.getElementById('assetPerformanceStatus'),
  historyRangeButtons: [...document.querySelectorAll('[data-history-range]')],
  chart: document.getElementById('returnChart')
};

/* Local symbol fallback search is provided by symbol-catalog.js through app-core.js */

let activeMode = 'same';
let lastSignature = '';
let selectedInstrument = null;
let selectedTargetInstrument = null;
let pendingTargetPrice = null;
let searchTimer = null;
let targetSearchTimer = null;
let searchAbort = null;
let targetSearchAbort = null;
let instrumentResultItems = [];
let targetInstrumentResultItems = [];
let activeInstrumentResultIndex = -1;
let activeTargetInstrumentResultIndex = -1;
let autoPriceTimer = null;
let targetAutoPriceTimer = null;
let priceAbort = null;
let targetPriceAbort = null;
let applyingMarketPrice = false;
let applyingTargetMarketPrice = false;
let latestQuoteData = null;
let latestTargetQuoteData = null;
let assetHistoryRange = '1Y';
let assetHistoryTimer = null;
let assetHistoryAbort = null;
let assetHistoryData = { current: null, target: null };
const assetHistoryCache = new Map();

/* parseLocaleNumber, normalizeCurrencyCode, formatCurrency, formatInputNumber,
   formatPercent, formatShares, clampTaxRate, clampReturn now in app-core.js */

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
  const switchTargetPriceParsed = parseLocaleNumber(els.switchTargetPrice?.value);
  const switchBuyCostParsed = parseLocaleNumber(els.switchBuyCost?.value);
  const switchHorizonYearsParsed = parseLocaleNumber(els.switchHorizonYears?.value);
  const currencyCode = normalizeCurrencyCode(els.currencyCode.value);
  const activeFxMode = typeof fxMode !== 'undefined' ? fxMode : 'same';
  const positionCurrency = activeFxMode === 'manual'
    ? normalizeCurrencyCode(ui?.positionCurrency?.value || currencyCode)
    : currencyCode;
  const taxCurrency = activeFxMode === 'manual'
    ? normalizeCurrencyCode(ui?.taxCurrency?.value || currencyCode)
    : currencyCode;
  const sf = typeof getSellFraction === 'function' ? getSellFraction() : 1;
  const fxRateBuyVal = ui ? parseLocaleNumber(ui.fxRateBuy?.value) : NaN;
  const fxRateNowVal = ui ? parseLocaleNumber(ui.fxRateNow?.value) : NaN;
  const pvVal = ui ? parseLocaleNumber(ui.portfolioValue?.value) : NaN;
  const twVal = ui ? parseLocaleNumber(ui.targetWeight?.value) : NaN;
  const targetSellPriceVal = ui ? parseLocaleNumber(ui.targetSellPrice?.value) : NaN;
  const targetReachProbabilityVal = ui ? parseLocaleNumber(ui.targetReachProbability?.value) : NaN;
  const freshCashAmountVal = ui ? parseLocaleNumber(ui.freshCashAmount?.value) : NaN;
  const cashReserveVal = ui ? parseLocaleNumber(ui.cashReserve?.value) : NaN;
  const maxTolerableLossVal = ui ? parseLocaleNumber(ui.maxTolerableLoss?.value) : NaN;
  const timeHorizonYearsVal = ui ? parseLocaleNumber(ui.timeHorizonYears?.value) : NaN;
  const currentVolatilityVal = ui ? parseLocaleNumber(ui.currentVolatility?.value) : NaN;
  const newVolatilityVal = ui ? parseLocaleNumber(ui.newVolatility?.value) : NaN;
  const portfolioVolatilityVal = ui ? parseLocaleNumber(ui.portfolioVolatility?.value) : NaN;
  const correlationToPortfolioVal = ui ? parseLocaleNumber(ui.correlationToPortfolio?.value) : NaN;
  const taxProfile = typeof getDetailedTaxProfile === 'function' ? getDetailedTaxProfile() : { mode: 'flat' };

  const input = {
    shares: Number.isFinite(shares) ? Math.max(shares, 0) : NaN,
    buyPrice: Number.isFinite(buyPrice) ? Math.max(buyPrice, 0) : NaN,
    currentPrice: Number.isFinite(currentPrice) ? Math.max(currentPrice, 0) : NaN,
    taxRate,
    transactionCost,
    rebuyPrice,
    expectedOldReturn,
    expectedNewReturn,
    includeTaxOnNew: els.includeTaxOnNew.checked,
    currencyCode,
    instrumentCurrency: positionCurrency,
    positionCurrency,
    taxCurrency,
    sellFraction: sf,
    fxMode: activeFxMode,
    hurdleMode: typeof getHurdleMode === 'function' ? getHurdleMode() : 'beat-pretax',
    taxProfile,
    fxRateBuy: fxRateBuyVal,
    fxRateNow: fxRateNowVal,
    portfolioValue: pvVal,
    targetWeight: twVal,
    targetSellPrice: Number.isFinite(targetSellPriceVal) ? Math.max(targetSellPriceVal, 0) : NaN,
    targetReachProbability: Number.isFinite(targetReachProbabilityVal) ? Math.min(Math.max(targetReachProbabilityVal / 100, 0), 1) : 0.5,
    freshCashAmount: Number.isFinite(freshCashAmountVal) ? Math.max(freshCashAmountVal, 0) : 0,
    cashReserve: Number.isFinite(cashReserveVal) ? Math.max(cashReserveVal, 0) : 0,
    maxTolerableLoss: Number.isFinite(maxTolerableLossVal) ? Math.min(Math.max(maxTolerableLossVal / 100, 0), 1) : 0.25,
    timeHorizonYears: Number.isFinite(timeHorizonYearsVal) && timeHorizonYearsVal > 0 ? timeHorizonYearsVal : 1,
    sectorExposure: ui?.sectorExposure?.value || selectedInstrument?.sector || '',
    countryExposure: ui?.countryExposure?.value || selectedInstrument?.country || '',
    currentVolatility: Number.isFinite(currentVolatilityVal) ? Math.max(currentVolatilityVal / 100, 0) : NaN,
    newVolatility: Number.isFinite(newVolatilityVal) ? Math.max(newVolatilityVal / 100, 0) : NaN,
    portfolioVolatility: Number.isFinite(portfolioVolatilityVal) ? Math.max(portfolioVolatilityVal / 100, 0) : NaN,
    correlationToPortfolio: Number.isFinite(correlationToPortfolioVal) ? Math.min(Math.max(correlationToPortfolioVal / 100, -1), 1) : NaN,
    switchTargetPrice: Number.isFinite(switchTargetPriceParsed) ? Math.max(switchTargetPriceParsed, 0) : NaN,
    switchBuyCost: Number.isFinite(switchBuyCostParsed) ? Math.max(switchBuyCostParsed, 0) : 0,
    switchHorizonYears: Number.isFinite(switchHorizonYearsParsed) && switchHorizonYearsParsed > 0 ? switchHorizonYearsParsed : 1,
    switchAllowFractional: els.switchAllowFractional?.checked !== false,
    switchTargetInstrument: selectedTargetInstrument ? { ...selectedTargetInstrument } : null
  };
  if (typeof getActiveLotSaleResult === 'function') {
    input.lotSaleResult = getActiveLotSaleResult(input);
  }
  return input;
}

/* hasCoreInputs, afterTaxFutureValue, requiredGrossReturn,
   calculateValues now in app-core.js (with sellFraction + FX support) */

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
  setText(els.requiredDropAmount, '—');
  setText(els.requiredDropPct, '—');
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
  if (els.switchTicket) {
    els.switchTicket.hidden = true;
    els.switchTicket.innerHTML = '';
  }
  if (els.switchComparisonTable) {
    els.switchComparisonTable.hidden = true;
    els.switchComparisonTable.innerHTML = '';
  }
  if (els.switchMapping) {
    els.switchMapping.hidden = true;
    els.switchMapping.innerHTML = '';
  }
  if (els.switchHeatmap) els.switchHeatmap.innerHTML = '';
  renderSwitchAssetData();
  if (els.taxBreakdownPanel) els.taxBreakdownPanel.hidden = true;
  if (els.fifoPanel) els.fifoPanel.hidden = true;
  clearChart();
}

function renderTaxBreakdown(input, output) {
  if (!els.taxBreakdownPanel) return;
  const breakdown = output.taxBreakdown;
  if (!breakdown || input.taxProfile?.mode !== 'de') {
    els.taxBreakdownPanel.hidden = true;
    return;
  }
  const money = (value) => formatCurrency(value, input.taxCurrency || input.currencyCode);
  els.taxBreakdownPanel.hidden = false;
  setText(els.taxBreakdownMode, 'German detailed');
  setText(els.taxIncomeTax, money(breakdown.incomeTax));
  setText(els.taxSolidarity, money(breakdown.solidaritySurcharge));
  setText(els.taxChurch, money(breakdown.churchTax));
  setText(els.taxAllowanceUsed, money(breakdown.allowanceUsed));
  setText(els.taxLossOffset, money(breakdown.lossOffsetUsed));
  setText(els.taxExemption, money(breakdown.exemptAmount));
  setText(els.taxForeignCredit, money(breakdown.foreignTaxCreditUsed));
  setText(els.taxRemainingAllowance, money(breakdown.remainingAllowance));
}

function renderFifoBreakdown(input, output) {
  if (!els.fifoPanel || !els.fifoRows) return;
  const matches = output.lotSaleResult?.matches || [];
  const errors = output.lotSaleResult?.errors || [];
  if (!matches.length && !errors.length) {
    els.fifoPanel.hidden = true;
    els.fifoRows.innerHTML = '';
    return;
  }
  els.fifoPanel.hidden = false;
  const saleOrderLabel = ui?.saleOrderSelect?.selectedOptions?.[0]?.textContent || 'FIFO / broker default';
  setText(els.fifoSummary, errors.length ? errors[0] : `${formatShares(output.lotSaleResult.soldQuantity)} shares · ${saleOrderLabel}`);
  els.fifoRows.innerHTML = '';
  matches.slice(0, 8).forEach((match) => {
    const row = document.createElement('div');
    row.className = 'fifo-row';
    const date = document.createElement('span');
    const qty = document.createElement('strong');
    const gain = document.createElement('small');
    date.textContent = match.acquiredAt || 'No date';
    qty.textContent = formatShares(match.quantity);
    gain.textContent = formatCurrency(match.gain, input.taxCurrency || input.currencyCode);
    row.append(date, qty, gain);
    els.fifoRows.appendChild(row);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function signedMoney(value, currencyCode) {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${formatCurrency(value, currencyCode)}`;
}

function signedPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${formatPercent(value)}`;
}

function instrumentDisplayName(instrument, fallback = 'Manual target') {
  return instrument?.name || instrument?.symbol || fallback;
}

function renderSwitchReadiness(input, switchOutput) {
  if (!els.switchTargetReadiness) return;
  els.switchTargetReadiness.classList.remove('is-ready', 'is-live');
  if (selectedTargetInstrument && switchOutput.hasTargetPrice) {
    els.switchTargetReadiness.textContent = 'Target priced';
    els.switchTargetReadiness.classList.add('is-live');
  } else if (switchOutput.hasTargetPrice) {
    els.switchTargetReadiness.textContent = 'Manual price';
    els.switchTargetReadiness.classList.add('is-ready');
  } else if (selectedTargetInstrument) {
    els.switchTargetReadiness.textContent = 'Target selected';
    els.switchTargetReadiness.classList.add('is-ready');
  } else {
    els.switchTargetReadiness.textContent = 'Manual target';
  }
}

function renderSwitchTicket(input, output, switchOutput) {
  if (!els.switchTicket) return;
  if (!switchOutput.isValid) {
    els.switchTicket.hidden = true;
    els.switchTicket.innerHTML = '';
    return;
  }
  const money = (value) => formatCurrency(value, output.valueCurrency || input.currencyCode);
  const rows = [
    ['Sell shares', formatShares(output.sellShares)],
    ['Gross sale', money(output.sellValue)],
    ['Realized tax', money(output.taxDue)],
    ['Sell costs', money(switchOutput.sellCost)],
    ['Cash after sale', money(output.cashAfter)],
    ['Buy cost', money(switchOutput.buyCost)],
    ['Investable cash', money(switchOutput.investableCash)],
    ['Target price', switchOutput.hasTargetPrice ? money(switchOutput.targetPrice) : 'Manual'],
    ['Target shares', switchOutput.hasTargetPrice ? formatShares(switchOutput.targetShares) : 'Price needed'],
    ['Invested value', money(switchOutput.targetInvested)],
    ['Residual cash', money(switchOutput.residualCash)],
    ['Horizon', `${input.switchHorizonYears || 1}y`]
  ];
  els.switchTicket.hidden = false;
  els.switchTicket.innerHTML = `
    <div class="switch-ticket__header">
      <div><span>Trade ticket</span><strong>${escapeHtml(instrumentDisplayName(selectedTargetInstrument))}</strong></div>
      <strong>${switchOutput.allowFractional ? 'Fractional' : 'Whole shares'}</strong>
    </div>
    <div class="switch-ticket__grid">
      ${rows.map(([label, value], index) => `
        <div class="switch-ticket__item${index === 6 ? ' switch-ticket__item--wide' : ''}">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSwitchComparison(input, output, switchOutput) {
  if (!els.switchComparisonTable) return;
  if (!switchOutput.isValid) {
    els.switchComparisonTable.hidden = true;
    els.switchComparisonTable.innerHTML = '';
    return;
  }
  const money = (value) => formatCurrency(value, output.valueCurrency || input.currencyCode);
  const oldName = instrumentDisplayName(selectedInstrument, 'Hold old stock');
  const newName = instrumentDisplayName(selectedTargetInstrument, 'Switch target');
  const horizon = input.switchHorizonYears || 1;
  const targetShareText = switchOutput.hasTargetPrice
    ? formatShares(switchOutput.targetShares)
    : money(switchOutput.targetInvested);
  const rows = [
    ['Start value', money(output.sellValue), money(switchOutput.investableCash)],
    ['Realized tax', money(0), money(output.taxDue)],
    ['Costs', money(0), money(switchOutput.sellCost + switchOutput.buyCost)],
    ['Shares', formatShares(output.sellShares), targetShareText],
    [`Expected return (${horizon}y)`, formatPercent(input.expectedOldReturn), formatPercent(input.expectedNewReturn)],
    ['Future value', money(output.futureValueOld), money(switchOutput.futureValueNew)],
    ['Expected difference', '—', signedMoney(switchOutput.futureDifference, output.valueCurrency || input.currencyCode)],
    ['Required target return', '—', formatPercent(switchOutput.requiredTargetReturn)],
    ['Margin vs hurdle', '—', signedPercent(switchOutput.returnMargin)],
    ['Expected new gain', '—', money(switchOutput.expectedGainAmount)]
  ];
  const outcomeLabel = Number.isFinite(switchOutput.futureDifference)
    ? (switchOutput.futureDifference >= 0 ? 'Switch leads' : 'Hold leads')
    : 'Awaiting return';
  els.switchComparisonTable.hidden = false;
  els.switchComparisonTable.innerHTML = `
    <div class="switch-comparison-table__header">
      <div><span>Full comparison</span><strong>Hold vs switch</strong></div>
      <strong>${escapeHtml(outcomeLabel)}</strong>
    </div>
    <div class="switch-comparison-table__rows">
      <div class="switch-comparison-row switch-comparison-row--head">
        <span>Metric</span>
        <strong>${escapeHtml(oldName)}</strong>
        <strong>${escapeHtml(newName)}</strong>
      </div>
      ${rows.map(([label, hold, sw]) => `
        <div class="switch-comparison-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(hold)}</strong>
          <strong>${escapeHtml(sw)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSwitchMapping(input, output, switchOutput) {
  if (!els.switchMapping) return;
  if (!switchOutput.isValid) {
    els.switchMapping.hidden = true;
    els.switchMapping.innerHTML = '';
    return;
  }
  const portfolioValue = parseLocaleNumber(ui?.portfolioValue?.value);
  const beforeWeight = Number.isFinite(portfolioValue) && portfolioValue > 0 ? output.sellValue / portfolioValue : NaN;
  const afterWeight = Number.isFinite(portfolioValue) && portfolioValue > 0 ? switchOutput.targetInvested / portfolioValue : NaN;
  const fromCurrency = selectedInstrument?.priceCurrency || selectedInstrument?.currency || input.positionCurrency || input.currencyCode;
  const toCurrency = selectedTargetInstrument?.priceCurrency || selectedTargetInstrument?.currency || input.currencyCode;
  const cards = [
    ['Currency', `${fromCurrency || '—'} → ${toCurrency || '—'}`],
    ['Exchange', `${selectedInstrument?.exchange || 'Manual'} → ${selectedTargetInstrument?.exchange || 'Manual'}`],
    ['Country', `${selectedInstrument?.country || '—'} → ${selectedTargetInstrument?.country || '—'}`],
    ['Asset type', `${selectedInstrument?.type || 'Position'} → ${selectedTargetInstrument?.type || 'Target'}`],
    ['Tax class', ui?.instrumentTaxClass?.value || 'stock'],
    ['Portfolio weight', Number.isFinite(beforeWeight) ? `${formatPercent(beforeWeight)} → ${formatPercent(afterWeight)}` : 'Add portfolio value']
  ];
  els.switchMapping.hidden = false;
  els.switchMapping.innerHTML = `
    <div class="switch-mapping__header">
      <div><span>Exposure mapping</span><strong>${escapeHtml(instrumentDisplayName(selectedInstrument, 'Current position'))} → ${escapeHtml(instrumentDisplayName(selectedTargetInstrument))}</strong></div>
      <strong>${escapeHtml(switchOutput.hasTargetPrice ? 'Mapped' : 'Needs target price')}</strong>
    </div>
    <div class="switch-mapping__grid">
      ${cards.map(([label, value]) => `
        <div class="switch-map-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSwitchHeatmap(input, output, switchOutput) {
  if (!els.switchHeatmap) return;
  if (!switchOutput.isValid || !Number.isFinite(switchOutput.targetInvested) || switchOutput.targetInvested <= 0) {
    els.switchHeatmap.innerHTML = '';
    return;
  }
  const oldReturns = [-0.2, -0.1, 0, 0.1, 0.2];
  const newReturns = [-0.2, -0.1, 0, 0.1, 0.2];
  const money = (value) => formatCurrency(value, output.valueCurrency || input.currencyCode);
  const cells = ['<div class="switch-heatmap__cell switch-heatmap__cell--axis">old\\new</div>'];
  newReturns.forEach((newReturn) => {
    cells.push(`<div class="switch-heatmap__cell switch-heatmap__cell--axis">${escapeHtml(formatPercent(newReturn))}</div>`);
  });
  oldReturns.forEach((oldReturn) => {
    cells.push(`<div class="switch-heatmap__cell switch-heatmap__cell--axis">${escapeHtml(formatPercent(oldReturn))}</div>`);
    newReturns.forEach((newReturn) => {
      const holdValue = output.sellValue * (1 + oldReturn);
      const switchValue = input.taxProfile?.mode === 'de' && typeof GermanTax !== 'undefined'
        ? GermanTax.afterGermanTaxFutureValue(switchOutput.targetInvested, newReturn, input.taxProfile) + switchOutput.residualCash
        : afterTaxFutureValue(switchOutput.targetInvested, newReturn, input.taxRate, input.includeTaxOnNew) + switchOutput.residualCash;
      const diff = switchValue - holdValue;
      const nearBreak = Math.abs(diff) <= Math.max(output.sellValue * 0.01, 1);
      const klass = diff >= 0 ? 'switch-heatmap__cell--positive' : 'switch-heatmap__cell--negative';
      cells.push(`
        <div class="switch-heatmap__cell ${klass}${nearBreak ? ' switch-heatmap__cell--break' : ''}">
          ${escapeHtml(signedMoney(diff, output.valueCurrency || input.currencyCode))}
          <small>${escapeHtml(money(switchValue))}</small>
        </div>
      `);
    });
  });
  els.switchHeatmap.innerHTML = `
    <div class="switch-heatmap__header">
      <span>Scenario grid: old return rows, target return columns</span>
      <strong>${escapeHtml(switchOutput.allowFractional ? 'fractional' : 'whole shares')}</strong>
    </div>
    <div class="switch-heatmap__grid">${cells.join('')}</div>
  `;
}

function compactNumber(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('de-DE', {
    notation: Math.abs(value) >= 100_000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(value) >= 100_000 ? 1 : 0
  }).format(value);
}

function quoteMoney(value, currencyCode) {
  return Number.isFinite(value) ? formatCurrency(value, currencyCode) : '—';
}

function quoteDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('de-DE');
}

function quotePayload(payload, price, returnedCurrency, sourceCurrency) {
  const quote = {
    price,
    currency: returnedCurrency,
    source: 'Market data',
    converted: Boolean(payload.converted),
    originalPrice: Number(payload.originalPrice),
    originalCurrency: payload.originalCurrency || sourceCurrency,
    fxRate: Number(payload.fxRate),
    fetchedAt: payload.fetchedAt || new Date().toISOString(),
    latestTradingDay: payload.latestTradingDay || ''
  };
  ['open', 'high', 'low', 'previousClose', 'change', 'changePercent', 'volume', 'marketCap'].forEach((key) => {
    const value = Number(payload[key]);
    if (Number.isFinite(value)) quote[key] = value;
  });
  return quote;
}

function assetDataRows(instrument, quote) {
  const currency = quote?.currency || instrument?.priceCurrency || instrument?.currency || normalizeCurrencyCode(els.currencyCode.value);
  const rows = [
    ['Last', quote?.price ? quoteMoney(quote.price, currency) : 'Manual'],
    ['Day change', Number.isFinite(quote?.change) || Number.isFinite(quote?.changePercent)
      ? `${Number.isFinite(quote?.change) ? signedMoney(quote.change, currency) : '—'} · ${Number.isFinite(quote?.changePercent) ? signedPercent(quote.changePercent) : '—'}`
      : '—'],
    ['Day range', Number.isFinite(quote?.low) && Number.isFinite(quote?.high) ? `${quoteMoney(quote.low, currency)} – ${quoteMoney(quote.high, currency)}` : '—'],
    ['Prev close', quoteMoney(quote?.previousClose, currency)],
    ['Volume', compactNumber(quote?.volume)],
    ['Market cap', Number.isFinite(quote?.marketCap) ? quoteMoney(quote.marketCap, currency) : (instrument?.type || '—')],
    ['As of', quote?.latestTradingDay ? quoteDate(quote.latestTradingDay) : quoteDate(quote?.fetchedAt)],
    ['Currency', quote?.converted && quote?.originalCurrency ? `${quote.originalCurrency} -> ${currency}` : currency || '—']
  ];
  if (!quote) {
    rows.splice(1, 5,
      ['Currency', currency || '—'],
      ['Exchange', instrument?.exchange || '—'],
      ['Country', instrument?.country || '—'],
      ['Type', instrument?.type || '—'],
      ['Data', 'Select latest price']
    );
  }
  return rows;
}

function renderAssetDataCard(label, instrument, quote) {
  if (!instrument && !quote) return '';
  const symbol = instrument?.symbol || quote?.symbol || '—';
  const title = instrumentDisplayName(instrument, label);
  const rows = assetDataRows(instrument, quote);
  return `
    <article class="asset-data-card">
      <div class="asset-data-card__title">
        <span>${escapeHtml(title)}</span>
        <code>${escapeHtml(symbol)}</code>
      </div>
      <div class="asset-data-card__rows">
        ${rows.map(([name, value]) => `
          <div class="asset-data-row">
            <span>${escapeHtml(name)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function renderSwitchAssetData() {
  if (!els.switchAssetData) return;
  const currentCard = selectedInstrument || pendingPrice
    ? renderAssetDataCard('Current position', selectedInstrument, pendingPrice)
    : '';
  const targetCard = selectedTargetInstrument || pendingTargetPrice
    ? renderAssetDataCard('Switch target', selectedTargetInstrument, pendingTargetPrice)
    : '';
  if (!currentCard && !targetCard) {
    els.switchAssetData.hidden = true;
    els.switchAssetData.innerHTML = '';
    return;
  }
  els.switchAssetData.hidden = false;
  els.switchAssetData.innerHTML = `
    <div class="switch-asset-data__header">
      <div><span>Market snapshot</span><strong>Selected assets</strong></div>
      <strong>${escapeHtml([pendingPrice, pendingTargetPrice].filter(Boolean).length ? 'Live quote' : 'Metadata')}</strong>
    </div>
    <div class="switch-asset-data__grid">${currentCard}${targetCard}</div>
  `;
}

function updateResults(input, output) {
  if (!hasCoreInputs(input)) {
    showEmptyState();
    return;
  }

  const valueMoney = (value) => formatCurrency(value, output.valueCurrency || input.currencyCode);
  const positionMoney = (value) => formatCurrency(value, output.positionCurrency || input.currencyCode);
  const switchOutput = calculateSwitchUpgrade(input, output);
  const breakEvenText = positionMoney(output.breakEvenPrice);
  const requiredNewValue = Number.isFinite(switchOutput.requiredTargetReturn)
    ? switchOutput.requiredTargetReturn
    : output.requiredNewReturn;
  const requiredNewText = formatPercent(requiredNewValue);

  setText(els.heroBreakEven, breakEvenText);
  setText(els.stickyBreakEven, breakEvenText);
  setText(els.heroRequiredNew, requiredNewText);
  setText(els.stickyRequiredNew, requiredNewText);
  setText(els.heroDrop, `${formatPercent(output.requiredDropPct)} drop needed`);

  setText(els.breakEvenPrice, breakEvenText);
  setText(els.requiredDropAmount, positionMoney(output.requiredDrop));
  setText(els.requiredDropPct, formatPercent(output.requiredDropPct));
  setText(els.taxDue, valueMoney(output.taxDue));
  setText(els.cashAfter, valueMoney(output.cashAfter));
  setText(els.taxableGain, valueMoney(output.taxableGain));
  renderTaxBreakdown(input, output);
  renderFifoBreakdown(input, output);

  if (Number.isFinite(input.rebuyPrice) && input.rebuyPrice > 0) {
    const newShares = output.cashAfter / input.rebuyPrice;
    const shareDifference = newShares - input.shares;
    els.rebuySection.hidden = false;
    setText(els.newShareCount, `${formatShares(newShares)} shares`);
    setText(els.shareDifference, `${shareDifference >= 0 ? '+' : ''}${formatShares(shareDifference)}`);
    setSignedClass(els.shareDifference, shareDifference);

    if (input.rebuyPrice < output.breakEvenPrice) {
      els.sameVerdict.textContent = 'Adds shares';
      els.sameExplanation.textContent = `At ${positionMoney(input.rebuyPrice)}, you buy back more than your original ${formatShares(input.shares)} shares.`;
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
  setText(els.cashRatio, formatPercent(switchOutput.investableCash / output.sellValue));
  setText(els.requiredExcessReturn, formatPercent(switchOutput.requiredExcessReturn));
  setText(els.fvOld, valueMoney(output.futureValueOld));

  const taxPhrase = input.includeTaxOnNew ? 'after tax on future positive gains' : 'without taxing future gains';
  els.switchVerdict.textContent = 'Hurdle rate';
  const targetPhrase = selectedTargetInstrument
    ? `${instrumentDisplayName(selectedTargetInstrument)} must reach`
    : 'The new stock must reach';
  els.switchExplanation.textContent = `${targetPhrase} ${requiredNewText} gross return to match holding the old stock, ${taxPhrase}.`;

  if (Number.isFinite(input.expectedNewReturn)) {
    els.futureComparison.hidden = false;
    setText(els.fvNew, valueMoney(switchOutput.futureValueNew));
    setText(els.fvDifference, signedMoney(switchOutput.futureDifference, output.valueCurrency || input.currencyCode));
    setSignedClass(els.fvDifference, switchOutput.futureDifference);
    els.switchVerdict.textContent = switchOutput.futureDifference >= 0 ? 'Beats hold' : 'Trails hold';
  } else {
    els.futureComparison.hidden = true;
    setText(els.fvNew, '—');
    setText(els.fvDifference, '—');
    els.fvDifference.classList.remove('is-positive', 'is-negative');
  }
  renderSwitchReadiness(input, switchOutput);
  renderSwitchTicket(input, output, switchOutput);
  renderSwitchComparison(input, output, switchOutput);
  renderSwitchMapping(input, output, switchOutput);
  renderSwitchAssetData();
  renderSwitchHeatmap(input, output, switchOutput);
}

function drawChart(input, output, switchOutput = calculateSwitchUpgrade(input, output)) {
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
  const required = oldReturns.map((oldReturn) => {
    if (input.hurdleMode === 'reduce-risk') return 0;
    const targetValue = typeof hurdleTargetValue === 'function'
      ? hurdleTargetValue({
        sellValue: output.sellValue,
        oldReturn,
        taxRate: input.taxRate,
        hurdleMode: input.hurdleMode,
        taxProfile: input.taxProfile
      })
      : output.sellValue * (1 + oldReturn);
    return typeof requiredGrossReturnForInvestment === 'function'
      ? requiredGrossReturnForInvestment({
        investmentBase: switchOutput.targetInvested,
        residualCash: switchOutput.residualCash,
        targetValue,
        taxRate: input.taxRate,
        includeTax: input.includeTaxOnNew,
        taxProfile: input.taxProfile
      })
      : requiredGrossReturn(output.cashRatio, oldReturn, input.taxRate, input.includeTaxOnNew);
  });

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

function clearAssetPerformanceChart(message = 'Select an instrument to load history.') {
  const canvas = els.assetPerformanceChart;
  if (canvas?.getContext) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
  }
  if (els.assetPerformanceStatus) els.assetPerformanceStatus.textContent = message;
}

function historyRequestKey(instrument, range, currency) {
  return [
    instrument?.symbol || '',
    instrument?.exchange || '',
    instrument?.providerSymbol || '',
    currency,
    range
  ].join('|');
}

function historyParamsFor(instrument, range, currency) {
  const sourceCurrency = normalizeCurrencyCode(instrument?.nativeCurrency || instrument?.currency || currency);
  return new URLSearchParams({
    symbol: instrument.symbol,
    exchange: instrument.exchange || '',
    mic_code: instrument.micCode || instrument.mic_code || '',
    currency,
    sourceCurrency,
    range,
    type: instrument.type || '',
    providerSymbol: instrument.providerSymbol || '',
    twelvedataSymbol: instrument.twelvedataSymbol || '',
    fmpSymbol: instrument.fmpSymbol || '',
    eodhdSymbol: instrument.eodhdSymbol || '',
    alphavantageSymbol: instrument.alphavantageSymbol || ''
  });
}

async function loadAssetHistory(instrument, role, range, signal) {
  const currency = normalizeCurrencyCode(els.currencyCode.value);
  const key = historyRequestKey(instrument, range, currency);
  if (assetHistoryCache.has(key)) return { role, payload: assetHistoryCache.get(key) };
  const params = historyParamsFor(instrument, range, currency);
  const response = await fetch(`/.netlify/functions/get-history?${params.toString()}`, { signal });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.points) || payload.points.length < 2) {
    throw new Error(payload.message || payload.error || 'Historical prices unavailable.');
  }
  assetHistoryCache.set(key, payload);
  return { role, payload };
}

function normalizedHistorySeries(payload, label, color) {
  const points = (payload?.points || [])
    .filter(point => point?.date && Number.isFinite(Number(point.close)))
    .map(point => ({ date: point.date, time: new Date(point.date).getTime(), close: Number(point.close) }))
    .filter(point => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
  if (points.length < 2) return null;
  const base = points[0].close;
  if (!Number.isFinite(base) || base <= 0) return null;
  return {
    label,
    color,
    payload,
    points: points.map(point => ({
      ...point,
      value: point.close / base - 1
    }))
  };
}

function drawAssetPerformanceChart() {
  const canvas = els.assetPerformanceChart;
  if (!canvas || !canvas.getContext) return;

  const series = [
    normalizedHistorySeries(assetHistoryData.current, instrumentDisplayName(selectedInstrument, 'Current'), '#98a2b3'),
    normalizedHistorySeries(assetHistoryData.target, instrumentDisplayName(selectedTargetInstrument, 'Target'), '#2b63ff')
  ].filter(Boolean);

  if (!series.length) {
    clearAssetPerformanceChart('Historical price data appears when a selected asset can be loaded.');
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(rect.width, 280);
  const cssHeight = 250;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = cssWidth;
  const height = cssHeight;
  const pad = { top: 24, right: 14, bottom: 32, left: 46 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const allPoints = series.flatMap(item => item.points);
  const minTime = Math.min(...allPoints.map(point => point.time));
  const maxTime = Math.max(...allPoints.map(point => point.time));
  let minY = Math.min(...allPoints.map(point => point.value), -0.02);
  let maxY = Math.max(...allPoints.map(point => point.value), 0.02);
  const spread = maxY - minY || 0.1;
  minY -= spread * 0.14;
  maxY += spread * 0.14;

  const xFor = (time) => {
    if (maxTime === minTime) return pad.left + chartW / 2;
    return pad.left + ((time - minTime) / (maxTime - minTime)) * chartW;
  };
  const yFor = (value) => pad.top + chartH - ((value - minY) / (maxY - minY)) * chartH;

  ctx.clearRect(0, 0, width, height);
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

  const zeroY = yFor(0);
  ctx.strokeStyle = 'rgba(16, 24, 40, 0.18)';
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(width - pad.right, zeroY);
  ctx.stroke();

  series.forEach((item) => {
    ctx.beginPath();
    item.points.forEach((point, index) => {
      const x = xFor(point.time);
      const y = yFor(point.value);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    const last = item.points[item.points.length - 1];
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(xFor(last.time), yFor(last.value), 3.6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let legendX = pad.left;
  series.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legendX + 4, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#344054';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    const label = `${item.label.slice(0, 22)} ${signedPercent(item.points[item.points.length - 1].value)}`;
    ctx.fillText(label, legendX + 12, 3);
    legendX += Math.min(ctx.measureText(label).width + 34, 210);
  });

  ctx.fillStyle = '#667085';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(quoteDate(new Date(minTime).toISOString()), pad.left, pad.top + chartH + 9);
  ctx.textAlign = 'right';
  ctx.fillText(quoteDate(new Date(maxTime).toISOString()), width - pad.right, pad.top + chartH + 9);

  const converted = series.some(item => item.payload?.converted);
  const pointCount = Math.max(...series.map(item => item.points.length));
  if (els.assetPerformanceStatus) {
    els.assetPerformanceStatus.textContent = `${assetHistoryRange} history · ${pointCount} daily points${converted ? ' · converted with latest FX rate' : ''}`;
  }
}

function queueAssetHistoryRefresh(delay = 140) {
  clearTimeout(assetHistoryTimer);
  assetHistoryTimer = window.setTimeout(refreshAssetHistory, delay);
}

async function refreshAssetHistory() {
  if (!els.assetPerformanceChart) return;
  const instruments = [
    selectedInstrument ? { role: 'current', instrument: selectedInstrument } : null,
    selectedTargetInstrument ? { role: 'target', instrument: selectedTargetInstrument } : null
  ].filter(Boolean);

  if (!instruments.length) {
    assetHistoryData = { current: null, target: null };
    clearAssetPerformanceChart();
    return;
  }

  if (!canUseFunctionEndpoint()) {
    clearAssetPerformanceChart('Live history needs Netlify dev or deploy.');
    return;
  }

  if (assetHistoryAbort) assetHistoryAbort.abort();
  assetHistoryAbort = new AbortController();
  const currentAbort = assetHistoryAbort;
  if (els.assetPerformanceStatus) els.assetPerformanceStatus.textContent = 'Loading historical prices...';

  try {
    const results = await Promise.allSettled(instruments.map(item => (
      loadAssetHistory(item.instrument, item.role, assetHistoryRange, currentAbort.signal)
    )));
    if (assetHistoryAbort !== currentAbort) return;
    const nextData = { current: null, target: null };
    let successCount = 0;
    let failureCount = 0;
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        nextData[result.value.role] = result.value.payload;
        successCount += 1;
      } else if (result.reason?.name !== 'AbortError') {
        failureCount += 1;
      }
    });
    assetHistoryData = nextData;
    drawAssetPerformanceChart();
    if (!successCount && failureCount && els.assetPerformanceStatus) {
      els.assetPerformanceStatus.textContent = 'Historical prices unavailable for the selected assets.';
    } else if (failureCount && els.assetPerformanceStatus) {
      els.assetPerformanceStatus.textContent += ' · some comparison history unavailable';
    }
  } catch (error) {
    if (error.name !== 'AbortError') clearAssetPerformanceChart('Historical prices unavailable for the selected assets.');
  } finally {
    if (assetHistoryAbort === currentAbort) assetHistoryAbort = null;
  }
}

function calculate() {
  setCurrency(els.currencyCode.value);
  const input = getInputs();
  const output = calculateValues(input);
  const switchOutput = calculateSwitchUpgrade(input, output);
  const signature = JSON.stringify(input);

  updateChipState();
  updateResults(input, output);
  if (signature !== lastSignature || activeMode === 'switch') {
    drawChart(input, output, switchOutput);
    lastSignature = signature;
  }
  // New v2 UI updates
  if (typeof updateTaxDrag === 'function') updateTaxDrag(input, output);
  if (typeof updatePartialSell === 'function') updatePartialSell(input, output);
  if (typeof updatePortfolio === 'function') updatePortfolio(input, output);
  if (typeof updateLocalAlerts === 'function') updateLocalAlerts(input, output);
  if (typeof updateDecisionLab === 'function') updateDecisionLab(input, output, switchOutput);
  if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
  queueDockVisibility();
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
  els.sameResult.setAttribute('aria-hidden', String(mode !== 'same'));
  els.switchResult.setAttribute('aria-hidden', String(mode !== 'switch'));
  requestAnimationFrame(calculate);
}

function updateDockVisibility() {
  if (!els.stickySummary) return;
  if (window.matchMedia('(min-width: 740px)').matches) {
    els.stickySummary.classList.remove('is-docked-hidden');
    return;
  }

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const heroRect = els.pageHero?.getBoundingClientRect();
  const resultsRect = els.resultsPanel?.getBoundingClientRect();
  const switchTargetRect = document.querySelector('.switch-target-panel')?.getBoundingClientRect();
  const headerSummaryVisible = heroRect ? heroRect.bottom > 16 : false;
  const resultsVisible = resultsRect
    ? resultsRect.top < viewportHeight - 90 && resultsRect.bottom > 90
    : false;
  const switchTargetVisible = switchTargetRect
    ? switchTargetRect.top < viewportHeight - 90 && switchTargetRect.bottom > 90
    : false;
  const formActive = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
  const configuredSwitchTarget = Boolean(els.switchTargetPrice?.value || selectedTargetInstrument);

  els.stickySummary.classList.toggle('is-docked-hidden', headerSummaryVisible || resultsVisible || switchTargetVisible || formActive || configuredSwitchTarget);
}

function queueDockVisibility() {
  requestAnimationFrame(updateDockVisibility);
}

/* localSearchSymbols now in app-core.js */

function setMarketStatus(text, tone = '') {
  els.marketDataStatus.textContent = text;
  els.marketDataStatus.classList.remove('is-success', 'is-warning', 'is-error');
  if (tone) els.marketDataStatus.classList.add(`is-${tone}`);
}

function canUseFunctionEndpoint() {
  return window.location.protocol !== 'file:';
}

function setPriceLoading(isLoading, label = 'Apply latest') {
  els.selectedInstrument?.classList.toggle('is-loading-price', Boolean(isLoading));
  els.selectedInstrument?.setAttribute('aria-busy', String(Boolean(isLoading)));
  if (els.useLatestPriceBtn) {
    els.useLatestPriceBtn.disabled = Boolean(isLoading);
    els.useLatestPriceBtn.textContent = isLoading ? 'Fetching live...' : label;
  }
  if (els.refreshPriceBtn) els.refreshPriceBtn.disabled = Boolean(isLoading);
}

function flashField(input, className = 'is-autofilled') {
  const field = input?.closest?.('.field');
  if (!field) return;
  field.classList.remove(className);
  void field.offsetWidth;
  field.classList.add(className);
  window.setTimeout(() => field.classList.remove(className), 1400);
}

function flashLiveResult() {
  const targets = [els.selectedInstrument, els.selectedTargetInstrument, els.resultsPanel].filter(Boolean);
  targets.forEach((target) => {
    target.classList.remove('is-live-updated');
    void target.offsetWidth;
    target.classList.add('is-live-updated');
    window.setTimeout(() => target.classList.remove('is-live-updated'), 1200);
  });
}

function instrumentInitials(item) {
  const symbol = String(item?.symbol || '?').replace(/[^A-Za-z0-9]/g, '');
  return symbol.slice(0, 2).toUpperCase() || '?';
}

function instrumentSubtitle(item) {
  return [item.symbol, item.exchange, item.country, item.currency, item.type].filter(Boolean).join(' · ');
}

function getAssetFilters() {
  return {
    type: els.assetTypeFilter?.value || 'all',
    country: els.assetCountryFilter?.value || 'all'
  };
}

function getTargetAssetFilters() {
  return {
    type: els.targetAssetTypeFilter?.value || 'all',
    country: els.targetAssetCountryFilter?.value || 'all'
  };
}

function assetMatchesFilter(item, filters = getAssetFilters()) {
  const type = String(item?.type || '').toLowerCase();
  const country = String(item?.country || '').toLowerCase();
  const exchange = String(item?.exchange || '').toLowerCase();
  const requestedType = String(filters.type || 'all').toLowerCase();
  const requestedCountry = String(filters.country || 'all').toLowerCase();
  const typeOk = requestedType === 'all'
    || (requestedType === 'stock' && (type.includes('stock') || type.includes('adr') || type.includes('reit')))
    || (requestedType === 'etf' && type.includes('etf'))
    || (requestedType === 'index' && type.includes('index'))
    || (requestedType === 'fx' && (type.includes('forex') || type.includes('physical currency')))
    || (requestedType === 'crypto' && (type.includes('crypto') || type.includes('digital currency')));
  const countryOk = requestedCountry === 'all'
    || country === requestedCountry
    || exchange.includes(requestedCountry);
  return typeOk && countryOk;
}

function filteredLocalSearchSymbols(query, limit = 10, filters = getAssetFilters()) {
  return localSearchSymbols(query, Math.min(limit * 3, 60))
    .filter(item => assetMatchesFilter(item, filters))
    .slice(0, limit);
}

function setSearchExpanded(input, expanded) {
  if (!input) return;
  input.setAttribute('aria-expanded', String(Boolean(expanded)));
  if (!expanded) input.removeAttribute('aria-activedescendant');
}

function updateSearchActiveState(container, input, activeIndex) {
  if (!container) return;
  const options = [...container.querySelectorAll('.instrument-option[role="option"]')];
  options.forEach((option, index) => {
    const isActive = index === activeIndex;
    option.setAttribute('aria-selected', String(isActive));
    if (isActive) {
      input?.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    }
  });
  if (activeIndex < 0) input?.removeAttribute('aria-activedescendant');
}

function setInstrumentSearchHidden(hidden) {
  if (!els.instrumentResults) return;
  els.instrumentResults.hidden = Boolean(hidden);
  setSearchExpanded(els.instrumentSearch, !hidden);
  if (hidden) {
    activeInstrumentResultIndex = -1;
    updateSearchActiveState(els.instrumentResults, els.instrumentSearch, activeInstrumentResultIndex);
  }
}

function setTargetSearchHidden(hidden) {
  if (!els.targetInstrumentResults) return;
  els.targetInstrumentResults.hidden = Boolean(hidden);
  setSearchExpanded(els.targetInstrumentSearch, !hidden);
  if (hidden) {
    activeTargetInstrumentResultIndex = -1;
    updateSearchActiveState(els.targetInstrumentResults, els.targetInstrumentSearch, activeTargetInstrumentResultIndex);
  }
}

function moveSearchActiveResult(kind, delta) {
  const isTarget = kind === 'target';
  const items = isTarget ? targetInstrumentResultItems : instrumentResultItems;
  if (!items.length) return;
  const current = isTarget ? activeTargetInstrumentResultIndex : activeInstrumentResultIndex;
  const next = current < 0
    ? (delta > 0 ? 0 : items.length - 1)
    : (current + delta + items.length) % items.length;
  if (isTarget) {
    activeTargetInstrumentResultIndex = next;
    updateSearchActiveState(els.targetInstrumentResults, els.targetInstrumentSearch, next);
  } else {
    activeInstrumentResultIndex = next;
    updateSearchActiveState(els.instrumentResults, els.instrumentSearch, next);
  }
}

function selectActiveSearchResult(kind) {
  const isTarget = kind === 'target';
  const items = isTarget ? targetInstrumentResultItems : instrumentResultItems;
  const activeIndex = isTarget ? activeTargetInstrumentResultIndex : activeInstrumentResultIndex;
  const item = items[activeIndex >= 0 ? activeIndex : 0];
  if (!item) return false;
  if (isTarget) selectTargetInstrument(item);
  else selectInstrument(item);
  return true;
}

function handleInstrumentSearchKeydown(event, kind) {
  const isTarget = kind === 'target';
  const input = isTarget ? els.targetInstrumentSearch : els.instrumentSearch;
  const container = isTarget ? els.targetInstrumentResults : els.instrumentResults;
  const items = isTarget ? targetInstrumentResultItems : instrumentResultItems;
  if (!input || !container) return;

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (container.hidden && input.value.trim().length >= 2) {
      isTarget ? queueTargetSymbolSearch() : queueSymbolSearch();
    }
    moveSearchActiveResult(kind, event.key === 'ArrowDown' ? 1 : -1);
    return;
  }

  if (event.key === 'Enter' && !container.hidden && items.length) {
    event.preventDefault();
    selectActiveSearchResult(kind);
    return;
  }

  if (event.key === 'Escape') {
    isTarget ? setTargetSearchHidden(true) : setInstrumentSearchHidden(true);
  }
}

function renderInstrumentResults(results, sourceLabel = '') {
  els.instrumentResults.innerHTML = '';
  instrumentResultItems = results.slice();
  activeInstrumentResultIndex = results.length ? 0 : -1;

  if (!results.length) {
    const empty = document.createElement('div');
    empty.className = 'instrument-option';
    empty.setAttribute('aria-disabled', 'true');
    empty.innerHTML = '<span class="asset-avatar">?</span><div class="instrument-option__text"><strong>No matches found</strong><span>Try a symbol, company name, ETF name or index.</span></div><code>—</code>';
    els.instrumentResults.appendChild(empty);
    setInstrumentSearchHidden(false);
    return;
  }

  results.forEach((item, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'instrument-option';
    option.id = `instrument-option-${index}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(index === activeInstrumentResultIndex));
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

  setInstrumentSearchHidden(false);
  updateSearchActiveState(els.instrumentResults, els.instrumentSearch, activeInstrumentResultIndex);
}

function renderInstrumentLoading(text) {
  els.instrumentResults.innerHTML = '';
  instrumentResultItems = [];
  activeInstrumentResultIndex = -1;
  const row = document.createElement('div');
  row.className = 'instrument-option';
  row.setAttribute('aria-disabled', 'true');
  row.innerHTML = `<span class="asset-avatar">…</span><div class="instrument-option__text"><strong>${text}</strong><span>Searching available instruments…</span></div><code>API</code>`;
  els.instrumentResults.appendChild(row);
  setInstrumentSearchHidden(false);
}

function instrumentResultKey(item) {
  const symbol = String(item?.symbol || '').trim().toUpperCase();
  const exchange = String(item?.exchange || item?.micCode || item?.mic_code || '').trim().toUpperCase();
  const currency = String(item?.currency || '').trim().toUpperCase();
  return [symbol, exchange, currency].join('|');
}

function mergeInstrumentResults(primary = [], secondary = [], limit = 10) {
  const seen = new Set();
  const merged = [];
  const add = (item) => {
    if (!item?.symbol) return;
    const key = instrumentResultKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  };

  primary.forEach(add);
  secondary.forEach(add);
  return merged.slice(0, limit);
}

async function searchSymbols(query) {
  const q = String(query || '').trim();
  if (q.length < 2) {
    instrumentResultItems = [];
    setInstrumentSearchHidden(true);
    return;
  }

  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();
  renderInstrumentLoading('Searching');
  const filters = getAssetFilters();
  const params = new URLSearchParams({
    q,
    type: filters.type,
    country: filters.country
  });

  try {
    const response = await fetch(`/.netlify/functions/search-symbols?${params.toString()}`, {
      signal: searchAbort.signal
    });

    if (!response.ok) throw new Error(`Search failed with ${response.status}`);
    const payload = await response.json();
    const apiResults = Array.isArray(payload.results) ? payload.results : [];
    const fallbackResults = filteredLocalSearchSymbols(q);
    const results = apiResults.length ? mergeInstrumentResults(fallbackResults, apiResults) : fallbackResults;
    renderInstrumentResults(results, payload.source || 'search');
  } catch (error) {
    if (error.name === 'AbortError') return;
    renderInstrumentResults(filteredLocalSearchSymbols(q), 'local');
  }
}

function queueSymbolSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchSymbols(els.instrumentSearch.value), 260);
}

function queueAutoPriceFetch() {
  clearTimeout(autoPriceTimer);
  autoPriceTimer = window.setTimeout(() => useLatestPrice({ auto: true }), 90);
}

function selectInstrument(item, options = {}) {
  selectedInstrument = { ...item };
  pendingPrice = null;
  latestQuoteData = null;
  assetHistoryData.current = null;
  els.selectedInstrument.hidden = false;
  els.selectedInstrument.classList.remove('is-loading-price', 'is-live-updated');
  setInstrumentSearchHidden(true);
  els.instrumentSearch.value = item.name || item.symbol || '';
  els.selectedAvatar.textContent = instrumentInitials(item);
  els.selectedName.textContent = item.name || item.symbol || 'Selected instrument';
  els.selectedMeta.textContent = instrumentSubtitle(item);
  if (ui?.priceTimestamp) ui.priceTimestamp.hidden = true;
  if (els.refreshPriceBtn) els.refreshPriceBtn.hidden = true;
  if (canUseFunctionEndpoint() && !options.skipAutoPrice) {
    setMarketStatus('Selected. Pulling the latest market price automatically...');
    queueAutoPriceFetch();
  } else {
    setMarketStatus(canUseFunctionEndpoint()
      ? 'Selected instrument. Current price stays manual until refreshed.'
      : 'Selected instrument. Live auto-price needs Netlify dev or deploy.');
  }
  renderSwitchAssetData();
  drawAssetPerformanceChart();
  queueAssetHistoryRefresh();
  calculate();
}

function clearSelectedInstrument({ clearSearch = true } = {}) {
  clearTimeout(autoPriceTimer);
  if (priceAbort) priceAbort.abort();
  priceAbort = null;
  selectedInstrument = null;
  pendingPrice = null;
  latestQuoteData = null;
  assetHistoryData.current = null;
  els.selectedInstrument.hidden = true;
  els.selectedInstrument.classList.remove('is-loading-price', 'is-live-updated');
  els.selectedInstrument.removeAttribute('aria-busy');
  setInstrumentSearchHidden(true);
  if (els.refreshPriceBtn) els.refreshPriceBtn.hidden = true;
  if (ui?.priceTimestamp) ui.priceTimestamp.hidden = true;
  if (clearSearch) els.instrumentSearch.value = '';
  setMarketStatus('Selected instruments are metadata only until you fill or fetch a current price.');
  renderSwitchAssetData();
  drawAssetPerformanceChart();
  queueAssetHistoryRefresh();
}

async function useLatestPrice(options = {}) {
  if (!selectedInstrument?.symbol) return;
  const auto = options?.auto === true;

  if (!canUseFunctionEndpoint()) {
    setMarketStatus('Live price needs Netlify dev or deploy. Enter the current price manually.', auto ? 'warning' : 'error');
    return;
  }

  const targetCurrency = normalizeCurrencyCode(els.currencyCode.value);
  const sourceCurrency = normalizeCurrencyCode(selectedInstrument.currency || targetCurrency);
  const requestKey = [
    selectedInstrument.symbol,
    selectedInstrument.exchange || '',
    selectedInstrument.providerSymbol || '',
    targetCurrency
  ].join('|');
  const params = new URLSearchParams({
    symbol: selectedInstrument.symbol,
    exchange: selectedInstrument.exchange || '',
    mic_code: selectedInstrument.micCode || selectedInstrument.mic_code || '',
    currency: targetCurrency,
    sourceCurrency,
    type: selectedInstrument.type || '',
    providerSymbol: selectedInstrument.providerSymbol || '',
    twelvedataSymbol: selectedInstrument.twelvedataSymbol || '',
    fmpSymbol: selectedInstrument.fmpSymbol || '',
    eodhdSymbol: selectedInstrument.eodhdSymbol || '',
    alphavantageSymbol: selectedInstrument.alphavantageSymbol || ''
  });

  if (priceAbort) priceAbort.abort();
  priceAbort = new AbortController();
  const currentAbort = priceAbort;
  setPriceLoading(true);
  setMarketStatus(auto ? 'Selected. Pulling the latest market price automatically...' : 'Fetching latest price...');

  try {
    const response = await fetch(`/.netlify/functions/get-price?${params.toString()}`, {
      signal: currentAbort.signal
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !Number.isFinite(Number(payload.price))) {
      const message = payload.message || payload.error || 'Live price unavailable. Enter the current price manually.';
      setMarketStatus(message, response.status === 503 ? 'warning' : 'error');
      return;
    }

    const activeKey = [
      selectedInstrument?.symbol || '',
      selectedInstrument?.exchange || '',
      selectedInstrument?.providerSymbol || '',
      normalizeCurrencyCode(els.currencyCode.value)
    ].join('|');
    if (activeKey !== requestKey) return;

    const price = Number(payload.price);
    const returnedCurrency = normalizeCurrencyCode(payload.currency || targetCurrency);
    const converted = Boolean(payload.converted);
    pendingPrice = quotePayload(payload, price, returnedCurrency, sourceCurrency);
    latestQuoteData = pendingPrice;
    applyingMarketPrice = true;
    els.currentPrice.value = formatInputNumber(price);
    applyingMarketPrice = false;
    setCurrency(returnedCurrency);
    selectedInstrument.priceCurrency = returnedCurrency;
    selectedInstrument.nativeCurrency = payload.originalCurrency || sourceCurrency;
    if (ui?.priceTimestamp) {
      ui.priceTimestamp.hidden = false;
      if (ui.priceSourceLabel) {
        ui.priceSourceLabel.textContent = converted && Number.isFinite(Number(payload.originalPrice))
          ? `Converted from ${formatCurrency(Number(payload.originalPrice), payload.originalCurrency || sourceCurrency)}`
          : 'Latest market price';
      }
      if (ui.priceTimeLabel) {
        ui.priceTimeLabel.textContent = `Fetched: ${new Date(pendingPrice.fetchedAt).toLocaleTimeString('de-DE')}`;
      }
    }
    if (els.refreshPriceBtn) els.refreshPriceBtn.hidden = false;
    flashField(els.currentPrice);
    flashLiveResult();
    setMarketStatus(`${auto ? 'Auto-applied' : 'Applied'} latest ${returnedCurrency} market price: ${formatCurrency(price, returnedCurrency)}.`, 'success');
    renderSwitchAssetData();
    queueAssetHistoryRefresh();
    calculate();
  } catch (error) {
    if (error.name === 'AbortError') return;
    setMarketStatus('Live price unavailable in this environment. Enter the current price manually.', 'warning');
  } finally {
    if (priceAbort === currentAbort) {
      priceAbort = null;
      setPriceLoading(false);
    }
  }
}

function setTargetMarketStatus(text, tone = '') {
  if (!els.targetMarketDataStatus) return;
  els.targetMarketDataStatus.textContent = text;
  els.targetMarketDataStatus.classList.remove('is-success', 'is-warning', 'is-error');
  if (tone) els.targetMarketDataStatus.classList.add(`is-${tone}`);
}

function setTargetPriceLoading(isLoading, label = 'Apply latest') {
  els.selectedTargetInstrument?.classList.toggle('is-loading-price', Boolean(isLoading));
  els.selectedTargetInstrument?.setAttribute('aria-busy', String(Boolean(isLoading)));
  if (els.useLatestTargetPriceBtn) {
    els.useLatestTargetPriceBtn.disabled = Boolean(isLoading);
    els.useLatestTargetPriceBtn.textContent = isLoading ? 'Fetching live...' : label;
  }
  if (els.refreshTargetPriceBtn) els.refreshTargetPriceBtn.disabled = Boolean(isLoading);
}

function renderTargetInstrumentResults(results, sourceLabel = '') {
  if (!els.targetInstrumentResults) return;
  els.targetInstrumentResults.innerHTML = '';
  targetInstrumentResultItems = results.slice();
  activeTargetInstrumentResultIndex = results.length ? 0 : -1;

  if (!results.length) {
    const empty = document.createElement('div');
    empty.className = 'instrument-option';
    empty.setAttribute('aria-disabled', 'true');
    empty.innerHTML = '<span class="asset-avatar">?</span><div class="instrument-option__text"><strong>No matches found</strong><span>Try another target symbol, company, ETF or index.</span></div><code>—</code>';
    els.targetInstrumentResults.appendChild(empty);
    setTargetSearchHidden(false);
    return;
  }

  results.forEach((item, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'instrument-option';
    option.id = `target-instrument-option-${index}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(index === activeTargetInstrumentResultIndex));
    option.dataset.index = String(index);

    const avatar = document.createElement('span');
    avatar.className = 'asset-avatar';
    avatar.textContent = instrumentInitials(item);

    const text = document.createElement('div');
    text.className = 'instrument-option__text';
    const name = document.createElement('strong');
    name.textContent = item.name || item.symbol || 'Unknown target';
    const meta = document.createElement('span');
    meta.textContent = instrumentSubtitle(item);
    text.append(name, meta);

    const code = document.createElement('code');
    code.textContent = item.currency || sourceLabel || '—';

    option.append(avatar, text, code);
    option.addEventListener('click', () => selectTargetInstrument(item));
    els.targetInstrumentResults.appendChild(option);
  });

  setTargetSearchHidden(false);
  updateSearchActiveState(els.targetInstrumentResults, els.targetInstrumentSearch, activeTargetInstrumentResultIndex);
}

function renderTargetInstrumentLoading(text) {
  if (!els.targetInstrumentResults) return;
  els.targetInstrumentResults.innerHTML = '';
  targetInstrumentResultItems = [];
  activeTargetInstrumentResultIndex = -1;
  const row = document.createElement('div');
  row.className = 'instrument-option';
  row.setAttribute('aria-disabled', 'true');
  row.innerHTML = `<span class="asset-avatar">…</span><div class="instrument-option__text"><strong>${text}</strong><span>Searching target instruments…</span></div><code>API</code>`;
  els.targetInstrumentResults.appendChild(row);
  setTargetSearchHidden(false);
}

async function searchTargetSymbols(query) {
  const q = String(query || '').trim();
  if (q.length < 2) {
    targetInstrumentResultItems = [];
    setTargetSearchHidden(true);
    return;
  }

  if (targetSearchAbort) targetSearchAbort.abort();
  targetSearchAbort = new AbortController();
  renderTargetInstrumentLoading('Searching');
  const filters = getTargetAssetFilters();
  const params = new URLSearchParams({
    q,
    type: filters.type,
    country: filters.country
  });

  try {
    const response = await fetch(`/.netlify/functions/search-symbols?${params.toString()}`, {
      signal: targetSearchAbort.signal
    });

    if (!response.ok) throw new Error(`Search failed with ${response.status}`);
    const payload = await response.json();
    const apiResults = Array.isArray(payload.results) ? payload.results : [];
    const fallbackResults = filteredLocalSearchSymbols(q, 10, filters);
    const results = apiResults.length ? mergeInstrumentResults(fallbackResults, apiResults) : fallbackResults;
    renderTargetInstrumentResults(results, payload.source || 'search');
  } catch (error) {
    if (error.name === 'AbortError') return;
    renderTargetInstrumentResults(filteredLocalSearchSymbols(q, 10, filters), 'local');
  }
}

function queueTargetSymbolSearch() {
  clearTimeout(targetSearchTimer);
  targetSearchTimer = setTimeout(() => searchTargetSymbols(els.targetInstrumentSearch?.value), 260);
}

function queueTargetAutoPriceFetch() {
  clearTimeout(targetAutoPriceTimer);
  targetAutoPriceTimer = window.setTimeout(() => useLatestTargetPrice({ auto: true }), 90);
}

function activateSwitchStockMode() {
  if (activeMode !== 'switch') setMode('switch');
}

function selectTargetInstrument(item, options = {}) {
  selectedTargetInstrument = { ...item };
  pendingTargetPrice = null;
  latestTargetQuoteData = null;
  assetHistoryData.target = null;
  if (els.selectedTargetInstrument) {
    els.selectedTargetInstrument.hidden = false;
    els.selectedTargetInstrument.classList.remove('is-loading-price', 'is-live-updated');
  }
  setTargetSearchHidden(true);
  if (els.targetInstrumentSearch) els.targetInstrumentSearch.value = item.name || item.symbol || '';
  if (els.selectedTargetAvatar) els.selectedTargetAvatar.textContent = instrumentInitials(item);
  if (els.selectedTargetName) els.selectedTargetName.textContent = item.name || item.symbol || 'Selected target';
  if (els.selectedTargetMeta) els.selectedTargetMeta.textContent = instrumentSubtitle(item);
  if (els.targetPriceTimestamp) els.targetPriceTimestamp.hidden = true;
  if (els.refreshTargetPriceBtn) els.refreshTargetPriceBtn.hidden = true;
  if (canUseFunctionEndpoint() && !options.skipAutoPrice) {
    setTargetMarketStatus('Selected target. Pulling the latest price automatically...');
    queueTargetAutoPriceFetch();
  } else {
    setTargetMarketStatus(canUseFunctionEndpoint()
      ? 'Selected target. Target price stays manual until refreshed.'
      : 'Selected target. Live auto-price needs Netlify dev or deploy.');
  }
  renderSwitchAssetData();
  drawAssetPerformanceChart();
  queueAssetHistoryRefresh();
  activateSwitchStockMode();
  calculate();
}

function clearSelectedTargetInstrument({ clearSearch = true, clearPrice = false } = {}) {
  clearTimeout(targetAutoPriceTimer);
  if (targetPriceAbort) targetPriceAbort.abort();
  targetPriceAbort = null;
  selectedTargetInstrument = null;
  pendingTargetPrice = null;
  latestTargetQuoteData = null;
  assetHistoryData.target = null;
  if (els.selectedTargetInstrument) {
    els.selectedTargetInstrument.hidden = true;
    els.selectedTargetInstrument.classList.remove('is-loading-price', 'is-live-updated');
    els.selectedTargetInstrument.removeAttribute('aria-busy');
  }
  setTargetSearchHidden(true);
  if (els.refreshTargetPriceBtn) els.refreshTargetPriceBtn.hidden = true;
  if (els.targetPriceTimestamp) els.targetPriceTimestamp.hidden = true;
  if (clearSearch && els.targetInstrumentSearch) els.targetInstrumentSearch.value = '';
  if (clearPrice && els.switchTargetPrice) els.switchTargetPrice.value = '';
  setTargetMarketStatus('Select a target to fetch its current price.');
  renderSwitchAssetData();
  drawAssetPerformanceChart();
  queueAssetHistoryRefresh();
  calculate();
}

async function useLatestTargetPrice(options = {}) {
  if (!selectedTargetInstrument?.symbol) return;
  const auto = options?.auto === true;

  if (!canUseFunctionEndpoint()) {
    setTargetMarketStatus('Live target price needs Netlify dev or deploy. Enter target price manually.', auto ? 'warning' : 'error');
    return;
  }

  const targetCurrency = normalizeCurrencyCode(els.currencyCode.value);
  const sourceCurrency = normalizeCurrencyCode(selectedTargetInstrument.currency || targetCurrency);
  const requestKey = [
    selectedTargetInstrument.symbol,
    selectedTargetInstrument.exchange || '',
    selectedTargetInstrument.providerSymbol || '',
    targetCurrency
  ].join('|');
  const params = new URLSearchParams({
    symbol: selectedTargetInstrument.symbol,
    exchange: selectedTargetInstrument.exchange || '',
    mic_code: selectedTargetInstrument.micCode || selectedTargetInstrument.mic_code || '',
    currency: targetCurrency,
    sourceCurrency,
    type: selectedTargetInstrument.type || '',
    providerSymbol: selectedTargetInstrument.providerSymbol || '',
    twelvedataSymbol: selectedTargetInstrument.twelvedataSymbol || '',
    fmpSymbol: selectedTargetInstrument.fmpSymbol || '',
    eodhdSymbol: selectedTargetInstrument.eodhdSymbol || '',
    alphavantageSymbol: selectedTargetInstrument.alphavantageSymbol || ''
  });

  if (targetPriceAbort) targetPriceAbort.abort();
  targetPriceAbort = new AbortController();
  const currentAbort = targetPriceAbort;
  setTargetPriceLoading(true);
  setTargetMarketStatus(auto ? 'Selected target. Pulling the latest price automatically...' : 'Fetching latest target price...');

  try {
    const response = await fetch(`/.netlify/functions/get-price?${params.toString()}`, {
      signal: currentAbort.signal
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !Number.isFinite(Number(payload.price))) {
      const message = payload.message || payload.error || 'Live target price unavailable. Enter the target price manually.';
      setTargetMarketStatus(message, response.status === 503 ? 'warning' : 'error');
      return;
    }

    const activeKey = [
      selectedTargetInstrument?.symbol || '',
      selectedTargetInstrument?.exchange || '',
      selectedTargetInstrument?.providerSymbol || '',
      normalizeCurrencyCode(els.currencyCode.value)
    ].join('|');
    if (activeKey !== requestKey) return;

    const price = Number(payload.price);
    const returnedCurrency = normalizeCurrencyCode(payload.currency || targetCurrency);
    const converted = Boolean(payload.converted);
    pendingTargetPrice = quotePayload(payload, price, returnedCurrency, sourceCurrency);
    latestTargetQuoteData = pendingTargetPrice;
    applyingTargetMarketPrice = true;
    if (els.switchTargetPrice) els.switchTargetPrice.value = formatInputNumber(price);
    applyingTargetMarketPrice = false;
    selectedTargetInstrument.priceCurrency = returnedCurrency;
    selectedTargetInstrument.nativeCurrency = payload.originalCurrency || sourceCurrency;
    if (els.targetPriceTimestamp) {
      els.targetPriceTimestamp.hidden = false;
      if (els.targetPriceSourceLabel) {
        els.targetPriceSourceLabel.textContent = converted && Number.isFinite(Number(payload.originalPrice))
          ? `Converted from ${formatCurrency(Number(payload.originalPrice), payload.originalCurrency || sourceCurrency)}`
          : 'Latest target price';
      }
      if (els.targetPriceTimeLabel) {
        els.targetPriceTimeLabel.textContent = `Fetched: ${new Date(pendingTargetPrice.fetchedAt).toLocaleTimeString('de-DE')}`;
      }
    }
    if (els.refreshTargetPriceBtn) els.refreshTargetPriceBtn.hidden = false;
    flashField(els.switchTargetPrice);
    flashLiveResult();
    setTargetMarketStatus(`${auto ? 'Auto-applied' : 'Applied'} latest ${returnedCurrency} target price: ${formatCurrency(price, returnedCurrency)}.`, 'success');
    renderSwitchAssetData();
    queueAssetHistoryRefresh();
    calculate();
  } catch (error) {
    if (error.name === 'AbortError') return;
    setTargetMarketStatus('Live target price unavailable in this environment. Enter target price manually.', 'warning');
  } finally {
    if (targetPriceAbort === currentAbort) {
      targetPriceAbort = null;
      setTargetPriceLoading(false);
    }
  }
}

function markManualPriceOverride() {
  if (applyingMarketPrice || !selectedInstrument) return;
  if (ui?.priceTimestamp) ui.priceTimestamp.hidden = true;
  pendingPrice = null;
  latestQuoteData = null;
  if (els.refreshPriceBtn) els.refreshPriceBtn.hidden = false;
  setMarketStatus('Manual price override active. Refresh latest price anytime.', 'warning');
  renderSwitchAssetData();
}

function markManualTargetPriceOverride() {
  if (applyingTargetMarketPrice || !selectedTargetInstrument) return;
  if (els.targetPriceTimestamp) els.targetPriceTimestamp.hidden = true;
  pendingTargetPrice = null;
  latestTargetQuoteData = null;
  if (els.refreshTargetPriceBtn) els.refreshTargetPriceBtn.hidden = false;
  setTargetMarketStatus('Manual target price override active. Refresh latest price anytime.', 'warning');
  renderSwitchAssetData();
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
  if (els.switchTargetPrice) els.switchTargetPrice.value = '';
  if (els.switchBuyCost) els.switchBuyCost.value = '';
  if (els.switchHorizonYears) els.switchHorizonYears.value = '';
  if (els.switchAllowFractional) els.switchAllowFractional.checked = true;
  els.includeTaxOnNew.checked = true;
  clearSelectedInstrument({ clearSearch: true });
  clearSelectedTargetInstrument({ clearSearch: true, clearPrice: true });
  // Reset new v2 fields
  if (typeof clearLots === 'function') clearLots();
  if (typeof activateSellChip === 'function') activateSellChip('100');
  if (typeof activateFxMode === 'function') activateFxMode('same');
  if (ui) {
    if (ui.portfolioValue) ui.portfolioValue.value = '';
    if (ui.targetWeight) ui.targetWeight.value = '';
    if (ui.customSellShares) ui.customSellShares.value = '';
    if (ui.fxRateBuy) ui.fxRateBuy.value = '';
    if (ui.fxRateNow) ui.fxRateNow.value = '';
    if (ui.saleOrderSelect) ui.saleOrderSelect.value = 'fifo';
    if (ui.targetSellPrice) ui.targetSellPrice.value = '';
    if (ui.targetReachProbability) ui.targetReachProbability.value = '';
    if (ui.freshCashAmount) ui.freshCashAmount.value = '';
    if (ui.cashReserve) ui.cashReserve.value = '';
    if (ui.maxTolerableLoss) ui.maxTolerableLoss.value = '';
    if (ui.timeHorizonYears) ui.timeHorizonYears.value = '';
    if (ui.sectorExposure) ui.sectorExposure.value = '';
    if (ui.countryExposure) ui.countryExposure.value = '';
    if (ui.currentVolatility) ui.currentVolatility.value = '';
    if (ui.newVolatility) ui.newVolatility.value = '';
    if (ui.portfolioVolatility) ui.portfolioVolatility.value = '';
    if (ui.correlationToPortfolio) ui.correlationToPortfolio.value = '';
    if (ui.researchThesis) ui.researchThesis.value = '';
    if (ui.taxProfileMode) ui.taxProfileMode.value = 'flat';
    if (ui.filingStatus) ui.filingStatus.value = 'single';
    if (ui.saverAllowanceRemaining) ui.saverAllowanceRemaining.value = '';
    if (ui.churchTaxRate) ui.churchTaxRate.value = '0';
    if (ui.instrumentTaxClass) ui.instrumentTaxClass.value = 'stock';
    if (ui.stockLossPot) ui.stockLossPot.value = '';
    if (ui.otherLossPot) ui.otherLossPot.value = '';
    if (ui.foreignTaxPaid) ui.foreignTaxPaid.value = '';
    if (ui.foreignTaxCreditable) ui.foreignTaxCreditable.value = '';
    if (ui.priorTaxedVorabpauschale) ui.priorTaxedVorabpauschale.value = '';
    if (ui.distributionPolicy) ui.distributionPolicy.value = 'unknown';
    if (ui.fundDomicile) ui.fundDomicile.value = '';
    if (ui.annualDistributionYield) ui.annualDistributionYield.value = '';
    if (ui.withholdingTaxRate) ui.withholdingTaxRate.value = '';
    if (ui.totalExpenseRatio) ui.totalExpenseRatio.value = '';
    if (ui.trackingDifference) ui.trackingDifference.value = '';
    if (ui.fundCurrencyExposure) ui.fundCurrencyExposure.value = '';
    if (ui.indexMethodology) ui.indexMethodology.value = '';
    if (ui.workspaceName) ui.workspaceName.value = '';
    if (ui.priceTimestamp) ui.priceTimestamp.hidden = true;
  }
  [els.targetAssetTypeFilter, els.targetAssetCountryFilter].filter(Boolean).forEach((filter) => {
    filter.value = 'all';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    filter.dispatchEvent(new Event('change', { bubbles: true }));
  });
  if (typeof decisionScenarioCases !== 'undefined') decisionScenarioCases = [];
  if (typeof researchMemos !== 'undefined') researchMemos = [];
  if (typeof lastDecisionResult !== 'undefined') lastDecisionResult = null;
  if (typeof clearBrokerImport === 'function') clearBrokerImport();
  try { localStorage.removeItem(LS_KEY); } catch(e) {}
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
  els.expectedNewReturn,
  els.switchTargetPrice,
  els.switchBuyCost,
  els.switchHorizonYears
].filter(Boolean).forEach((input) => {
  input.addEventListener('input', calculate);
  input.addEventListener('focus', () => input.select());
});

els.currentPrice.addEventListener('input', markManualPriceOverride);
if (els.switchTargetPrice) {
  els.switchTargetPrice.addEventListener('input', markManualTargetPriceOverride);
  els.switchTargetPrice.addEventListener('input', activateSwitchStockMode);
}

els.currencyCode.addEventListener('blur', () => {
  setCurrency(els.currencyCode.value);
  queueAssetHistoryRefresh();
  calculate();
});

els.instrumentSearch.addEventListener('input', queueSymbolSearch);
els.instrumentSearch.addEventListener('keydown', (event) => handleInstrumentSearchKeydown(event, 'current'));
els.instrumentSearch.addEventListener('focus', () => {
  if (els.instrumentSearch.value.trim().length >= 2) queueSymbolSearch();
});
els.clearInstrumentSearch.addEventListener('click', () => {
  els.instrumentSearch.value = '';
  instrumentResultItems = [];
  setInstrumentSearchHidden(true);
});
[
  els.assetTypeFilter,
  els.assetCountryFilter
].filter(Boolean).forEach((filter) => {
  filter.addEventListener('change', () => {
    if (els.instrumentSearch.value.trim().length >= 2) queueSymbolSearch();
  });
});
els.clearInstrumentBtn.addEventListener('click', () => clearSelectedInstrument({ clearSearch: true }));
els.useLatestPriceBtn.addEventListener('click', useLatestPrice);
if (els.refreshPriceBtn) els.refreshPriceBtn.addEventListener('click', useLatestPrice);

if (els.targetInstrumentSearch) {
  els.targetInstrumentSearch.addEventListener('input', queueTargetSymbolSearch);
  els.targetInstrumentSearch.addEventListener('keydown', (event) => handleInstrumentSearchKeydown(event, 'target'));
  els.targetInstrumentSearch.addEventListener('focus', () => {
    activateSwitchStockMode();
    if (els.targetInstrumentSearch.value.trim().length >= 2) queueTargetSymbolSearch();
  });
}
if (els.clearTargetInstrumentSearch) {
  els.clearTargetInstrumentSearch.addEventListener('click', () => {
    els.targetInstrumentSearch.value = '';
    targetInstrumentResultItems = [];
    setTargetSearchHidden(true);
  });
}
[
  els.targetAssetTypeFilter,
  els.targetAssetCountryFilter
].filter(Boolean).forEach((filter) => {
  filter.addEventListener('change', () => {
    if (els.targetInstrumentSearch?.value.trim().length >= 2) queueTargetSymbolSearch();
  });
});
if (els.clearTargetInstrumentBtn) els.clearTargetInstrumentBtn.addEventListener('click', () => clearSelectedTargetInstrument({ clearSearch: true, clearPrice: false }));
if (els.useLatestTargetPriceBtn) els.useLatestTargetPriceBtn.addEventListener('click', useLatestTargetPrice);
if (els.refreshTargetPriceBtn) els.refreshTargetPriceBtn.addEventListener('click', useLatestTargetPrice);

els.historyRangeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    assetHistoryRange = button.dataset.historyRange || '1Y';
    els.historyRangeButtons.forEach(item => item.classList.toggle('is-active', item === button));
    queueAssetHistoryRefresh(0);
  });
});

els.includeTaxOnNew.addEventListener('change', calculate);
if (els.switchAllowFractional) els.switchAllowFractional.addEventListener('change', calculate);
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

window.addEventListener('resize', () => {
  requestAnimationFrame(calculate);
  requestAnimationFrame(drawAssetPerformanceChart);
  queueDockVisibility();
});
window.addEventListener('scroll', queueDockVisibility, { passive: true });
document.addEventListener('focusin', queueDockVisibility);
document.addEventListener('focusout', queueDockVisibility);
document.addEventListener('click', (event) => {
  if (!event.target.closest('.panel--instrument')) {
    setInstrumentSearchHidden(true);
  }
  if (!event.target.closest('.switch-target-panel') && els.targetInstrumentResults) {
    setTargetSearchHidden(true);
  }
});

setCurrency(els.currencyCode.value);

// Initialize: URL state > localStorage > fresh
const urlRestored = typeof decodeStateFromURL === 'function' && decodeStateFromURL();
if (!urlRestored && typeof restoreFromLocalStorage === 'function') restoreFromLocalStorage();

// Wire new UI
if (typeof wireNewUI === 'function') wireNewUI();

calculate();
updateDockVisibility();
queueAssetHistoryRefresh();
