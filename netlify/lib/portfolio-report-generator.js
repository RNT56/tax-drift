"use strict";

function minorToNumber(amount) {
  return Number(amount?.minor || 0) / 10 ** Number(amount?.scale || 2);
}

function formatMoney(amount) {
  return `${minorToNumber(amount).toFixed(2)} ${amount?.currency || "EUR"}`;
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function csv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))
  ].join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlTable(rows) {
  if (!rows.length) return "<p>No rows.</p>";
  const headers = Object.keys(rows[0]);
  return [
    "<table>",
    `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>`,
    `<tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody>`,
    "</table>"
  ].join("");
}

function positionRows(snapshot) {
  return (snapshot.positions || []).map((item) => ({
    symbol: item.position?.symbol || item.symbol,
    name: item.position?.name || item.name,
    marketValue: formatMoney(item.marketValue),
    costBasis: formatMoney(item.position?.costBasis || item.costBasis),
    unrealizedGain: formatMoney(item.unrealizedGain),
    estimatedSaleTax: formatMoney(item.estimatedSaleTax),
    currentWeightPct: Number(item.currentWeightPct || 0).toFixed(2),
    driftPct: Number(item.driftPct || 0).toFixed(2)
  }));
}

function actionRows(actionPlan) {
  return (actionPlan.actions || []).map((action) => ({
    rank: action.rank,
    kind: action.kind,
    title: action.title,
    reason: action.reason,
    confidence: Number(action.confidence || 0).toFixed(2),
    decision: action.userDecision,
    requiredInputs: (action.requiredInputs || []).join("; ")
  }));
}

function taxLotRows(snapshot) {
  return (snapshot.positions || []).flatMap((item) => {
    const position = item.position || item;
    return (position.taxLots || []).map((lot) => ({
      symbol: position.symbol,
      lotId: lot.id,
      acquiredAt: lot.acquiredAt,
      quantity: lot.quantity,
      costBasis: formatMoney(lot.costBasis),
      source: lot.source,
      fifoRank: lot.fifoRank,
      partialExemptionPct: lot.germanTax?.partialExemptionPct ?? "",
      lossPot: lot.germanTax?.lossPot ?? ""
    }));
  });
}

function issueRows(snapshot) {
  return (snapshot.dataQualityIssues || []).map((issue) => ({
    severity: issue.severity,
    code: issue.code,
    title: issue.title,
    detail: issue.detail,
    entityType: issue.entityType,
    entityId: issue.entityId || ""
  }));
}

function reportRows(type, snapshot, actionPlan) {
  if (type === "action_plan") return actionRows(actionPlan);
  if (type === "tax_lot_audit") return taxLotRows(snapshot);
  if (type === "import_reconciliation") return issueRows(snapshot);
  return positionRows(snapshot);
}

function titleFor(type) {
  return {
    portfolio_snapshot: "Portfolio Snapshot",
    tax_lot_audit: "Tax-Lot Audit",
    action_plan: "Action Plan",
    import_reconciliation: "Import Reconciliation",
    decision_memo: "Decision Memo"
  }[type] || "Portfolio Report";
}

function memoPayload(snapshot, actionPlan) {
  return {
    generatedAt: new Date().toISOString(),
    portfolio: {
      userId: snapshot.userId,
      totalValue: snapshot.totalValue,
      cashValue: snapshot.cashValue,
      unrealizedGain: snapshot.unrealizedGain,
      estimatedLiquidationTax: snapshot.estimatedLiquidationTax,
      allocationDriftScore: snapshot.allocationDriftScore,
      concentrationScore: snapshot.concentrationScore,
      openIssueCount: snapshot.openIssueCount
    },
    topActions: (actionPlan.actions || []).slice(0, 5),
    dataQualityIssues: snapshot.dataQualityIssues || []
  };
}

function generatePortfolioReport({ type = "portfolio_snapshot", format = "json", snapshot, actionPlan }) {
  const safeType = [
    "portfolio_snapshot",
    "tax_lot_audit",
    "action_plan",
    "import_reconciliation",
    "decision_memo"
  ].includes(type) ? type : "portfolio_snapshot";
  const safeFormat = ["json", "csv", "html"].includes(format) ? format : "json";
  const title = titleFor(safeType);
  const rows = reportRows(safeType, snapshot, actionPlan);
  const generatedAt = new Date().toISOString();

  if (safeFormat === "csv") {
    return {
      type: safeType,
      format: safeFormat,
      title,
      generatedAt,
      contentType: "text/csv; charset=utf-8",
      filename: `${safeType}.csv`,
      content: csv(rows)
    };
  }

  if (safeFormat === "html") {
    const payload = safeType === "decision_memo" ? memoPayload(snapshot, actionPlan) : null;
    const body = payload
      ? `<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`
      : htmlTable(rows);
    return {
      type: safeType,
      format: safeFormat,
      title,
      generatedAt,
      contentType: "text/html; charset=utf-8",
      filename: `${safeType}.html`,
      content: `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,sans-serif;margin:32px;color:#17211b}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe4db;padding:8px;text-align:left}th{background:#f5f6f1}</style></head><body><h1>${escapeHtml(title)}</h1><p>Generated ${escapeHtml(generatedAt)}</p>${body}</body></html>`
    };
  }

  return {
    type: safeType,
    format: safeFormat,
    title,
    generatedAt,
    contentType: "application/json; charset=utf-8",
    filename: `${safeType}.json`,
    content: safeType === "decision_memo"
      ? memoPayload(snapshot, actionPlan)
      : { snapshot, actionPlan, rows }
  };
}

module.exports = {
  generatePortfolioReport
};
