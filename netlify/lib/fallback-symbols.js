const FALLBACK_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc Class A', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'META', name: 'Meta Platforms Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc Class B', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'V', name: 'Visa Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'VT', name: 'Vanguard Total World Stock ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
  { symbol: 'BMW', name: 'Bayerische Motoren Werke AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'MBG', name: 'Mercedes-Benz Group AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'VOW3', name: 'Volkswagen AG Preference Shares', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Preferred Stock' },
  { symbol: 'SAP', name: 'SAP SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'SIE', name: 'Siemens AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'ALV', name: 'Allianz SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'DTE', name: 'Deutsche Telekom AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'AIR', name: 'Airbus SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'ASML', name: 'ASML Holding NV', exchange: 'Euronext Amsterdam', country: 'Netherlands', currency: 'EUR', type: 'Common Stock' },
  { symbol: 'NESN', name: 'Nestlé SA', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock' },
  { symbol: 'NOVN', name: 'Novartis AG', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock' },
  { symbol: 'ROG', name: 'Roche Holding AG', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock' },
  { symbol: '7203', name: 'Toyota Motor Corporation', exchange: 'Tokyo Stock Exchange', country: 'Japan', currency: 'JPY', type: 'Common Stock' },
  { symbol: '6758', name: 'Sony Group Corporation', exchange: 'Tokyo Stock Exchange', country: 'Japan', currency: 'JPY', type: 'Common Stock' },
  { symbol: '0700', name: 'Tencent Holdings Ltd', exchange: 'Hong Kong Exchange', country: 'Hong Kong', currency: 'HKD', type: 'Common Stock' },
  { symbol: '005930', name: 'Samsung Electronics Co Ltd', exchange: 'Korea Exchange', country: 'South Korea', currency: 'KRW', type: 'Common Stock' },
  { symbol: 'DAX', name: 'DAX Performance Index', exchange: 'Deutsche Börse', country: 'Germany', currency: 'EUR', type: 'Index' },
  { symbol: 'SPX', name: 'S&P 500 Index', exchange: 'CBOE', country: 'United States', currency: 'USD', type: 'Index' },
  { symbol: 'NDX', name: 'NASDAQ 100 Index', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Index' },
  { symbol: 'DJI', name: 'Dow Jones Industrial Average', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Index' },
  { symbol: 'SX5E', name: 'EURO STOXX 50 Index', exchange: 'STOXX', country: 'Europe', currency: 'EUR', type: 'Index' },
  { symbol: 'IWDA', name: 'iShares Core MSCI World UCITS ETF', exchange: 'Euronext Amsterdam', country: 'Netherlands', currency: 'EUR', type: 'ETF' },
  { symbol: 'EUNL', name: 'iShares Core MSCI World UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
  { symbol: 'VWCE', name: 'Vanguard FTSE All-World UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
  { symbol: 'SXR8', name: 'iShares Core S&P 500 UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
  { symbol: 'EXS1', name: 'iShares Core DAX UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' }
];

function normalizeSymbol(item, source = 'fallback') {
  const symbol = item.symbol || item.ticker || '';
  return {
    id: [symbol, item.exchange, item.mic_code || item.micCode, item.currency].filter(Boolean).join('|'),
    symbol,
    name: item.instrument_name || item.name || item.description || symbol,
    exchange: item.exchange || item.exchange_name || '',
    micCode: item.mic_code || item.micCode || '',
    country: item.country || '',
    currency: item.currency || '',
    type: item.instrument_type || item.type || item.security_type || 'Instrument',
    source
  };
}

function searchFallback(query, limit = 10) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  return FALLBACK_SYMBOLS
    .map((item) => {
      const symbol = item.symbol.toLowerCase();
      const name = item.name.toLowerCase();
      const exchange = item.exchange.toLowerCase();
      const type = item.type.toLowerCase();
      let score = 0;
      if (symbol === q) score += 100;
      if (symbol.startsWith(q)) score += 55;
      if (name.startsWith(q)) score += 40;
      if (symbol.includes(q)) score += 24;
      if (name.includes(q)) score += 18;
      if (exchange.includes(q) || type.includes(q)) score += 8;
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((item) => normalizeSymbol(item, 'fallback'));
}

module.exports = { FALLBACK_SYMBOLS, normalizeSymbol, searchFallback };
