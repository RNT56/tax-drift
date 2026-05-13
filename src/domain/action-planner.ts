import { minorToNumber, money, multiplyMoney, subtractMoney, zeroMoney } from "./money";
import { emptyImpact } from "./portfolio";
import type {
  ActionItem,
  ActionPlan,
  ActionPlanConstraints,
  MoneyAmount,
  PortfolioSnapshot,
  PositionAnalytics
} from "./types";

function defaultConstraints(baseCurrency: string): ActionPlanConstraints {
  return {
    maxTaxCost: money(baseCurrency, 2_500),
    maxTurnoverPct: 8,
    minTradeValue: money(baseCurrency, 750),
    cashReserve: money(baseCurrency, 10_000),
    taxableAccountsOnly: true
  };
}

function actionBase(snapshot: PortfolioSnapshot, id: string): Omit<ActionItem, "rank"> {
  return {
    id,
    kind: "do_nothing",
    title: "Hold current plan",
    reason: "Portfolio is within configured drift, tax, cash, and data-quality thresholds.",
    confidence: 0.72,
    impact: emptyImpact(snapshot.baseCurrency),
    requiredInputs: [],
    relatedEntityIds: [],
    userDecision: "ready"
  };
}

function turnoverForPosition(item: PositionAnalytics, pctOfPosition: number): MoneyAmount {
  return multiplyMoney(item.marketValue, pctOfPosition);
}

function ranked(actions: Omit<ActionItem, "rank">[]): ActionItem[] {
  return actions
    .sort((left, right) => {
      const severityWeight = {
        refresh_reconnect: 90,
        set_missing_basis: 80,
        harvest_loss: 65,
        trim_concentration: 60,
        rebalance: 55,
        deploy_cash: 45,
        review_tax_drag: 40,
        do_nothing: 1
      };
      return severityWeight[right.kind] - severityWeight[left.kind] || right.confidence - left.confidence;
    })
    .map((action, index) => ({ ...action, rank: index + 1 }));
}

export function generateActionPlan(
  snapshot: PortfolioSnapshot,
  constraints = defaultConstraints(snapshot.baseCurrency)
): ActionPlan {
  const actions: Omit<ActionItem, "rank">[] = [];
  const zero = zeroMoney(snapshot.baseCurrency);
  const minTrade = minorToNumber(constraints.minTradeValue);

  const reconnectIssues = snapshot.dataQualityIssues.filter((issue) => issue.code === "reconnect_required");
  if (reconnectIssues.length) {
    actions.push({
      ...actionBase(snapshot, "act-reconnect"),
      kind: "refresh_reconnect",
      title: "Reconnect broker data before taking portfolio decisions",
      reason: `${reconnectIssues.length} broker account requires renewed consent, so drift and tax rankings may be stale.`,
      confidence: 0.96,
      requiredInputs: ["Broker reauthorization"],
      relatedEntityIds: reconnectIssues.map((issue) => issue.entityId).filter(Boolean) as string[],
      userDecision: "blocked"
    });
  }

  const missingBasis = snapshot.dataQualityIssues.filter((issue) => issue.code === "missing_basis");
  if (missingBasis.length) {
    actions.push({
      ...actionBase(snapshot, "act-missing-basis"),
      kind: "set_missing_basis",
      title: "Set missing tax basis and FIFO lots",
      reason: `${missingBasis.length} position cannot produce reliable liquidation tax, loss-pot, or harvest rankings.`,
      confidence: 0.92,
      requiredInputs: ["Acquisition date", "Quantity", "Unit cost", "Broker/source proof"],
      relatedEntityIds: missingBasis.map((issue) => issue.entityId).filter(Boolean) as string[],
      userDecision: "blocked"
    });
  }

  const stale = snapshot.dataQualityIssues.filter((issue) => issue.code === "stale_price" || issue.code === "sync_failed");
  if (stale.length) {
    actions.push({
      ...actionBase(snapshot, "act-refresh"),
      kind: "refresh_reconnect",
      title: "Refresh stale prices and sync runs",
      reason: `${stale.length} stale data issue affects portfolio totals and action confidence.`,
      confidence: 0.86,
      requiredInputs: ["Price refresh", "Broker sync"],
      relatedEntityIds: stale.map((issue) => issue.entityId).filter(Boolean) as string[],
      userDecision: "review"
    });
  }

  for (const item of snapshot.positions) {
    const loss = Math.min(0, minorToNumber(item.unrealizedGain));
    if (Math.abs(loss) >= minTrade && item.position.instrumentType !== "cash_like") {
      actions.push({
        ...actionBase(snapshot, `act-harvest-${item.position.id}`),
        kind: "harvest_loss",
        title: `Review tax-loss harvest for ${item.position.symbol}`,
        reason: `${item.position.symbol} has an unrealized loss that may improve German loss-pot flexibility.`,
        confidence: item.position.confidence,
        impact: {
          portfolioValueChange: zero,
          estimatedTaxCost: zero,
          turnover: turnoverForPosition(item, 0.35),
          driftReductionPct: Math.max(0, Math.abs(item.driftPct) * 0.3),
          concentrationReductionPct: 0,
          cashChange: zero
        },
        requiredInputs: ["Replacement instrument", "Wash-sale equivalent policy", "Loss-pot treatment"],
        relatedEntityIds: [item.position.id],
        userDecision: "review"
      });
    }
  }

  const concentrated = snapshot.positions.filter((item) => item.currentWeightPct > 22);
  for (const item of concentrated) {
    actions.push({
      ...actionBase(snapshot, `act-trim-${item.position.id}`),
      kind: "trim_concentration",
      title: `Trim concentration in ${item.position.symbol}`,
      reason: `${item.position.symbol} is ${item.currentWeightPct.toFixed(1)}% of portfolio value, above the concentration limit.`,
      confidence: item.position.confidence,
      impact: {
        portfolioValueChange: zero,
        estimatedTaxCost: item.estimatedSaleTax,
        turnover: turnoverForPosition(item, 0.18),
        driftReductionPct: Math.max(0, Math.abs(item.driftPct) * 0.45),
        concentrationReductionPct: item.currentWeightPct - 18,
        cashChange: turnoverForPosition(item, 0.18)
      },
      requiredInputs: ["Maximum tax cost", "Minimum sale size", "Destination allocation"],
      relatedEntityIds: [item.position.id],
      userDecision: minorToNumber(item.estimatedSaleTax) > minorToNumber(constraints.maxTaxCost) ? "blocked" : "review"
    });
  }

  if (snapshot.allocationDriftScore > 12) {
    actions.push({
      ...actionBase(snapshot, "act-rebalance"),
      kind: "rebalance",
      title: "Generate a constrained rebalance plan",
      reason: `Aggregate absolute drift is ${snapshot.allocationDriftScore.toFixed(1)} percentage points.`,
      confidence: 0.82,
      impact: {
        portfolioValueChange: zero,
        estimatedTaxCost: money(snapshot.baseCurrency, Math.min(minorToNumber(snapshot.estimatedLiquidationTax), 900)),
        turnover: multiplyMoney(snapshot.totalValue, constraints.maxTurnoverPct / 100),
        driftReductionPct: Math.min(snapshot.allocationDriftScore, 9),
        concentrationReductionPct: Math.min(snapshot.concentrationScore, 4),
        cashChange: zero
      },
      requiredInputs: ["Target allocation", "Max tax", "Max turnover", "Cash reserve"],
      relatedEntityIds: snapshot.drift.filter((item) => Math.abs(item.driftPct) > 2).map((item) => item.id),
      userDecision: "review"
    });
  }

  const deployableCash = subtractMoney(snapshot.cashValue, constraints.cashReserve);
  if (minorToNumber(deployableCash) >= minTrade) {
    actions.push({
      ...actionBase(snapshot, "act-deploy-cash"),
      kind: "deploy_cash",
      title: "Deploy excess cash into underweight targets",
      reason: `Cash is above the configured reserve by ${minorToNumber(deployableCash).toFixed(0)} ${snapshot.baseCurrency}.`,
      confidence: 0.8,
      impact: {
        portfolioValueChange: zero,
        estimatedTaxCost: zero,
        turnover: deployableCash,
        driftReductionPct: Math.min(6, snapshot.allocationDriftScore),
        concentrationReductionPct: 0,
        cashChange: multiplyMoney(deployableCash, -1)
      },
      requiredInputs: ["Cash reserve", "Minimum order size", "Underweight priority"],
      relatedEntityIds: ["cash"],
      userDecision: "review"
    });
  }

  const taxDrag = snapshot.positions.filter((item) => minorToNumber(item.estimatedSaleTax) / Math.max(1, minorToNumber(item.marketValue)) > 0.04);
  if (taxDrag.length) {
    actions.push({
      ...actionBase(snapshot, "act-tax-drag"),
      kind: "review_tax_drag",
      title: "Review tax drag before selling high-gain positions",
      reason: `${taxDrag.length} position has estimated sale tax above 4% of market value.`,
      confidence: 0.79,
      impact: {
        portfolioValueChange: zero,
        estimatedTaxCost: snapshot.estimatedLiquidationTax,
        turnover: zero,
        driftReductionPct: 0,
        concentrationReductionPct: 0,
        cashChange: zero
      },
      requiredInputs: ["Saver allowance usage", "Loss pots", "Church tax setting", "ETF partial exemption"],
      relatedEntityIds: taxDrag.map((item) => item.position.id),
      userDecision: "review"
    });
  }

  if (!actions.length) {
    actions.push(actionBase(snapshot, "act-hold"));
  }

  const rankedActions = ranked(actions);
  const expectedTurnover = rankedActions.reduce(
    (sum, action) => sum + minorToNumber(action.impact.turnover),
    0
  );
  const blockedActionCount = rankedActions.filter((action) => action.userDecision === "blocked").length;

  return {
    id: `plan-${snapshot.asOf}`,
    userId: snapshot.userId,
    generatedAt: snapshot.asOf,
    constraints,
    summary: {
      beforeDriftScore: snapshot.allocationDriftScore,
      afterDriftScore: Math.max(0, snapshot.allocationDriftScore - rankedActions.reduce((sum, action) => sum + action.impact.driftReductionPct, 0)),
      beforeEstimatedTax: snapshot.estimatedLiquidationTax,
      afterEstimatedTax: money(snapshot.baseCurrency, Math.max(0, minorToNumber(snapshot.estimatedLiquidationTax) - 400)),
      expectedTurnover: money(snapshot.baseCurrency, expectedTurnover),
      blockedActionCount
    },
    actions: rankedActions
  };
}
