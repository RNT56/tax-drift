const assert = require('node:assert/strict');
const { generatePortfolioReport } = require('../netlify/lib/portfolio-report-generator');
const { demoActionPlan, demoSnapshot } = require('../netlify/lib/portfolio-demo');

const jsonReport = generatePortfolioReport({
  type: 'portfolio_snapshot',
  format: 'json',
  snapshot: demoSnapshot,
  actionPlan: demoActionPlan
});

assert.equal(jsonReport.contentType, 'application/json; charset=utf-8');
assert.equal(jsonReport.content.rows.length > 0, true);
assert.equal(jsonReport.filename, 'portfolio_snapshot.json');

const csvReport = generatePortfolioReport({
  type: 'action_plan',
  format: 'csv',
  snapshot: demoSnapshot,
  actionPlan: demoActionPlan
});

assert.equal(csvReport.contentType, 'text/csv; charset=utf-8');
assert.match(csvReport.content, /rank,kind,title/);
assert.match(csvReport.content, /refresh_reconnect/);

const htmlReport = generatePortfolioReport({
  type: 'decision_memo',
  format: 'html',
  snapshot: demoSnapshot,
  actionPlan: demoActionPlan
});

assert.equal(htmlReport.contentType, 'text/html; charset=utf-8');
assert.match(htmlReport.content, /<!doctype html>/);
assert.match(htmlReport.content, /Decision Memo/);

const fallback = generatePortfolioReport({
  type: 'not-real',
  format: 'pdf',
  snapshot: demoSnapshot,
  actionPlan: demoActionPlan
});

assert.equal(fallback.type, 'portfolio_snapshot');
assert.equal(fallback.format, 'json');

console.log('Portfolio report generator tests passed');
