import assert from "node:assert/strict";
import { generateActionPlan } from "../src/domain/action-planner";
import { addMoney, money, minorToNumber } from "../src/domain/money";
import { derivePortfolioSnapshot } from "../src/domain/portfolio";
import { demoPortfolioInput } from "../src/domain/sample-data";

const snapshot = derivePortfolioSnapshot(demoPortfolioInput);
assert.equal(snapshot.baseCurrency, "EUR");
assert.ok(minorToNumber(snapshot.totalValue) > 80_000);
assert.ok(snapshot.positions.length >= 5);
assert.ok(snapshot.dataQualityIssues.some((issue) => issue.code === "missing_basis"));
assert.ok(snapshot.dataQualityIssues.some((issue) => issue.code === "reconnect_required"));
assert.ok(snapshot.dataQualityIssues.some((issue) => issue.code === "stale_price"));
assert.ok(snapshot.estimatedLiquidationTax.minor !== "0");

const actionPlan = generateActionPlan(snapshot);
assert.ok(actionPlan.actions.length >= 5);
assert.equal(actionPlan.actions[0].kind, "refresh_reconnect");
assert.ok(actionPlan.actions.some((action) => action.kind === "set_missing_basis"));
assert.ok(actionPlan.actions.some((action) => action.kind === "rebalance"));
assert.ok(actionPlan.actions.every((action) => !String(action.kind).includes("trade")));
assert.ok(minorToNumber(actionPlan.summary.expectedTurnover) > 0);

const sum = addMoney(money("EUR", 10.1), money("EUR", 0.2));
assert.equal(sum.minor, "1030");

console.log("Portfolio domain tests passed");
