/* ═══════════════════════════════════════════════════════════════════
   TaxSwitch — UI Extensions (lots, sell mode, FX, portfolio, etc.)
   Loaded after app-core.js, before app.js
   ═══════════════════════════════════════════════════════════════════ */

/* ── New element references ────────────────────────────────────────── */
const ui = {
  apiStatusChip: document.getElementById('apiStatusChip'),
  apiStatusLabel: document.getElementById('apiStatusLabel'),
  authStatusBtn: document.getElementById('authStatusBtn'),
  priceConfirmation: document.getElementById('priceConfirmation'),
  confirmPrice: document.getElementById('confirmPrice'),
  confirmPriceMeta: document.getElementById('confirmPriceMeta'),
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
  taxProfileMode: document.getElementById('taxProfileMode'),
  filingStatus: document.getElementById('filingStatus'),
  saverAllowanceRemaining: document.getElementById('saverAllowanceRemaining'),
  churchTaxRate: document.getElementById('churchTaxRate'),
  instrumentTaxClass: document.getElementById('instrumentTaxClass'),
  stockLossPot: document.getElementById('stockLossPot'),
  otherLossPot: document.getElementById('otherLossPot'),
  foreignTaxPaid: document.getElementById('foreignTaxPaid'),
  foreignTaxCreditable: document.getElementById('foreignTaxCreditable'),
  priorTaxedVorabpauschale: document.getElementById('priorTaxedVorabpauschale'),
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
  workspaceName: document.getElementById('workspaceName'),
  premiumAuthToken: document.getElementById('premiumAuthToken'),
  saveWorkspaceBtn: document.getElementById('saveWorkspaceBtn'),
  loadWorkspaceBtn: document.getElementById('loadWorkspaceBtn'),
  syncWorkspaceBtn: document.getElementById('syncWorkspaceBtn'),
  brokerImportFile: document.getElementById('brokerImportFile'),
  importPreview: document.getElementById('importPreview'),
  commitImportBtn: document.getElementById('commitImportBtn'),
  clearImportBtn: document.getElementById('clearImportBtn'),
  workspaceTabs: [...document.querySelectorAll('[data-workspace-tab]')],
  workspaceTabPanels: [...document.querySelectorAll('.workspace-tab-panel')],
  addPositionBtn: document.getElementById('addPositionBtn'),
  clearPositionsBtn: document.getElementById('clearPositionsBtn'),
  positionsList: document.getElementById('positionsList'),
  targetSummary: document.getElementById('targetSummary'),
  targetsList: document.getElementById('targetsList'),
  optimizerObjective: document.getElementById('optimizerObjective'),
  optimizerTolerance: document.getElementById('optimizerTolerance'),
  optimizerMaxTax: document.getElementById('optimizerMaxTax'),
  optimizerMaxTurnover: document.getElementById('optimizerMaxTurnover'),
  optimizerMinTrade: document.getElementById('optimizerMinTrade'),
  optimizerAllowBuys: document.getElementById('optimizerAllowBuys'),
  optimizerAllowPartialLots: document.getElementById('optimizerAllowPartialLots'),
  runOptimizerBtn: document.getElementById('runOptimizerBtn'),
  optimizerResult: document.getElementById('optimizerResult'),
  scenarioName: document.getElementById('scenarioName'),
  scenarioSelect: document.getElementById('scenarioSelect'),
  saveScenarioBtn: document.getElementById('saveScenarioBtn'),
  duplicateScenarioBtn: document.getElementById('duplicateScenarioBtn'),
  deleteScenarioBtn: document.getElementById('deleteScenarioBtn'),
  scenarioComparison: document.getElementById('scenarioComparison'),
  shareBtn: document.getElementById('shareBtn'),
  exportBtn: document.getElementById('exportBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportHtmlBtn: document.getElementById('exportHtmlBtn'),
  alertType: document.getElementById('alertType'),
  alertThreshold: document.getElementById('alertThreshold'),
  addAlertBtn: document.getElementById('addAlertBtn'),
  alertList: document.getElementById('alertList'),
  shareToast: document.getElementById('shareToast'),
  shareToastMsg: document.getElementById('shareToastMsg'),
  installAppBtn: document.getElementById('installAppBtn'),
  installPrompt: document.getElementById('installPrompt'),
  installPromptText: document.getElementById('installPromptText'),
  installPromptBtn: document.getElementById('installPromptBtn'),
  dismissInstallPrompt: document.getElementById('dismissInstallPrompt'),
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
let deferredInstallPrompt = null;
let localAlertRules = [];
let activeWorkspaceId = null;
let importedTransactions = [];
let importedLots = [];
let pendingImportPreview = null;
let portfolioPositions = [];
let portfolioScenarios = [];
let activeScenarioId = null;
let lastOptimizerResult = null;

/* ── Lots manager ──────────────────────────────────────────────────── */
function addLot(sharesVal, priceVal) {
  const idx = lots.length;
  lots.push({ shares: sharesVal || '', price: priceVal || '' });
  const row = document.createElement('div');
  row.className = 'lot-row';
  row.dataset.lotIndex = idx;
  row.innerHTML = `<label class="field"><span>Shares</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 5" data-lot-shares="${idx}"></label><label class="field"><span>Buy price</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 80" data-lot-price="${idx}"></label><button type="button" class="lot-remove" data-remove-lot="${idx}" aria-label="Remove lot"><span class="icon-x" aria-hidden="true"></span></button>`;
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

/* ── Workspace / broker import / FIFO ──────────────────────────────── */
const WORKSPACE_KEY = 'taxswitch_workspace_v1';

function buildWorkspaceSnapshot() {
  const input = typeof getInputs === 'function' ? getInputs() : {};
  return window.TaxWorkspace?.createWorkspace
    ? window.TaxWorkspace.createWorkspace({
      id: activeWorkspaceId || undefined,
      name: ui.workspaceName?.value || 'Local workspace',
      baseCurrency: input.currencyCode || 'EUR',
      taxCurrency: input.taxCurrency || input.currencyCode || 'EUR',
      taxProfile: input.taxProfile || { mode: 'flat' },
      activeScenarioId,
      positions: portfolioPositions.length ? portfolioPositions : [{
        id: 'active-position',
        name: selectedInstrument?.name || ui.workspaceName?.value || 'Manual position',
        symbol: selectedInstrument?.symbol || '',
        isin: selectedInstrument?.isin || '',
        currency: input.currencyCode || 'EUR',
        shares: input.shares,
        buyPrice: input.buyPrice,
        currentPrice: input.currentPrice,
        lots: importedLots
      }],
      scenarios: portfolioScenarios.length ? portfolioScenarios : [{ id: 'active-scenario', name: 'Current inputs', settings: input, optimizerResult: lastOptimizerResult, updatedAt: new Date().toISOString() }],
      imports: importedTransactions.length ? [{ id: pendingImportPreview?.importId || 'local-import', transactions: importedTransactions }] : []
    })
    : { name: ui.workspaceName?.value || 'Local workspace', input, positions: portfolioPositions, scenarios: portfolioScenarios, imports: importedTransactions, lots: importedLots };
}

function saveWorkspaceLocal() {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(buildWorkspaceSnapshot()));
    showToast('Workspace saved locally');
  } catch(e) {
    showToast('Workspace save failed');
  }
}

function applyWorkspaceSnapshot(workspace) {
  const scenario = workspace?.scenarios?.[0]?.settings || workspace?.input || {};
  Object.entries({
    shares: scenario.shares,
    buyPrice: scenario.buyPrice,
    currentPrice: scenario.currentPrice,
    taxRate: Number.isFinite(scenario.taxRate) ? scenario.taxRate * 100 : undefined,
    transactionCost: scenario.transactionCost,
    rebuyPrice: scenario.rebuyPrice,
    expectedOldReturn: Number.isFinite(scenario.expectedOldReturn) ? scenario.expectedOldReturn * 100 : undefined,
    expectedNewReturn: Number.isFinite(scenario.expectedNewReturn) ? scenario.expectedNewReturn * 100 : undefined,
    currencyCode: scenario.currencyCode,
    positionCurrency: scenario.positionCurrency,
    taxCurrency: scenario.taxCurrency,
    fxRateBuy: scenario.fxRateBuy,
    fxRateNow: scenario.fxRateNow
  }).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null && value !== '') el.value = Number.isFinite(Number(value)) ? formatInputNumber(Number(value)) : String(value);
  });
  if (ui.workspaceName) ui.workspaceName.value = workspace?.name || '';
  activeWorkspaceId = workspace?.id || null;
  activeScenarioId = workspace?.activeScenarioId || workspace?.scenarios?.[0]?.id || null;
  portfolioPositions = Array.isArray(workspace?.positions) ? workspace.positions : [];
  portfolioScenarios = Array.isArray(workspace?.scenarios) ? workspace.scenarios : [];
  lastOptimizerResult = portfolioScenarios.find(item => item.id === activeScenarioId)?.optimizerResult || null;
  importedTransactions = workspace?.imports?.[0]?.transactions || workspace?.imports || [];
  importedLots = workspace?.positions?.[0]?.lots || workspace?.lots || [];
  applyImportedLotsToInputs();
  renderImportPreview({
    rowCount: importedTransactions.length,
    transactions: importedTransactions,
    symbols: [...new Set(importedTransactions.map(tx => tx.isin || tx.symbol).filter(Boolean))],
    warnings: importedLots.length ? [`Loaded ${importedLots.length} FIFO lots.`] : [],
    errors: []
  });
  renderPortfolioWorkspace();
  if (typeof calculate === 'function') calculate();
}

function loadWorkspaceLocal() {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) {
      showToast('No local workspace found');
      return;
    }
    applyWorkspaceSnapshot(JSON.parse(raw));
    showToast('Workspace loaded');
  } catch(e) {
    showToast('Workspace load failed');
  }
}

async function syncWorkspaceBackend() {
  const token = await getPremiumAuthToken();
  if (!token) {
    saveWorkspaceLocal();
    showToast('Saved locally; sign in for backend sync');
    return;
  }
  if (window.location.protocol === 'file:') {
    showToast('Backend sync needs Netlify dev or deploy');
    return;
  }
  const snapshot = buildWorkspaceSnapshot();
  const path = activeWorkspaceId
    ? `/.netlify/functions/workspace?id=${encodeURIComponent(activeWorkspaceId)}`
    : '/.netlify/functions/workspaces';
  const response = await fetch(path, {
    method: activeWorkspaceId ? 'PUT' : 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(snapshot)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    showToast(payload.error?.message || 'Backend sync failed');
    return;
  }
  activeWorkspaceId = payload.data?.workspace?.id || payload.workspace?.id || activeWorkspaceId;
  showToast('Workspace synced');
}

function refreshAuthStatus() {
  if (!ui.authStatusBtn) return;
  const user = window.netlifyIdentity?.currentUser?.();
  ui.authStatusBtn.textContent = user ? 'Signed in' : 'Sign in';
  ui.authStatusBtn.classList.toggle('is-active', !!user);
}

function toggleAuthStatus() {
  if (!window.netlifyIdentity) {
    showToast('Netlify Identity is unavailable');
    return;
  }
  if (window.netlifyIdentity.currentUser()) {
    window.netlifyIdentity.logout();
    return;
  }
  window.netlifyIdentity.open('login');
}

async function getPremiumAuthToken() {
  const manual = ui.premiumAuthToken?.value.trim();
  if (manual) return manual;
  const user = window.netlifyIdentity?.currentUser?.();
  if (!user?.jwt) return '';
  try {
    return await user.jwt();
  } catch {
    return '';
  }
}

function renderImportPreview(preview) {
  if (!ui.importPreview) return;
  if (!preview) {
    ui.importPreview.hidden = true;
    ui.importPreview.textContent = '';
    if (ui.commitImportBtn) ui.commitImportBtn.disabled = true;
    return;
  }
  ui.importPreview.hidden = false;
  ui.importPreview.innerHTML = '';
  const summary = document.createElement('div');
  summary.className = 'import-preview__summary';
  summary.textContent = `${preview.detectedBroker || 'generic-csv'} · ${preview.adapter || 'adapter'} · ${Math.round((preview.confidence || 0) * 100)}% · ${preview.rowCount || 0} rows · ${(preview.symbols || []).slice(0, 4).join(', ') || 'no symbol'}`;
  ui.importPreview.appendChild(summary);
  const statusMessages = [
    preview.mappingRequired ? 'Mapping required before commit.' : '',
    preview.reason || '',
    ...(preview.warnings || []),
    ...(preview.errors || [])
  ].filter(Boolean);
  statusMessages.slice(0, 6).forEach((message) => {
    const row = document.createElement('div');
    row.className = 'import-preview__message';
    row.textContent = message;
    ui.importPreview.appendChild(row);
  });
  const sample = document.createElement('div');
  sample.className = 'import-preview__sample';
  sample.textContent = (preview.transactions || []).slice(0, 3).map(tx => `${tx.tradeDate || 'no date'} ${tx.type} ${tx.quantity || '—'} ${tx.symbol || tx.isin || '—'}`).join(' · ');
  ui.importPreview.appendChild(sample);
  if (ui.commitImportBtn) ui.commitImportBtn.disabled = !!(preview.errors || []).length || preview.mappingRequired || !(preview.transactions || []).length;
}

async function parseBrokerImportFile() {
  const file = ui.brokerImportFile?.files?.[0];
  if (!file) return;
  if (/\.pdf$/i.test(file.name)) {
    if (window.location.protocol === 'file:') {
      pendingImportPreview = { detectedBroker: 'pdf', rowCount: 0, transactions: [], symbols: [], warnings: [], errors: ['PDF import requires Netlify dev or deploy. CSV import works locally from file mode.'] };
      renderImportPreview(pendingImportPreview);
      return;
    }
    const token = await getPremiumAuthToken();
    if (!token) {
      pendingImportPreview = { detectedBroker: 'pdf', rowCount: 0, transactions: [], symbols: [], warnings: [], errors: ['Sign in before parsing broker PDFs.'] };
      renderImportPreview(pendingImportPreview);
      return;
    }
    pendingImportPreview = { detectedBroker: 'pdf', rowCount: 0, transactions: [], symbols: [], warnings: ['Parsing PDF…'], errors: [] };
    renderImportPreview(pendingImportPreview);
    try {
      const contentBase64 = await readFileBase64(file);
      const response = await fetch('/.netlify/functions/import-parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/pdf', contentBase64 })
      });
      const payload = await response.json();
      pendingImportPreview = payload.data || payload;
      renderImportPreview(pendingImportPreview);
    } catch(e) {
      pendingImportPreview = { detectedBroker: 'pdf', rowCount: 0, transactions: [], symbols: [], warnings: [], errors: [e.message || 'PDF import failed.'] };
      renderImportPreview(pendingImportPreview);
    }
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      pendingImportPreview = window.TaxWorkspace.parseBrokerCsv(String(reader.result || ''), { fileName: file.name });
      renderImportPreview(pendingImportPreview);
    } catch(e) {
      pendingImportPreview = { detectedBroker: 'generic-csv', rowCount: 0, transactions: [], symbols: [], warnings: [], errors: [e.message || 'Import parse failed.'] };
      renderImportPreview(pendingImportPreview);
    }
  };
  reader.readAsText(file);
}

function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('File read failed.'));
    reader.readAsDataURL(file);
  });
}

function applyImportedLotsToInputs() {
  if (!importedLots.length) return;
  const totalShares = importedLots.reduce((sum, lot) => sum + (Number(lot.shares) || 0), 0);
  const totalCost = importedLots.reduce((sum, lot) => sum + (Number(lot.shares) || 0) * (Number(lot.price) || 0), 0);
  const sharesEl = document.getElementById('shares');
  const buyEl = document.getElementById('buyPrice');
  const currencyEl = document.getElementById('currencyCode');
  if (sharesEl) sharesEl.value = formatInputNumber(totalShares);
  if (buyEl && totalShares > 0) buyEl.value = formatInputNumber(totalCost / totalShares);
  if (currencyEl && importedLots[0]?.currency) currencyEl.value = importedLots[0].currency;
  if (typeof setCurrency === 'function') setCurrency(currencyEl?.value || importedLots[0]?.currency || 'EUR');
}

function commitBrokerImport() {
  if (!pendingImportPreview?.transactions?.length) return;
  const result = window.AppLedger?.buildOpenLotsFromTransactions
    ? window.AppLedger.buildOpenLotsFromTransactions(pendingImportPreview.transactions)
    : { lots: [], errors: ['FIFO ledger is unavailable.'] };
  importedTransactions = pendingImportPreview.transactions;
  importedLots = result.lots || [];
  if (portfolioPositions.length) {
    portfolioPositions[0] = { ...portfolioPositions[0], lots: importedLots, importedTransactionCount: importedTransactions.length };
  }
  renderImportPreview({
    ...pendingImportPreview,
    warnings: [...(pendingImportPreview.warnings || []), `Committed ${importedLots.length} open FIFO lots.`],
    errors: result.errors || []
  });
  applyImportedLotsToInputs();
  renderPortfolioWorkspace();
  saveWorkspaceLocal();
  if (typeof calculate === 'function') calculate();
}

function clearBrokerImport() {
  pendingImportPreview = null;
  importedTransactions = [];
  importedLots = [];
  portfolioPositions = portfolioPositions.map(position => ({ ...position, lots: [], importedTransactionCount: 0 }));
  renderImportPreview(null);
  if (ui.brokerImportFile) ui.brokerImportFile.value = '';
  saveWorkspaceLocal();
  renderPortfolioWorkspace();
  if (typeof calculate === 'function') calculate();
}

function getActiveLotSaleResult(input) {
  if (!importedLots.length || !window.AppLedger?.calculateFifoSale || !hasCoreInputs(input)) return null;
  return window.AppLedger.calculateFifoSale(importedLots, {
    shares: input.shares * (input.sellFraction || 1),
    price: input.currentPrice,
    fees: input.transactionCost * (input.sellFraction || 1)
  }, { taxRate: input.taxRate, taxProfile: input.taxProfile });
}

function activateWorkspaceTab(name) {
  ui.workspaceTabs.forEach((tab) => {
    const selected = tab.dataset.workspaceTab === name;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  ui.workspaceTabPanels.forEach((panel) => {
    panel.hidden = !panel.id.startsWith(name);
  });
}

function currentPositionFromInputs() {
  const input = typeof getInputs === 'function' ? getInputs() : {};
  if (!hasCoreInputs(input)) return null;
  const id = selectedInstrument?.isin || selectedInstrument?.symbol || `manual-${Date.now().toString(36)}`;
  return {
    id: String(id).toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || `position-${Date.now().toString(36)}`,
    name: selectedInstrument?.name || ui.workspaceName?.value || 'Manual position',
    symbol: selectedInstrument?.symbol || '',
    isin: selectedInstrument?.isin || '',
    currency: input.currencyCode,
    shares: input.shares,
    buyPrice: input.buyPrice,
    currentPrice: input.currentPrice,
    currentFxRate: Number.isFinite(input.fxRateNow) && input.fxMode === 'manual' ? input.fxRateNow : 1,
    targetWeight: Number.isFinite(input.targetWeight) ? input.targetWeight : 0,
    expectedReturn: Number.isFinite(input.expectedOldReturn) ? input.expectedOldReturn : 0,
    minTradeValue: 0,
    lots: importedLots.length ? importedLots : [{ id: `${id}-avg`, shares: input.shares, price: input.buyPrice, acquiredAt: '' }]
  };
}

function addCurrentPosition() {
  const position = currentPositionFromInputs();
  if (!position) {
    showToast('Enter shares and prices first');
    return;
  }
  portfolioPositions = [...portfolioPositions.filter(item => item.id !== position.id), position];
  renderPortfolioWorkspace();
  saveWorkspaceLocal();
}

function clearPortfolioPositions() {
  portfolioPositions = [];
  lastOptimizerResult = null;
  renderPortfolioWorkspace();
  saveWorkspaceLocal();
}

function updatePositionTarget(positionId, value) {
  const targetWeight = parseLocaleNumber(value);
  portfolioPositions = portfolioPositions.map(position => position.id === positionId
    ? { ...position, targetWeight: Number.isFinite(targetWeight) ? targetWeight : 0 }
    : position);
  renderPortfolioWorkspace();
  saveWorkspaceLocal();
}

function removePortfolioPosition(positionId) {
  portfolioPositions = portfolioPositions.filter(position => position.id !== positionId);
  renderPortfolioWorkspace();
  saveWorkspaceLocal();
}

function renderPortfolioWorkspace() {
  renderPositionsList();
  renderTargetsList();
  renderOptimizerResult(lastOptimizerResult);
  renderScenarios();
}

function renderPositionsList() {
  if (!ui.positionsList) return;
  ui.positionsList.innerHTML = '';
  if (!portfolioPositions.length) {
    ui.positionsList.textContent = 'No positions yet.';
    return;
  }
  portfolioPositions.forEach((position) => {
    const value = position.shares * position.currentPrice * (position.currentFxRate || 1);
    const row = document.createElement('div');
    row.className = 'workspace-row';
    const main = document.createElement('span');
    const stats = document.createElement('strong');
    const remove = document.createElement('button');
    main.textContent = `${position.symbol || position.name} · ${formatShares(position.shares)} shares`;
    stats.textContent = formatCurrency(value, position.currency || 'EUR');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => removePortfolioPosition(position.id));
    row.append(main, stats, remove);
    ui.positionsList.appendChild(row);
  });
}

function renderTargetsList() {
  if (!ui.targetsList || !ui.targetSummary) return;
  ui.targetsList.innerHTML = '';
  if (!portfolioPositions.length) {
    ui.targetSummary.textContent = 'No positions yet.';
    return;
  }
  const totalValue = portfolioPositions.reduce((sum, position) => sum + position.shares * position.currentPrice * (position.currentFxRate || 1), 0);
  const totalTarget = portfolioPositions.reduce((sum, position) => sum + (Number(position.targetWeight) || 0), 0);
  ui.targetSummary.textContent = `Target weights total ${totalTarget.toFixed(2)}%. Portfolio value ${formatCurrency(totalValue, document.getElementById('currencyCode')?.value || 'EUR')}.`;
  portfolioPositions.forEach((position) => {
    const value = position.shares * position.currentPrice * (position.currentFxRate || 1);
    const currentWeight = totalValue > 0 ? (value / totalValue) * 100 : 0;
    const row = document.createElement('div');
    row.className = 'workspace-row workspace-row--target';
    const label = document.createElement('span');
    const input = document.createElement('input');
    const drift = document.createElement('small');
    label.textContent = `${position.symbol || position.name} · current ${currentWeight.toFixed(1)}%`;
    input.type = 'text';
    input.inputMode = 'decimal';
    input.value = formatInputNumber(Number(position.targetWeight) || 0);
    input.setAttribute('aria-label', `Target weight for ${position.symbol || position.name}`);
    input.addEventListener('change', () => updatePositionTarget(position.id, input.value));
    drift.textContent = `Drift ${(currentWeight - (Number(position.targetWeight) || 0)).toFixed(1)}pp`;
    row.append(label, input, drift);
    ui.targetsList.appendChild(row);
  });
}

function getOptimizerSettings() {
  return {
    objective: ui.optimizerObjective?.value || 'balanced',
    targetTolerancePct: parseLocaleNumber(ui.optimizerTolerance?.value) || 2,
    maxTaxDue: parseLocaleNumber(ui.optimizerMaxTax?.value),
    maxTurnoverValue: parseLocaleNumber(ui.optimizerMaxTurnover?.value),
    minTradeValue: parseLocaleNumber(ui.optimizerMinTrade?.value) || 0,
    allowBuys: ui.optimizerAllowBuys?.checked !== false,
    allowPartialLots: ui.optimizerAllowPartialLots?.checked !== false,
    taxRate: typeof getInputs === 'function' ? getInputs().taxRate : 0
  };
}

function runPortfolioOptimizer() {
  if (!window.TaxWorkspace?.optimizePortfolio) return;
  lastOptimizerResult = window.TaxWorkspace.optimizePortfolio(portfolioPositions, getOptimizerSettings(), {
    taxProfile: typeof getDetailedTaxProfile === 'function' ? getDetailedTaxProfile() : { mode: 'flat' }
  });
  renderOptimizerResult(lastOptimizerResult);
  saveScenario(true);
}

function renderOptimizerResult(result) {
  if (!ui.optimizerResult) return;
  ui.optimizerResult.innerHTML = '';
  if (!result) {
    ui.optimizerResult.textContent = 'Run the optimizer to see trades.';
    return;
  }
  const summary = document.createElement('div');
  summary.className = 'optimizer-summary';
  summary.textContent = `Tracking error ${result.trackingErrorBefore.toFixed(2)} -> ${result.trackingErrorAfter.toFixed(2)} · Tax ${formatCurrency(result.taxDue, document.getElementById('currencyCode')?.value || 'EUR')}`;
  ui.optimizerResult.appendChild(summary);
  (result.warnings || []).forEach((warning) => {
    const item = document.createElement('div');
    item.className = 'import-preview__message';
    item.textContent = warning;
    ui.optimizerResult.appendChild(item);
  });
  (result.trades || []).forEach((trade) => {
    const row = document.createElement('div');
    row.className = 'optimizer-trade-row';
    const action = document.createElement('strong');
    const detail = document.createElement('span');
    const value = document.createElement('small');
    action.textContent = trade.action;
    detail.textContent = `${trade.symbol || trade.name} · ${formatShares(trade.quantity)} · ${trade.reason}`;
    value.textContent = formatCurrency(trade.grossValue, document.getElementById('currencyCode')?.value || 'EUR');
    row.append(action, detail, value);
    ui.optimizerResult.appendChild(row);
  });
}

function saveScenario(silent = false) {
  const input = typeof getInputs === 'function' ? getInputs() : {};
  const id = activeScenarioId || `scenario-${Date.now().toString(36)}`;
  const name = ui.scenarioName?.value || `Scenario ${portfolioScenarios.length + 1}`;
  const scenario = {
    id,
    name,
    settings: input,
    positionOverrides: portfolioPositions,
    optimizerSettings: getOptimizerSettings(),
    optimizerResult: lastOptimizerResult,
    createdAt: portfolioScenarios.find(item => item.id === id)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  portfolioScenarios = [...portfolioScenarios.filter(item => item.id !== id), scenario];
  activeScenarioId = id;
  renderScenarios();
  saveWorkspaceLocal();
  if (!silent) showToast('Scenario saved');
}

function duplicateScenario() {
  activeScenarioId = null;
  if (ui.scenarioName) ui.scenarioName.value = `${ui.scenarioName.value || 'Scenario'} copy`;
  saveScenario();
}

function deleteScenario() {
  if (!activeScenarioId) return;
  portfolioScenarios = portfolioScenarios.filter(item => item.id !== activeScenarioId);
  activeScenarioId = portfolioScenarios[0]?.id || null;
  renderScenarios();
  saveWorkspaceLocal();
}

function renderScenarios() {
  if (ui.scenarioSelect) {
    ui.scenarioSelect.innerHTML = '';
    portfolioScenarios.forEach((scenario) => {
      const option = document.createElement('option');
      option.value = scenario.id;
      option.textContent = scenario.name;
      option.selected = scenario.id === activeScenarioId;
      ui.scenarioSelect.appendChild(option);
    });
  }
  if (!ui.scenarioComparison) return;
  ui.scenarioComparison.innerHTML = '';
  if (!portfolioScenarios.length) {
    ui.scenarioComparison.textContent = 'No saved scenarios.';
    return;
  }
  portfolioScenarios.slice(-5).forEach((scenario) => {
    const result = scenario.optimizerResult || {};
    const row = document.createElement('div');
    row.className = 'scenario-row';
    const name = document.createElement('span');
    const tax = document.createElement('strong');
    const trades = document.createElement('small');
    name.textContent = scenario.name;
    tax.textContent = formatCurrency(result.taxDue || 0, scenario.settings?.currencyCode || 'EUR');
    trades.textContent = `${(result.trades || []).length} trades · TE ${(result.trackingErrorAfter || 0).toFixed(2)}`;
    row.append(name, tax, trades);
    ui.scenarioComparison.appendChild(row);
  });
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
  downloadText(`taxswitch-report-${new Date().toISOString().slice(0,10)}.csv`, csv, 'text/csv;charset=utf-8;');
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function getDetailedTaxProfile() {
  const num = (el, fallback = 0) => {
    const parsed = parseLocaleNumber(el?.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const mode = ui.taxProfileMode?.value || 'flat';
  const filingStatus = ui.filingStatus?.value || 'single';
  const allowanceFallback = filingStatus === 'joint' ? 2000 : 1000;
  return {
    mode,
    filingStatus,
    saverAllowanceRemaining: num(ui.saverAllowanceRemaining, allowanceFallback),
    churchTaxRate: Number(ui.churchTaxRate?.value || 0),
    instrumentTaxClass: ui.instrumentTaxClass?.value || 'stock',
    stockLossPot: num(ui.stockLossPot, 0),
    otherLossPot: num(ui.otherLossPot, 0),
    foreignTaxPaid: num(ui.foreignTaxPaid, 0),
    foreignTaxCreditable: num(ui.foreignTaxCreditable, 0),
    priorTaxedVorabpauschale: num(ui.priorTaxedVorabpauschale, 0)
  };
}

function saveLocalAlerts() {
  try {
    localStorage.setItem('taxswitch_local_alerts', JSON.stringify(localAlertRules));
  } catch(e) { /* ignore private browsing / quota errors */ }
}

function restoreLocalAlerts() {
  try {
    const raw = localStorage.getItem('taxswitch_local_alerts');
    localAlertRules = raw ? JSON.parse(raw) : [];
  } catch(e) {
    localAlertRules = [];
  }
}

function addLocalAlert() {
  const threshold = parseLocaleNumber(ui.alertThreshold?.value);
  if (!ui.alertType || !Number.isFinite(threshold)) {
    showToast('Enter an alert threshold');
    return;
  }
  localAlertRules.push({
    id: `local-${Date.now().toString(36)}`,
    type: ui.alertType.value,
    threshold,
    enabled: true,
    channel: 'in-app'
  });
  if (ui.alertThreshold) ui.alertThreshold.value = '';
  saveLocalAlerts();
  if (typeof calculate === 'function') calculate();
}

function updateLocalAlerts(input, output) {
  if (!ui.alertList) return;
  if (!localAlertRules.length) {
    ui.alertList.textContent = 'No local alerts';
    return;
  }
  const evaluated = window.TaxWorkspace?.evaluateAlertRules
    ? window.TaxWorkspace.evaluateAlertRules(localAlertRules, input, output)
    : localAlertRules;
  ui.alertList.innerHTML = '';
  evaluated.forEach((rule) => {
    const row = document.createElement('div');
    row.className = `local-alert-row${rule.triggered ? ' is-triggered' : ''}`;
    const value = Number.isFinite(rule.lastValue) ? rule.lastValue : '—';
    const type = document.createElement('span');
    const status = document.createElement('strong');
    const lastValue = document.createElement('small');
    const remove = document.createElement('button');
    type.textContent = rule.type;
    status.textContent = rule.triggered ? 'Triggered' : 'Watching';
    lastValue.textContent = String(value);
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove alert');
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      localAlertRules = localAlertRules.filter((item) => item.id !== rule.id);
      saveLocalAlerts();
      updateLocalAlerts(input, output);
    });
    row.append(type, status, lastValue, remove);
    ui.alertList.appendChild(row);
  });
}

function buildCurrentAuditReport() {
  const input = typeof getInputs === 'function' ? getInputs() : {};
  const output = hasCoreInputs(input) ? calculateValues(input) : {};
  if (window.TaxWorkspace?.buildAuditReport) {
    return window.TaxWorkspace.buildAuditReport(input, output, {
      marketData: pendingPrice || {},
      positions: portfolioPositions,
      optimizerResult: lastOptimizerResult,
      formulas: ['Realized gain = sale proceeds - cost basis - allocated costs', 'Tax due uses selected flat or German detailed profile']
    });
  }
  return { createdAt: new Date().toISOString(), inputs: input, output };
}

function exportAuditJson() {
  const report = buildCurrentAuditReport();
  const text = window.TaxWorkspace?.serializeAuditReportJson
    ? window.TaxWorkspace.serializeAuditReportJson(report)
    : JSON.stringify(report, null, 2);
  downloadText(`taxswitch-audit-${new Date().toISOString().slice(0,10)}.json`, text, 'application/json;charset=utf-8;');
}

function exportAuditHtml() {
  const report = buildCurrentAuditReport();
  const html = window.TaxWorkspace?.serializeAuditReportHtml
    ? window.TaxWorkspace.serializeAuditReportHtml(report)
    : `<pre>${JSON.stringify(report, null, 2)}</pre>`;
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) {
    downloadText(`taxswitch-audit-${new Date().toISOString().slice(0,10)}.html`, html, 'text/html;charset=utf-8;');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* ── PWA install prompt ────────────────────────────────────────────── */
function isStandaloneDisplay() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '') && 'standalone' in window.navigator;
}

function hideInstallPrompt() {
  if (ui.installPrompt) ui.installPrompt.hidden = true;
  if (ui.installAppBtn) ui.installAppBtn.hidden = true;
}

function showInstallPrompt({ text, buttonLabel = 'Install', canPrompt = true }) {
  if (!ui.installPrompt || isStandaloneDisplay()) return;
  if (ui.installPromptText) ui.installPromptText.textContent = text;
  if (ui.installPromptBtn) {
    ui.installPromptBtn.textContent = buttonLabel;
    ui.installPromptBtn.hidden = !canPrompt;
  }
  if (ui.installAppBtn) ui.installAppBtn.hidden = !canPrompt;
  ui.installPrompt.hidden = false;
}

function setupInstallPrompt() {
  if (isStandaloneDisplay()) {
    hideInstallPrompt();
    return;
  }

  const dismissed = localStorage.getItem('taxswitch_install_dismissed') === '1';

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (!dismissed) {
      showInstallPrompt({
        text: 'Install TaxSwitch for faster mobile access and offline use.',
        buttonLabel: 'Install',
        canPrompt: true
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideInstallPrompt();
  });

  const promptInstall = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    hideInstallPrompt();
  };

  if (ui.installPromptBtn) ui.installPromptBtn.addEventListener('click', promptInstall);
  if (ui.installAppBtn) ui.installAppBtn.addEventListener('click', promptInstall);
  if (ui.dismissInstallPrompt) {
    ui.dismissInstallPrompt.addEventListener('click', () => {
      localStorage.setItem('taxswitch_install_dismissed', '1');
      hideInstallPrompt();
    });
  }

  if (!dismissed && isIosDevice()) {
    showInstallPrompt({
      text: 'Add TaxSwitch from Safari Share > Add to Home Screen for offline mobile use.',
      canPrompt: false
    });
  }
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
    ['shares','buyPrice','currentPrice','taxRate','transactionCost','rebuyPrice','expectedOldReturn','expectedNewReturn','currencyCode','portfolioValue','targetWeight','positionCurrency','taxCurrency','fxRateBuy','fxRateNow','customSellShares','assetTypeFilter','assetCountryFilter','taxProfileMode','filingStatus','saverAllowanceRemaining','churchTaxRate','instrumentTaxClass','stockLossPot','otherLossPot','foreignTaxPaid','foreignTaxCreditable','priorTaxedVorabpauschale','workspaceName'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value) data[id] = el.value;
    });
    data.includeTaxOnNew = document.getElementById('includeTaxOnNew')?.checked;
    data.sellPct = sellPct;
    data.fxMode = fxMode;
    data.hurdleMode = getHurdleMode();
    data.lots = lots;
    if (typeof selectedInstrument !== 'undefined' && selectedInstrument) data.selectedInstrument = selectedInstrument;
    if (typeof pendingPrice !== 'undefined' && pendingPrice) data.pendingPrice = pendingPrice;
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { /* quota exceeded or private browsing */ }
}

function restoreFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    ['shares','buyPrice','currentPrice','taxRate','transactionCost','rebuyPrice','expectedOldReturn','expectedNewReturn','currencyCode','portfolioValue','targetWeight','positionCurrency','taxCurrency','fxRateBuy','fxRateNow','customSellShares','assetTypeFilter','assetCountryFilter','taxProfileMode','filingStatus','saverAllowanceRemaining','churchTaxRate','instrumentTaxClass','stockLossPot','otherLossPot','foreignTaxPaid','foreignTaxCreditable','priorTaxedVorabpauschale','workspaceName'].forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id]) el.value = data[id];
    });
    if (data.includeTaxOnNew !== undefined) document.getElementById('includeTaxOnNew').checked = data.includeTaxOnNew;
    if (data.sellPct) activateSellChip(data.sellPct);
    if (data.fxMode) activateFxMode(data.fxMode);
    if (data.hurdleMode) {
      const radio = document.querySelector(`[name="hurdleMode"][value="${data.hurdleMode}"]`);
      if (radio) {
        radio.checked = true;
        hurdleMode = data.hurdleMode;
      }
    }
    if (Array.isArray(data.lots) && data.lots.length > 0) {
      data.lots.forEach(l => addLot(l.shares, l.price));
    }
    if (data.selectedInstrument && typeof selectInstrument === 'function') {
      selectInstrument(data.selectedInstrument);
    }
    restoreLocalAlerts();
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
  [ui.taxProfileMode, ui.filingStatus, ui.saverAllowanceRemaining, ui.churchTaxRate, ui.instrumentTaxClass, ui.stockLossPot, ui.otherLossPot, ui.foreignTaxPaid, ui.foreignTaxCreditable, ui.priorTaxedVorabpauschale].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', () => { if (typeof calculate === 'function') calculate(); });
      inp.addEventListener('change', () => { if (typeof calculate === 'function') calculate(); });
    }
  });
  // Share / export
  if (ui.shareBtn) ui.shareBtn.addEventListener('click', shareScenario);
  if (ui.exportBtn) ui.exportBtn.addEventListener('click', exportCSV);
  if (ui.exportJsonBtn) ui.exportJsonBtn.addEventListener('click', exportAuditJson);
  if (ui.exportHtmlBtn) ui.exportHtmlBtn.addEventListener('click', exportAuditHtml);
  if (ui.addAlertBtn) ui.addAlertBtn.addEventListener('click', addLocalAlert);
  ui.workspaceTabs.forEach(tab => tab.addEventListener('click', () => activateWorkspaceTab(tab.dataset.workspaceTab)));
  if (ui.addPositionBtn) ui.addPositionBtn.addEventListener('click', addCurrentPosition);
  if (ui.clearPositionsBtn) ui.clearPositionsBtn.addEventListener('click', clearPortfolioPositions);
  if (ui.runOptimizerBtn) ui.runOptimizerBtn.addEventListener('click', runPortfolioOptimizer);
  if (ui.saveScenarioBtn) ui.saveScenarioBtn.addEventListener('click', () => saveScenario());
  if (ui.duplicateScenarioBtn) ui.duplicateScenarioBtn.addEventListener('click', duplicateScenario);
  if (ui.deleteScenarioBtn) ui.deleteScenarioBtn.addEventListener('click', deleteScenario);
  if (ui.scenarioSelect) ui.scenarioSelect.addEventListener('change', () => {
    activeScenarioId = ui.scenarioSelect.value;
    const scenario = portfolioScenarios.find(item => item.id === activeScenarioId);
    if (scenario) {
      if (ui.scenarioName) ui.scenarioName.value = scenario.name;
      portfolioPositions = scenario.positionOverrides || portfolioPositions;
      lastOptimizerResult = scenario.optimizerResult || null;
      renderPortfolioWorkspace();
    }
  });
  if (ui.authStatusBtn) ui.authStatusBtn.addEventListener('click', toggleAuthStatus);
  if (ui.saveWorkspaceBtn) ui.saveWorkspaceBtn.addEventListener('click', saveWorkspaceLocal);
  if (ui.loadWorkspaceBtn) ui.loadWorkspaceBtn.addEventListener('click', loadWorkspaceLocal);
  if (ui.syncWorkspaceBtn) ui.syncWorkspaceBtn.addEventListener('click', syncWorkspaceBackend);
  if (ui.brokerImportFile) ui.brokerImportFile.addEventListener('change', parseBrokerImportFile);
  if (ui.commitImportBtn) ui.commitImportBtn.addEventListener('click', commitBrokerImport);
  if (ui.clearImportBtn) ui.clearImportBtn.addEventListener('click', clearBrokerImport);
  if (window.netlifyIdentity?.on) {
    window.netlifyIdentity.on('init', refreshAuthStatus);
    window.netlifyIdentity.on('login', () => { refreshAuthStatus(); window.netlifyIdentity.close(); });
    window.netlifyIdentity.on('logout', refreshAuthStatus);
    window.netlifyIdentity.init();
  }
  refreshAuthStatus();
  restoreLocalAlerts();
  renderPortfolioWorkspace();
  // Price confirmation
  if (ui.confirmPriceBtn) ui.confirmPriceBtn.addEventListener('click', () => {
    if (pendingPrice !== null) {
      const cpEl = document.getElementById('currentPrice');
      if (cpEl) {
        applyingMarketPrice = true;
        cpEl.value = formatInputNumber(pendingPrice.price);
        applyingMarketPrice = false;
      }
      if (pendingPrice.currency) {
        const ccEl = document.getElementById('currencyCode');
        if (ccEl) ccEl.value = normalizeCurrencyCode(pendingPrice.currency);
        setCurrency(pendingPrice.currency);
      }
      ui.priceConfirmation.hidden = true;
      ui.priceTimestamp.hidden = false;
      ui.priceSourceLabel.textContent = pendingPrice.converted
        ? `Converted from ${formatCurrency(pendingPrice.originalPrice, pendingPrice.originalCurrency)}`
        : 'Latest market price';
      ui.priceTimeLabel.textContent = `Fetched: ${new Date(pendingPrice.fetchedAt || Date.now()).toLocaleTimeString('de-DE')}`;
      if (els?.refreshPriceBtn) els.refreshPriceBtn.hidden = false;
      pendingPrice = null;
      if (typeof calculate === 'function') calculate();
    }
  });
  if (ui.cancelPriceBtn) ui.cancelPriceBtn.addEventListener('click', () => {
    ui.priceConfirmation.hidden = true;
    pendingPrice = null;
  });
  // Install prompt
  setupInstallPrompt();
  // API status check
  checkApiStatus();
}
