"use strict";

function money(currency, amount) {
  return { currency, minor: String(Math.round(Number(amount || 0) * 100)), scale: 2 };
}

function minorToNumber(amount) {
  return Number(amount?.minor || 0) / 10 ** Number(amount?.scale || 2);
}

function zeroImpact(currency) {
  const zero = money(currency, 0);
  return {
    portfolioValueChange: zero,
    estimatedTaxCost: zero,
    turnover: zero,
    driftReductionPct: 0,
    concentrationReductionPct: 0,
    cashChange: zero
  };
}

function baseAction(snapshot, id) {
  return {
    id,
    kind: "do_nothing",
    title: "Hold current plan",
    reason: "Portfolio is within configured drift, tax, cash, and data-quality thresholds.",
    confidence: 0.7,
    impact: zeroImpact(snapshot.baseCurrency),
    requiredInputs: [],
    relatedEntityIds: [],
    userDecision: "ready"
  };
}

function defaultConstraints(currency) {
  return {
    maxTaxCost: money(currency, 2500),
    maxTurnoverPct: 8,
    minTradeValue: money(currency, 750),
    cashReserve: money(currency, 10000),
    taxableAccountsOnly: true
  };
}

function rankActions(actions) {
  const weights = {
    refresh_reconnect: 90,
    set_missing_basis: 80,
    harvest_loss: 65,
    trim_concentration: 60,
    rebalance: 55,
    deploy_cash: 45,
    review_tax_drag: 40,
    do_nothing: 1
  };
  return actions
    .sort((left, right) => weights[right.kind] - weights[left.kind] || right.confidence - left.confidence)
    .map((action, index) => ({ ...action, rank: index + 1 }));
}

function normalizeConstraints(snapshot, constraints) {
  return {
    ...defaultConstraints(snapshot.baseCurrency),
    ...(constraints || {})
  };
}

function generateActionPlan(snapshot, constraints) {
  const normalized = normalizeConstraints(snapshot, constraints);
  const actions = [];
  const currency = snapshot.baseCurrency;
  const zero = money(currency, 0);
  const minTrade = minorToNumber(normalized.minTradeValue);

  const reconnect = snapshot.dataQualityIssues.filter((issue) => issue.code === "reconnect_required");
  if (reconnect.length) {
    actions.push({
      ...baseAction(snapshot, "act-reconnect"),
      kind: "refresh_reconnect",
      title: "Reconnect broker data before taking portfolio decisions",
      reason: `${reconnect.length} account requires renewed consent before decisions are reliable.`,
      confidence: 0.96,
      requiredInputs: ["Broker reauthorization"],
      relatedEntityIds: reconnect.map((issue) => issue.entityId).filter(Boolean),
      userDecision: "blocked"
    });
  }

  const missingBasis = snapshot.dataQualityIssues.filter((issue) => issue.code === "missing_basis");
  if (missingBasis.length) {
    actions.push({
      ...baseAction(snapshot, "act-missing-basis"),
      kind: "set_missing_basis",
      title: "Set missing tax basis and FIFO lots",
      reason: `${missingBasis.length} position cannot support German tax-aware action rankings yet.`,
      confidence: 0.92,
      requiredInputs: ["Acquisition date", "Quantity", "Unit cost", "Source proof"],
      relatedEntityIds: missingBasis.map((issue) => issue.entityId).filter(Boolean),
      userDecision: "blocked"
    });
  }

  const stale = snapshot.dataQualityIssues.filter((issue) => issue.code === "stale_price" || issue.code === "sync_failed");
  if (stale.length) {
    actions.push({
      ...baseAction(snapshot, "act-refresh"),
      kind: "refresh_reconnect",
      title: "Refresh stale data",
      reason: `${stale.length} stale data issue affects totals, drift, or action confidence.`,
      confidence: 0.84,
      requiredInputs: ["Price refresh", "Broker sync"],
      relatedEntityIds: stale.map((issue) => issue.entityId).filter(Boolean),
      userDecision: "review"
    });
  }

  const concentrated = snapshot.positions.filter((item) => item.currentWeightPct > 22);
  for (const item of concentrated) {
    actions.push({
      ...baseAction(snapshot, `act-trim-${item.position.id}`),
      kind: "trim_concentration",
      title: `Trim concentration in ${item.position.symbol}`,
      reason: `${item.position.symbol} is ${item.currentWeightPct.toFixed(1)}% of portfolio value.`,
      confidence: item.position.confidence || 0.8,
      impact: {
        portfolioValueChange: zero,
        estimatedTaxCost: item.estimatedSaleTax,
        turnover: money(currency, minorToNumber(item.marketValue) * 0.18),
        driftReductionPct: Math.max(0, Math.abs(item.driftPct) * 0.45),
        concentrationReductionPct: item.currentWeightPct - 18,
        cashChange: money(currency, minorToNumber(item.marketValue) * 0.18)
      },
      requiredInputs: ["Maximum tax cost", "Minimum sale size", "Destination allocation"],
      relatedEntityIds: [item.position.id],
      userDecision: minorToNumber(item.estimatedSaleTax) > minorToNumber(normalized.maxTaxCost) ? "blocked" : "review"
    });
  }

  if (snapshot.allocationDriftScore > 12) {
    actions.push({
      ...baseAction(snapshot, "act-rebalance"),
      kind: "rebalance",
      title: "Generate a constrained rebalance plan",
      reason: `Aggregate absolute drift is ${snapshot.allocationDriftScore.toFixed(1)} percentage points.`,
      confidence: 0.82,
      impact: {
        portfolioValueChange: zero,
        estimatedTaxCost: money(currency, Math.min(minorToNumber(snapshot.estimatedLiquidationTax), 900)),
        turnover: money(currency, minorToNumber(snapshot.totalValue) * (normalized.maxTurnoverPct / 100)),
        driftReductionPct: Math.min(snapshot.allocationDriftScore, 9),
        concentrationReductionPct: Math.min(snapshot.concentrationScore, 4),
        cashChange: zero
      },
      requiredInputs: ["Target allocation", "Max tax", "Max turnover", "Cash reserve"],
      relatedEntityIds: snapshot.drift.filter((item) => Math.abs(item.driftPct) > 2).map((item) => item.id),
      userDecision: "review"
    });
  }

  const deployableCash = minorToNumber(snapshot.cashValue) - minorToNumber(normalized.cashReserve);
  if (deployableCash >= minTrade) {
    actions.push({
      ...baseAction(snapshot, "act-deploy-cash"),
      kind: "deploy_cash",
      title: "Deploy excess cash into underweight targets",
      reason: `Cash is above the configured reserve by ${deployableCash.toFixed(0)} ${currency}.`,
      confidence: 0.8,
      impact: {
        portfolioValueChange: zero,
        estimatedTaxCost: zero,
        turnover: money(currency, deployableCash),
        driftReductionPct: Math.min(6, snapshot.allocationDriftScore),
        concentrationReductionPct: 0,
        cashChange: money(currency, -deployableCash)
      },
      requiredInputs: ["Cash reserve", "Minimum order size", "Underweight priority"],
      relatedEntityIds: ["cash"],
      userDecision: "review"
    });
  }

  const losses = snapshot.positions.filter((item) => minorToNumber(item.unrealizedGain) <= -minTrade);
  for (const item of losses) {
    actions.push({
      ...baseAction(snapshot, `act-harvest-${item.position.id}`),
      kind: "harvest_loss",
      title: `Review tax-loss harvest for ${item.position.symbol}`,
      reason: `${item.position.symbol} has an unrealized loss that may improve German loss-pot flexibility.`,
      confidence: item.position.confidence || 0.75,
      impact: {
        ...zeroImpact(currency),
        turnover: money(currency, minorToNumber(item.marketValue) * 0.35),
        driftReductionPct: Math.max(0, Math.abs(item.driftPct) * 0.3)
      },
      requiredInputs: ["Replacement instrument", "Loss-pot treatment"],
      relatedEntityIds: [item.position.id],
      userDecision: "review"
    });
  }

  if (!actions.length) actions.push(baseAction(snapshot, "act-hold"));

  const ranked = rankActions(actions);
  const expectedTurnover = ranked.reduce((sum, action) => sum + minorToNumber(action.impact.turnover), 0);
  const driftReduction = ranked.reduce((sum, action) => sum + Number(action.impact.driftReductionPct || 0), 0);

  return {
    id: `plan-${Date.now()}`,
    userId: snapshot.userId,
    generatedAt: new Date().toISOString(),
    constraints: normalized,
    summary: {
      beforeDriftScore: snapshot.allocationDriftScore,
      afterDriftScore: Math.max(0, snapshot.allocationDriftScore - driftReduction),
      beforeEstimatedTax: snapshot.estimatedLiquidationTax,
      afterEstimatedTax: money(currency, Math.max(0, minorToNumber(snapshot.estimatedLiquidationTax) - 400)),
      expectedTurnover: money(currency, expectedTurnover),
      blockedActionCount: ranked.filter((action) => action.userDecision === "blocked").length
    },
    actions: ranked
  };
}

module.exports = {
  generateActionPlan
};
