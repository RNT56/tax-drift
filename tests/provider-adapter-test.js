const assert = require('node:assert/strict');
const { getHistoricalPrices, getLatestPrice, searchLiveProviders } = require('../netlify/lib/market-data-providers');

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

  await withMockFetch(async (url) => {
    const parsed = new URL(String(url));
    if (parsed.hostname === 'financialmodelingprep.com' && parsed.pathname === '/stable/quote') {
      return jsonResponse([{
        symbol: 'TSLA',
        price: 100,
        open: 97,
        dayHigh: 102,
        dayLow: 96,
        previousClose: 95,
        change: 5,
        changesPercentage: 5.263,
        volume: 1234567,
        marketCap: 987654321
      }]);
    }
    throw new Error(`Unexpected URL ${url}`);
  }, async () => {
    const { result } = await getLatestPrice(
      { symbol: 'TSLA', exchange: 'NASDAQ', currency: 'USD' },
      { FMP_API_KEY: 'fmp-key' }
    );

    assert.equal(result.price, 100);
    assert.equal(result.previousClose, 95);
    assert.equal(result.high, 102);
    assert.equal(result.low, 96);
    assert.equal(result.volume, 1234567);
    assert.ok(Math.abs(result.changePercent - 0.05263) < 1e-9);
  });

  await withMockFetch(async (url) => {
    const parsed = new URL(String(url));
    if (parsed.hostname === 'financialmodelingprep.com' && parsed.pathname === '/api/v3/historical-price-full/TSLA') {
      return jsonResponse({
        symbol: 'TSLA',
        historical: [
          { date: '2025-01-03', close: 104, volume: 3000 },
          { date: '2025-01-02', close: 102, volume: 2000 },
          { date: '2025-01-01', close: 100, volume: 1000 }
        ]
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  }, async () => {
    const { result } = await getHistoricalPrices(
      { symbol: 'TSLA', exchange: 'NASDAQ', sourceCurrency: 'USD', currency: 'USD', range: '5Y' },
      { FMP_API_KEY: 'fmp-key' }
    );

    assert.equal(result.provider, 'fmp');
    assert.equal(result.points.length, 3);
    assert.equal(result.points[0].date, '2025-01-01');
    assert.equal(result.points[2].close, 104);
  });

  console.log('Provider adapter tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  console.info = originalInfo;
  console.warn = originalWarn;
});
