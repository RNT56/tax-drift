/* German capital gains tax helpers. Pure JS, browser and Node compatible. */
(function initTaxGermany(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TaxGermany = api;
  root.GermanTax = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function taxGermanyFactory() {
  const DEFAULT_TAX = Object.freeze({
    capitalGainsTaxRate: 0.25,
    solidaritySurchargeRate: 0.055,
    churchTaxRate: 0,
    saverAllowance: 1000,
    saverAllowanceUsed: 0,
    equityFundPartialExemptionRate: 0,
    carriedForwardLoss: 0,
    withholdingTaxCredit: 0
  });

  const FUND_EXEMPTIONS = Object.freeze({
    stock: 0.30,
    mixed: 0.15,
    realEstateDomestic: 0.60,
    realEstateForeign: 0.80,
    none: 0
  });

  function finiteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeTaxConfig(config) {
    const input = config || {};
    const fundType = input.fundType || input.assetType || 'none';
    const exemption = input.equityFundPartialExemptionRate ?? FUND_EXEMPTIONS[fundType] ?? 0;

    return {
      capitalGainsTaxRate: clamp(finiteNumber(input.capitalGainsTaxRate, DEFAULT_TAX.capitalGainsTaxRate), 0, 1),
      solidaritySurchargeRate: clamp(finiteNumber(input.solidaritySurchargeRate, DEFAULT_TAX.solidaritySurchargeRate), 0, 1),
      churchTaxRate: clamp(finiteNumber(input.churchTaxRate, DEFAULT_TAX.churchTaxRate), 0, 1),
      saverAllowance: Math.max(finiteNumber(input.saverAllowance, DEFAULT_TAX.saverAllowance), 0),
      saverAllowanceUsed: Math.max(finiteNumber(input.saverAllowanceUsed, DEFAULT_TAX.saverAllowanceUsed), 0),
      equityFundPartialExemptionRate: clamp(finiteNumber(exemption, 0), 0, 1),
      carriedForwardLoss: Math.max(finiteNumber(input.carriedForwardLoss, DEFAULT_TAX.carriedForwardLoss), 0),
      withholdingTaxCredit: Math.max(finiteNumber(input.withholdingTaxCredit, DEFAULT_TAX.withholdingTaxCredit), 0)
    };
  }

  function availableAllowance(config) {
    const cfg = normalizeTaxConfig(config);
    return Math.max(cfg.saverAllowance - cfg.saverAllowanceUsed, 0);
  }

  function calculateGermanCapitalGainsTax(gain, config) {
    const cfg = normalizeTaxConfig(config);
    const grossGain = finiteNumber(gain, 0);
    const exemptGain = Math.max(grossGain, 0) * cfg.equityFundPartialExemptionRate;
    const gainAfterExemption = Math.max(grossGain - exemptGain, 0);
    const lossUsed = Math.min(gainAfterExemption, cfg.carriedForwardLoss);
    const gainAfterLoss = gainAfterExemption - lossUsed;
    const allowanceUsed = Math.min(gainAfterLoss, availableAllowance(cfg));
    const taxableGain = Math.max(gainAfterLoss - allowanceUsed, 0);

    const capitalGainsTax = taxableGain * cfg.capitalGainsTaxRate;
    const solidaritySurcharge = capitalGainsTax * cfg.solidaritySurchargeRate;
    const churchTax = taxableGain * cfg.churchTaxRate;
    const grossTax = capitalGainsTax + solidaritySurcharge + churchTax;
    const withholdingTaxCreditUsed = Math.min(grossTax, cfg.withholdingTaxCredit);
    const taxDue = Math.max(grossTax - withholdingTaxCreditUsed, 0);

    return {
      grossGain,
      exemptGain,
      gainAfterExemption,
      lossUsed,
      allowanceUsed,
      taxableGain,
      capitalGainsTax,
      solidaritySurcharge,
      churchTax,
      grossTax,
      withholdingTaxCreditUsed,
      taxDue,
      effectiveTaxRate: grossGain > 0 ? taxDue / grossGain : 0
    };
  }

  function combineTaxResults(results) {
    const totals = {
      grossGain: 0,
      exemptGain: 0,
      gainAfterExemption: 0,
      lossUsed: 0,
      allowanceUsed: 0,
      taxableGain: 0,
      capitalGainsTax: 0,
      solidaritySurcharge: 0,
      churchTax: 0,
      grossTax: 0,
      withholdingTaxCreditUsed: 0,
      taxDue: 0,
      lossesRealized: 0
    };

    for (const result of results || []) {
      for (const key of Object.keys(totals)) totals[key] += finiteNumber(result[key], 0);
      if (finiteNumber(result.grossGain, 0) < 0) totals.lossesRealized += Math.abs(result.grossGain);
    }
    totals.effectiveTaxRate = totals.grossGain > 0 ? totals.taxDue / totals.grossGain : 0;
    return totals;
  }

  function profileToTaxConfig(profile) {
    const p = profile || {};
    const filingStatus = p.filingStatus === 'joint' ? 'joint' : 'single';
    const allowance = filingStatus === 'joint' ? 2000 : 1000;
    const taxClass = p.instrumentTaxClass || 'stock';
    const fundType = {
      'etf-equity': 'stock',
      'etf-mixed': 'mixed',
      'etf-real-estate': 'realEstateDomestic',
      'etf-foreign-real-estate': 'realEstateForeign'
    }[taxClass] || 'none';
    return {
      saverAllowance: allowance,
      saverAllowanceUsed: Math.max(allowance - finiteNumber(p.saverAllowanceRemaining, allowance), 0),
      churchTaxRate: p.churchTaxRate || 0,
      carriedForwardLoss: taxClass === 'stock' ? p.stockLossPot : p.otherLossPot,
      withholdingTaxCredit: p.foreignTaxPaid || p.foreignTaxCreditable || 0,
      fundType
    };
  }

  function normalizeProfile(profile) {
    return {
      mode: profile?.mode || 'flat',
      ...profileToTaxConfig(profile)
    };
  }

  function calculateGermanTax({ grossGain = 0, profile = {} } = {}) {
    const p = profile || {};
    const adjustedGain = finiteNumber(grossGain, 0) - Math.min(Math.max(finiteNumber(grossGain, 0), 0), finiteNumber(p.priorTaxedVorabpauschale, 0));
    const result = calculateGermanCapitalGainsTax(adjustedGain, profileToTaxConfig(p));
    const taxClass = p.instrumentTaxClass || 'stock';
    return {
      grossGain: adjustedGain,
      realizedLoss: adjustedGain < 0 ? Math.abs(adjustedGain) : 0,
      partialExemptionRate: result.grossGain > 0 ? result.exemptGain / result.grossGain : 0,
      exemptAmount: result.exemptGain,
      lossOffsetUsed: result.lossUsed,
      allowanceUsed: result.allowanceUsed,
      foreignTaxCreditUsed: result.withholdingTaxCreditUsed,
      incomeTax: result.capitalGainsTax,
      solidaritySurcharge: result.solidaritySurcharge,
      churchTax: result.churchTax,
      taxableGain: result.taxableGain,
      taxDue: result.taxDue,
      vorabpauschaleGross: 0,
      vorabpauschaleTaxable: 0,
      remainingAllowance: Math.max(finiteNumber(p.saverAllowanceRemaining, 0) - result.allowanceUsed, 0),
      remainingStockLossPot: Math.max(finiteNumber(p.stockLossPot, 0) - (taxClass === 'stock' ? result.lossUsed : 0), 0),
      remainingOtherLossPot: Math.max(finiteNumber(p.otherLossPot, 0) - (taxClass !== 'stock' ? result.lossUsed : 0), 0),
      warnings: []
    };
  }

  function afterGermanTaxFutureValue(cash, grossReturn, profile = {}) {
    const c = finiteNumber(cash, NaN);
    const r = finiteNumber(grossReturn, NaN);
    if (!Number.isFinite(c) || !Number.isFinite(r)) return NaN;
    if (r <= 0) return c * (1 + r);
    const gain = c * r;
    const tax = calculateGermanTax({ grossGain: gain, profile }).taxDue;
    return c + gain - tax;
  }

  function requiredGrossReturnDetailed({ cash, targetValue, profile = {}, min = -0.9999, max = 10 } = {}) {
    if (!Number.isFinite(cash) || cash <= 0 || !Number.isFinite(targetValue)) return NaN;
    let lo = min;
    let hi = max;
    for (let i = 0; i < 80; i += 1) {
      const mid = (lo + hi) / 2;
      if (afterGermanTaxFutureValue(cash, mid, profile) >= targetValue) hi = mid;
      else lo = mid;
    }
    return hi;
  }

  function getPartialExemptionRate(profile = {}) {
    return normalizeTaxConfig(profileToTaxConfig(profile)).equityFundPartialExemptionRate;
  }

  function calculateVorabpauschale(profile = {}, shares = 1) {
    const vorab = profile.vorab || {};
    if (!vorab.enabled) return { gross: 0, taxable: 0, perShare: 0, warnings: [] };
    const basisRate = finiteNumber(vorab.basisRate, vorab.taxYear === 2026 ? 0.032 : 0);
    const startPrice = Math.max(finiteNumber(vorab.startPrice, 0), 0);
    const endPrice = Math.max(finiteNumber(vorab.endPrice, startPrice), 0);
    const distributions = Math.max(finiteNumber(vorab.distributionsPerShare, 0), 0);
    const acquisitionMonth = clamp(Math.trunc(finiteNumber(vorab.acquisitionMonth, 1)), 1, 12);
    const baseReturn = startPrice * 0.70 * basisRate;
    const cap = Math.max(endPrice - startPrice + distributions, 0);
    const perShare = Math.max(Math.min(baseReturn, cap) - distributions, 0);
    const proration = (13 - acquisitionMonth) / 12;
    const gross = perShare * Math.max(finiteNumber(shares, 0), 0) * proration;
    const taxable = gross * (1 - getPartialExemptionRate(profile));
    return { gross, taxable, perShare, proration, basisRate, warnings: basisRate ? [] : ['Missing Vorabpauschale basis rate.'] };
  }

  return {
    DEFAULT_TAX,
    FUND_EXEMPTIONS,
    normalizeTaxConfig,
    normalizeProfile,
    availableAllowance,
    getPartialExemptionRate,
    calculateVorabpauschale,
    calculateGermanCapitalGainsTax,
    calculateGermanTax,
    afterGermanTaxFutureValue,
    requiredGrossReturnDetailed,
    combineTaxResults
  };
});
