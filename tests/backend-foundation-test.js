const assert = require('node:assert/strict');
const { createMemoryBackingStore, createSecureStore } = require('../netlify/lib/secure-store');
const { sha256, verifyToken } = require('../netlify/lib/premium-auth');
const { createWorkspaceStore } = require('../netlify/lib/workspace-store');
const { createAlertStore, runScheduledAlertCheck } = require('../netlify/lib/alert-store');
const { createReportSnapshotStore } = require('../netlify/lib/report-snapshots');
const workspaces = require('../netlify/functions/workspaces');
const alerts = require('../netlify/functions/alerts');
const alertScheduler = require('../netlify/functions/alert-scheduler');
const snapshots = require('../netlify/functions/report-snapshot');
const fxRate = require('../netlify/functions/get-fx-rate');
const importCommit = require('../netlify/functions/import-commit');
const ImportParser = require('../netlify/lib/import-parser');
const OcrProviders = require('../netlify/lib/ocr-providers');

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

  response = await alertScheduler.handler(event('GET'), {});
  assert.equal(response.statusCode, 403);

  response = await alertScheduler.route(event('GET', null, {}, { 'x-alert-scheduler-secret': 'scheduler-secret' }), {}, {
    env: { ALERT_SCHEDULER_SECRET: 'scheduler-secret' },
    alertStore: { listAll: async () => [] },
    workspaceStore: { get: async () => null }
  });
  assert.equal(response.statusCode, 200);
  assert.equal(parse(response).checkedAlerts, 0);

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

  const mappedCsv = ImportParser.normalizeGenericCsv('Aktion;Anzahl;Betrag;ISIN;Datum\nKauf;10;123,40;DE0001234567;01.02.2024\n');
  assert.equal(mappedCsv.mappingRequired, false);
  assert.equal(mappedCsv.headers.includes('Aktion'), true);
  assert.equal(mappedCsv.fieldMapping.quantity, 'Anzahl');
  assert.equal(mappedCsv.transactions[0].quantity, 10);

  const remappedCsv = ImportParser.normalizeGenericCsv('Action;Pieces;Total;Identifier\nBUY;3;75;US0378331005\n', {
    mapping: { type: 'Action', quantity: 'Pieces', grossAmount: 'Total', isin: 'Identifier' }
  });
  assert.equal(remappedCsv.mappingRequired, false);
  assert.equal(remappedCsv.transactions[0].isin, 'US0378331005');

  const consorsDepotCsv = ImportParser.normalizeGenericCsv('Name;ISIN;WKN;Stück;Einstandskurs;Aktueller Kurs;Einstandswert;Marktwert;Währung;Depotnummer\nSAP SE;DE0007164600;716460;6;100,00;120,00;600,00;720,00;EUR;12345\n', {
    fileName: 'consorsbank-depot.csv'
  });
  assert.equal(consorsDepotCsv.detectedBroker, 'consorsbank');
  assert.equal(consorsDepotCsv.importKind, 'positions');
  assert.equal(consorsDepotCsv.mappingRequired, false);
  assert.equal(consorsDepotCsv.transactions.length, 0);
  assert.equal(consorsDepotCsv.positions[0].shares, 6);
  assert.equal(consorsDepotCsv.positions[0].currentPrice, 120);

  const consorsDepotPdf = ImportParser.parseBrokerPdfText(`
    Consorsbank BNP Paribas Depotübersicht
    Stand 12.05.2026
    SAP SE ISIN DE0007164600 Stück 6 Einstandskurs 100,00 Aktueller Kurs 120,00 Marktwert 720,00 EUR
  `, { fileName: 'consorsbank-depot.pdf' });
  assert.equal(consorsDepotPdf.importKind, 'positions');
  assert.equal(consorsDepotPdf.positions[0].isin, 'DE0007164600');
  assert.equal(consorsDepotPdf.positions[0].shares, 6);

  const fakeOcrDocument = OcrProviders.buildDocumentModel([{
    pageNumber: 1,
    words: OcrProviders.parseTesseractTsv([
      'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
      '5\t1\t1\t1\t1\t1\t10\t10\t100\t12\t94\tConsorsbank',
      '5\t1\t1\t1\t1\t2\t120\t10\t120\t12\t94\tDepotübersicht',
      '5\t1\t1\t1\t2\t1\t10\t40\t40\t12\t93\tSAP',
      '5\t1\t1\t1\t2\t2\t55\t40\t20\t12\t92\tSE',
      '5\t1\t1\t1\t2\t3\t90\t40\t90\t12\t96\tDE0007164600',
      '5\t1\t1\t1\t2\t4\t190\t40\t35\t12\t91\tStück',
      '5\t1\t1\t1\t2\t5\t230\t40\t20\t12\t91\t6',
      '5\t1\t1\t1\t2\t6\t260\t40\t75\t12\t91\t120,00',
      '5\t1\t1\t1\t2\t7\t345\t40\t75\t12\t91\t720,00',
      '5\t1\t1\t1\t2\t8\t430\t40\t30\t12\t91\tEUR'
    ].join('\n'), 1)
  }], { provider: 'local-tesseract' });
  const fakeOcrPreview = ImportParser.parseBrokerDocument(fakeOcrDocument, { fileName: 'consorsbank-scan.pdf', contentType: 'application/pdf' });
  assert.equal(fakeOcrPreview.extractedBy, 'local-tesseract');
  assert.equal(fakeOcrPreview.importKind, 'positions');
  assert.equal(fakeOcrPreview.positions[0].isin, 'DE0007164600');
  assert.equal(fakeOcrPreview.positions[0].shares, 6);
  assert.ok(fakeOcrPreview.ocrConfidence > 0.9);

  const missingMappingCsv = ImportParser.normalizeGenericCsv('Name;Amount\nExample;10\n');
  assert.equal(missingMappingCsv.mappingRequired, true);
  assert.ok(missingMappingCsv.requiredFieldsMissing.includes('type'));

  response = await importCommit.route(event('POST', {
    workspaceId: workspace.id,
    importId: 'import-multi',
    transactions: [
      { id: 'sap-buy', broker: 'trade-republic', accountId: 'main', type: 'BUY', tradeDate: '2024-01-01', symbol: 'SAP', isin: 'DE0007164600', quantity: 10, price: 100, currency: 'EUR' },
      { id: 'msft-buy', broker: 'interactive-brokers', accountId: 'usd', type: 'BUY', tradeDate: '2024-01-02', symbol: 'MSFT', isin: 'US5949181045', quantity: 3, price: 300, currency: 'USD' },
      { id: 'sap-sell', broker: 'trade-republic', accountId: 'main', type: 'SELL', tradeDate: '2024-02-01', symbol: 'SAP', isin: 'DE0007164600', quantity: 4, price: 120, currency: 'EUR' }
    ]
  }, {}, headers), {}, { env, workspaceStore });
  assert.equal(response.statusCode, 200);
  const committedWorkspace = parse(response).workspace;
  assert.equal(committedWorkspace.imports[0].transactions.length, 3);
  const sapPosition = committedWorkspace.positions.find(position => position.isin === 'DE0007164600');
  const msftPosition = committedWorkspace.positions.find(position => position.isin === 'US5949181045');
  assert.equal(sapPosition.shares, 6);
  assert.equal(msftPosition.shares, 3);
  assert.equal(committedWorkspace.positions.filter(position => position.source === 'import').length, 2);

  response = await importCommit.route(event('POST', {
    workspaceId: workspace.id,
    importId: 'import-consors-positions',
    positions: consorsDepotCsv.positions
  }, {}, headers), {}, { env, workspaceStore });
  assert.equal(response.statusCode, 200);
  const committedPositionWorkspace = parse(response).workspace;
  assert.equal(parse(response).committedPositions, 1);
  const importedSapSnapshot = committedPositionWorkspace.positions.find(position => position.isin === 'DE0007164600');
  assert.equal(importedSapSnapshot.shares, 6);
  assert.equal(importedSapSnapshot.currentPrice, 120);
  assert.ok(committedPositionWorkspace.imports.some(item => item.positions?.length === 1));

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
