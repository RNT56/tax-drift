const { normalizeSymbol } = require('./fallback-symbols');

const PROVIDERS = {
  twelvedata: {
    id: 'twelvedata',
    name: 'Twelve Data',
    envKey: 'TWELVE_DATA_API_KEY',
    coverage: 'Stocks, ETFs, indices, forex, crypto and commodities'
  },
  fmp: {
    id: 'fmp',
    name: 'Financial Modeling Prep',
    envKey: 'FMP_API_KEY',
    coverage: 'Stocks, ETFs, indices, forex, crypto and commodities'
  },
  eodhd: {
    id: 'eodhd',
    name: 'EODHD',
    envKey: 'EODHD_API_KEY',
    coverage: 'Global stocks, ETFs, indices, forex and crypto'
  },
  alphavantage: {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    envKey: 'ALPHA_VANTAGE_API_KEY',
    coverage: 'Global equities, ETFs, forex, crypto and commodities'
  }
};

const DEFAULT_PROVIDER_ORDER = ['twelvedata', 'fmp', 'eodhd', 'alphavantage'];

const EODHD_EXCHANGE_SUFFIXES = [
  { match: ['NASDAQ', 'NYSE', 'NYSE ARCA', 'CBOE', 'AMEX', 'NYSE MKT'], suffix: 'US' },
  { match: ['XETRA', 'FRANKFURT'], suffix: 'XETRA' },
  { match: ['EURONEXT AMSTERDAM'], suffix: 'AS' },
  { match: ['EURONEXT PARIS'], suffix: 'PA' },
  { match: ['BORSA ITALIANA'], suffix: 'MI' },
  { match: ['SIX SWISS EXCHANGE'], suffix: 'SW' },
  { match: ['LONDON STOCK EXCHANGE'], suffix: 'LSE' },
  { match: ['TOKYO STOCK EXCHANGE'], suffix: 'TSE' },
  { match: ['HONG KONG EXCHANGE'], suffix: 'HK' },
  { match: ['KOREA EXCHANGE'], suffix: 'KO' }
];

function clean(value) {
  return String(value || '').trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function normalizeCurrency(value, fallback = '') {
  return upper(value || fallback).replace(/[^A-Z]/g, '').slice(0, 3);
}

function normalizeCurrencyOrDefault(value, fallback = 'EUR') {
  return normalizeCurrency(value, fallback) || fallback;
}

function parsePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : NaN;
}

function getProviderSymbol(params, providerId) {
  const key = `${providerId}Symbol`;
  return clean(params[key] || params.providerSymbol || params.symbol);
}

function getConfiguredProviders(env = process.env, order = DEFAULT_PROVIDER_ORDER) {
  return order
    .map(id => PROVIDERS[id])
    .filter(provider => provider && clean(env[provider.envKey]));
}

function getProviderStatuses(env = process.env) {
  return DEFAULT_PROVIDER_ORDER.map(id => {
    const provider = PROVIDERS[id];
    return {
      id: provider.id,
      name: provider.name,
      envKey: provider.envKey,
      configured: Boolean(clean(env[provider.envKey])),
      coverage: provider.coverage
    };
  });
}

function resultKey(item) {
  return [
    upper(item?.symbol),
    upper(item?.exchange || item?.micCode || item?.mic_code),
    upper(item?.currency)
  ].join('|');
}

function mergeResults(resultGroups = [], limit = 10) {
  const seen = new Set();
  const merged = [];

  for (const group of resultGroups) {
    for (const item of group || []) {
      if (!item?.symbol) continue;
      const key = resultKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= limit) return merged;
    }
  }

  return merged;
}

function withProviderFields(item, providerId, providerSymbol = item?.symbol) {
  const normalized = normalizeSymbol(item, providerId);
  const fieldName = `${providerId}Symbol`;
  return {
    ...normalized,
    provider: providerId,
    providerSymbol: clean(providerSymbol || normalized.symbol),
    [fieldName]: clean(providerSymbol || normalized.symbol)
  };
}

function normalizeTwelveDataPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.values)) return payload.values;
  return [];
}

function normalizeFmpSearchItem(item) {
  return withProviderFields({
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchangeShortName || item.stockExchange || item.exchange,
    currency: item.currency,
    type: item.type || 'Instrument'
  }, 'fmp', item.symbol);
}

function normalizeEodhdSearchItem(item) {
  const code = clean(item.Code || item.code || item.symbol);
  const exchange = clean(item.Exchange || item.exchange || item.exchangeName);
  const symbol = code.includes('.') ? code.split('.')[0] : code;
  return withProviderFields({
    symbol,
    name: item.Name || item.name,
    exchange,
    currency: item.Currency || item.currency,
    type: item.Type || item.type || 'Instrument'
  }, 'eodhd', code);
}

function normalizeAlphaSearchItem(item) {
  return withProviderFields({
    symbol: item['1. symbol'] || item.symbol,
    name: item['2. name'] || item.name,
    exchange: item['4. region'] || item.exchange,
    currency: item['8. currency'] || item.currency,
    type: item['3. type'] || item.type || 'Instrument'
  }, 'alphavantage', item['1. symbol'] || item.symbol);
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === 'error' || payload?.Error || payload?.['Error Message'] || payload?.Note || payload?.Information) {
    const message = payload?.message || payload?.Error || payload?.['Error Message'] || payload?.Note || payload?.Information || `${response.status} from ${url.hostname}`;
    throw new Error(message);
  }
  return payload;
}

async function searchTwelveData(query, limit, apiKey) {
  const url = new URL('https://api.twelvedata.com/symbol_search');
  url.searchParams.set('symbol', query);
  url.searchParams.set('outputsize', String(limit));
  const payload = await fetchJson(url, { Authorization: `apikey ${apiKey}` });
  return normalizeTwelveDataPayload(payload)
    .map(item => withProviderFields(item, 'twelvedata', item.symbol || item.ticker))
    .filter(item => item.symbol);
}

async function searchFmp(query, limit, apiKey) {
  const urls = [
    new URL('https://financialmodelingprep.com/stable/search-symbol'),
    new URL('https://financialmodelingprep.com/stable/search-name')
  ];
  urls.forEach(url => {
    url.searchParams.set('query', query);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('apikey', apiKey);
  });

  const groups = await Promise.all(urls.map(url => fetchJson(url).catch(() => [])));
  return mergeResults(groups.map(group => (Array.isArray(group) ? group : []).map(normalizeFmpSearchItem)), limit);
}

async function searchEodhd(query, limit, apiKey) {
  const url = new URL(`https://eodhd.com/api/search/${encodeURIComponent(query)}`);
  url.searchParams.set('api_token', apiKey);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', String(limit));
  const payload = await fetchJson(url);
  return (Array.isArray(payload) ? payload : [])
    .map(normalizeEodhdSearchItem)
    .filter(item => item.symbol);
}

async function searchAlphaVantage(query, limit, apiKey) {
  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'SYMBOL_SEARCH');
  url.searchParams.set('keywords', query);
  url.searchParams.set('apikey', apiKey);
  const payload = await fetchJson(url);
  return (payload.bestMatches || [])
    .map(normalizeAlphaSearchItem)
    .filter(item => item.symbol)
    .slice(0, limit);
}

const searchAdapters = {
  twelvedata: searchTwelveData,
  fmp: searchFmp,
  eodhd: searchEodhd,
  alphavantage: searchAlphaVantage
};

function inferEodhdSymbol(params) {
  const explicit = clean(params.eodhdSymbol);
  if (explicit) return explicit;

  const symbol = clean(params.symbol);
  if (!symbol) return '';
  if (symbol.includes('.')) return symbol;

  const exchange = upper(params.exchange || params.mic_code || params.micCode);
  const match = EODHD_EXCHANGE_SUFFIXES.find(entry => entry.match.some(value => exchange.includes(value)));
  return match ? `${symbol}.${match.suffix}` : symbol;
}

async function getTwelveDataPrice(params, apiKey) {
  const symbol = getProviderSymbol(params, 'twelvedata');
  const url = new URL('https://api.twelvedata.com/price');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('dp', '6');
  if (params.exchange) url.searchParams.set('exchange', params.exchange);
  const payload = await fetchJson(url, { Authorization: `apikey ${apiKey}` });
  const price = parsePositiveNumber(payload.price);
  if (!Number.isFinite(price)) throw new Error('Twelve Data did not return a valid price.');
  return {
    symbol: params.symbol,
    providerSymbol: symbol,
    exchange: params.exchange,
    currency: normalizeCurrencyOrDefault(params.sourceCurrency || params.currency, 'USD'),
    price,
    source: 'Twelve Data',
    provider: 'twelvedata',
    fetchedAt: new Date().toISOString()
  };
}

async function getFmpPrice(params, apiKey) {
  const symbol = getProviderSymbol(params, 'fmp');
  const url = new URL('https://financialmodelingprep.com/stable/quote');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('apikey', apiKey);
  const payload = await fetchJson(url);
  const quote = Array.isArray(payload) ? payload[0] : payload;
  const price = parsePositiveNumber(quote?.price);
  if (!Number.isFinite(price)) throw new Error('FMP did not return a valid price.');
  return {
    symbol: params.symbol,
    providerSymbol: symbol,
    exchange: params.exchange,
    currency: normalizeCurrencyOrDefault(params.sourceCurrency || quote?.currency || params.currency, 'USD'),
    price,
    source: 'Financial Modeling Prep',
    provider: 'fmp',
    fetchedAt: new Date().toISOString()
  };
}

async function getEodhdPrice(params, apiKey) {
  const symbol = inferEodhdSymbol(params);
  const url = new URL(`https://eodhd.com/api/real-time/${encodeURIComponent(symbol)}`);
  url.searchParams.set('api_token', apiKey);
  url.searchParams.set('fmt', 'json');
  const payload = await fetchJson(url);
  const price = parsePositiveNumber(payload.close ?? payload.price ?? payload.last ?? payload.previousClose);
  if (!Number.isFinite(price)) throw new Error('EODHD did not return a valid price.');
  return {
    symbol: params.symbol,
    providerSymbol: symbol,
    exchange: params.exchange,
    currency: normalizeCurrencyOrDefault(params.sourceCurrency || payload.currency || params.currency, 'USD'),
    price,
    source: 'EODHD',
    provider: 'eodhd',
    fetchedAt: new Date().toISOString()
  };
}

async function getAlphaVantagePrice(params, apiKey) {
  const symbol = getProviderSymbol(params, 'alphavantage');
  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'GLOBAL_QUOTE');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('apikey', apiKey);
  const payload = await fetchJson(url);
  const quote = payload['Global Quote'] || payload;
  const price = parsePositiveNumber(quote['05. price'] || quote.price);
  if (!Number.isFinite(price)) throw new Error('Alpha Vantage did not return a valid price.');
  return {
    symbol: params.symbol,
    providerSymbol: symbol,
    exchange: params.exchange,
    currency: normalizeCurrencyOrDefault(params.sourceCurrency || params.currency, 'USD'),
    price,
    source: 'Alpha Vantage',
    provider: 'alphavantage',
    fetchedAt: new Date().toISOString()
  };
}

const priceAdapters = {
  twelvedata: getTwelveDataPrice,
  fmp: getFmpPrice,
  eodhd: getEodhdPrice,
  alphavantage: getAlphaVantagePrice
};

async function getTwelveDataFxRate(fromCurrency, toCurrency, apiKey) {
  const url = new URL('https://api.twelvedata.com/exchange_rate');
  url.searchParams.set('symbol', `${fromCurrency}/${toCurrency}`);
  const payload = await fetchJson(url, { Authorization: `apikey ${apiKey}` });
  const rate = parsePositiveNumber(payload.rate);
  if (!Number.isFinite(rate)) throw new Error('Twelve Data did not return a valid FX rate.');
  return { rate, provider: 'twelvedata', source: 'Twelve Data' };
}

async function getFmpFxRate(fromCurrency, toCurrency, apiKey) {
  const url = new URL(`https://financialmodelingprep.com/api/v3/forex/${fromCurrency}${toCurrency}`);
  url.searchParams.set('apikey', apiKey);
  const payload = await fetchJson(url);
  const quote = Array.isArray(payload) ? payload[0] : payload;
  const bid = parsePositiveNumber(quote?.bid);
  const ask = parsePositiveNumber(quote?.ask);
  const price = parsePositiveNumber(quote?.price);
  const rate = Number.isFinite(price) ? price : Number.isFinite(bid) && Number.isFinite(ask) ? (bid + ask) / 2 : NaN;
  if (!Number.isFinite(rate)) throw new Error('FMP did not return a valid FX rate.');
  return { rate, provider: 'fmp', source: 'Financial Modeling Prep' };
}

async function getEodhdFxRate(fromCurrency, toCurrency, apiKey) {
  const symbol = `${fromCurrency}${toCurrency}.FOREX`;
  const url = new URL(`https://eodhd.com/api/real-time/${encodeURIComponent(symbol)}`);
  url.searchParams.set('api_token', apiKey);
  url.searchParams.set('fmt', 'json');
  const payload = await fetchJson(url);
  const rate = parsePositiveNumber(payload.close ?? payload.price ?? payload.last ?? payload.previousClose);
  if (!Number.isFinite(rate)) throw new Error('EODHD did not return a valid FX rate.');
  return { rate, provider: 'eodhd', source: 'EODHD' };
}

async function getAlphaVantageFxRate(fromCurrency, toCurrency, apiKey) {
  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'CURRENCY_EXCHANGE_RATE');
  url.searchParams.set('from_currency', fromCurrency);
  url.searchParams.set('to_currency', toCurrency);
  url.searchParams.set('apikey', apiKey);
  const payload = await fetchJson(url);
  const quote = payload['Realtime Currency Exchange Rate'] || {};
  const rate = parsePositiveNumber(quote['5. Exchange Rate'] || quote.exchangeRate || quote.rate);
  if (!Number.isFinite(rate)) throw new Error('Alpha Vantage did not return a valid FX rate.');
  return { rate, provider: 'alphavantage', source: 'Alpha Vantage' };
}

const fxAdapters = {
  twelvedata: getTwelveDataFxRate,
  fmp: getFmpFxRate,
  eodhd: getEodhdFxRate,
  alphavantage: getAlphaVantageFxRate
};

async function getFxRate(fromCurrency, toCurrency, env = process.env) {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (!from || !to) throw new Error('Missing FX currency.');
  if (from === to) return { rate: 1, provider: 'same-currency', source: 'Same currency' };

  const configured = getConfiguredProviders(env);
  const errors = [];

  for (const provider of configured) {
    try {
      const result = await fxAdapters[provider.id](from, to, clean(env[provider.envKey]));
      console.info('market_data.fx.success', { provider: provider.id, from, to });
      return { ...result, fromCurrency: from, toCurrency: to, errors };
    } catch (error) {
      errors.push({ provider: provider.id, source: provider.name, error: error.message });
      console.warn('market_data.fx.failure', { provider: provider.id, from, to, error: error.message });
    }
  }

  const aggregate = new Error(`FX conversion unavailable for ${from}/${to}.`);
  aggregate.errors = errors;
  throw aggregate;
}

async function searchLiveProviders(query, limit, env = process.env) {
  const configured = getConfiguredProviders(env);
  const attempts = await Promise.all(configured.map(async provider => {
    try {
      const results = await searchAdapters[provider.id](query, limit, clean(env[provider.envKey]));
      if (results.length) console.info('market_data.search.success', { provider: provider.id, query, results: results.length });
      return { provider: provider.id, ok: true, results };
    } catch (error) {
      console.warn('market_data.search.failure', { provider: provider.id, query, error: error.message });
      return { provider: provider.id, ok: false, error: error.message, results: [] };
    }
  }));

  return {
    configured,
    attempts,
    results: mergeResults(attempts.map(attempt => attempt.results), limit)
  };
}

async function getLatestPrice(params, env = process.env) {
  const configured = getConfiguredProviders(env);
  const errors = [];
  const targetCurrency = normalizeCurrencyOrDefault(params.currency, params.sourceCurrency || 'EUR');

  for (const provider of configured) {
    try {
      const result = await priceAdapters[provider.id](params, clean(env[provider.envKey]));
      console.info('market_data.price.success', { provider: provider.id, symbol: params.symbol, currency: result.currency });
      if (result.currency !== targetCurrency) {
        const fx = await getFxRate(result.currency, targetCurrency, env);
        return {
          result: {
            ...result,
            originalPrice: result.price,
            originalCurrency: result.currency,
            fxRate: fx.rate,
            fxFromCurrency: fx.fromCurrency,
            fxToCurrency: fx.toCurrency,
            fxProvider: fx.provider,
            price: result.price * fx.rate,
            currency: targetCurrency,
            converted: true
          },
          errors,
          providerCount: configured.length
        };
      }
      return { result: { ...result, converted: false }, errors, providerCount: configured.length };
    } catch (error) {
      errors.push({ provider: provider.id, source: provider.name, error: error.message });
      console.warn('market_data.price.failure', { provider: provider.id, symbol: params.symbol, error: error.message });
    }
  }

  return { result: null, errors, providerCount: configured.length };
}

module.exports = {
  DEFAULT_PROVIDER_ORDER,
  PROVIDERS,
  getConfiguredProviders,
  getFxRate,
  getLatestPrice,
  getProviderStatuses,
  mergeResults,
  normalizeCurrency,
  searchLiveProviders
};
