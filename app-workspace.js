/* Calculation workspace helpers. Pure JS, browser and Node compatible. */
(function initAppWorkspace(root, factory) {
  const taxApi = root.TaxGermany || (typeof require === 'function' ? require('./tax-germany') : null);
  const ledgerApi = root.AppLedger || (typeof require === 'function' ? require('./app-ledger') : null);
  const api = factory(taxApi, ledgerApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AppWorkspace = api;
  root.TaxWorkspace = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function appWorkspaceFactory(TaxGermany, AppLedger) {
  function finiteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function optimizeSaleForTarget(lots, options) {
    const opts = options || {};
    const price = Math.max(finiteNumber(opts.price, 0), 0);
    const maxShares = AppLedger.sortLotsFifo(lots).reduce((sum, lot) => sum + lot.shares, 0);
    const targetCash = Math.max(finiteNumber(opts.targetCash, 0), 0);
    const targetGrossValue = Math.max(finiteNumber(opts.targetGrossValue, 0), 0);
    const targetShares = Math.max(finiteNumber(opts.targetShares, 0), 0);
    const feeRate = Math.max(finiteNumber(opts.feeRate, 0), 0);
    const fixedFee = Math.max(finiteNumber(opts.fixedFee, 0), 0);

    let low = 0;
    let high = targetShares > 0 ? Math.min(targetShares, maxShares) : maxShares;
    let best = null;

    for (let i = 0; i < 64; i += 1) {
      const shares = (low + high) / 2;
      const gross = shares * price;
      const fees = shares > 0 ? fixedFee + gross * feeRate : 0;
      const result = AppLedger.taxableFifoSale(lots, { shares, price, fees }, opts.taxConfig);
      const cash = result.netProceeds;
      best = { shares, gross, fees, cash, result };

      const target = targetCash || targetGrossValue;
      if (!target || Math.abs(cash - target) < 0.000001) break;
      if (cash < target) low = shares;
      else high = shares;
    }

    if (targetGrossValue > 0 && !targetCash) {
      const shares = Math.min(targetGrossValue / price, maxShares);
      const gross = shares * price;
      const fees = shares > 0 ? fixedFee + gross * feeRate : 0;
      const result = AppLedger.taxableFifoSale(lots, { shares, price, fees }, opts.taxConfig);
      best = { shares, gross, fees, cash: result.netProceeds, result };
    }

    return {
      targetCash,
      targetGrossValue,
      maxShares,
      feasible: !!best && best.shares <= maxShares && (!targetCash || best.cash + 0.01 >= targetCash),
      ...best
    };
  }

  function normalizePosition(position, index = 0) {
    const shares = Math.max(finiteNumber(position.shares, 0), 0);
    const price = Math.max(finiteNumber(position.currentPrice ?? position.price, 0), 0);
    const fxRate = Math.max(finiteNumber(position.currentFxRate ?? position.fxRate, 1), 0) || 1;
    const value = shares * price * fxRate;
    return {
      id: position.id || `position-${index + 1}`,
      name: position.name || position.symbol || `Position ${index + 1}`,
      symbol: String(position.symbol || position.isin || '').toUpperCase(),
      isin: String(position.isin || '').toUpperCase(),
      currency: position.currency || 'EUR',
      shares,
      currentPrice: price,
      currentFxRate: fxRate,
      value,
      targetWeight: Math.max(finiteNumber(position.targetWeight, 0), 0),
      expectedReturn: finiteNumber(position.expectedReturn, 0),
      minTradeValue: Math.max(finiteNumber(position.minTradeValue, 0), 0),
      lots: Array.isArray(position.lots) ? position.lots : []
    };
  }

  function optimizePortfolio(positions = [], settings = {}, context = {}) {
    const opts = {
      objective: settings.objective || 'balanced',
      targetTolerancePct: Math.max(finiteNumber(settings.targetTolerancePct, 2), 0),
      maxTaxDue: Math.max(finiteNumber(settings.maxTaxDue, Infinity), 0),
      maxTurnoverValue: Math.max(finiteNumber(settings.maxTurnoverValue, Infinity), 0),
      allowBuys: settings.allowBuys !== false,
      allowPartialLots: settings.allowPartialLots !== false,
      minTradeValue: Math.max(finiteNumber(settings.minTradeValue, 0), 0),
      taxRate: Math.max(finiteNumber(settings.taxRate ?? context.taxRate, 0), 0),
      fixedCost: Math.max(finiteNumber(settings.fixedCost, 0), 0),
      variableCostPct: Math.max(finiteNumber(settings.variableCostPct, 0), 0)
    };
    const normalized = positions.map(normalizePosition).filter(position => position.value > 0 || position.targetWeight > 0);
    const totalValue = normalized.reduce((sum, position) => sum + position.value, 0);
    const warnings = [];
    if (!normalized.length || totalValue <= 0) {
      return emptyOptimizerResult(warnings.concat('Add positions before running the optimizer.'));
    }

    const targetWeightSum = normalized.reduce((sum, position) => sum + position.targetWeight, 0);
    if (targetWeightSum <= 0) warnings.push('Target weights are empty.');
    if (Math.abs(targetWeightSum - 100) > 0.5) warnings.push(`Target weights total ${targetWeightSum.toFixed(2)}%, not 100%.`);

    const targetScale = targetWeightSum > 0 ? targetWeightSum : 100;
    const before = normalized.map(position => {
      const currentWeight = totalValue > 0 ? (position.value / totalValue) * 100 : 0;
      const targetWeight = position.targetWeight * (100 / targetScale);
      const targetValue = totalValue * targetWeight / 100;
      return {
        ...position,
        currentWeight,
        targetWeight,
        targetValue,
        driftValue: position.value - targetValue,
        driftPct: currentWeight - targetWeight
      };
    });

    const toleranceValue = totalValue * (opts.targetTolerancePct / 100);
    let remainingTaxBudget = opts.maxTaxDue;
    let remainingTurnover = opts.maxTurnoverValue;
    let cashRaised = 0;
    let taxDue = 0;
    let costs = 0;
    const trades = [];

    const sellCandidates = before
      .filter(position => position.driftValue > Math.max(toleranceValue, opts.minTradeValue, position.minTradeValue || 0))
      .map(position => {
        const desiredGross = Math.min(position.driftValue, remainingTurnover);
        const shares = position.currentPrice > 0 ? desiredGross / (position.currentPrice * position.currentFxRate) : 0;
        const lots = position.lots?.length ? position.lots : [{ id: `${position.id}-avg`, shares: position.shares, price: finiteNumber(position.buyPrice, position.currentPrice), acquiredAt: '' }];
        const sale = AppLedger.calculateFifoSale(lots, { shares, price: position.currentPrice, fees: opts.fixedCost + desiredGross * opts.variableCostPct }, { taxRate: opts.taxRate });
        const estimatedTax = Math.max(finiteNumber(sale.taxDue, 0), 0);
        const estimatedCosts = Math.max(finiteNumber(sale.saleFeesAllocated, opts.fixedCost + desiredGross * opts.variableCostPct), 0);
        const lossScore = finiteNumber(sale.rawGain, 0) < 0 ? -1000000 : 0;
        const taxDrag = desiredGross > 0 ? estimatedTax / desiredGross : 0;
        const objectiveBias = opts.objective === 'min-tax' ? taxDrag * 1000 : opts.objective === 'min-drift' ? -Math.abs(position.driftValue) / Math.max(totalValue, 1) : taxDrag * 250 - Math.abs(position.driftValue) / Math.max(totalValue, 1);
        return { position, gross: desiredGross, shares, sale, estimatedTax, estimatedCosts, score: lossScore + objectiveBias };
      })
      .filter(candidate => candidate.gross > 0 && candidate.shares > 0)
      .sort((a, b) => a.score - b.score);

    for (const candidate of sellCandidates) {
      const minimum = Math.max(opts.minTradeValue, candidate.position.minTradeValue || 0);
      if (candidate.gross < minimum) continue;
      if (candidate.estimatedTax > remainingTaxBudget) continue;
      if (candidate.gross > remainingTurnover) continue;
      trades.push({
        id: `trade-${trades.length + 1}`,
        action: 'SELL',
        positionId: candidate.position.id,
        symbol: candidate.position.symbol,
        name: candidate.position.name,
        quantity: candidate.shares,
        grossValue: candidate.gross,
        taxDue: candidate.estimatedTax,
        costs: candidate.estimatedCosts,
        cashImpact: candidate.gross - candidate.estimatedTax - candidate.estimatedCosts,
        reason: candidate.sale.rawGain < 0 ? 'Tax-loss lot reduces drift' : 'Reduces overweight drift',
        lotMatches: candidate.sale.matches || []
      });
      remainingTaxBudget -= candidate.estimatedTax;
      remainingTurnover -= candidate.gross;
      cashRaised += candidate.gross - candidate.estimatedTax - candidate.estimatedCosts;
      taxDue += candidate.estimatedTax;
      costs += candidate.estimatedCosts;
    }

    let cashDeployed = 0;
    if (opts.allowBuys && cashRaised > 0) {
      const underweights = before
        .filter(position => position.driftValue < -Math.max(toleranceValue, opts.minTradeValue, position.minTradeValue || 0))
        .sort((a, b) => Math.abs(b.driftValue) - Math.abs(a.driftValue));
      for (const position of underweights) {
        if (cashRaised - cashDeployed <= 0) break;
        const buyValue = Math.min(Math.abs(position.driftValue), cashRaised - cashDeployed, remainingTurnover);
        const minimum = Math.max(opts.minTradeValue, position.minTradeValue || 0);
        if (buyValue < minimum) continue;
        const quantity = position.currentPrice > 0 ? buyValue / (position.currentPrice * position.currentFxRate) : 0;
        trades.push({
          id: `trade-${trades.length + 1}`,
          action: 'BUY',
          positionId: position.id,
          symbol: position.symbol,
          name: position.name,
          quantity,
          grossValue: buyValue,
          taxDue: 0,
          costs: 0,
          cashImpact: -buyValue,
          reason: 'Allocates after-tax cash to underweight target'
        });
        cashDeployed += buyValue;
        remainingTurnover -= buyValue;
      }
    }

    const afterValues = new Map(before.map(position => [position.id, position.value]));
    for (const trade of trades) {
      const current = afterValues.get(trade.positionId) || 0;
      afterValues.set(trade.positionId, current + (trade.action === 'BUY' ? trade.grossValue : -trade.grossValue));
    }
    const afterTotal = [...afterValues.values()].reduce((sum, value) => sum + value, 0) + Math.max(cashRaised - cashDeployed, 0);
    const after = before.map(position => {
      const value = Math.max(afterValues.get(position.id) || 0, 0);
      const currentWeight = afterTotal > 0 ? (value / afterTotal) * 100 : 0;
      return {
        positionId: position.id,
        symbol: position.symbol,
        name: position.name,
        value,
        currentWeight,
        targetWeight: position.targetWeight,
        driftPct: currentWeight - position.targetWeight
      };
    });

    const trackingErrorBefore = Math.sqrt(before.reduce((sum, position) => sum + Math.pow(position.driftPct, 2), 0));
    const trackingErrorAfter = Math.sqrt(after.reduce((sum, position) => sum + Math.pow(position.driftPct, 2), 0));
    if (!trades.length) warnings.push('No trades satisfy the current tolerance and budget constraints.');

    return {
      trades,
      before: before.map(position => ({
        positionId: position.id,
        symbol: position.symbol,
        name: position.name,
        value: position.value,
        currentWeight: position.currentWeight,
        targetWeight: position.targetWeight,
        driftPct: position.driftPct
      })),
      after,
      taxDue,
      costs,
      cashRaised,
      cashDeployed,
      trackingErrorBefore,
      trackingErrorAfter,
      warnings
    };
  }

  function emptyOptimizerResult(warnings = []) {
    return {
      trades: [],
      before: [],
      after: [],
      taxDue: 0,
      costs: 0,
      cashRaised: 0,
      cashDeployed: 0,
      trackingErrorBefore: 0,
      trackingErrorAfter: 0,
      warnings
    };
  }

  function generateTaxReport(saleResult, context) {
    const ctx = context || {};
    const tax = saleResult.tax || TaxGermany.calculateGermanCapitalGainsTax(saleResult.totals.gain, ctx.taxConfig);
    const rows = [
      ['Report', ctx.title || 'German FIFO tax report'],
      ['Currency', ctx.currency || 'EUR'],
      ['Shares sold', saleResult.totals.shares],
      ['Gross proceeds', saleResult.totals.proceeds],
      ['Fees', saleResult.totals.saleFees],
      ['Cost basis', saleResult.totals.costBasis],
      ['Realized gain', saleResult.totals.gain],
      ['Taxable gain', tax.taxableGain],
      ['Capital gains tax', tax.capitalGainsTax],
      ['Solidarity surcharge', tax.solidaritySurcharge],
      ['Church tax', tax.churchTax],
      ['Tax due', tax.taxDue],
      ['Net proceeds', saleResult.netProceeds ?? saleResult.totals.proceeds - saleResult.totals.saleFees - tax.taxDue]
    ];

    return {
      rows,
      csv: rows.map((row) => row.map(csvCell).join(',')).join('\n'),
      totals: { ...saleResult.totals, taxDue: tax.taxDue },
      fills: saleResult.fills.slice()
    };
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function serializeRowsCsv(rows) {
    return rows.map((row) => row.map(csvCell).join(',')).join('\n');
  }

  function createWorkspace(overrides = {}) {
    const now = new Date().toISOString();
    return {
      schemaVersion: 2,
      id: overrides.id || `workspace-${Date.now().toString(36)}`,
      ownerId: overrides.ownerId || null,
      name: overrides.name || 'TaxSwitch Workspace',
      baseCurrency: overrides.baseCurrency || 'EUR',
      taxCurrency: overrides.taxCurrency || 'EUR',
      createdAt: overrides.createdAt || now,
      updatedAt: now,
      taxProfile: overrides.taxProfile || { mode: 'flat' },
      activeScenarioId: overrides.activeScenarioId || overrides.scenarios?.[0]?.id || null,
      positions: overrides.positions || [],
      scenarios: overrides.scenarios || [],
      decisionCases: overrides.decisionCases || [],
      riskProfile: overrides.riskProfile || {},
      researchMemos: overrides.researchMemos || [],
      watchRules: overrides.watchRules || overrides.alerts || [],
      portfolioExposure: overrides.portfolioExposure || {},
      assumptions: overrides.assumptions || {},
      imports: overrides.imports || [],
      alertIds: overrides.alertIds || [],
      reportIds: overrides.reportIds || []
    };
  }

  function buildAuditReport(input = {}, output = {}, metadata = {}) {
    return {
      id: metadata.id || `report-${Date.now().toString(36)}`,
      createdAt: metadata.createdAt || new Date().toISOString(),
      appVersion: metadata.appVersion || '2.0.0',
      calculationVersion: metadata.calculationVersion || 'premium-v1',
      inputs: input,
      marketData: metadata.marketData || {},
      switchMarketData: metadata.switchMarketData || {},
      marketHistory: metadata.marketHistory || {},
      fxData: output.fx || metadata.fxData || {},
      taxProfile: input.taxProfile || {},
      positions: metadata.positions || [],
      decisionResult: metadata.decisionResult || null,
      researchMemos: metadata.researchMemos || [],
      assumptions: metadata.assumptions || {},
      lotsConsumed: output.lotSaleResult?.matches || output.lots || output.matches || [],
      taxBreakdown: output.taxBreakdown || {},
      optimizerResult: metadata.optimizerResult || null,
      formulas: metadata.formulas || [],
      warnings: [...(output.warnings || []), ...(metadata.warnings || [])],
      disclaimers: ['TaxSwitch is a planning tool and is not tax or financial advice.']
    };
  }

  function serializeAuditReportCsv(report) {
    return serializeRowsCsv([
      ['TaxSwitch Audit Report', report.createdAt],
      ['App version', report.appVersion],
      ['Calculation version', report.calculationVersion],
      [],
      ['Inputs'],
      ...Object.entries(report.inputs || {}).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]),
      [],
      ['Tax breakdown'],
      ...Object.entries(report.taxBreakdown || {}).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]),
      [],
      ['Warnings'],
      ...(report.warnings || []).map(warning => [warning]),
      [],
      ['Disclaimer'],
      ...(report.disclaimers || []).map(disclaimer => [disclaimer])
    ]);
  }

  function serializeAuditReportJson(report) {
    return JSON.stringify(report, null, 2);
  }

  function serializeAuditReportHtml(report) {
    const esc = (value) => String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    return `<!doctype html><html><head><meta charset="utf-8"><title>TaxSwitch Audit Report</title></head><body><h1>TaxSwitch Audit Report</h1><p>${esc(report.createdAt)}</p><h2>Inputs</h2><pre>${esc(JSON.stringify(report.inputs, null, 2))}</pre><h2>Tax breakdown</h2><pre>${esc(JSON.stringify(report.taxBreakdown, null, 2))}</pre><h2>Warnings</h2><ul>${(report.warnings || []).map(w => `<li>${esc(w)}</li>`).join('')}</ul><p>${esc((report.disclaimers || [])[0] || '')}</p></body></html>`;
  }

  function parseDelimitedText(text, delimiter) {
    const raw = String(text || '').replace(/^\uFEFF/, '');
    const firstLine = raw.split(/\r?\n/, 1)[0] || '';
    const chosen = delimiter || [';', ',', '\t']
      .map(item => ({ item, count: firstLine.split(item).length - 1 }))
      .sort((a, b) => b.count - a.count)[0].item || ',';
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      const next = raw[i + 1];
      if (quoted) {
        if (ch === '"' && next === '"') {
          cell += '"';
          i += 1;
        } else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === chosen) {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else if (ch !== '\r') cell += ch;
    }
    row.push(cell);
    if (row.length > 1 || row[0]) rows.push(row);
    return rows;
  }

  function normalizeHeader(value) {
    return String(value || '').toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function parseImportNumber(value) {
    const cleaned = String(value || '')
      .trim()
      .replace(/[€$£]/g, '')
      .replace(/\s/g, '')
      .replace(/^\((.*)\)$/, '-$1');
    const comma = cleaned.lastIndexOf(',');
    const dot = cleaned.lastIndexOf('.');
    const normalized = comma > dot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  }

  function simpleHash(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `tx_${(hash >>> 0).toString(16)}`;
  }

  function parseBrokerCsv(text, options = {}) {
    const rows = parseDelimitedText(text, options.delimiter);
    const detection = detectBrokerText(text, options.fileName || '');
    const headers = (rows[0] || []).map(normalizeHeader);
    const objects = rows.slice(1).filter(row => row.some(Boolean)).map((row, index) => {
      const obj = { sourceRow: index + 2 };
      headers.forEach((header, i) => { obj[header] = row[i] || ''; });
      return obj;
    });
    const pick = (row, names) => {
      for (const name of names) {
        const key = normalizeHeader(name);
        if (row[key] !== undefined && row[key] !== '') return row[key];
      }
      return '';
    };
    const mapping = options.mapping || {};
    const transactions = objects.map((row) => {
      const typeRaw = pick(row, [mapping.type, 'type', 'transaction type', 'aktion', 'typ', 'side']);
      const type = /sell|verkauf/i.test(typeRaw) ? 'SELL' : /buy|kauf/i.test(typeRaw) ? 'BUY' : String(typeRaw || 'UNKNOWN').toUpperCase();
      const quantity = parseImportNumber(pick(row, [mapping.quantity, 'quantity', 'shares', 'stück', 'stueck', 'anzahl']));
      const price = parseImportNumber(pick(row, [mapping.price, 'price', 'kurs']));
      const grossAmount = parseImportNumber(pick(row, [mapping.grossAmount, 'amount', 'gross amount', 'betrag', 'total']));
      const tx = {
        id: '',
        sourceRow: row.sourceRow,
        broker: options.broker || detection.broker,
        accountId: options.accountId || '',
        symbol: pick(row, [mapping.symbol, 'symbol', 'ticker', 'wertpapier']),
        isin: pick(row, [mapping.isin, 'isin']),
        name: pick(row, [mapping.name, 'name', 'instrument', 'description']),
        tradeDate: pick(row, [mapping.tradeDate, 'trade date', 'date', 'datum']),
        settlementDate: pick(row, [mapping.settlementDate, 'settlement date', 'valuta']),
        type,
        quantity,
        price,
        grossAmount,
        fees: parseImportNumber(pick(row, [mapping.fees, 'fees', 'fee', 'kosten', 'gebühr'])),
        taxes: parseImportNumber(pick(row, [mapping.taxes, 'tax', 'taxes', 'steuer'])),
        currency: String(pick(row, [mapping.currency, 'currency', 'währung', 'waehrung']) || options.currency || 'EUR').toUpperCase().slice(0, 3),
        warnings: [],
        errors: []
      };
      tx.id = simpleHash([tx.broker, tx.accountId, tx.tradeDate, tx.type, tx.symbol || tx.isin, tx.quantity, tx.grossAmount, tx.sourceRow].join('|'));
      if (!tx.symbol && !tx.isin) tx.warnings.push('Missing symbol/ISIN.');
      if (!Number.isFinite(tx.quantity)) tx.errors.push('Missing quantity.');
      return tx;
    });
    return {
      importId: `local_${Date.now().toString(36)}`,
      detectedBroker: options.broker || detection.broker,
      adapter: detection.adapter,
      confidence: options.broker ? 0.75 : detection.confidence,
      reason: detection.reason,
      mappingRequired: detection.confidence < 0.5,
      rowCount: objects.length,
      transactions,
      symbols: [...new Set(transactions.map(tx => tx.isin || tx.symbol).filter(Boolean))],
      dateRange: {
        from: transactions.map(tx => tx.tradeDate).filter(Boolean).sort()[0] || null,
        to: transactions.map(tx => tx.tradeDate).filter(Boolean).sort().slice(-1)[0] || null
      },
      warnings: [],
      errors: []
    };
  }

  function detectBrokerText(text = '', fileName = '') {
    const sample = `${fileName}\n${String(text).slice(0, 5000)}`.toLowerCase();
    if (/trade\s*republic|traderepublic/.test(sample)) return { broker: 'trade-republic', adapter: 'trade-republic-csv', confidence: 0.9, reason: 'Trade Republic marker found.' };
    if (/scalable\s*capital|baader\s*bank/.test(sample)) return { broker: 'scalable-capital', adapter: 'scalable-csv', confidence: 0.88, reason: 'Scalable Capital/Baader marker found.' };
    if (/interactive\s*brokers|ibkr|flex\s+query/.test(sample)) return { broker: 'interactive-brokers', adapter: 'ibkr-csv', confidence: 0.82, reason: 'Interactive Brokers marker found.' };
    return { broker: 'generic-csv', adapter: 'generic-csv', confidence: 0.45, reason: 'Generic CSV fallback.' };
  }

  function buildAlerts(workspace) {
    const state = workspace || {};
    const alerts = [];
    const lots = AppLedger.sortLotsFifo(state.lots || []);
    const totalShares = lots.reduce((sum, lot) => sum + lot.shares, 0);
    const price = finiteNumber(state.price, NaN);
    const taxConfig = TaxGermany.normalizeTaxConfig(state.taxConfig);
    const saleShares = Math.max(finiteNumber(state.saleShares, 0), 0);

    if (!Number.isFinite(price) || price <= 0) {
      alerts.push({ level: 'error', code: 'missing-price', message: 'Current price is required.' });
    }
    if (saleShares > totalShares + 1e-10) {
      alerts.push({ level: 'error', code: 'oversell', message: 'Sale exceeds available shares.' });
    }
    if (taxConfig.saverAllowanceUsed > taxConfig.saverAllowance) {
      alerts.push({ level: 'warning', code: 'allowance-exhausted', message: 'Saver allowance is already exhausted.' });
    }
    if (taxConfig.churchTaxRate === 0 && state.expectChurchTax) {
      alerts.push({ level: 'warning', code: 'church-tax-disabled', message: 'Church tax is expected but not configured.' });
    }
    if (lots.length > 1 && saleShares > 0) {
      alerts.push({ level: 'info', code: 'fifo-applies', message: 'German tax calculation uses FIFO lot order.' });
    }

    return alerts;
  }

  function evaluateAlertRules(rules, input = {}, output = {}, marketSnapshot = {}) {
    const list = Array.isArray(rules) ? rules : [];
    return list.map((rule) => {
      const threshold = finiteNumber(rule.threshold, NaN);
      let value = NaN;
      if (rule.type === 'tax-due-above') value = finiteNumber(output.taxDue, NaN);
      if (rule.type === 'tax-drag-above') {
        const sellValue = finiteNumber(output.sellValue, 0);
        value = sellValue > 0 ? finiteNumber(output.taxDue, 0) / sellValue : NaN;
      }
      if (rule.type === 'rebuy-break-even-reached' || rule.type === 'rebuy-break-even') {
        value = finiteNumber(input.rebuyPrice, NaN);
        return {
          ...rule,
          lastValue: value,
          triggered: Number.isFinite(value) && Number.isFinite(output.breakEvenPrice) && value <= output.breakEvenPrice
        };
      }
      if (rule.type === 'switch-hurdle-reached' || rule.type === 'switch-hurdle') {
        value = finiteNumber(input.expectedNewReturn, NaN);
        const hurdle = finiteNumber(output.requiredNewReturn, NaN);
        return {
          ...rule,
          lastValue: value,
          triggered: Number.isFinite(value) && Number.isFinite(hurdle) && value >= hurdle
        };
      }
      if (rule.type === 'target-reached') {
        value = finiteNumber(marketSnapshot.price ?? input.currentPrice, NaN);
        const target = finiteNumber(rule.threshold || input.targetSellPrice, NaN);
        return {
          ...rule,
          lastValue: value,
          triggered: Number.isFinite(value) && Number.isFinite(target) && value >= target
        };
      }
      if (rule.type === 'position-weight') {
        const portfolioValue = finiteNumber(input.portfolioValue, NaN);
        value = portfolioValue > 0 ? finiteNumber(output.currentValue, 0) / portfolioValue : NaN;
      }
      if (rule.type === 'scenario-margin') {
        value = finiteNumber(marketSnapshot.scenarioMargin ?? input.scenarioMargin, NaN);
      }
      if (rule.type === 'price-above' || rule.type === 'price-below') {
        value = finiteNumber(marketSnapshot.price ?? input.currentPrice, NaN);
      }

      let triggered = false;
      if (rule.type === 'price-below') triggered = Number.isFinite(value) && Number.isFinite(threshold) && value <= threshold;
      else triggered = Number.isFinite(value) && Number.isFinite(threshold) && value >= threshold;
      return { ...rule, lastValue: value, triggered };
    });
  }

  return {
    createWorkspace,
    optimizeSaleForTarget,
    optimizePortfolio,
    generateTaxReport,
    buildAlerts,
    evaluateAlertRules,
    serializeRowsCsv,
    buildAuditReport,
    serializeAuditReportCsv,
    serializeAuditReportJson,
    serializeAuditReportHtml,
    parseBrokerCsv,
    detectBrokerText,
    parseDelimitedText,
    parseImportNumber
  };
});
