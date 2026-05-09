const assert = require('node:assert/strict');
const { createMemoryBackingStore, createSecureStore } = require('../netlify/lib/secure-store');
const { sha256, verifyToken } = require('../netlify/lib/premium-auth');
const { createWorkspaceStore } = require('../netlify/lib/workspace-store');
const { createAlertStore, runScheduledAlertCheck } = require('../netlify/lib/alert-store');
const { createReportSnapshotStore } = require('../netlify/lib/report-snapshots');
const workspaces = require('../netlify/functions/workspaces');
const alerts = require('../netlify/functions/alerts');
const snapshots = require('../netlify/functions/report-snapshot');
const fxRate = require('../netlify/functions/get-fx-rate');
const ImportParser = require('../netlify/lib/import-parser');

function event(method, body, query = {}, headers = {}) {
  return {
    httpMethod: method,
    queryStringParameters: query,
    headers,
    body: body ? JSON.stringify(body) : ''
  };
}

function parse(response) {
  return JSON.parse(response.body);
}

(async () => {
  const backing = createMemoryBackingStore('backend-foundation-test');
  const secureStore = createSecureStore({
    env: { SECURE_STORE_KEY: 'test-secret' },
    namespace: 'backend-foundation-test',
    store: backing
  });

  await secureStore.setJson('users/user-1/example', { ok: true });
  const raw = await backing.get('users/user-1/example');
  assert.match(raw, /secureStoreVersion/);
  assert.equal(raw.includes('"ok":true'), false);
  assert.deepEqual(await secureStore.getJson('users/user-1/example'), { ok: true });

  const token = 'premium-token';
  const env = {
    NODE_ENV: 'test',
    PREMIUM_API_TOKEN_HASHES: `${sha256(token)}:user-1`,
    SECURE_STORE_KEY: 'test-secret'
  };
  assert.equal(verifyToken(token, env).userId, 'user-1');

  const workspaceStore = createWorkspaceStore({ secureStore });
  const alertStore = createAlertStore({ secureStore });
  const reportSnapshotStore = createReportSnapshotStore({ secureStore });
  const headers = { authorization: `Bearer ${token}` };

  let response = await workspaces.route(event('POST', {
    name: 'Main',
    baseCurrency: 'eur',
    positions: [{ symbol: 'AAPL' }]
  }, {}, headers), {}, { env, workspaceStore });
  assert.equal(response.statusCode, 201);
  const workspace = parse(response).workspace;
  assert.equal(workspace.userId, 'user-1');
  assert.equal(workspace.baseCurrency, 'EUR');

  response = await workspaces.route(event('GET', null, {}, headers), {}, { env, workspaceStore });
  assert.equal(response.statusCode, 200);
  assert.equal(parse(response).workspaces.length, 1);

  response = await workspaces.route(event('PATCH', { name: 'Updated' }, { id: workspace.id }, headers), {}, { env, workspaceStore });
  assert.equal(parse(response).workspace.name, 'Updated');

  response = await alerts.route(event('POST', {
    symbol: 'msft',
    threshold: 500,
    direction: 'above'
  }, {}, headers), {}, { env, alertStore });
  assert.equal(response.statusCode, 201);
  const alert = parse(response).alert;
  assert.equal(alert.symbol, 'MSFT');

  response = await alerts.route(event('GET', null, { id: alert.id }, headers), {}, { env, alertStore });
  assert.equal(parse(response).alert.threshold, 500);

  response = await snapshots.route(event('POST', {
    title: 'Quarter end',
    workspaceId: workspace.id,
    report: { taxableGain: 123 }
  }, {}, headers), {}, { env, reportSnapshotStore });
  assert.equal(response.statusCode, 201);
  assert.equal(parse(response).snapshot.report.taxableGain, 123);

  const scheduled = await runScheduledAlertCheck();
  assert.equal(scheduled.mode, 'evaluated');
  assert.equal(scheduled.checkedAlerts, 0);

  const tradeRepublicPdf = ImportParser.parseBrokerPdfText(`
    Trade Republic Bank GmbH
    Wertpapier: Example AG ISIN DE0001234567
    Kauf 10 Stück
    Ausführungstag 01.02.2024
    Kurs 12,34 EUR
    Betrag 123,40 EUR
  `, { fileName: 'trade-republic.pdf' });
  assert.equal(tradeRepublicPdf.adapter, 'trade-republic-pdf');
  assert.equal(tradeRepublicPdf.transactions[0].type, 'BUY');
  assert.equal(tradeRepublicPdf.transactions[0].isin, 'DE0001234567');

  const scalablePdf = ImportParser.parseBrokerPdfText(`
    Scalable Capital Baader Bank
    Verkauf 2 Stück
    ISIN DE0007654321
    Datum 03.04.2024
    Preis 55,00 EUR
  `, { fileName: 'scalable.pdf' });
  assert.equal(scalablePdf.adapter, 'scalable-pdf');
  assert.equal(scalablePdf.transactions[0].type, 'SELL');

  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const parsedUrl = new URL(String(url));
    assert.equal(parsedUrl.hostname, 'financialmodelingprep.com');
    return {
      ok: true,
      status: 200,
      json: async () => [{ bid: 0.9, ask: 0.92 }]
    };
  };

  try {
    response = await fxRate.route(event('GET', null, { from: 'USD', to: 'EUR' }), {}, {
      env: { FMP_API_KEY: 'fmp-key' }
    });
    assert.equal(response.statusCode, 200);
    assert.equal(parse(response).rate, 0.91);
  } finally {
    global.fetch = originalFetch;
  }

  console.log('Backend foundation tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
