/* FIFO ledger helpers. Pure JS, browser and Node compatible. */
(function initAppLedger(root, factory) {
  const taxApi = root.TaxGermany || (typeof require === 'function' ? require('./tax-germany') : null);
  const api = factory(taxApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AppLedger = api;
  root.TaxLedger = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function appLedgerFactory(TaxGermany) {
  function finiteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeLot(lot, index) {
    const shares = finiteNumber(lot && lot.shares, 0);
    const price = finiteNumber(lot && (lot.price ?? lot.buyPrice ?? lot.costPerShare), 0);
    const fees = finiteNumber(lot && lot.fees, 0);
    const fxRateBuy = finiteNumber(lot && (lot.fxRateBuy ?? lot.buyFxRate ?? lot.fxRate), 1) || 1;
    return {
      id: (lot && lot.id) || `lot-${index + 1}`,
      acquiredAt: (lot && (lot.acquiredAt || lot.date)) || '',
      shares: Math.max(shares, 0),
      price: Math.max(price, 0),
      fees: Math.max(fees, 0),
      currency: (lot && lot.currency) || 'EUR',
      fxRateBuy: Math.max(fxRateBuy, 0),
      meta: (lot && lot.meta) || null
    };
  }

  function sortLotsFifo(lots) {
    return (lots || [])
      .map(normalizeLot)
      .filter((lot) => lot.shares > 0)
      .sort((a, b) => {
        const ad = Date.parse(a.acquiredAt);
        const bd = Date.parse(b.acquiredAt);
        if (Number.isFinite(ad) && Number.isFinite(bd) && ad !== bd) return ad - bd;
        if (Number.isFinite(ad) && !Number.isFinite(bd)) return -1;
        if (!Number.isFinite(ad) && Number.isFinite(bd)) return 1;
        return String(a.id).localeCompare(String(b.id));
      });
  }

  function buildLotsFromTransactions(transactions) {
    const lots = [];
    for (const tx of transactions || []) {
      const type = String(tx.type || tx.side || '').toLowerCase();
      if (type !== 'buy') continue;
      const quantity = tx.shares ?? tx.quantity;
      const price = tx.price ?? (finiteNumber(tx.grossAmount, NaN) && finiteNumber(quantity, 0) > 0
        ? Math.abs(finiteNumber(tx.grossAmount, 0)) / finiteNumber(quantity, 1)
        : undefined);
      lots.push(normalizeLot({
        id: tx.id,
        acquiredAt: tx.date || tx.executedAt || tx.tradeDate || tx.settlementDate,
        shares: quantity,
        price,
        fees: tx.fees,
        currency: tx.currency,
        fxRateBuy: tx.fxRateBuy || tx.fxRate,
        meta: tx
      }, lots.length));
    }
    return sortLotsFifo(lots);
  }

  function buildOpenLotsFromTransactions(transactions) {
    let openLots = [];
    const ordered = (transactions || []).slice().sort((a, b) => {
      const ad = Date.parse(a.tradeDate || a.date || a.executedAt || '');
      const bd = Date.parse(b.tradeDate || b.date || b.executedAt || '');
      if (Number.isFinite(ad) && Number.isFinite(bd) && ad !== bd) return ad - bd;
      if (Number.isFinite(ad) && !Number.isFinite(bd)) return -1;
      if (!Number.isFinite(ad) && Number.isFinite(bd)) return 1;
      return finiteNumber(a.sourceRow, 0) - finiteNumber(b.sourceRow, 0);
    });

    for (const tx of ordered) {
      const type = String(tx.type || tx.side || '').toUpperCase();
      const quantity = Math.abs(finiteNumber(tx.quantity ?? tx.shares, 0));
      if (!quantity) continue;
      if (type === 'BUY' || type === 'TRANSFER_IN') {
        const gross = Math.abs(finiteNumber(tx.grossAmount, 0));
        const price = finiteNumber(tx.price, gross > 0 ? gross / quantity : 0);
        openLots.push(normalizeLot({
          id: tx.id || `tx-${openLots.length + 1}`,
          acquiredAt: tx.tradeDate || tx.date || tx.settlementDate || '',
          shares: quantity,
          price,
          fees: finiteNumber(tx.fees, 0),
          currency: tx.currency,
          fxRateBuy: tx.fxRateBuy || tx.fxRate,
          meta: tx
        }, openLots.length));
      } else if (type === 'SELL' || type === 'TRANSFER_OUT') {
        const price = finiteNumber(tx.price, 0);
        try {
          openLots = fifoSell(openLots, { shares: quantity, price, fees: type === 'SELL' ? finiteNumber(tx.fees, 0) : 0 }).remainingLots;
        } catch {
          return { lots: openLots, errors: [`Imported ${type} exceeds available FIFO lots at row ${tx.sourceRow || tx.id || ''}.`.trim()] };
        }
      } else if (type === 'SPLIT') {
        const ratio = finiteNumber(tx.ratio, 1) || 1;
        openLots = openLots.map((lot) => ({ ...lot, shares: lot.shares * ratio, price: lot.price / ratio }));
      }
    }
    return { lots: sortLotsFifo(openLots), errors: [] };
  }

  function orderLotsForSale(lots, sale = {}) {
    const order = String(sale.saleOrder || sale.order || 'fifo').toLowerCase();
    const sorted = sortLotsFifo(lots);
    const selectedIds = Array.isArray(sale.selectedLotIds || sale.lotIds)
      ? (sale.selectedLotIds || sale.lotIds).map(id => String(id))
      : [];
    if (order === 'manual' || selectedIds.length) {
      const selectedSet = new Set(selectedIds);
      const selected = sorted.filter(lot => selectedSet.has(String(lot.id)));
      if (selectedIds.length) {
        selected.sort((a, b) => selectedIds.indexOf(String(a.id)) - selectedIds.indexOf(String(b.id)));
      }
      return selected;
    }
    if (order === 'highest-cost' || order === 'tax-efficient') {
      return sorted.slice().sort((a, b) => b.price * (b.fxRateBuy || 1) - a.price * (a.fxRateBuy || 1));
    }
    if (order === 'lowest-cost') {
      return sorted.slice().sort((a, b) => a.price * (a.fxRateBuy || 1) - b.price * (b.fxRateBuy || 1));
    }
    return sorted;
  }

  function fifoSell(lots, sale) {
    const orderedLots = orderLotsForSale(lots, sale);
    const sellShares = Math.max(finiteNumber(sale && sale.shares, 0), 0);
    const sellPrice = Math.max(finiteNumber(sale && sale.price, 0), 0);
    const saleFees = Math.max(finiteNumber(sale && sale.fees, 0), 0);
    const saleFxRate = Math.max(finiteNumber(sale && (sale.fxRateNow ?? sale.saleFxRate ?? sale.fxRate), 1), 0) || 1;
    const requestedProceeds = sellShares * sellPrice;
    let remainingToSell = sellShares;
    let remainingFee = saleFees;
    const fills = [];
    const remainingLots = [];

    for (const lot of orderedLots) {
      if (remainingToSell <= 0) {
        remainingLots.push({ ...lot });
        continue;
      }

      const soldShares = Math.min(lot.shares, remainingToSell);
      const shareRatio = lot.shares > 0 ? soldShares / lot.shares : 0;
      const proceeds = soldShares * sellPrice;
      const feeShare = requestedProceeds > 0 ? saleFees * (proceeds / requestedProceeds) : 0;
      remainingFee -= feeShare;
      const costBasis = soldShares * lot.price + lot.fees * shareRatio;
      const lotFxRate = Math.max(finiteNumber(lot.fxRateBuy, 1), 0) || 1;
      const proceedsTaxCurrency = proceeds * saleFxRate;
      const saleFeesTaxCurrency = feeShare * saleFxRate;
      const costBasisTaxCurrency = costBasis * lotFxRate;
      const gain = proceeds - feeShare - costBasis;
      const gainTaxCurrency = proceedsTaxCurrency - saleFeesTaxCurrency - costBasisTaxCurrency;

      fills.push({
        lotId: lot.id,
        acquiredAt: lot.acquiredAt,
        shares: soldShares,
        salePrice: sellPrice,
        proceeds,
        proceedsTaxCurrency,
        saleFees: feeShare,
        saleFeesTaxCurrency,
        costBasis,
        costBasisTaxCurrency,
        gain,
        gainTaxCurrency,
        buyFxRate: lotFxRate,
        saleFxRate
      });

      const sharesLeft = lot.shares - soldShares;
      if (sharesLeft > 0) {
        remainingLots.push({
          ...lot,
          shares: sharesLeft,
          fees: lot.fees * (sharesLeft / lot.shares)
        });
      }
      remainingToSell -= soldShares;
    }

    if (remainingToSell > 1e-10) {
      throw new RangeError(`Cannot sell ${sellShares} shares; only ${sellShares - remainingToSell} available`);
    }

    if (Math.abs(remainingFee) > 1e-8 && fills.length > 0) {
      const last = fills[fills.length - 1];
      last.saleFees += remainingFee;
      last.gain -= remainingFee;
      last.saleFeesTaxCurrency += remainingFee * last.saleFxRate;
      last.gainTaxCurrency -= remainingFee * last.saleFxRate;
    }

    const totals = fills.reduce((acc, fill) => {
      acc.shares += fill.shares;
      acc.proceeds += fill.proceeds;
      acc.proceedsTaxCurrency += fill.proceedsTaxCurrency;
      acc.saleFees += fill.saleFees;
      acc.saleFeesTaxCurrency += fill.saleFeesTaxCurrency;
      acc.costBasis += fill.costBasis;
      acc.costBasisTaxCurrency += fill.costBasisTaxCurrency;
      acc.gain += fill.gain;
      acc.gainTaxCurrency += fill.gainTaxCurrency;
      return acc;
    }, { shares: 0, proceeds: 0, proceedsTaxCurrency: 0, saleFees: 0, saleFeesTaxCurrency: 0, costBasis: 0, costBasisTaxCurrency: 0, gain: 0, gainTaxCurrency: 0 });

    return { fills, remainingLots, totals };
  }

  function taxableFifoSale(lots, sale, taxConfig) {
    const fifo = fifoSell(lots, sale);
    const tax = TaxGermany.calculateGermanCapitalGainsTax(fifo.totals.gain, taxConfig);
    return {
      ...fifo,
      tax,
      netProceeds: fifo.totals.proceeds - fifo.totals.saleFees - tax.taxDue
    };
  }

  function calculateFifoSale(lots, sale, options = {}) {
    try {
      const result = fifoSell(lots, {
        shares: sale.quantity ?? sale.shares,
        price: sale.price ?? sale.currentPrice,
        fees: sale.fees,
        fxRateNow: sale.fxRateNow,
        saleOrder: sale.saleOrder,
        selectedLotIds: sale.selectedLotIds || sale.lotIds
      });
      const taxRate = finiteNumber(options.taxRate, 0);
      const useTaxCurrency = Number.isFinite(Number(sale.fxRateNow)) || result.fills.some(fill => Math.abs(fill.buyFxRate - 1) > 1e-10);
      const rawGain = useTaxCurrency ? result.totals.gainTaxCurrency : result.totals.gain;
      const taxableGain = Math.max(rawGain, 0);
      return {
        soldQuantity: result.totals.shares,
        proceeds: result.totals.proceeds,
        proceedsTaxCurrency: useTaxCurrency ? result.totals.proceedsTaxCurrency : result.totals.proceeds,
        costBasis: useTaxCurrency ? result.totals.costBasisTaxCurrency : result.totals.costBasis,
        costBasisPositionCurrency: result.totals.costBasis,
        taxableGain,
        rawGain,
        rawGainPositionCurrency: result.totals.gain,
        taxDue: taxableGain * taxRate,
        saleFeesAllocated: useTaxCurrency ? result.totals.saleFeesTaxCurrency : result.totals.saleFees,
        saleFeesPositionCurrency: result.totals.saleFees,
        matches: result.fills.map(fill => ({
          lotId: fill.lotId,
          acquiredAt: fill.acquiredAt,
          quantity: fill.shares,
          unitCost: (useTaxCurrency ? fill.costBasisTaxCurrency : fill.costBasis) / Math.max(fill.shares, 1),
          costBasis: useTaxCurrency ? fill.costBasisTaxCurrency : fill.costBasis,
          costBasisPositionCurrency: fill.costBasis,
          proceeds: fill.proceeds,
          proceedsTaxCurrency: fill.proceedsTaxCurrency,
          gain: useTaxCurrency ? fill.gainTaxCurrency : fill.gain,
          gainPositionCurrency: fill.gain,
          buyFxRate: fill.buyFxRate,
          saleFxRate: fill.saleFxRate
        })),
        remainingLots: result.remainingLots,
        warnings: [],
        errors: []
      };
    } catch (error) {
      return { soldQuantity: finiteNumber(sale.quantity ?? sale.shares, 0), errors: [error.message], warnings: [] };
    }
  }

  return {
    normalizeLot,
    sortLotsFifo,
    orderLotsForSale,
    buildLotsFromTransactions,
    buildOpenLotsFromTransactions,
    fifoSell,
    taxableFifoSale,
    calculateFifoSale
  };
});
