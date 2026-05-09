/* ═══════════════════════════════════════════════════════════════════
   TaxSwitch — UI Extensions (lots, sell mode, FX, portfolio, etc.)
   Loaded after app-core.js, before app.js
   ═══════════════════════════════════════════════════════════════════ */

/* ── New element references ────────────────────────────────────────── */
const ui = {
  apiStatusChip: document.getElementById('apiStatusChip'),
  apiStatusLabel: document.getElementById('apiStatusLabel'),
  priceConfirmation: document.getElementById('priceConfirmation'),
  confirmPrice: document.getElementById('confirmPrice'),
  confirmPriceBtn: document.getElementById('confirmPriceBtn'),
  cancelPriceBtn: document.getElementById('cancelPriceBtn'),
  priceTimestamp: document.getElementById('priceTimestamp'),
  priceSourceLabel: document.getElementById('priceSourceLabel'),
  priceTimeLabel: document.getElementById('priceTimeLabel'),
  lotsDetails: document.getElementById('lotsDetails'),
  lotsContainer: document.getElementById('lotsContainer'),
  lotsCount: document.getElementById('lotsCount'),
  addLotBtn: document.getElementById('addLotBtn'),
  clearLotsBtn: document.getElementById('clearLotsBtn'),
  lotsSummary: document.getElementById('lotsSummary'),
  lotsTotalShares: document.getElementById('lotsTotalShares'),
  lotsTotalInvested: document.getElementById('lotsTotalInvested'),
  lotsBlendedCost: document.getElementById('lotsBlendedCost'),
  customSellRow: document.getElementById('customSellRow'),
  customSellShares: document.getElementById('customSellShares'),
  partialSellInfo: document.getElementById('partialSellInfo'),
  partialSellPct: document.getElementById('partialSellPct'),
  partialSellShares: document.getElementById('partialSellShares'),
  remainingPosition: document.getElementById('remainingPosition'),
  remainingShares: document.getElementById('remainingShares'),
  remainingValue: document.getElementById('remainingValue'),
  taxDragViz: document.getElementById('taxDragViz'),
  taxDragMarket: document.getElementById('taxDragMarket'),
  taxDragTax: document.getElementById('taxDragTax'),
  taxDragCosts: document.getElementById('taxDragCosts'),
  taxDragMarketLabel: document.getElementById('taxDragMarketLabel'),
  taxDragTaxLabel: document.getElementById('taxDragTaxLabel'),
  taxDragCostsLabel: document.getElementById('taxDragCostsLabel'),
  taxDragReinvestable: document.getElementById('taxDragReinvestable'),
  positionCurrency: document.getElementById('positionCurrency'),
  taxCurrency: document.getElementById('taxCurrency'),
  fxRateBuy: document.getElementById('fxRateBuy'),
  fxRateNow: document.getElementById('fxRateNow'),
  fxFields: document.getElementById('fxFields'),
  portfolioValue: document.getElementById('portfolioValue'),
  targetWeight: document.getElementById('targetWeight'),
  concentrationAlert: document.getElementById('concentrationAlert'),
  concentrationFill: document.getElementById('concentrationFill'),
  concentrationText: document.getElementById('concentrationText'),
  rebalanceOutput: document.getElementById('rebalanceOutput'),
  rebalCurrentWeight: document.getElementById('rebalCurrentWeight'),
  rebalSharesToSell: document.getElementById('rebalSharesToSell'),
  rebalTaxTriggered: document.getElementById('rebalTaxTriggered'),
  rebalCashReleased: document.getElementById('rebalCashReleased'),
  shareBtn: document.getElementById('shareBtn'),
  exportBtn: document.getElementById('exportBtn'),
  shareToast: document.getElementById('shareToast'),
  shareToastMsg: document.getElementById('shareToastMsg'),
  sellChips: [...document.querySelectorAll('.chip--sell')],
  fxChips: [...document.querySelectorAll('[data-fx-mode]')],
  hurdleRadios: [...document.querySelectorAll('[name="hurdleMode"]')]
};

/* ── Extended state ────────────────────────────────────────────────── */
let lots = [];
let sellPct = 100;
let fxMode = 'same';
let hurdleMode = 'beat-pretax';
let pendingPrice = null;
let toastTimer = null;

/* ── Lots manager ──────────────────────────────────────────────────── */
function addLot(sharesVal, priceVal) {
  const idx = lots.length;
  lots.push({ shares: sharesVal || '', price: priceVal || '' });
  const row = document.createElement('div');
  row.className = 'lot-row';
  row.dataset.lotIndex = idx;
  row.innerHTML = `<label class="field"><span>Shares</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 5" data-lot-shares="${idx}"></label><label class="field"><span>Buy price</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 80" data-lot-price="${idx}"></label><button type="button" class="lot-remove" data-remove-lot="${idx}">×</button>`;
  if (sharesVal) row.querySelector(`[data-lot-shares="${idx}"]`).value = sharesVal;
  if (priceVal) row.querySelector(`[data-lot-price="${idx}"]`).value = priceVal;
  ui.lotsContainer.appendChild(row);
  row.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => { readLots(); if (typeof calculate === 'function') calculate(); });
    inp.addEventListener('focus', () => inp.select());
  });
  row.querySelector(`[data-remove-lot="${idx}"]`).addEventListener('click', () => removeLot(idx));
  readLots();
}

function removeLot(idx) {
  lots.splice(idx, 1);
  rebuildLotRows();
  readLots();
  if (typeof calculate === 'function') calculate();
}

function rebuildLotRows() {
  ui.lotsContainer.innerHTML = '';
  const copy = lots.slice();
  lots = [];
  copy.forEach(l => addLot(l.shares, l.price));
}

function readLots() {
  lots = [];
  ui.lotsContainer.querySelectorAll('.lot-row').forEach(row => {
    const sInp = row.querySelector('[data-lot-shares]');
    const pInp = row.querySelector('[data-lot-price]');
    lots.push({ shares: sInp?.value || '', price: pInp?.value || '' });
  });
  renderLotsSummary();
}

function renderLotsSummary() {
  const count = lots.length;
  ui.lotsCount.textContent = count > 0 ? count : '';
  if (count === 0) { ui.lotsSummary.hidden = true; return; }
  const blend = blendLots(lots);
  if (!blend) { ui.lotsSummary.hidden = true; return; }
  ui.lotsSummary.hidden = false;
  const cc = document.getElementById('currencyCode')?.value || 'EUR';
  ui.lotsTotalShares.textContent = formatShares(blend.totalShares);
  ui.lotsBlendedCost.textContent = formatCurrency(blend.blendedPrice, cc);
  ui.lotsTotalInvested.textContent = formatCurrency(blend.totalCost, cc);
  // Push blended values to main fields
  const sharesEl = document.getElementById('shares');
  const buyEl = document.getElementById('buyPrice');
  if (sharesEl) sharesEl.value = formatInputNumber(blend.totalShares);
  if (buyEl) buyEl.value = formatInputNumber(blend.blendedPrice);
}

function clearLots() {
  lots = [];
  ui.lotsContainer.innerHTML = '';
  renderLotsSummary();
  if (typeof calculate === 'function') calculate();
}

/* ── Sell mode ─────────────────────────────────────────────────────── */
function getSellFraction() {
  if (sellPct === 'custom') {
    const totalShares = parseLocaleNumber(document.getElementById('shares')?.value);
    const customShares = parseLocaleNumber(ui.customSellShares?.value);
    if (Number.isFinite(totalShares) && totalShares > 0 && Number.isFinite(customShares) && customShares > 0) {
      return Math.min(customShares / totalShares, 1);
    }
    return 1;
  }
  return (Number(sellPct) || 100) / 100;
}

function activateSellChip(pct) {
  sellPct = pct;
  ui.sellChips.forEach(c => c.classList.toggle('is-active', c.dataset.sellPct === String(pct)));
  ui.customSellRow.hidden = pct !== 'custom';
  if (typeof calculate === 'function') calculate();
}

/* ── FX mode ───────────────────────────────────────────────────────── */
function activateFxMode(mode) {
  fxMode = mode;
  ui.fxChips.forEach(c => c.classList.toggle('is-active', c.dataset.fxMode === mode));
  ui.fxFields.hidden = mode !== 'manual';
  if (typeof calculate === 'function') calculate();
}

/* ── API status ────────────────────────────────────────────────────── */
function checkApiStatus() {
  fetch('/.netlify/functions/api-status').then(r => r.json()).then(data => {
    const dot = ui.apiStatusChip?.querySelector('.status-dot');
    if (!dot) return;
    dot.classList.remove('status-dot--checking', 'status-dot--live', 'status-dot--manual');
    if (data.hasLiveProvider) {
      dot.classList.add('status-dot--live');
      if (ui.apiStatusLabel) ui.apiStatusLabel.textContent = 'Live data';
    } else {
      dot.classList.add('status-dot--manual');
      if (ui.apiStatusLabel) ui.apiStatusLabel.textContent = 'Manual mode';
    }
  }).catch(() => {
    const dot = ui.apiStatusChip?.querySelector('.status-dot');
    if (dot) { dot.classList.remove('status-dot--checking'); dot.classList.add('status-dot--manual'); }
    if (ui.apiStatusLabel) ui.apiStatusLabel.textContent = 'Manual mode';
  });
}

/* ── Tax drag visualization ────────────────────────────────────────── */
function updateTaxDrag(input, output) {
  if (!ui.taxDragViz || !hasCoreInputs(input)) { if (ui.taxDragViz) ui.taxDragViz.hidden = true; return; }
  const sv = output.sellValue || output.currentValue;
  if (!Number.isFinite(sv) || sv <= 0) { ui.taxDragViz.hidden = true; return; }
  ui.taxDragViz.hidden = false;
  const cashPct = Math.max((output.cashAfter / sv) * 100, 1);
  const taxPct = Math.max((output.taxDue / sv) * 100, 0);
  const costFrac = (input.transactionCost * (output.sellShares ? output.sellShares / input.shares : 1));
  const costPct = Math.max((costFrac / sv) * 100, 0);
  ui.taxDragMarket.style.flex = cashPct;
  ui.taxDragTax.style.flex = taxPct || 0.001;
  ui.taxDragCosts.style.flex = costPct || 0.001;
  const cc = input.currencyCode || 'EUR';
  ui.taxDragMarketLabel.textContent = `${cashPct.toFixed(1)}%`;
  ui.taxDragTaxLabel.textContent = taxPct > 0.5 ? `${taxPct.toFixed(1)}%` : '';
  ui.taxDragCostsLabel.textContent = costPct > 0.5 ? `${costPct.toFixed(1)}%` : '';
  ui.taxDragReinvestable.textContent = formatCurrency(output.cashAfter, cc);
}

/* ── Portfolio / concentration / rebalance ──────────────────────────── */
function updatePortfolio(input, output) {
  const pv = parseLocaleNumber(ui.portfolioValue?.value);
  const tw = parseLocaleNumber(ui.targetWeight?.value);
  const cc = input.currencyCode || 'EUR';
  if (!Number.isFinite(pv) || pv <= 0 || !hasCoreInputs(input)) {
    ui.concentrationAlert.hidden = true;
    ui.rebalanceOutput.hidden = true;
    return;
  }
  const extInput = { ...input, portfolioValue: pv, targetWeight: tw };
  const rebal = calculateRebalance(extInput, output);
  if (!rebal) { ui.concentrationAlert.hidden = true; ui.rebalanceOutput.hidden = true; return; }
  // Concentration bar
  ui.concentrationAlert.hidden = false;
  const weightPct = (rebal.currentWeight * 100);
  ui.concentrationFill.style.width = `${Math.min(weightPct, 100)}%`;
  ui.concentrationText.textContent = `This position is ${weightPct.toFixed(1)}% of your portfolio.${weightPct > 25 ? ' Consider diversification.' : ''}`;
  // Rebalance output
  if (Number.isFinite(tw) && tw > 0) {
    ui.rebalanceOutput.hidden = false;
    ui.rebalCurrentWeight.textContent = `${weightPct.toFixed(1)}%`;
    ui.rebalSharesToSell.textContent = rebal.sharesToSell > 0 ? formatShares(rebal.sharesToSell) : 'None';
    ui.rebalTaxTriggered.textContent = formatCurrency(rebal.taxTriggered, cc);
    ui.rebalCashReleased.textContent = formatCurrency(rebal.cashReleased, cc);
  } else {
    ui.rebalanceOutput.hidden = true;
  }
}

/* ── Partial sell display ──────────────────────────────────────────── */
function updatePartialSell(input, output) {
  const frac = getSellFraction();
  if (frac >= 1) {
    ui.partialSellInfo.hidden = true;
    ui.remainingPosition.hidden = true;
    return;
  }
  ui.partialSellInfo.hidden = false;
  ui.partialSellPct.textContent = `${Math.round(frac * 100)}%`;
  ui.partialSellShares.textContent = formatShares(output.sellShares);
  if (Number.isFinite(output.remainingShares) && output.remainingShares > 0) {
    ui.remainingPosition.hidden = false;
    ui.remainingShares.textContent = formatShares(output.remainingShares);
    ui.remainingValue.textContent = formatCurrency(output.remainingValue, input.currencyCode);
  } else {
    ui.remainingPosition.hidden = true;
  }
}

/* ── Share / export ────────────────────────────────────────────────── */
function showToast(msg) {
  if (!ui.shareToast) return;
  ui.shareToastMsg.textContent = msg || 'Link copied!';
  ui.shareToast.hidden = false;
  ui.shareToast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.shareToast.classList.remove('is-visible'); setTimeout(() => { ui.shareToast.hidden = true; }, 300); }, 2200);
}

function shareScenario() {
  const qs = encodeStateToURL();
  const url = `${window.location.origin}${window.location.pathname}?${qs}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast('Link copied to clipboard!')).catch(() => showToast('Could not copy link'));
  } else {
    showToast('Sharing not available');
  }
}

function exportCSV() {
  const input = typeof getInputs === 'function' ? getInputs() : {};
  const output = hasCoreInputs(input) ? calculateValues(input) : {};
  const csv = generateCSV(input, output);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `taxswitch-report-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── Hurdle mode ───────────────────────────────────────────────────── */
function getHurdleMode() {
  const checked = document.querySelector('[name="hurdleMode"]:checked');
  return checked ? checked.value : 'beat-pretax';
}

/* ── Local storage ─────────────────────────────────────────────────── */
const LS_KEY = 'taxswitch_inputs';
function saveToLocalStorage() {
  try {
    const data = {};
    ['shares','buyPrice','currentPrice','taxRate','transactionCost','rebuyPrice','expectedOldReturn','expectedNewReturn','currencyCode','portfolioValue','targetWeight','positionCurrency','taxCurrency','fxRateBuy','fxRateNow','customSellShares'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value) data[id] = el.value;
    });
    data.includeTaxOnNew = document.getElementById('includeTaxOnNew')?.checked;
    data.sellPct = sellPct;
    data.fxMode = fxMode;
    data.lots = lots;
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { /* quota exceeded or private browsing */ }
}

function restoreFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    ['shares','buyPrice','currentPrice','taxRate','transactionCost','rebuyPrice','expectedOldReturn','expectedNewReturn','currencyCode','portfolioValue','targetWeight','positionCurrency','taxCurrency','fxRateBuy','fxRateNow','customSellShares'].forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id]) el.value = data[id];
    });
    if (data.includeTaxOnNew !== undefined) document.getElementById('includeTaxOnNew').checked = data.includeTaxOnNew;
    if (data.sellPct) activateSellChip(data.sellPct);
    if (data.fxMode) activateFxMode(data.fxMode);
    if (Array.isArray(data.lots) && data.lots.length > 0) {
      data.lots.forEach(l => addLot(l.shares, l.price));
    }
    return true;
  } catch(e) { return false; }
}

/* ── Wire up new event listeners ───────────────────────────────────── */
function wireNewUI() {
  // Sell chips
  ui.sellChips.forEach(c => c.addEventListener('click', () => activateSellChip(c.dataset.sellPct)));
  // Custom sell shares input
  if (ui.customSellShares) {
    ui.customSellShares.addEventListener('input', () => { if (typeof calculate === 'function') calculate(); });
    ui.customSellShares.addEventListener('focus', () => ui.customSellShares.select());
  }
  // FX chips
  ui.fxChips.forEach(c => c.addEventListener('click', () => activateFxMode(c.dataset.fxMode)));
  // FX inputs
  [ui.fxRateBuy, ui.fxRateNow, ui.positionCurrency, ui.taxCurrency].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', () => { if (typeof calculate === 'function') calculate(); });
      inp.addEventListener('focus', () => inp.select());
    }
  });
  // Lots
  if (ui.addLotBtn) ui.addLotBtn.addEventListener('click', () => addLot('', ''));
  if (ui.clearLotsBtn) ui.clearLotsBtn.addEventListener('click', clearLots);
  // Portfolio
  [ui.portfolioValue, ui.targetWeight].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', () => { if (typeof calculate === 'function') calculate(); });
      inp.addEventListener('focus', () => inp.select());
    }
  });
  // Hurdle radios
  ui.hurdleRadios.forEach(r => r.addEventListener('change', () => { hurdleMode = getHurdleMode(); if (typeof calculate === 'function') calculate(); }));
  // Share / export
  if (ui.shareBtn) ui.shareBtn.addEventListener('click', shareScenario);
  if (ui.exportBtn) ui.exportBtn.addEventListener('click', exportCSV);
  // Price confirmation
  if (ui.confirmPriceBtn) ui.confirmPriceBtn.addEventListener('click', () => {
    if (pendingPrice !== null) {
      const cpEl = document.getElementById('currentPrice');
      if (cpEl) cpEl.value = formatInputNumber(pendingPrice.price);
      if (pendingPrice.currency) {
        const ccEl = document.getElementById('currencyCode');
        if (ccEl) ccEl.value = normalizeCurrencyCode(pendingPrice.currency);
        setCurrency(pendingPrice.currency);
      }
      ui.priceConfirmation.hidden = true;
      ui.priceTimestamp.hidden = false;
      ui.priceSourceLabel.textContent = `Source: ${pendingPrice.source || 'market data'}`;
      ui.priceTimeLabel.textContent = `Fetched: ${new Date().toLocaleTimeString('de-DE')}`;
      pendingPrice = null;
      if (typeof calculate === 'function') calculate();
    }
  });
  if (ui.cancelPriceBtn) ui.cancelPriceBtn.addEventListener('click', () => {
    ui.priceConfirmation.hidden = true;
    pendingPrice = null;
  });
  // API status check
  checkApiStatus();
}
