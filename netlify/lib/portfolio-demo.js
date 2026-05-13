"use strict";

function money(currency, amount) {
  return { currency, minor: String(Math.round(amount * 100)), scale: 2 };
}

const snapshot = {
  userId: "demo-user",
  baseCurrency: "EUR",
  asOf: "2026-05-12T08:00:00.000Z",
  totalValue: money("EUR", 83642.4),
  investedValue: money("EUR", 63862.4),
  cashValue: money("EUR", 19780),
  unrealizedGain: money("EUR", 15487.4),
  unrealizedGainPct: 32.02,
  estimatedLiquidationTax: money("EUR", 3092.44),
  allocationDriftScore: 39.7,
  concentrationScore: 5.1,
  staleDataCount: 1,
  openIssueCount: 6,
  accounts: [
    { id: "acct-taxable-1", name: "Scalable Taxable", provider: "snaptrade", status: "active", taxTreatment: "taxable_de" },
    { id: "acct-taxable-2", name: "ING ETF Depot", provider: "snaptrade", status: "reconnect_required", taxTreatment: "taxable_de" }
  ],
  brokerConnections: [
    { id: "conn-scalable", provider: "snaptrade", institutionName: "Scalable Capital", status: "active", scopes: ["accounts.read", "holdings.read", "transactions.read"] },
    { id: "conn-ing", provider: "snaptrade", institutionName: "ING", status: "reconnect_required", scopes: ["accounts.read", "holdings.read", "transactions.read"] }
  ],
  positions: [
    { id: "pos-sap", symbol: "SAP.DE", name: "SAP SE", marketValue: money("EUR", 16941.6), costBasis: money("EUR", 11880), estimatedSaleTax: money("EUR", 1171.4), currentWeightPct: 20.25 },
    { id: "pos-aapl", symbol: "AAPL", name: "Apple Inc.", marketValue: money("EUR", 15752), costBasis: money("EUR", 6120), estimatedSaleTax: money("EUR", 2384.6), currentWeightPct: 18.83 },
    { id: "pos-iwda", symbol: "IWDA", name: "iShares Core MSCI World UCITS ETF", marketValue: money("EUR", 22365), costBasis: money("EUR", 21450), estimatedSaleTax: money("EUR", 42.8), currentWeightPct: 26.74 },
    { id: "pos-emim", symbol: "EMIM", name: "iShares Core MSCI Emerging Markets IMI UCITS ETF", marketValue: money("EUR", 9672), costBasis: money("EUR", 0), estimatedSaleTax: money("EUR", 0), currentWeightPct: 11.56 }
  ],
  dataQualityIssues: [
    { id: "reconnect_required-acct-taxable-2", code: "reconnect_required", severity: "critical", title: "Reconnect broker account" },
    { id: "missing_basis-pos-emim", code: "missing_basis", severity: "critical", title: "Missing tax basis" },
    { id: "stale_price-pos-iwda", code: "stale_price", severity: "warning", title: "Price is stale" }
  ]
};

const actionPlan = {
  id: "plan-demo",
  userId: "demo-user",
  generatedAt: snapshot.asOf,
  summary: {
    beforeDriftScore: 39.7,
    afterDriftScore: 21.1,
    beforeEstimatedTax: snapshot.estimatedLiquidationTax,
    afterEstimatedTax: money("EUR", 2692.44),
    expectedTurnover: money("EUR", 15500),
    blockedActionCount: 2
  },
  actions: [
    {
      id: "act-reconnect",
      kind: "refresh_reconnect",
      rank: 1,
      title: "Reconnect broker data before taking portfolio decisions",
      reason: "One account requires renewed consent, so drift and tax rankings may be stale.",
      confidence: 0.96,
      requiredInputs: ["Broker reauthorization"],
      relatedEntityIds: ["acct-taxable-2"],
      userDecision: "blocked"
    },
    {
      id: "act-missing-basis",
      kind: "set_missing_basis",
      rank: 2,
      title: "Set missing tax basis and FIFO lots",
      reason: "One position cannot produce reliable German FIFO tax output.",
      confidence: 0.92,
      requiredInputs: ["Acquisition date", "Quantity", "Unit cost"],
      relatedEntityIds: ["pos-emim"],
      userDecision: "blocked"
    },
    {
      id: "act-rebalance",
      kind: "rebalance",
      rank: 3,
      title: "Generate a constrained rebalance plan",
      reason: "Aggregate absolute drift is above configured tolerance.",
      confidence: 0.82,
      requiredInputs: ["Target allocation", "Max tax", "Max turnover"],
      relatedEntityIds: ["cash", "pos-iwda"],
      userDecision: "review"
    }
  ]
};

module.exports = {
  demoSnapshot: snapshot,
  demoActionPlan: actionPlan
};
