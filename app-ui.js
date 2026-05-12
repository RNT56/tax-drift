/* ═══════════════════════════════════════════════════════════════════
   TaxSwitch — UI Extensions (lots, sell mode, FX, portfolio, etc.)
   Loaded after app-core.js, before app.js
   ═══════════════════════════════════════════════════════════════════ */

/* ── New element references ────────────────────────────────────────── */
const ui = {
  apiStatusChip: document.getElementById('apiStatusChip'),
  apiStatusLabel: document.getElementById('apiStatusLabel'),
  authStatusBtn: document.getElementById('authStatusBtn'),
  routeButtons: [...document.querySelectorAll('[data-app-route]')],
  calculatorPageSections: [...document.querySelectorAll('[data-calculator-page]')],
  depotPage: document.getElementById('depotPage'),
  depotSummary: document.getElementById('depotSummary'),
  depotImportStatus: document.getElementById('depotImportStatus'),
  depotImportFile: document.getElementById('depotImportFile'),
  depotImportFileName: document.getElementById('depotImportFileName'),
  depotImportPreview: document.getElementById('depotImportPreview'),
  depotCommitImportBtn: document.getElementById('depotCommitImportBtn'),
  depotClearImportBtn: document.getElementById('depotClearImportBtn'),
  depotSaveWorkspaceBtn: document.getElementById('depotSaveWorkspaceBtn'),
  depotSyncWorkspaceBtn: document.getElementById('depotSyncWorkspaceBtn'),
  depotSourceList: document.getElementById('depotSourceList'),
  depotPositionsTable: document.getElementById('depotPositionsTable'),
  depotPositionCount: document.getElementById('depotPositionCount'),
  depotAccountList: document.getElementById('depotAccountList'),
  depotAccountCount: document.getElementById('depotAccountCount'),
  depotCashEventList: document.getElementById('depotCashEventList'),
  depotCashEventCount: document.getElementById('depotCashEventCount'),
  priceTimestamp: document.getElementById('priceTimestamp'),
  priceSourceLabel: document.getElementById('priceSourceLabel'),
  priceTimeLabel: document.getElementById('priceTimeLabel'),
  targetPriceTimestamp: document.getElementById('targetPriceTimestamp'),
  targetPriceSourceLabel: document.getElementById('targetPriceSourceLabel'),
  targetPriceTimeLabel: document.getElementById('targetPriceTimeLabel'),
  switchBuyPrice: document.getElementById('switchBuyPrice'),
  switchTargetPrice: document.getElementById('switchTargetPrice'),
  switchBuyCost: document.getElementById('switchBuyCost'),
  switchHorizonYears: document.getElementById('switchHorizonYears'),
  switchAllowFractional: document.getElementById('switchAllowFractional'),
  lotsDetails: document.getElementById('lotsDetails'),
  lotsContainer: document.getElementById('lotsContainer'),
  lotsCount: document.getElementById('lotsCount'),
  saleOrderSelect: document.getElementById('saleOrderSelect'),
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
  distributionPolicy: document.getElementById('distributionPolicy'),
  fundDomicile: document.getElementById('fundDomicile'),
  annualDistributionYield: document.getElementById('annualDistributionYield'),
  withholdingTaxRate: document.getElementById('withholdingTaxRate'),
  totalExpenseRatio: document.getElementById('totalExpenseRatio'),
  trackingDifference: document.getElementById('trackingDifference'),
  fundCurrencyExposure: document.getElementById('fundCurrencyExposure'),
  indexMethodology: document.getElementById('indexMethodology'),
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
  workspaceSyncStatus: document.getElementById('workspaceSyncStatus'),
  brokerImportFile: document.getElementById('brokerImportFile'),
  brokerImportFileName: document.getElementById('brokerImportFileName'),
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
  targetSellPrice: document.getElementById('targetSellPrice'),
  targetReachProbability: document.getElementById('targetReachProbability'),
  freshCashAmount: document.getElementById('freshCashAmount'),
  cashReserve: document.getElementById('cashReserve'),
  maxTolerableLoss: document.getElementById('maxTolerableLoss'),
  timeHorizonYears: document.getElementById('timeHorizonYears'),
  sectorExposure: document.getElementById('sectorExposure'),
  countryExposure: document.getElementById('countryExposure'),
  currentVolatility: document.getElementById('currentVolatility'),
  newVolatility: document.getElementById('newVolatility'),
  portfolioVolatility: document.getElementById('portfolioVolatility'),
  correlationToPortfolio: document.getElementById('correlationToPortfolio'),
  decisionSummary: document.getElementById('decisionSummary'),
  decisionTabs: [...document.querySelectorAll('[data-decision-tab]')],
  decisionPanels: [...document.querySelectorAll('[data-decision-panel]')],
  scenarioCaseEditor: document.getElementById('scenarioCaseEditor'),
  decisionScenarioResults: document.getElementById('decisionScenarioResults'),
  monteCarloSummary: document.getElementById('monteCarloSummary'),
  portfolioRiskMetrics: document.getElementById('portfolioRiskMetrics'),
  riskFlagList: document.getElementById('riskFlagList'),
  riskCatalogList: document.getElementById('riskCatalogList'),
  researchThesis: document.getElementById('researchThesis'),
  aiProviderSelect: document.getElementById('aiProviderSelect'),
  aiModelSelect: document.getElementById('aiModelSelect'),
  aiProviderStatus: document.getElementById('aiProviderStatus'),
  generateResearchMemoBtn: document.getElementById('generateResearchMemoBtn'),
  researchMemoStatus: document.getElementById('researchMemoStatus'),
  researchMemoOutput: document.getElementById('researchMemoOutput'),
  assumptionQualityList: document.getElementById('assumptionQualityList'),
  decisionWatchSuggestions: document.getElementById('decisionWatchSuggestions'),
  printDecisionReportBtn: document.getElementById('printDecisionReportBtn'),
  decisionReportOutput: document.getElementById('decisionReportOutput'),
  shareToast: document.getElementById('shareToast'),
  shareToastMsg: document.getElementById('shareToastMsg'),
  installAppBtn: document.getElementById('installAppBtn'),
  installPrompt: document.getElementById('installPrompt'),
  installPromptText: document.getElementById('installPromptText'),
  installPromptBtn: document.getElementById('installPromptBtn'),
  dismissInstallPrompt: document.getElementById('dismissInstallPrompt'),
  updatePrompt: document.getElementById('updatePrompt'),
  updatePromptText: document.getElementById('updatePromptText'),
  reloadUpdateBtn: document.getElementById('reloadUpdateBtn'),
  dismissUpdatePrompt: document.getElementById('dismissUpdatePrompt'),
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
let pendingImportText = '';
let pendingImportMeta = null;
let portfolioPositions = [];
let portfolioScenarios = [];
let activeScenarioId = null;
let lastOptimizerResult = null;
let lastDepotBuild = null;
let fxFetchTimer = null;
let fxAbort = null;
let optimizerRerunTimer = null;
let decisionScenarioCases = [];
let lastDecisionResult = null;
let researchMemos = [];
let aiProviderCatalog = [];
let pendingAiProviderSelection = '';
let pendingAiModelSelection = '';
let identityLoadPromise = null;
let identityInitialized = false;
let waitingServiceWorker = null;
let serviceWorkerRefreshing = false;

function setAppRoute(route = 'calculator') {
  const active = route === 'depot' ? 'depot' : 'calculator';
  ui.routeButtons.forEach((button) => {
    const selected = button.dataset.appRoute === active;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-current', selected ? 'page' : 'false');
  });
  ui.calculatorPageSections.forEach(section => { section.hidden = active !== 'calculator'; });
  if (ui.depotPage) ui.depotPage.hidden = active !== 'depot';
  document.body.classList.toggle('is-depot-route', active === 'depot');
  if (window.location.hash !== `#${active}`) {
    history.replaceState(null, '', `#${active}`);
  }
  if (active === 'depot') renderDepotOverview();
}

function routeFromHash() {
  return String(window.location.hash || '').replace(/^#/, '') === 'depot' ? 'depot' : 'calculator';
}

/* ── Lots manager ──────────────────────────────────────────────────── */
function addLot(sharesVal, priceVal) {
  const idx = lots.length;
  const source = typeof sharesVal === 'object' && sharesVal !== null ? sharesVal : { shares: sharesVal, price: priceVal };
  lots.push({
    acquiredAt: source.acquiredAt || source.date || '',
    shares: source.shares || '',
    price: source.price || '',
    fees: source.fees || '',
    fxRateBuy: source.fxRateBuy || source.fxRate || '',
    currency: source.currency || '',
    selectedForSale: source.selectedForSale !== false
  });
  const row = document.createElement('div');
  row.className = 'lot-row';
  row.dataset.lotIndex = idx;
  row.innerHTML = `<label class="lot-select"><input type="checkbox" data-lot-selected="${idx}" checked><span>Sell</span></label><label class="field field--compact"><span>Date</span><input type="text" autocomplete="off" placeholder="YYYY-MM-DD" data-lot-date="${idx}"></label><label class="field field--compact"><span>Shares</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 5" data-lot-shares="${idx}"></label><label class="field field--compact"><span>Unit cost</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 80" data-lot-price="${idx}"></label><label class="field field--compact"><span>Fees</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="0" data-lot-fees="${idx}"></label><label class="field field--compact"><span>Buy FX</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="1" data-lot-fx="${idx}"></label><label class="field field--compact"><span>Currency</span><input type="text" inputmode="latin" maxlength="3" autocomplete="off" placeholder="EUR" data-lot-currency="${idx}"></label><button type="button" class="lot-remove" data-remove-lot="${idx}" aria-label="Remove lot"><span class="icon-x" aria-hidden="true"></span></button>`;
  row.querySelector(`[data-lot-selected="${idx}"]`).checked = lots[idx].selectedForSale !== false;
  row.querySelector(`[data-lot-date="${idx}"]`).value = lots[idx].acquiredAt;
  row.querySelector(`[data-lot-shares="${idx}"]`).value = lots[idx].shares;
  row.querySelector(`[data-lot-price="${idx}"]`).value = lots[idx].price;
  row.querySelector(`[data-lot-fees="${idx}"]`).value = lots[idx].fees;
  row.querySelector(`[data-lot-fx="${idx}"]`).value = lots[idx].fxRateBuy;
  row.querySelector(`[data-lot-currency="${idx}"]`).value = lots[idx].currency;
  ui.lotsContainer.appendChild(row);
  row.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => { readLots(); if (typeof calculate === 'function') calculate(); });
    inp.addEventListener('change', () => { readLots(); if (typeof calculate === 'function') calculate(); });
    inp.addEventListener('focus', () => { if (inp.type !== 'checkbox' && typeof inp.select === 'function') inp.select(); });
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
  copy.forEach(l => addLot(l));
}

function readLots() {
  lots = [];
  ui.lotsContainer.querySelectorAll('.lot-row').forEach(row => {
    const sInp = row.querySelector('[data-lot-shares]');
    const pInp = row.querySelector('[data-lot-price]');
    const dateInp = row.querySelector('[data-lot-date]');
    const feeInp = row.querySelector('[data-lot-fees]');
    const fxInp = row.querySelector('[data-lot-fx]');
    const ccyInp = row.querySelector('[data-lot-currency]');
    const selectedInp = row.querySelector('[data-lot-selected]');
    lots.push({
      acquiredAt: dateInp?.value || '',
      shares: sInp?.value || '',
      price: pInp?.value || '',
      fees: feeInp?.value || '',
      fxRateBuy: fxInp?.value || '',
      currency: normalizeCurrencyCode(ccyInp?.value || document.getElementById('currencyCode')?.value || 'EUR'),
      selectedForSale: selectedInp?.checked !== false
    });
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
  if (mode === 'manual') queueCurrentFxFetch();
}

function setFxLoading(isLoading) {
  ui.fxRateNow?.closest('.field')?.classList.toggle('is-loading-inline', Boolean(isLoading));
}

function queueCurrentFxFetch(force = false) {
  clearTimeout(fxFetchTimer);
  fxFetchTimer = window.setTimeout(() => autoFetchCurrentFx({ force }), 220);
}

async function autoFetchCurrentFx({ force = false } = {}) {
  if (fxMode !== 'manual' || window.location.protocol === 'file:') return;
  const from = normalizeCurrencyCode(ui.positionCurrency?.value || '');
  const to = normalizeCurrencyCode(ui.taxCurrency?.value || '');
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return;
  if (from === to) {
    if (ui.fxRateNow) ui.fxRateNow.value = '1';
    if (typeof calculate === 'function') calculate();
    return;
  }
  if (!force && parseLocaleNumber(ui.fxRateNow?.value) > 0) return;
  if (fxAbort) fxAbort.abort();
  fxAbort = new AbortController();
  const currentAbort = fxAbort;
  setFxLoading(true);
  try {
    const params = new URLSearchParams({ from, to });
    const response = await fetch(`/.netlify/functions/get-fx-rate?${params.toString()}`, {
      signal: currentAbort.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Number.isFinite(Number(payload.rate))) return;
    if (ui.fxRateNow) {
      ui.fxRateNow.value = formatInputNumber(Number(payload.rate));
      ui.fxRateNow.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof flashField === 'function') flashField(ui.fxRateNow);
      const hint = ui.fxRateNow.closest('.field')?.querySelector('em');
      if (hint) hint.textContent = payload.cached ? 'cached live rate' : 'live rate';
    }
  } catch(e) {
    if (e.name !== 'AbortError') {
      const hint = ui.fxRateNow?.closest('.field')?.querySelector('em');
      if (hint) hint.textContent = 'manual rate';
    }
  } finally {
    if (fxAbort === currentAbort) {
      fxAbort = null;
      setFxLoading(false);
    }
  }
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
  const cc = output.valueCurrency || input.currencyCode || 'EUR';
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

function setWorkspaceSyncStatus(text, tone = '') {
  if (!ui.workspaceSyncStatus) return;
  ui.workspaceSyncStatus.textContent = text;
  ui.workspaceSyncStatus.classList.remove('is-local', 'is-synced', 'is-error', 'is-syncing');
  if (tone) ui.workspaceSyncStatus.classList.add(`is-${tone}`);
}

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
      decisionCases: decisionScenarioCases,
      riskProfile: {
        cashReserve: input.cashReserve,
        maxTolerableLoss: input.maxTolerableLoss,
        timeHorizonYears: input.timeHorizonYears,
        sectorExposure: input.sectorExposure,
        countryExposure: input.countryExposure,
        currentVolatility: input.currentVolatility,
        newVolatility: input.newVolatility,
        portfolioVolatility: input.portfolioVolatility,
        correlationToPortfolio: input.correlationToPortfolio
      },
      researchMemos,
      watchRules: localAlertRules,
      portfolioExposure: {
        portfolioValue: input.portfolioValue,
        targetWeight: input.targetWeight,
        currencyExposure: input.positionCurrency
      },
      assumptions: lastDecisionResult?.assumptionQuality || {},
      imports: importedTransactions.length ? [{ id: pendingImportPreview?.importId || 'local-import', transactions: importedTransactions }] : []
    })
    : { name: ui.workspaceName?.value || 'Local workspace', input, positions: portfolioPositions, scenarios: portfolioScenarios, imports: importedTransactions, lots: importedLots };
}

function saveWorkspaceLocal(silent = false) {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(buildWorkspaceSnapshot()));
    setWorkspaceSyncStatus('Saved locally on this device.', 'local');
    if (!silent) showToast('Workspace saved locally');
  } catch(e) {
    setWorkspaceSyncStatus('Local workspace save failed.', 'error');
    if (!silent) showToast('Workspace save failed');
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
    switchBuyPrice: scenario.switchBuyPrice,
    switchTargetPrice: scenario.switchTargetPrice,
    switchBuyCost: scenario.switchBuyCost,
    switchHorizonYears: scenario.switchHorizonYears,
    currencyCode: scenario.currencyCode,
    positionCurrency: scenario.positionCurrency,
    taxCurrency: scenario.taxCurrency,
    fxRateBuy: scenario.fxRateBuy,
    fxRateNow: scenario.fxRateNow,
    targetSellPrice: scenario.targetSellPrice,
    targetReachProbability: Number.isFinite(scenario.targetReachProbability) ? scenario.targetReachProbability * 100 : undefined,
    freshCashAmount: scenario.freshCashAmount,
    cashReserve: scenario.cashReserve,
    maxTolerableLoss: Number.isFinite(scenario.maxTolerableLoss) ? scenario.maxTolerableLoss * 100 : undefined,
    timeHorizonYears: scenario.timeHorizonYears,
    sectorExposure: scenario.sectorExposure,
    countryExposure: scenario.countryExposure
  }).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null && value !== '') el.value = Number.isFinite(Number(value)) ? formatInputNumber(Number(value)) : String(value);
  });
  if (ui.workspaceName) ui.workspaceName.value = workspace?.name || '';
  activeWorkspaceId = workspace?.id || null;
  activeScenarioId = workspace?.activeScenarioId || workspace?.scenarios?.[0]?.id || null;
  portfolioPositions = Array.isArray(workspace?.positions) ? workspace.positions : [];
  portfolioScenarios = Array.isArray(workspace?.scenarios) ? workspace.scenarios : [];
  decisionScenarioCases = Array.isArray(workspace?.decisionCases) && workspace.decisionCases.length ? workspace.decisionCases : decisionScenarioCases;
  researchMemos = Array.isArray(workspace?.researchMemos) ? workspace.researchMemos : [];
  localAlertRules = Array.isArray(workspace?.watchRules) ? workspace.watchRules : localAlertRules;
  lastOptimizerResult = portfolioScenarios.find(item => item.id === activeScenarioId)?.optimizerResult || null;
  importedTransactions = Array.isArray(workspace?.imports)
    ? workspace.imports.flatMap(item => Array.isArray(item.transactions) ? item.transactions : (item.type ? [item] : []))
    : [];
  importedLots = workspace?.positions?.find(position => position.lots?.length)?.lots || workspace?.lots || [];
  if (importedTransactions.length && window.TaxWorkspace?.buildDepotFromTransactions) {
    lastDepotBuild = window.TaxWorkspace.buildDepotFromTransactions(importedTransactions, { existingPositions: portfolioPositions });
  }
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
    setWorkspaceSyncStatus('Loaded the local workspace copy.', 'local');
    showToast('Workspace loaded');
  } catch(e) {
    setWorkspaceSyncStatus('Local workspace load failed.', 'error');
    showToast('Workspace load failed');
  }
}

async function syncWorkspaceBackend() {
  const token = await getPremiumAuthToken();
  if (!token) {
    saveWorkspaceLocal(true);
    setWorkspaceSyncStatus('Saved locally. Sign in or enter an auth token to sync backend storage.', 'local');
    showToast('Saved locally; sign in for backend sync');
    return;
  }
  if (window.location.protocol === 'file:') {
    setWorkspaceSyncStatus('Backend sync needs Netlify dev or a deployed site.', 'error');
    showToast('Backend sync needs Netlify dev or deploy');
    return;
  }
  const snapshot = buildWorkspaceSnapshot();
  const path = activeWorkspaceId
    ? `/.netlify/functions/workspace?id=${encodeURIComponent(activeWorkspaceId)}`
    : '/.netlify/functions/workspaces';
  if (ui.syncWorkspaceBtn) ui.syncWorkspaceBtn.disabled = true;
  setWorkspaceSyncStatus(activeWorkspaceId ? 'Updating encrypted backend workspace...' : 'Creating encrypted backend workspace...', 'syncing');
  try {
    const response = await fetch(path, {
      method: activeWorkspaceId ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(snapshot)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const message = payload.error?.message || payload.error || 'Backend sync failed';
      setWorkspaceSyncStatus(message, 'error');
      showToast(message);
      return;
    }
    activeWorkspaceId = payload.data?.workspace?.id || payload.workspace?.id || activeWorkspaceId;
    const updatedAt = payload.data?.workspace?.updatedAt || payload.workspace?.updatedAt || new Date().toISOString();
    setWorkspaceSyncStatus(`Synced backend workspace ${activeWorkspaceId || ''} at ${new Date(updatedAt).toLocaleTimeString('de-DE')}.`, 'synced');
    showToast('Workspace synced');
  } catch (error) {
    setWorkspaceSyncStatus(error.message || 'Backend sync failed.', 'error');
    showToast('Backend sync failed');
  } finally {
    if (ui.syncWorkspaceBtn) ui.syncWorkspaceBtn.disabled = false;
  }
}

function refreshAuthStatus() {
  if (!ui.authStatusBtn) return;
  const user = window.netlifyIdentity?.currentUser?.();
  ui.authStatusBtn.textContent = user ? 'Signed in' : 'Sign in';
  ui.authStatusBtn.classList.toggle('is-active', !!user);
  if (user) setWorkspaceSyncStatus('Signed in. Backend sync is available.', 'synced');
}

function loadNetlifyIdentityWidget() {
  if (window.netlifyIdentity) return Promise.resolve(window.netlifyIdentity);
  if (identityLoadPromise) return identityLoadPromise;
  identityLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
    script.async = true;
    script.onload = () => window.netlifyIdentity ? resolve(window.netlifyIdentity) : reject(new Error('Netlify Identity did not initialize.'));
    script.onerror = () => reject(new Error('Netlify Identity is unavailable.'));
    document.head.appendChild(script);
  });
  return identityLoadPromise;
}

async function initializeNetlifyIdentity() {
  const identity = await loadNetlifyIdentityWidget();
  if (!identityInitialized && identity?.on) {
    identity.on('init', refreshAuthStatus);
    identity.on('login', () => { refreshAuthStatus(); identity.close(); });
    identity.on('logout', () => {
      refreshAuthStatus();
      setWorkspaceSyncStatus('Signed out. Workspace changes stay local until synced again.', 'local');
    });
    identity.init();
    identityInitialized = true;
  }
  refreshAuthStatus();
  return identity;
}

async function toggleAuthStatus() {
  try {
    const identity = await initializeNetlifyIdentity();
    if (identity.currentUser()) {
      identity.logout();
      return;
    }
    identity.open('login');
  } catch (error) {
    setWorkspaceSyncStatus(error.message || 'Netlify Identity is unavailable.', 'error');
    showToast('Netlify Identity is unavailable');
    return;
  }
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

const IMPORT_MAPPING_FIELDS = [
  { key: 'tradeDate', label: 'Trade date', required: false },
  { key: 'type', label: 'Type', required: true },
  { key: 'quantity', label: 'Quantity', required: true },
  { key: 'price', label: 'Price', required: false },
  { key: 'grossAmount', label: 'Gross amount', required: false },
  { key: 'fees', label: 'Fees', required: false },
  { key: 'currency', label: 'Currency', required: false },
  { key: 'symbol', label: 'Symbol', required: false },
  { key: 'isin', label: 'ISIN', required: false },
  { key: 'name', label: 'Name', required: false }
];

function hasImportBlockingErrors(preview) {
  return (preview?.transactions || []).some(tx => (tx.errors || []).length);
}

function collectImportTransactionMessages(preview) {
  return (preview?.transactions || []).flatMap((tx) => [
    ...(tx.errors || []).map(message => `Row ${tx.sourceRow || '?'}: ${message}`),
    ...(tx.warnings || []).map(message => `Row ${tx.sourceRow || '?'}: ${message}`)
  ]);
}

function updateImportFileLabels(file = null) {
  const text = file?.name || 'No file selected';
  if (ui.depotImportFileName) ui.depotImportFileName.textContent = text;
  if (ui.brokerImportFileName) ui.brokerImportFileName.textContent = text;
}

function getImportPreviewStats(preview) {
  const transactions = preview?.transactions || [];
  const groups = window.TaxWorkspace?.groupImportTransactions
    ? window.TaxWorkspace.groupImportTransactions(transactions)
    : [];
  const accounts = new Set(groups.map(group => [group.broker, group.accountId || 'default'].join('|')));
  return {
    instruments: groups.length || (preview?.symbols || []).length,
    accounts: accounts.size,
    transactions: transactions.length
  };
}

function getImportMappingFromForm(form) {
  return [...form.querySelectorAll('[data-import-mapping-field]')].reduce((mapping, select) => {
    if (select.value) mapping[select.dataset.importMappingField] = select.value;
    return mapping;
  }, {});
}

function reparseCsvImportWithMapping(form) {
  if (!pendingImportText || !pendingImportMeta) return;
  const mapping = getImportMappingFromForm(form);
  pendingImportPreview = window.TaxWorkspace.parseBrokerCsv(pendingImportText, {
    ...pendingImportMeta,
    mapping
  });
  renderImportPreview(pendingImportPreview);
}

function renderImportMapping(preview) {
  const headers = Array.isArray(preview?.headers) ? preview.headers : [];
  if (!headers.length || !pendingImportText) return null;
  const form = document.createElement('form');
  form.className = 'import-mapping';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    reparseCsvImportWithMapping(form);
  });

  const heading = document.createElement('div');
  heading.className = 'import-mapping__heading';
  const title = document.createElement('strong');
  title.textContent = preview.mappingRequired ? 'Map CSV columns' : 'Review CSV mapping';
  const hint = document.createElement('span');
  hint.textContent = preview.requiredFieldsMissing?.length
    ? `Missing: ${preview.requiredFieldsMissing.join(', ')}`
    : 'Detected columns can be adjusted before using FIFO lots.';
  heading.append(title, hint);
  form.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'import-mapping__grid';
  const fieldMapping = preview.fieldMapping || {};
  IMPORT_MAPPING_FIELDS.forEach((field) => {
    const label = document.createElement('label');
    label.className = 'import-mapping__field';
    const text = document.createElement('span');
    text.textContent = field.required ? `${field.label} *` : field.label;
    const select = document.createElement('select');
    select.dataset.importMappingField = field.key;
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Not mapped';
    select.appendChild(empty);
    headers.forEach((header) => {
      const option = document.createElement('option');
      option.value = header;
      option.textContent = header;
      option.selected = fieldMapping[field.key] === header;
      select.appendChild(option);
    });
    label.append(text, select);
    grid.appendChild(label);
  });
  form.appendChild(grid);

  const actions = document.createElement('div');
  actions.className = 'import-mapping__actions';
  const apply = document.createElement('button');
  apply.type = 'submit';
  apply.className = 'ghost-button ghost-button--tight';
  apply.textContent = 'Apply mapping';
  actions.appendChild(apply);
  form.appendChild(actions);
  return form;
}

function renderImportPreview(preview) {
  const targets = [ui.importPreview, ui.depotImportPreview].filter(Boolean);
  if (!targets.length) return;
  if (!preview) {
    targets.forEach((target) => {
      target.hidden = true;
      target.textContent = '';
    });
    [ui.commitImportBtn, ui.depotCommitImportBtn].forEach(button => { if (button) button.disabled = true; });
    if (ui.depotImportStatus) ui.depotImportStatus.textContent = 'No import loaded';
    return;
  }
  targets.forEach((target) => {
    target.hidden = false;
    target.innerHTML = '';
    const stats = getImportPreviewStats(preview);
    const summary = document.createElement('div');
    summary.className = 'import-preview__summary';
    summary.textContent = `${preview.detectedBroker || 'generic-csv'} · ${preview.adapter || 'adapter'} · ${Math.round((preview.confidence || 0) * 100)}% · ${preview.rowCount || 0} rows`;
    target.appendChild(summary);
    if (stats.transactions) {
      const chips = document.createElement('div');
      chips.className = 'import-preview__chips';
      [
        `${stats.transactions} tx`,
        `${stats.instruments} instruments`,
        `${stats.accounts || 1} accounts`
      ].forEach((label) => {
        const chip = document.createElement('span');
        chip.textContent = label;
        chips.appendChild(chip);
      });
      target.appendChild(chips);
    }
    const statusMessages = [
      preview.mappingRequired ? 'Mapping required before commit.' : '',
      preview.reason || '',
      ...(preview.warnings || []),
      ...(preview.errors || []),
      ...collectImportTransactionMessages(preview)
    ].filter(Boolean);
    statusMessages.slice(0, 6).forEach((message) => {
      const row = document.createElement('div');
      row.className = 'import-preview__message';
      row.textContent = message;
      target.appendChild(row);
    });
    const sample = document.createElement('div');
    sample.className = 'import-preview__sample';
    sample.textContent = (preview.transactions || []).slice(0, 3).map(tx => `${tx.tradeDate || 'no date'} ${tx.type} ${tx.quantity || '—'} ${tx.symbol || tx.isin || '—'}`).join(' · ');
    target.appendChild(sample);
    const mapping = renderImportMapping(preview);
    if (mapping) target.appendChild(mapping);
  });
  const disabled = !!(preview.errors || []).length
    || hasImportBlockingErrors(preview)
    || preview.mappingRequired
    || !(preview.transactions || []).length;
  [ui.commitImportBtn, ui.depotCommitImportBtn].forEach(button => { if (button) button.disabled = disabled; });
  const stats = getImportPreviewStats(preview);
  if (ui.depotImportStatus) ui.depotImportStatus.textContent = stats.transactions ? `${stats.transactions} tx · ${stats.instruments} instruments` : `${preview.rowCount || 0} rows ready`;
}

async function parseBrokerImportFile(event) {
  const file = event?.target?.files?.[0] || ui.depotImportFile?.files?.[0] || ui.brokerImportFile?.files?.[0];
  if (!file) return;
  updateImportFileLabels(file);
  pendingImportText = '';
  pendingImportMeta = null;
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
      pendingImportText = String(reader.result || '');
      pendingImportMeta = { fileName: file.name, contentType: file.type || 'text/csv' };
      pendingImportPreview = window.TaxWorkspace.parseBrokerCsv(pendingImportText, pendingImportMeta);
      renderImportPreview(pendingImportPreview);
    } catch(e) {
      pendingImportText = '';
      pendingImportMeta = null;
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

function rebuildDepotPositionsFromTransactions(transactions, importedAt) {
  const manualPositions = portfolioPositions.filter(position => position.source !== 'import' && !position.importedTransactionCount);
  lastDepotBuild = window.TaxWorkspace?.buildDepotFromTransactions
    ? window.TaxWorkspace.buildDepotFromTransactions(transactions, { existingPositions: portfolioPositions, importedAt })
    : { positions: [], warnings: [], errors: ['Depot builder is unavailable.'] };
  portfolioPositions = [...manualPositions, ...(lastDepotBuild.positions || [])];
  importedLots = (lastDepotBuild.positions || []).find(position => position.lots?.length)?.lots || [];
  return lastDepotBuild;
}

function commitBrokerImport() {
  if (!pendingImportPreview?.transactions?.length) return;
  if (pendingImportPreview.mappingRequired || hasImportBlockingErrors(pendingImportPreview) || (pendingImportPreview.errors || []).length) {
    renderImportPreview(pendingImportPreview);
    showToast('Resolve import mapping first');
    return;
  }
  const incoming = pendingImportPreview.transactions || [];
  const existingIds = new Set(importedTransactions.map(tx => tx.id).filter(Boolean));
  const deduped = incoming.filter(tx => !tx.id || !existingIds.has(tx.id));
  importedTransactions = importedTransactions.concat(deduped);
  const result = rebuildDepotPositionsFromTransactions(importedTransactions, new Date().toISOString());
  renderImportPreview({
    ...pendingImportPreview,
    warnings: [
      ...(pendingImportPreview.warnings || []),
      `Committed ${deduped.length} transactions into ${(result.positions || []).length} Depot positions.`,
      deduped.length < incoming.length ? `Skipped ${incoming.length - deduped.length} duplicate transactions.` : ''
    ].filter(Boolean),
    errors: result.errors || []
  });
  applyImportedLotsToInputs();
  renderPortfolioWorkspace();
  renderDepotOverview();
  saveWorkspaceLocal(true);
  if (typeof calculate === 'function') calculate();
  queueOptimizerRerun();
}

function clearBrokerImport() {
  pendingImportPreview = null;
  pendingImportText = '';
  pendingImportMeta = null;
  importedTransactions = [];
  importedLots = [];
  lastDepotBuild = null;
  portfolioPositions = portfolioPositions.filter(position => position.source !== 'import' && !position.importedTransactionCount);
  renderImportPreview(null);
  if (ui.brokerImportFile) ui.brokerImportFile.value = '';
  if (ui.depotImportFile) ui.depotImportFile.value = '';
  updateImportFileLabels(null);
  saveWorkspaceLocal(true);
  renderPortfolioWorkspace();
  renderDepotOverview();
  if (typeof calculate === 'function') calculate();
}

function getActiveLotSaleResult(input) {
  if (!window.AppLedger?.calculateFifoSale || !hasCoreInputs(input)) return null;
  const manualLots = (lots || []).map((lot, index) => ({
    id: `manual-${index + 1}`,
    acquiredAt: lot.acquiredAt || '',
    shares: parseLocaleNumber(lot.shares),
    price: parseLocaleNumber(lot.price),
    fees: parseLocaleNumber(lot.fees) || 0,
    currency: lot.currency || input.positionCurrency || input.currencyCode,
    fxRateBuy: parseLocaleNumber(lot.fxRateBuy) || (input.fxMode === 'manual' ? input.fxRateBuy : 1),
    selectedForSale: lot.selectedForSale !== false
  })).filter(lot => Number.isFinite(lot.shares) && lot.shares > 0 && Number.isFinite(lot.price));
  const activeLots = importedLots.length ? importedLots : manualLots;
  if (!activeLots.length) return null;
  const selectedLotIds = ui.saleOrderSelect?.value === 'manual' && !importedLots.length
    ? manualLots.filter(lot => lot.selectedForSale).map(lot => lot.id)
    : undefined;
  return window.AppLedger.calculateFifoSale(activeLots, {
    shares: input.shares * (input.sellFraction || 1),
    price: input.currentPrice,
    fees: input.transactionCost * (input.sellFraction || 1),
    fxRateNow: input.fxMode === 'manual' ? input.fxRateNow : undefined,
    saleOrder: ui.saleOrderSelect?.value || 'fifo',
    selectedLotIds
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
  const importedIdentity = importedTransactions.find(tx => tx?.isin || tx?.symbol || tx?.name) || {};
  const id = selectedInstrument?.isin || importedIdentity.isin || selectedInstrument?.symbol || importedIdentity.symbol || `manual-${Date.now().toString(36)}`;
  return {
    id: String(id).toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || `position-${Date.now().toString(36)}`,
    name: selectedInstrument?.name || importedIdentity.name || importedIdentity.symbol || ui.workspaceName?.value || 'Manual position',
    symbol: selectedInstrument?.symbol || importedIdentity.symbol || '',
    isin: selectedInstrument?.isin || importedIdentity.isin || '',
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
  saveWorkspaceLocal(true);
  queueOptimizerRerun();
}

function clearPortfolioPositions() {
  portfolioPositions = [];
  lastOptimizerResult = null;
  renderPortfolioWorkspace();
  saveWorkspaceLocal(true);
}

function updatePositionTarget(positionId, value) {
  const targetWeight = parseLocaleNumber(value);
  portfolioPositions = portfolioPositions.map(position => position.id === positionId
    ? { ...position, targetWeight: Number.isFinite(targetWeight) ? targetWeight : 0 }
    : position);
  renderPortfolioWorkspace();
  saveWorkspaceLocal(true);
  queueOptimizerRerun(true);
}

function removePortfolioPosition(positionId) {
  portfolioPositions = portfolioPositions.filter(position => position.id !== positionId);
  renderPortfolioWorkspace();
  saveWorkspaceLocal(true);
  queueOptimizerRerun();
}

function renderPortfolioWorkspace() {
  renderPositionsList();
  renderTargetsList();
  renderOptimizerResult(lastOptimizerResult);
  renderScenarios();
  renderDepotOverview();
}

function getCurrentDepotBuild() {
  if (window.TaxWorkspace?.buildDepotFromTransactions && importedTransactions.length) {
    lastDepotBuild = window.TaxWorkspace.buildDepotFromTransactions(importedTransactions, { existingPositions: portfolioPositions });
  }
  return lastDepotBuild || { positions: portfolioPositions.filter(position => position.source === 'import' || position.importedTransactionCount), accounts: [], cashEvents: [], warnings: [], errors: [] };
}

function setDepotEmpty(node, text) {
  if (!node) return;
  node.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'depot-empty';
  empty.innerHTML = `<span>${localEscapeHtml(text)}</span>`;
  node.appendChild(empty);
}

function renderDepotOverview() {
  if (!ui.depotPage) return;
  const depot = getCurrentDepotBuild();
  const positions = portfolioPositions.length ? portfolioPositions : depot.positions || [];
  const importedPositions = positions.filter(position => position.source === 'import' || position.importedTransactionCount);
  const baseCurrency = document.getElementById('currencyCode')?.value || 'EUR';
  const totalValue = positions.reduce((sum, position) => sum + (Number(position.shares) || 0) * (Number(position.currentPrice) || 0) * (Number(position.currentFxRate) || 1), 0);
  const importedValue = importedPositions.reduce((sum, position) => sum + (Number(position.shares) || 0) * (Number(position.currentPrice) || 0) * (Number(position.currentFxRate) || 1), 0);
  const transactionCount = importedTransactions.length || depot.transactionCount || 0;
  if (ui.depotSummary) {
    ui.depotSummary.innerHTML = '';
    [
      ['Positions', String(positions.length), positions.length ? 'Live' : 'Empty'],
      ['Imported value', formatCurrency(importedValue, baseCurrency), importedPositions.length ? 'Imported' : 'Waiting'],
      ['Total value', formatCurrency(totalValue, baseCurrency), positions.length ? 'Current' : 'No holdings'],
      ['Transactions', String(transactionCount), transactionCount ? 'Parsed' : 'None']
    ].forEach(([label, value, meta]) => {
      const item = document.createElement('div');
      item.className = 'depot-summary__item';
      item.innerHTML = `<span>${localEscapeHtml(label)}</span><strong>${localEscapeHtml(value)}</strong><small>${localEscapeHtml(meta)}</small>`;
      ui.depotSummary.appendChild(item);
    });
  }
  if (ui.depotPositionCount) ui.depotPositionCount.textContent = `${positions.length} positions`;
  if (ui.depotPositionsTable) {
    ui.depotPositionsTable.innerHTML = '';
    if (!positions.length) {
      setDepotEmpty(ui.depotPositionsTable, 'No positions yet. Import a broker file or add the current calculator position.');
    } else {
      const head = document.createElement('div');
      head.className = 'depot-row depot-row--head';
      ['Instrument', 'Broker', 'Shares', 'Cost', 'Price', 'Value'].forEach(label => {
        const cell = document.createElement('span');
        cell.textContent = label;
        head.appendChild(cell);
      });
      ui.depotPositionsTable.appendChild(head);
      positions.forEach((position) => {
        const shares = Number(position.shares) || 0;
        const price = Number(position.currentPrice) || 0;
        const fx = Number(position.currentFxRate) || 1;
        const value = shares * price * fx;
        const row = document.createElement('div');
        row.className = 'depot-row';
        [
          `${position.symbol || position.name || position.isin || 'Position'}${position.isin ? ` · ${position.isin}` : ''}`,
          position.broker || 'Manual',
          formatShares(shares),
          formatCurrency(Number(position.buyPrice || 0) * shares, position.currency || baseCurrency),
          formatCurrency(price, position.currency || baseCurrency),
          formatCurrency(value, baseCurrency)
        ].forEach((text, index) => {
          const cell = document.createElement(index === 0 ? 'strong' : 'span');
          cell.dataset.label = ['Instrument', 'Broker', 'Shares', 'Cost', 'Price', 'Value'][index];
          cell.textContent = text;
          row.appendChild(cell);
        });
        ui.depotPositionsTable.appendChild(row);
      });
    }
  }
  const accounts = depot.accounts || [];
  if (ui.depotAccountCount) ui.depotAccountCount.textContent = `${accounts.length} accounts`;
  if (ui.depotAccountList) {
    ui.depotAccountList.innerHTML = '';
    if (!accounts.length) setDepotEmpty(ui.depotAccountList, 'No imported accounts yet.');
    accounts.forEach((account) => {
      const item = document.createElement('div');
      item.className = 'depot-list__item';
      item.innerHTML = `<strong>${localEscapeHtml(account.broker || 'Broker')}</strong><span class="depot-list__meta">${localEscapeHtml(account.accountId || 'default account')} · ${account.positionCount || 0} positions</span>`;
      ui.depotAccountList.appendChild(item);
    });
  }
  const cashEvents = depot.cashEvents || [];
  if (ui.depotCashEventCount) ui.depotCashEventCount.textContent = `${cashEvents.length} events`;
  if (ui.depotCashEventList) {
    ui.depotCashEventList.innerHTML = '';
    if (!cashEvents.length) setDepotEmpty(ui.depotCashEventList, 'No dividends, fees or standalone tax events imported.');
    cashEvents.slice(-8).forEach((tx) => {
      const amount = Number.isFinite(tx.grossAmount) ? tx.grossAmount : 0;
      const item = document.createElement('div');
      item.className = 'depot-list__item';
      item.innerHTML = `<strong>${localEscapeHtml(tx.type || 'Event')} ${localEscapeHtml(tx.symbol || tx.isin || '')}</strong><span class="depot-list__meta">${localEscapeHtml(tx.tradeDate || tx.date || 'no date')} · ${localEscapeHtml(formatCurrency(amount, tx.currency || baseCurrency))}</span>`;
      ui.depotCashEventList.appendChild(item);
    });
  }
  if (ui.depotSourceList) {
    ui.depotSourceList.innerHTML = '';
    const sources = importedTransactions.reduce((map, tx) => {
      const key = [tx.broker || 'generic', tx.accountId || 'default'].join('|');
      map.set(key, { broker: tx.broker || 'generic', accountId: tx.accountId || '', count: (map.get(key)?.count || 0) + 1 });
      return map;
    }, new Map());
    if (!sources.size) {
      [
        ['Generic CSV', 'Ready'],
        ['Trade Republic', 'CSV/PDF'],
        ['Scalable/Baader', 'CSV/PDF'],
        ['IBKR Flex', 'CSV']
      ].forEach(([name, state]) => {
        const item = document.createElement('div');
        item.className = 'depot-list__item depot-list__item--adapter';
        item.innerHTML = `<strong>${localEscapeHtml(name)}</strong><span class="depot-badge">${localEscapeHtml(state)}</span>`;
        ui.depotSourceList.appendChild(item);
      });
    }
    [...sources.values()].forEach((source) => {
      const item = document.createElement('div');
      item.className = 'depot-list__item';
      item.innerHTML = `<strong>${localEscapeHtml(source.broker)}</strong><span class="depot-list__meta">${localEscapeHtml(source.accountId || 'default account')} · ${source.count} transactions</span>`;
      ui.depotSourceList.appendChild(item);
    });
  }
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

function hasOptimizerInputs() {
  return portfolioPositions.length >= 2
    && portfolioPositions.some(position => (Number(position.targetWeight) || 0) > 0);
}

function queueOptimizerRerun(force = false) {
  clearTimeout(optimizerRerunTimer);
  if (!hasOptimizerInputs() || (!force && !lastOptimizerResult)) return;
  optimizerRerunTimer = window.setTimeout(() => runPortfolioOptimizer({ auto: true }), 160);
}

function runPortfolioOptimizer(options = {}) {
  if (!window.TaxWorkspace?.optimizePortfolio) return;
  const auto = options?.auto === true;
  ui.optimizerResult?.classList.add('is-optimizing');
  lastOptimizerResult = window.TaxWorkspace.optimizePortfolio(portfolioPositions, getOptimizerSettings(), {
    taxProfile: typeof getDetailedTaxProfile === 'function' ? getDetailedTaxProfile() : { mode: 'flat' }
  });
  renderOptimizerResult(lastOptimizerResult);
  saveScenario(true);
  ui.optimizerResult?.classList.remove('is-optimizing');
  ui.optimizerResult?.classList.add('is-live-updated');
  window.setTimeout(() => ui.optimizerResult?.classList.remove('is-live-updated'), 1200);
  if (!auto) showToast('Optimizer updated');
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
  saveWorkspaceLocal(silent);
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
  saveWorkspaceLocal(true);
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
    updateCustomSelect(ui.scenarioSelect);
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
    ui.remainingValue.textContent = formatCurrency(output.remainingValue, output.valueCurrency || input.currencyCode);
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
    priorTaxedVorabpauschale: num(ui.priorTaxedVorabpauschale, 0),
    distributionPolicy: ui.distributionPolicy?.value || 'unknown',
    fundDomicile: ui.fundDomicile?.value || '',
    annualDistributionYield: num(ui.annualDistributionYield, 0) / 100,
    withholdingTaxRate: num(ui.withholdingTaxRate, 0) / 100,
    totalExpenseRatio: num(ui.totalExpenseRatio, 0) / 100,
    trackingDifference: num(ui.trackingDifference, 0) / 100,
    currencyExposure: ui.fundCurrencyExposure?.value || '',
    indexMethodology: ui.indexMethodology?.value || ''
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

/* ── Decision Lab ─────────────────────────────────────────────────── */
function localEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setSelectOptions(select, options, selectedValue = '') {
  if (!select) return;
  select.innerHTML = '';
  options.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    option.disabled = Boolean(item.disabled);
    option.selected = item.value === selectedValue && !option.disabled;
    select.appendChild(option);
  });
  if (selectedValue && [...select.options].some(option => option.value === selectedValue && !option.disabled)) {
    select.value = selectedValue;
  } else {
    const firstEnabled = [...select.options].find(option => !option.disabled);
    if (firstEnabled) select.value = firstEnabled.value;
  }
  updateCustomSelect(select);
}

function updateAiModelSelect() {
  const selectedProvider = ui.aiProviderSelect?.value || '';
  const provider = aiProviderCatalog.find(item => item.id === selectedProvider);
  const previous = pendingAiModelSelection || ui.aiModelSelect?.value || '';
  const options = provider?.models?.length
    ? provider.models.map(model => ({ value: model.id, label: model.label || model.id }))
    : [{ value: '', label: selectedProvider ? 'No models available' : 'No AI model', disabled: Boolean(selectedProvider) }];
  setSelectOptions(ui.aiModelSelect, options, previous);
  if (ui.aiModelSelect && (!ui.aiModelSelect.value || ui.aiModelSelect.options[ui.aiModelSelect.selectedIndex]?.disabled)) {
    const firstEnabled = [...ui.aiModelSelect.options].find(option => !option.disabled);
    if (firstEnabled) ui.aiModelSelect.value = firstEnabled.value;
  }
  pendingAiModelSelection = '';
  updateCustomSelect(ui.aiModelSelect);
}

function renderAiProviderOptions() {
  const selected = pendingAiProviderSelection || ui.aiProviderSelect?.value || '';
  const options = [{ value: '', label: 'Evidence only' }].concat(aiProviderCatalog.map(provider => ({
    value: provider.id,
    label: provider.configured && provider.models?.length ? provider.label : `${provider.label} unavailable`,
    disabled: !provider.configured || !provider.models?.length
  })));
  setSelectOptions(ui.aiProviderSelect, options, selected);
  pendingAiProviderSelection = '';
  updateAiModelSelect();
  const configured = aiProviderCatalog.filter(provider => provider.configured && provider.models?.length).length;
  if (ui.aiProviderStatus) {
    ui.aiProviderStatus.textContent = configured
      ? `${configured} AI provider${configured === 1 ? '' : 's'} configured on host.`
      : 'No host AI provider key detected; memos use evidence only.';
  }
}

async function loadAiProviderCatalog() {
  if (!ui.aiProviderSelect || window.location?.protocol === 'file:') {
    renderAiProviderOptions();
    return;
  }
  try {
    const response = await fetch('/.netlify/functions/ai-models');
    const payload = await response.json().catch(() => ({}));
    aiProviderCatalog = Array.isArray(payload.providers) ? payload.providers : [];
    renderAiProviderOptions();
  } catch {
    aiProviderCatalog = [];
    renderAiProviderOptions();
    if (ui.aiProviderStatus) ui.aiProviderStatus.textContent = 'AI provider list is unavailable.';
  }
}

function buildResearchDecisionContext() {
  if (!lastDecisionResult) return null;
  return {
    generatedAt: lastDecisionResult.generatedAt,
    valueCurrency: lastDecisionResult.valueCurrency,
    scenarioAnalysis: lastDecisionResult.scenarioAnalysis,
    assumptionQuality: lastDecisionResult.assumptionQuality,
    riskFlags: lastDecisionResult.riskFlags,
    taxLossHarvesting: lastDecisionResult.taxLossHarvesting,
    portfolioRisk: lastDecisionResult.portfolioRisk,
    tradeScenarios: lastDecisionResult.tradeScenarios
  };
}

function ensureDecisionScenarioCases(input = {}) {
  if (!decisionScenarioCases.length && window.TaxDecision?.defaultScenarioCases) {
    decisionScenarioCases = window.TaxDecision.defaultScenarioCases(input);
  }
  return decisionScenarioCases;
}

function updateDecisionScenarioCase(index, key, value) {
  const current = ensureDecisionScenarioCases();
  const parsed = key === 'name' ? value : parseLocaleNumber(value);
  decisionScenarioCases = current.map((item, i) => {
    if (i !== index) return item;
    if (key === 'probability') return { ...item, probability: Number.isFinite(parsed) ? Math.max(parsed / 100, 0) : 0 };
    if (key === 'targetReachProbability') return { ...item, targetReachProbability: Number.isFinite(parsed) ? Math.min(Math.max(parsed / 100, 0), 1) : 0 };
    if (['oldReturn', 'newReturn', 'oldDividendYield', 'newDividendYield', 'fxReturn'].includes(key)) return { ...item, [key]: Number.isFinite(parsed) ? parsed / 100 : 0 };
    return { ...item, [key]: parsed };
  });
  if (typeof calculate === 'function') calculate();
}

function renderScenarioCaseEditor(input = {}) {
  if (!ui.scenarioCaseEditor) return;
  const cases = ensureDecisionScenarioCases(input);
  ui.scenarioCaseEditor.innerHTML = `
    <div class="scenario-case-row scenario-case-row--head"><span>Case</span><span>Prob.</span><span>Old</span><span>New</span><span>Old div</span><span>New div</span><span>FX</span><span>Target</span></div>
    ${cases.map((item, index) => `
      <div class="scenario-case-row" data-scenario-case="${index}">
        <input type="text" value="${localEscapeHtml(item.name)}" data-scenario-field="name" aria-label="Scenario name">
        <input type="text" inputmode="decimal" value="${formatInputNumber((item.probability || 0) * 100)}" data-scenario-field="probability" aria-label="Scenario probability">
        <input type="text" inputmode="decimal" value="${formatInputNumber((item.oldReturn || 0) * 100)}" data-scenario-field="oldReturn" aria-label="Old stock return">
        <input type="text" inputmode="decimal" value="${formatInputNumber((item.newReturn || 0) * 100)}" data-scenario-field="newReturn" aria-label="New stock return">
        <input type="text" inputmode="decimal" value="${formatInputNumber((item.oldDividendYield || 0) * 100)}" data-scenario-field="oldDividendYield" aria-label="Old dividend yield">
        <input type="text" inputmode="decimal" value="${formatInputNumber((item.newDividendYield || 0) * 100)}" data-scenario-field="newDividendYield" aria-label="New dividend yield">
        <input type="text" inputmode="decimal" value="${formatInputNumber((item.fxReturn || 0) * 100)}" data-scenario-field="fxReturn" aria-label="FX return">
        <input type="text" inputmode="decimal" value="${formatInputNumber((item.targetReachProbability ?? 1) * 100)}" data-scenario-field="targetReachProbability" aria-label="Target reach probability">
      </div>
    `).join('')}
  `;
}

function activateDecisionTab(name) {
  ui.decisionTabs.forEach((tab) => {
    const selected = tab.dataset.decisionTab === name;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  ui.decisionPanels.forEach((panel) => {
    panel.hidden = panel.dataset.decisionPanel !== name;
  });
}

function updateDecisionLab(input, output, switchOutput) {
  if (!window.TaxDecision || !ui.decisionSummary) return;
  if (!hasCoreInputs(input)) {
    ui.decisionSummary.textContent = 'Enter the current position to evaluate decision scenarios.';
    if (ui.decisionScenarioResults) ui.decisionScenarioResults.innerHTML = '';
    if (ui.monteCarloSummary) ui.monteCarloSummary.innerHTML = '';
    return;
  }
  ensureDecisionScenarioCases(input);
  renderScenarioCaseEditor(input);
  lastDecisionResult = window.TaxDecision.calculateDecision(input, output, switchOutput, {
    scenarioCases: decisionScenarioCases,
    hasLots: importedLots.length > 0 || lots.length > 0,
    marketData: pendingPrice || {},
    customScenarioCases: decisionScenarioCases.length > 0
  });
  renderDecisionSummary(lastDecisionResult, input, output);
  renderDecisionTradeScenarios(lastDecisionResult, input);
  renderDecisionRisk(lastDecisionResult);
  renderAssumptionQuality(lastDecisionResult);
  renderWatchSuggestions(lastDecisionResult, input, output);
  renderDecisionReport(lastDecisionResult, input);
}

function renderDecisionSummary(decision, input, output) {
  const cc = decision.valueCurrency || output.valueCurrency || input.currencyCode;
  const margin = decision.scenarioAnalysis.expectedMargin;
  const winner = margin >= 0 ? 'switch scenario leads' : 'hold scenario leads';
  ui.decisionSummary.innerHTML = `
    <div class="decision-summary__item"><span>Expected scenario margin</span><strong class="${margin >= 0 ? 'is-positive' : 'is-negative'}">${localEscapeHtml(signedMoney(margin, cc))}</strong><small>Under your assumptions, ${winner}; this is not a recommendation.</small></div>
    <div class="decision-summary__item"><span>Winner count</span><strong>${decision.scenarioAnalysis.winnerCounts.switch || 0} switch / ${decision.scenarioAnalysis.winnerCounts.hold || 0} hold / ${decision.scenarioAnalysis.winnerCounts.cash || 0} cash</strong><small>Across probability-weighted cases</small></div>
    <div class="decision-summary__item"><span>Main uncertainty</span><strong>${localEscapeHtml(decision.assumptionQuality.find(item => item.confidence === 'low')?.assumption || 'Scenario returns')}</strong><small>Precise tax math still depends on weak forecasts.</small></div>
  `;
}

function renderDecisionTradeScenarios(decision, input) {
  if (!ui.decisionScenarioResults) return;
  const cc = decision.valueCurrency || input.currencyCode;
  ui.decisionScenarioResults.innerHTML = decision.tradeScenarios.map(item => `
    <article class="decision-card">
      <div class="decision-card__header"><span>${localEscapeHtml(item.label)}</span><strong>${localEscapeHtml(Number.isFinite(item.expectedValue) ? formatCurrency(item.expectedValue, cc) : 'Needs input')}</strong></div>
      <div class="decision-card__grid">
        <div><span>Tax now</span><strong>${localEscapeHtml(formatCurrency(item.taxNow, cc))}</strong></div>
        <div><span>Investable</span><strong>${localEscapeHtml(formatCurrency(item.investableCash, cc))}</strong></div>
        <div><span>Required return</span><strong>${localEscapeHtml(formatPercent(item.requiredNewReturn))}</strong></div>
        <div><span>Margin</span><strong>${localEscapeHtml(formatPercent(item.marginVsHurdle))}</strong></div>
      </div>
      <div class="decision-card__notes">${(item.notes || ['Scenario output under your assumptions.']).map(note => `<p>${localEscapeHtml(note)}</p>`).join('')}</div>
    </article>
  `).join('');
  if (ui.monteCarloSummary) {
    const mc = decision.scenarioAnalysis.monteCarlo || {};
    ui.monteCarloSummary.innerHTML = `<span>Monte Carlo (${mc.runs || 0} seeded runs)</span><strong>${localEscapeHtml(formatPercent(mc.switchWinRate))} switch win rate</strong><small>P10 / P50 / P90 margin: ${localEscapeHtml(formatCurrency(mc.p10Margin, cc))} / ${localEscapeHtml(formatCurrency(mc.p50Margin, cc))} / ${localEscapeHtml(formatCurrency(mc.p90Margin, cc))}</small>`;
  }
}

function renderDecisionRisk(decision) {
  if (ui.portfolioRiskMetrics && decision.portfolioRisk) {
    const risk = decision.portfolioRisk;
    ui.portfolioRiskMetrics.innerHTML = `
      <div><span>Current weight</span><strong>${localEscapeHtml(formatPercent(risk.currentWeight))}</strong></div>
      <div><span>After switch</span><strong>${localEscapeHtml(formatPercent(risk.switchWeight))}</strong></div>
      <div><span>Risk-adjusted margin</span><strong>${localEscapeHtml(formatPercent(risk.riskAdjustedMargin))}</strong></div>
      <div><span>Volatility change</span><strong>${localEscapeHtml(formatPercent(risk.portfolioVolatilityChange))}</strong></div>
      <div><span>Drawdown vs tolerance</span><strong>${localEscapeHtml(formatPercent(risk.drawdownVsTolerance))}</strong></div>
      <div><span>Correlation used</span><strong>${localEscapeHtml(formatPercent(risk.correlationToPortfolio))}</strong></div>
    `;
  }
  if (ui.riskFlagList) {
    ui.riskFlagList.innerHTML = decision.riskFlags.length
      ? decision.riskFlags.map(flag => `<div class="risk-flag risk-flag--${localEscapeHtml(flag.severity)}"><span>${localEscapeHtml(flag.category)} · ${localEscapeHtml(flag.severity)}</span><strong>${localEscapeHtml(flag.label)}</strong><small>${localEscapeHtml(flag.message)}</small></div>`).join('')
      : 'No high-signal risk flags from the current inputs.';
  }
  if (ui.riskCatalogList && decision.riskCatalog) {
    ui.riskCatalogList.innerHTML = Object.entries(decision.riskCatalog).map(([category, items]) => `<details><summary>${localEscapeHtml(category)}</summary><p>${localEscapeHtml(items.join(', '))}</p></details>`).join('');
  }
}

function renderAssumptionQuality(decision) {
  if (!ui.assumptionQualityList) return;
  ui.assumptionQualityList.innerHTML = decision.assumptionQuality.map(item => `<div class="assumption-row assumption-row--${localEscapeHtml(item.confidence)}"><span>${localEscapeHtml(item.assumption)}</span><strong>${localEscapeHtml(item.confidence)}</strong><small>${localEscapeHtml(item.reason)}</small></div>`).join('');
}

function renderWatchSuggestions(decision, input, output) {
  if (!ui.decisionWatchSuggestions) return;
  const cc = decision.valueCurrency || input.currencyCode;
  const sw = decision.tradeScenarios.find(item => item.id === 'sell-switch') || {};
  const suggestions = [
    Number.isFinite(input.targetSellPrice) ? `Price reaches ${formatCurrency(input.targetSellPrice, output.positionCurrency || input.currencyCode)}` : '',
    Number.isFinite(output.breakEvenPrice) ? `Rebuy price falls below ${formatCurrency(output.breakEvenPrice, output.positionCurrency || input.currencyCode)}` : '',
    Number.isFinite(sw.requiredNewReturn) ? `Switch hurdle drops below ${formatPercent(sw.requiredNewReturn)}` : '',
    Number.isFinite(output.taxDue) ? `Tax drag exceeds ${formatCurrency(output.taxDue, cc)}` : '',
    Number.isFinite(input.portfolioValue) && input.portfolioValue > 0 ? 'Position weight exceeds target threshold' : ''
  ].filter(Boolean);
  ui.decisionWatchSuggestions.innerHTML = suggestions.map(item => `<div class="watch-suggestion">${localEscapeHtml(item)}</div>`).join('') || 'Add more assumptions to generate watch conditions.';
}

function renderDecisionReport(decision, input) {
  if (!ui.decisionReportOutput || !window.TaxDecision?.serializeDecisionReport) return;
  ui.decisionReportOutput.textContent = JSON.stringify(window.TaxDecision.serializeDecisionReport(decision, input), null, 2);
}

function researchMemoStatusLabel(memo) {
  const status = String(memo?.status || '').toLowerCase();
  if (status === 'rate-limited') return 'Rate limited';
  if (status.includes('+ai')) return 'AI-enhanced memo';
  if (status === 'fallback' || status === 'local') return 'Local evidence memo';
  if (status === 'partial') return 'Partial evidence memo';
  if (status === 'complete') return 'Evidence memo';
  return memo?.status || 'memo';
}

function renderSourceEvidence(ids = []) {
  return ids?.length ? `<small>Cites ${localEscapeHtml(ids.join(', '))}</small>` : '<small>Uncited by source evidence</small>';
}

function renderAiFeatureOutput(memo = {}) {
  const ai = memo.ai || {};
  if (!ai || !Object.keys(ai).length) return '';
  const contradiction = ai.contradictionCheck || {};
  const scenario = ai.scenarioGenerator || {};
  const critic = ai.assumptionCritic || {};
  const narrative = ai.reportNarrative || {};
  const watch = ai.watchRuleGenerator || {};
  const contradictionHtml = (contradiction.summary || contradiction.invalidatingEvidence?.length || contradiction.keyQuestions?.length)
    ? `<article class="ai-feature-panel"><div class="ai-feature-panel__head"><span>Contradiction checker</span></div>${contradiction.summary ? `<p>${localEscapeHtml(contradiction.summary)}</p>` : ''}${contradiction.invalidatingEvidence?.length ? `<strong>Invalidating evidence</strong>${contradiction.invalidatingEvidence.map(item => `<p>${localEscapeHtml(item)}</p>`).join('')}` : ''}${contradiction.keyQuestions?.length ? `<strong>Questions</strong>${contradiction.keyQuestions.map(item => `<p>${localEscapeHtml(item)}</p>`).join('')}` : ''}${renderSourceEvidence(contradiction.sourceEvidenceIds)}</article>`
    : '';
  const scenarioRows = (scenario.cases || []).map(item => `
    <div class="ai-scenario-row">
      <strong>${localEscapeHtml(item.name)}</strong>
      <span>${localEscapeHtml(formatPercent(item.probability))} prob · old ${localEscapeHtml(formatPercent(item.oldReturn))} · new ${localEscapeHtml(formatPercent(item.newReturn))}</span>
      ${item.rationale ? `<small>${localEscapeHtml(item.rationale)}</small>` : ''}
    </div>
  `).join('');
  const scenarioHtml = scenarioRows
    ? `<article class="ai-feature-panel"><div class="ai-feature-panel__head"><span>Scenario generator</span><button type="button" class="ghost-button ghost-button--tight" data-ai-action="apply-scenarios">Apply</button></div>${scenario.summary ? `<p>${localEscapeHtml(scenario.summary)}</p>` : ''}<div class="ai-scenario-list">${scenarioRows}</div></article>`
    : '';
  const driverRows = (critic.drivers || []).map(item => `<div class="ai-driver-row"><strong>${localEscapeHtml(item.assumption)}</strong>${item.impact ? `<span>${localEscapeHtml(item.impact)}</span>` : ''}${item.weakness ? `<small>${localEscapeHtml(item.weakness)}</small>` : ''}${renderSourceEvidence(item.sourceEvidenceIds)}</div>`).join('');
  const criticHtml = (critic.summary || driverRows)
    ? `<article class="ai-feature-panel"><div class="ai-feature-panel__head"><span>Assumption critic</span></div>${critic.summary ? `<p>${localEscapeHtml(critic.summary)}</p>` : ''}${driverRows}</article>`
    : '';
  const narrativeHtml = narrative.memo
    ? `<article class="ai-feature-panel"><div class="ai-feature-panel__head"><span>Report narrative</span></div><strong>${localEscapeHtml(narrative.title || 'AI report narrative')}</strong><p>${localEscapeHtml(narrative.memo)}</p></article>`
    : '';
  const watchRows = (watch.suggestions || []).map(item => `<div class="ai-watch-row"><strong>${localEscapeHtml(item.label)}</strong><span>${localEscapeHtml(item.type)} ${localEscapeHtml(item.direction || 'above')} ${localEscapeHtml(item.threshold)}</span>${item.rationale ? `<small>${localEscapeHtml(item.rationale)}</small>` : ''}${renderSourceEvidence(item.sourceEvidenceIds)}</div>`).join('');
  const watchHtml = watchRows
    ? `<article class="ai-feature-panel"><div class="ai-feature-panel__head"><span>Watch-rule generator</span><button type="button" class="ghost-button ghost-button--tight" data-ai-action="add-watch-rules">Add rules</button></div>${watch.summary ? `<p>${localEscapeHtml(watch.summary)}</p>` : ''}<div class="ai-watch-list">${watchRows}</div></article>`
    : '';
  return `<div class="ai-feature-grid">${contradictionHtml}${scenarioHtml}${criticHtml}${narrativeHtml}${watchHtml}</div>`;
}

function renderResearchMemo(memo) {
  if (!ui.researchMemoOutput) return;
  if (!memo) {
    ui.researchMemoStatus.textContent = 'No memo yet.';
    ui.researchMemoOutput.innerHTML = '';
    return;
  }
  ui.researchMemoStatus.textContent = `${researchMemoStatusLabel(memo)} · ${memo.generatedAt || ''}`;
  const aiPanel = memo.aiSummary
    ? `<article class="ai-memo-panel"><span>AI enhancement</span><strong>${localEscapeHtml([memo.aiProvider, memo.aiModel].filter(Boolean).join(' · ') || 'Configured AI endpoint')}</strong><p>${localEscapeHtml(memo.aiSummary)}</p></article>`
    : '';
  const sections = Object.values(memo.sections || {}).map(section => `<article class="research-section"><strong>${localEscapeHtml(section.title)}</strong>${(section.bullets || []).map(bullet => `<p>${localEscapeHtml(bullet)}</p>`).join('')}</article>`).join('');
  const evidenceRows = (memo.evidence || []).map(item => `<div class="evidence-row"><strong>${localEscapeHtml(item.claim)}</strong><span>${localEscapeHtml(item.evidence)}</span><small>${localEscapeHtml(item.id || '')}${item.id ? ' · ' : ''}${localEscapeHtml(item.sourceName)}${item.sourceDate ? ` · ${localEscapeHtml(item.sourceDate)}` : ''} · ${localEscapeHtml(item.confidence)} · ${localEscapeHtml(item.thesisImpact)}${item.sourceEvidenceIds?.length ? ` · cites ${localEscapeHtml(item.sourceEvidenceIds.join(', '))}` : ''}</small></div>`).join('');
  const sourceErrors = (memo.sourceErrors || []).length
    ? `<div class="research-source-errors">${memo.sourceErrors.map(error => `<span>${localEscapeHtml(error)}</span>`).join('')}</div>`
    : '';
  const aiErrors = (memo.aiErrors || []).length
    ? `<div class="research-source-errors">${memo.aiErrors.map(error => `<span>${localEscapeHtml(error)}</span>`).join('')}</div>`
    : '';
  ui.researchMemoOutput.innerHTML = `${aiPanel}${renderAiFeatureOutput(memo)}${sections}${sourceErrors}${aiErrors}${evidenceRows ? `<div class="evidence-list">${evidenceRows}</div>` : ''}`;
}

async function generateResearchMemo() {
  if (!window.TaxResearch?.generateResearchMemo) return;
  const input = typeof getInputs === 'function' ? getInputs() : {};
  if (ui.generateResearchMemoBtn?.disabled) return;
  if (ui.generateResearchMemoBtn) ui.generateResearchMemoBtn.disabled = true;
  if (ui.researchMemoStatus) ui.researchMemoStatus.textContent = 'Generating memo...';
  try {
    const memo = await window.TaxResearch.generateResearchMemo({
      symbol: selectedInstrument?.symbol || '',
      targetSymbol: selectedTargetInstrument?.symbol || '',
      thesis: ui.researchThesis?.value || '',
      aiProvider: ui.aiProviderSelect?.value || '',
      aiModel: ui.aiModelSelect?.value || '',
      decisionContext: buildResearchDecisionContext(),
      positionCurrency: input.positionCurrency,
      taxCurrency: input.taxCurrency,
      currency: input.currencyCode
    });
    if (!memo.rateLimited) {
      researchMemos = [memo, ...researchMemos].slice(0, 8);
      saveWorkspaceLocal(true);
    }
    renderResearchMemo(memo);
  } finally {
    if (ui.generateResearchMemoBtn) ui.generateResearchMemoBtn.disabled = false;
  }
}

function applyAiScenarioCasesFromMemo(memo = researchMemos[0]) {
  const cases = memo?.ai?.scenarioGenerator?.cases;
  if (!Array.isArray(cases) || !cases.length) {
    showToast('No AI scenarios to apply');
    return;
  }
  decisionScenarioCases = cases.map((item, index) => ({
    id: item.id || `ai-case-${index + 1}`,
    name: item.name || `AI case ${index + 1}`,
    probability: Number.isFinite(Number(item.probability)) ? Number(item.probability) : 0,
    oldReturn: Number.isFinite(Number(item.oldReturn)) ? Number(item.oldReturn) : 0,
    newReturn: Number.isFinite(Number(item.newReturn)) ? Number(item.newReturn) : 0,
    oldDividendYield: Number.isFinite(Number(item.oldDividendYield)) ? Number(item.oldDividendYield) : 0,
    newDividendYield: Number.isFinite(Number(item.newDividendYield)) ? Number(item.newDividendYield) : 0,
    fxReturn: Number.isFinite(Number(item.fxReturn)) ? Number(item.fxReturn) : 0,
    targetReachProbability: Number.isFinite(Number(item.targetReachProbability)) ? Number(item.targetReachProbability) : 0.5
  }));
  saveWorkspaceLocal(true);
  if (typeof calculate === 'function') calculate();
  activateDecisionTab('scenarios');
  showToast('AI scenarios applied');
}

function addAiWatchRulesFromMemo(memo = researchMemos[0]) {
  const suggestions = memo?.ai?.watchRuleGenerator?.suggestions;
  if (!Array.isArray(suggestions) || !suggestions.length) {
    showToast('No AI watch rules to add');
    return;
  }
  const now = Date.now().toString(36);
  const rules = suggestions
    .filter(item => Number.isFinite(Number(item.threshold)))
    .map((item, index) => ({
      id: `ai-${now}-${index + 1}`,
      type: item.type || 'scenario-margin',
      threshold: Number(item.threshold),
      direction: item.direction || 'above',
      enabled: true,
      channel: 'in-app',
      label: item.label || item.type || 'AI watch rule',
      metadata: { rationale: item.rationale || '', sourceEvidenceIds: item.sourceEvidenceIds || [] }
    }));
  if (!rules.length) {
    showToast('No valid AI watch rules');
    return;
  }
  localAlertRules = localAlertRules.concat(rules);
  saveLocalAlerts();
  saveWorkspaceLocal(true);
  if (typeof calculate === 'function') calculate();
  activateDecisionTab('alerts');
  showToast('AI watch rules added');
}

function handleAiFeatureAction(event) {
  const action = event.target?.closest('[data-ai-action]')?.dataset.aiAction;
  if (!action) return;
  if (action === 'apply-scenarios') applyAiScenarioCasesFromMemo();
  if (action === 'add-watch-rules') addAiWatchRulesFromMemo();
}

function printDecisionReport() {
  window.print();
}

function buildCurrentAuditReport() {
  const input = typeof getInputs === 'function' ? getInputs() : {};
  const output = hasCoreInputs(input) ? calculateValues(input) : {};
  if (window.TaxWorkspace?.buildAuditReport) {
    return window.TaxWorkspace.buildAuditReport(input, output, {
      marketData: pendingPrice || {},
      switchMarketData: typeof pendingTargetPrice !== 'undefined' ? (pendingTargetPrice || {}) : {},
      marketHistory: typeof assetHistoryData !== 'undefined' ? assetHistoryData : {},
      positions: portfolioPositions,
      optimizerResult: lastOptimizerResult,
      decisionResult: lastDecisionResult,
      researchMemos,
      assumptions: lastDecisionResult?.assumptionQuality || [],
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

function showUpdatePrompt(worker) {
  waitingServiceWorker = worker || waitingServiceWorker;
  if (!ui.updatePrompt) return;
  if (ui.updatePromptText) ui.updatePromptText.textContent = 'A new TaxSwitch version is ready.';
  ui.updatePrompt.hidden = false;
}

function setupServiceWorkerUpdates() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    if (registration.waiting && navigator.serviceWorker.controller) {
      showUpdatePrompt(registration.waiting);
    }
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdatePrompt(worker);
        }
      });
    });
  }).catch(() => null);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (serviceWorkerRefreshing) return;
    serviceWorkerRefreshing = true;
    window.location.reload();
  });

  if (ui.reloadUpdateBtn) {
    ui.reloadUpdateBtn.addEventListener('click', () => {
      if (!waitingServiceWorker) {
        window.location.reload();
        return;
      }
      waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
    });
  }
  if (ui.dismissUpdatePrompt) {
    ui.dismissUpdatePrompt.addEventListener('click', () => {
      if (ui.updatePrompt) ui.updatePrompt.hidden = true;
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
    ['shares','buyPrice','currentPrice','taxRate','transactionCost','rebuyPrice','expectedOldReturn','expectedNewReturn','switchBuyPrice','switchTargetPrice','switchBuyCost','switchHorizonYears','currencyCode','portfolioValue','targetWeight','positionCurrency','taxCurrency','fxRateBuy','fxRateNow','customSellShares','assetTypeFilter','assetCountryFilter','targetAssetTypeFilter','targetAssetCountryFilter','taxProfileMode','filingStatus','saverAllowanceRemaining','churchTaxRate','instrumentTaxClass','stockLossPot','otherLossPot','foreignTaxPaid','foreignTaxCreditable','priorTaxedVorabpauschale','distributionPolicy','fundDomicile','annualDistributionYield','withholdingTaxRate','totalExpenseRatio','trackingDifference','fundCurrencyExposure','indexMethodology','workspaceName','saleOrderSelect','targetSellPrice','targetReachProbability','freshCashAmount','cashReserve','maxTolerableLoss','timeHorizonYears','sectorExposure','countryExposure','currentVolatility','newVolatility','portfolioVolatility','correlationToPortfolio','researchThesis','aiProviderSelect','aiModelSelect'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value) data[id] = el.value;
    });
    data.includeTaxOnNew = document.getElementById('includeTaxOnNew')?.checked;
    data.switchAllowFractional = document.getElementById('switchAllowFractional')?.checked;
    data.sellPct = sellPct;
    data.fxMode = fxMode;
    data.hurdleMode = getHurdleMode();
    data.lots = lots;
    data.decisionScenarioCases = decisionScenarioCases;
    data.researchMemos = researchMemos;
    if (typeof selectedInstrument !== 'undefined' && selectedInstrument) data.selectedInstrument = selectedInstrument;
    if (typeof selectedTargetInstrument !== 'undefined' && selectedTargetInstrument) data.selectedTargetInstrument = selectedTargetInstrument;
    if (typeof pendingPrice !== 'undefined' && pendingPrice) data.pendingPrice = pendingPrice;
    if (typeof pendingTargetPrice !== 'undefined' && pendingTargetPrice) data.pendingTargetPrice = pendingTargetPrice;
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { /* quota exceeded or private browsing */ }
}

function restoreFromLocalStorage() {
  try {
	    const raw = localStorage.getItem(LS_KEY);
	    if (!raw) return false;
	    const data = JSON.parse(raw);
	    pendingAiProviderSelection = data.aiProviderSelect || '';
	    pendingAiModelSelection = data.aiModelSelect || '';
	    ['shares','buyPrice','currentPrice','taxRate','transactionCost','rebuyPrice','expectedOldReturn','expectedNewReturn','switchBuyPrice','switchTargetPrice','switchBuyCost','switchHorizonYears','currencyCode','portfolioValue','targetWeight','positionCurrency','taxCurrency','fxRateBuy','fxRateNow','customSellShares','assetTypeFilter','assetCountryFilter','targetAssetTypeFilter','targetAssetCountryFilter','taxProfileMode','filingStatus','saverAllowanceRemaining','churchTaxRate','instrumentTaxClass','stockLossPot','otherLossPot','foreignTaxPaid','foreignTaxCreditable','priorTaxedVorabpauschale','distributionPolicy','fundDomicile','annualDistributionYield','withholdingTaxRate','totalExpenseRatio','trackingDifference','fundCurrencyExposure','indexMethodology','workspaceName','saleOrderSelect','targetSellPrice','targetReachProbability','freshCashAmount','cashReserve','maxTolerableLoss','timeHorizonYears','sectorExposure','countryExposure','currentVolatility','newVolatility','portfolioVolatility','correlationToPortfolio','researchThesis','aiProviderSelect','aiModelSelect'].forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id]) el.value = data[id];
    });
    if (data.includeTaxOnNew !== undefined) document.getElementById('includeTaxOnNew').checked = data.includeTaxOnNew;
    if (data.switchAllowFractional !== undefined && document.getElementById('switchAllowFractional')) document.getElementById('switchAllowFractional').checked = data.switchAllowFractional;
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
      data.lots.forEach(l => addLot(l));
    }
    if (Array.isArray(data.decisionScenarioCases)) decisionScenarioCases = data.decisionScenarioCases;
    if (Array.isArray(data.researchMemos)) {
      researchMemos = data.researchMemos;
      renderResearchMemo(researchMemos[0]);
    }
    if (data.selectedInstrument && typeof selectInstrument === 'function') {
      selectInstrument(data.selectedInstrument, { skipAutoPrice: true });
    }
    if (data.selectedTargetInstrument && typeof selectTargetInstrument === 'function') {
      selectTargetInstrument(data.selectedTargetInstrument, { skipAutoPrice: true });
    }
    if (data.pendingPrice && typeof pendingPrice !== 'undefined') pendingPrice = data.pendingPrice;
    if (data.pendingPrice && typeof latestQuoteData !== 'undefined') latestQuoteData = data.pendingPrice;
    if (data.pendingTargetPrice && typeof pendingTargetPrice !== 'undefined') pendingTargetPrice = data.pendingTargetPrice;
    if (data.pendingTargetPrice && typeof latestTargetQuoteData !== 'undefined') latestTargetQuoteData = data.pendingTargetPrice;
    restoreLocalAlerts();
    return true;
  } catch(e) { return false; }
}

/* ── Reusable form controls ────────────────────────────────────────── */
let activeCustomSelect = null;

function closeCustomSelect(instance = activeCustomSelect) {
  if (!instance) return;
  instance.root.classList.remove('is-open');
  instance.button.setAttribute('aria-expanded', 'false');
  instance.menu.hidden = true;
  if (activeCustomSelect === instance) activeCustomSelect = null;
}

function getSelectLabel(select) {
  const option = select.options[select.selectedIndex];
  return option?.textContent?.trim() || select.getAttribute('aria-label') || 'Select';
}

function getSelectControlLabel(select) {
  return select.getAttribute('aria-label')
    || select.closest('.field')?.querySelector('span')?.textContent?.trim()
    || 'Select';
}

function updateCustomSelect(select) {
  const instance = select.__taxswitchSelect;
  if (!instance) return;
  const label = getSelectLabel(select);
  instance.value.textContent = label;
  instance.button.setAttribute('aria-label', `${instance.label}: ${label}`);
  instance.menu.innerHTML = '';
  [...select.options].forEach((option, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'custom-select__option';
    item.id = `${instance.id}-option-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(option.selected));
    item.textContent = option.textContent;
    item.disabled = option.disabled;
    item.addEventListener('click', () => {
      select.value = option.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      closeCustomSelect(instance);
      instance.button.focus();
    });
    instance.menu.appendChild(item);
  });
}

function enhanceCustomSelect(select) {
  if (!select || select.__taxswitchSelect || select.closest('.custom-select')) return;
  const id = `custom-${select.id || Math.random().toString(36).slice(2)}`;
  const label = getSelectControlLabel(select);
  const root = document.createElement('div');
  root.className = 'custom-select';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'custom-select__button';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', `${id}-menu`);
  const value = document.createElement('span');
  value.className = 'custom-select__value';
  const icon = document.createElement('span');
  icon.className = 'custom-select__icon';
  icon.setAttribute('aria-hidden', 'true');
  button.append(value, icon);
  const menu = document.createElement('div');
  menu.id = `${id}-menu`;
  menu.className = 'custom-select__menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', label);
  menu.hidden = true;
  root.append(button, menu);
  select.classList.add('native-select--enhanced');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  select.insertAdjacentElement('afterend', root);
  const instance = { id, label, root, button, value, menu, select };
  select.__taxswitchSelect = instance;
  button.addEventListener('click', () => {
    const isOpen = root.classList.contains('is-open');
    closeCustomSelect();
    if (isOpen || select.disabled) return;
    activeCustomSelect = instance;
    root.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    const selected = menu.querySelector('[aria-selected="true"]');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  });
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCustomSelect(instance);
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      button.click();
      menu.querySelector('[aria-selected="true"], .custom-select__option')?.focus();
    }
  });
  menu.addEventListener('keydown', (event) => {
    const options = [...menu.querySelectorAll('.custom-select__option:not(:disabled)')];
    const index = options.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      closeCustomSelect(instance);
      button.focus();
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown'
        ? options[Math.min(index + 1, options.length - 1)]
        : options[Math.max(index - 1, 0)];
      next?.focus();
    }
  });
  select.addEventListener('input', () => updateCustomSelect(select));
  select.addEventListener('change', () => updateCustomSelect(select));
  updateCustomSelect(select);
}

function enhanceClearableInput(input) {
  const field = input?.closest('.field');
  if (!field || input.__taxswitchInput || input.id === 'instrumentSearch' || input.id === 'targetInstrumentSearch' || input.id === 'currencyCode') return;
  const type = (input.getAttribute('type') || 'text').toLowerCase();
  const hasDecimalKeyboard = input.getAttribute('inputmode') === 'decimal';
  if (!['text', 'search', 'password'].includes(type) || hasDecimalKeyboard) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'field-clear';
  button.setAttribute('aria-label', `Clear ${field.querySelector('span')?.textContent || 'field'}`);
  const icon = document.createElement('span');
  icon.className = 'icon-x';
  icon.setAttribute('aria-hidden', 'true');
  button.appendChild(icon);
  button.addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
  });
  field.appendChild(button);
  input.__taxswitchInput = { button };
  const sync = () => field.classList.toggle('has-value', Boolean(input.value));
  input.addEventListener('input', sync);
  sync();
}

function refreshEnhancedControls() {
  document.querySelectorAll('.field select').forEach(enhanceCustomSelect);
  document.querySelectorAll('.field input').forEach(enhanceClearableInput);
}

document.addEventListener('click', (event) => {
  if (activeCustomSelect && !activeCustomSelect.root.contains(event.target)) closeCustomSelect();
});

/* ── Wire up new event listeners ───────────────────────────────────── */
function wireNewUI() {
  ui.routeButtons.forEach(button => button.addEventListener('click', () => setAppRoute(button.dataset.appRoute)));
  window.addEventListener('hashchange', () => setAppRoute(routeFromHash()));
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
  [ui.positionCurrency, ui.taxCurrency].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', () => {
        inp.value = normalizeCurrencyCode(inp.value);
        if (ui.fxRateNow) ui.fxRateNow.value = '';
        if (typeof calculate === 'function') calculate();
        queueCurrentFxFetch(true);
      });
      inp.addEventListener('blur', () => queueCurrentFxFetch(true));
    }
  });
  // Lots
  if (ui.addLotBtn) ui.addLotBtn.addEventListener('click', () => addLot('', ''));
  if (ui.clearLotsBtn) ui.clearLotsBtn.addEventListener('click', clearLots);
  if (ui.saleOrderSelect) ui.saleOrderSelect.addEventListener('change', () => { if (typeof calculate === 'function') calculate(); });
  // Portfolio
  [ui.portfolioValue, ui.targetWeight, ui.currentVolatility, ui.newVolatility, ui.portfolioVolatility, ui.correlationToPortfolio].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', () => { if (typeof calculate === 'function') calculate(); });
      inp.addEventListener('focus', () => inp.select());
    }
  });
  // Hurdle radios
  ui.hurdleRadios.forEach(r => r.addEventListener('change', () => { hurdleMode = getHurdleMode(); if (typeof calculate === 'function') calculate(); }));
  [ui.taxProfileMode, ui.filingStatus, ui.saverAllowanceRemaining, ui.churchTaxRate, ui.instrumentTaxClass, ui.stockLossPot, ui.otherLossPot, ui.foreignTaxPaid, ui.foreignTaxCreditable, ui.priorTaxedVorabpauschale, ui.distributionPolicy, ui.fundDomicile, ui.annualDistributionYield, ui.withholdingTaxRate, ui.totalExpenseRatio, ui.trackingDifference, ui.fundCurrencyExposure, ui.indexMethodology].forEach(inp => {
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
  [ui.targetSellPrice, ui.targetReachProbability, ui.freshCashAmount, ui.cashReserve, ui.maxTolerableLoss, ui.timeHorizonYears, ui.sectorExposure, ui.countryExposure, ui.researchThesis].forEach(control => {
    if (control) {
      control.addEventListener('input', () => { if (typeof calculate === 'function') calculate(); });
      control.addEventListener('focus', () => control.select?.());
    }
  });
  ui.decisionTabs.forEach(tab => tab.addEventListener('click', () => activateDecisionTab(tab.dataset.decisionTab)));
  if (ui.scenarioCaseEditor) {
    ui.scenarioCaseEditor.addEventListener('change', (event) => {
      const row = event.target.closest('[data-scenario-case]');
      const field = event.target.dataset.scenarioField;
      if (!row || !field) return;
      updateDecisionScenarioCase(Number(row.dataset.scenarioCase), field, event.target.value);
    });
  }
  if (ui.generateResearchMemoBtn) ui.generateResearchMemoBtn.addEventListener('click', generateResearchMemo);
  if (ui.aiProviderSelect) ui.aiProviderSelect.addEventListener('change', () => {
    updateAiModelSelect();
    saveToLocalStorage();
  });
  if (ui.aiModelSelect) ui.aiModelSelect.addEventListener('change', saveToLocalStorage);
  if (ui.researchMemoOutput) ui.researchMemoOutput.addEventListener('click', handleAiFeatureAction);
  if (ui.printDecisionReportBtn) ui.printDecisionReportBtn.addEventListener('click', printDecisionReport);
  ui.workspaceTabs.forEach(tab => tab.addEventListener('click', () => activateWorkspaceTab(tab.dataset.workspaceTab)));
  if (ui.addPositionBtn) ui.addPositionBtn.addEventListener('click', addCurrentPosition);
  if (ui.clearPositionsBtn) ui.clearPositionsBtn.addEventListener('click', clearPortfolioPositions);
  if (ui.runOptimizerBtn) ui.runOptimizerBtn.addEventListener('click', runPortfolioOptimizer);
  [ui.optimizerObjective, ui.optimizerTolerance, ui.optimizerMaxTax, ui.optimizerMaxTurnover, ui.optimizerMinTrade, ui.optimizerAllowBuys, ui.optimizerAllowPartialLots].forEach(control => {
    if (control) {
      control.addEventListener('input', () => queueOptimizerRerun(true));
      control.addEventListener('change', () => queueOptimizerRerun(true));
    }
  });
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
  if (ui.premiumAuthToken) {
    ui.premiumAuthToken.addEventListener('input', () => {
      setWorkspaceSyncStatus(ui.premiumAuthToken.value.trim()
        ? 'Backend token ready. Sync will use token access.'
        : 'Local only. Backend sync needs sign-in or an auth token.',
        ui.premiumAuthToken.value.trim() ? 'synced' : 'local');
    });
  }
  if (ui.saveWorkspaceBtn) ui.saveWorkspaceBtn.addEventListener('click', saveWorkspaceLocal);
  if (ui.loadWorkspaceBtn) ui.loadWorkspaceBtn.addEventListener('click', loadWorkspaceLocal);
  if (ui.syncWorkspaceBtn) ui.syncWorkspaceBtn.addEventListener('click', syncWorkspaceBackend);
  if (ui.depotSaveWorkspaceBtn) ui.depotSaveWorkspaceBtn.addEventListener('click', saveWorkspaceLocal);
  if (ui.depotSyncWorkspaceBtn) ui.depotSyncWorkspaceBtn.addEventListener('click', syncWorkspaceBackend);
  if (ui.brokerImportFile) ui.brokerImportFile.addEventListener('change', parseBrokerImportFile);
  if (ui.depotImportFile) ui.depotImportFile.addEventListener('change', parseBrokerImportFile);
  if (ui.commitImportBtn) ui.commitImportBtn.addEventListener('click', commitBrokerImport);
  if (ui.depotCommitImportBtn) ui.depotCommitImportBtn.addEventListener('click', commitBrokerImport);
  if (ui.clearImportBtn) ui.clearImportBtn.addEventListener('click', clearBrokerImport);
  if (ui.depotClearImportBtn) ui.depotClearImportBtn.addEventListener('click', clearBrokerImport);
  refreshAuthStatus();
  restoreLocalAlerts();
  renderPortfolioWorkspace();
  refreshEnhancedControls();
  loadAiProviderCatalog();
  setAppRoute(routeFromHash());
  // Install prompt
  setupInstallPrompt();
  setupServiceWorkerUpdates();
  // API status check
  checkApiStatus();
}
