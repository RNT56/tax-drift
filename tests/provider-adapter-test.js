const assert = require('node:assert/strict');
const { getLatestPrice, searchLiveProviders } = require('../netlify/lib/market-data-providers');

const originalFetch = global.fetch;
const originalInfo = console.info;
const originalWarn = console.warn;
console.info = () => {};
console.warn = () => {};

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  };
}

async function withMockFetch(mock, run) {
  global.fetch = mock;
  try {
    await run();
  } finally {
    global.fetch = originalFetch;
  }
}

(async () => {
  await withMockFetch(async (url) => {
    const parsed = new URL(String(url));
    if (parsed.hostname === 'api.twelvedata.com') {
      return jsonResponse({ status: 'error', message: 'not found' });
    }
    if (parsed.hostname === 'financialmodelingprep.com') {
      return jsonResponse([{ symbol: 'TSLA', price: 184.42 }]);
    }
    throw new Error(`Unexpected URL ${url}`);
  }, async () => {
    const { result, errors } = await getLatestPrice(
      { symbol: 'TSLA', exchange: 'NASDAQ', currency: 'USD' },
      { TWELVE_DATA_API_KEY: 'twelve-key', FMP_API_KEY: 'fmp-key' }
    );

    assert.equal(result.provider, 'fmp');
    assert.equal(result.price, 184.42);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].provider, 'twelvedata');
  });

  await withMockFetch(async (url) => {
    const parsed = new URL(String(url));
    if (parsed.hostname === 'financialmodelingprep.com' && parsed.pathname === '/stable/quote') {
      return jsonResponse([{ symbol: 'TSLA', price: 100 }]);
    }
    if (parsed.hostname === 'financialmodelingprep.com' && parsed.pathname === '/api/v3/forex/USDEUR') {
      return jsonResponse([{ bid: 0.91, ask: 0.93 }]);
    }
    throw new Error(`Unexpected URL ${url}`);
  }, async () => {
    const { result } = await getLatestPrice(
      { symbol: 'TSLA', exchange: 'NASDAQ', sourceCurrency: 'USD', currency: 'EUR' },
      { FMP_API_KEY: 'fmp-key' }
    );

    assert.equal(result.converted, true);
    assert.equal(result.currency, 'EUR');
    assert.equal(result.originalCurrency, 'USD');
    assert.equal(result.fxRate, 0.92);
    assert.equal(result.price, 92);
  });

  await withMockFetch(async (url) => {
    const parsed = new URL(String(url));
    if (parsed.hostname === 'financialmodelingprep.com') {
      return jsonResponse([
        { symbol: 'MSTR', name: 'Strategy Inc', exchangeShortName: 'NASDAQ', currency: 'USD' }
      ]);
    }
    throw new Error(`Unexpected URL ${url}`);
  }, async () => {
    const { results } = await searchLiveProviders('Strategy', 5, { FMP_API_KEY: 'fmp-key' });
    assert.equal(results[0].symbol, 'MSTR');
    assert.equal(results[0].provider, 'fmp');
  });

  console.log('Provider adapter tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  console.info = originalInfo;
  console.warn = originalWarn;
});
