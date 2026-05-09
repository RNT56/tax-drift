(function (root, factory) {
  const catalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  if (root) root.SymbolCatalog = catalog;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FALLBACK_SYMBOLS = [
    { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'AMZN', name: 'Amazon.com Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'GOOGL', name: 'Alphabet Inc Class A', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['Google', 'GOOG'] },
    { symbol: 'META', name: 'Meta Platforms Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['Facebook'] },
    { symbol: 'TSLA', name: 'Tesla Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'MSTR', name: 'Strategy Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['MicroStrategy'] },
    { symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing Company Limited ADR', exchange: 'NYSE', country: 'Taiwan', currency: 'USD', type: 'ADR', aliases: ['TSMC', 'Taiwan Semiconductor'] },
    { symbol: 'AVGO', name: 'Broadcom Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'NFLX', name: 'Netflix Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'AMD', name: 'Advanced Micro Devices Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'QCOM', name: 'Qualcomm Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'CRM', name: 'Salesforce Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'ADBE', name: 'Adobe Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'CSCO', name: 'Cisco Systems Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'TXN', name: 'Texas Instruments Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'IBM', name: 'International Business Machines Corporation', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'SHOP', name: 'Shopify Inc Class A', exchange: 'NYSE', country: 'Canada', currency: 'USD', type: 'Common Stock' },
    { symbol: 'NOW', name: 'ServiceNow Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'ARM', name: 'Arm Holdings plc ADR', exchange: 'NASDAQ', country: 'United Kingdom', currency: 'USD', type: 'ADR' },
    { symbol: 'PLTR', name: 'Palantir Technologies Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'UBER', name: 'Uber Technologies Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'ABNB', name: 'Airbnb Inc Class A', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'SNOW', name: 'Snowflake Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'COIN', name: 'Coinbase Global Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc Class B', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['Berkshire Hathaway B', 'BRKB'] },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['JP Morgan'] },
    { symbol: 'V', name: 'Visa Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'BAC', name: 'Bank of America Corporation', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'WFC', name: 'Wells Fargo & Co', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'GS', name: 'Goldman Sachs Group Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'MS', name: 'Morgan Stanley', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'BLK', name: 'BlackRock Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['Eli Lilly'] },
    { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'MRK', name: 'Merck & Co Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'ABBV', name: 'AbbVie Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'PFE', name: 'Pfizer Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'NVO', name: 'Novo Nordisk A/S ADR', exchange: 'NYSE', country: 'Denmark', currency: 'USD', type: 'ADR', aliases: ['Novo Nordisk'] },
    { symbol: 'PG', name: 'Procter & Gamble Company', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'KO', name: 'Coca-Cola Company', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['Coke'] },
    { symbol: 'PEP', name: 'PepsiCo Inc', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'MCD', name: "McDonald's Corporation", exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'COST', name: 'Costco Wholesale Corporation', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'WMT', name: 'Walmart Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'HD', name: 'Home Depot Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['The Home Depot'] },
    { symbol: 'NKE', name: 'Nike Inc Class B', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'DIS', name: 'Walt Disney Company', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['Disney'] },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['ExxonMobil'] },
    { symbol: 'CVX', name: 'Chevron Corporation', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'COP', name: 'ConocoPhillips', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'GE', name: 'GE Aerospace', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['General Electric'] },
    { symbol: 'CAT', name: 'Caterpillar Inc', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'DE', name: 'Deere & Company', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock', aliases: ['John Deere'] },
    { symbol: 'BA', name: 'Boeing Company', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'LMT', name: 'Lockheed Martin Corporation', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Common Stock' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF Trust', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'VT', name: 'Vanguard Total World Stock ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', exchange: 'NYSE Arca', country: 'United States', currency: 'USD', type: 'ETF' },
    { symbol: 'BMW', name: 'Bayerische Motoren Werke AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'MBG', name: 'Mercedes-Benz Group AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'VOW3', name: 'Volkswagen AG Preference Shares', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Preferred Stock', aliases: ['Volkswagen'] },
    { symbol: 'SAP', name: 'SAP SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'SIE', name: 'Siemens AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'ALV', name: 'Allianz SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'DTE', name: 'Deutsche Telekom AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'AIR', name: 'Airbus SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'BAS', name: 'BASF SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'BAYN', name: 'Bayer AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'DBK', name: 'Deutsche Bank AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'DHL', name: 'DHL Group AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock', aliases: ['Deutsche Post'] },
    { symbol: 'IFX', name: 'Infineon Technologies AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'ADS', name: 'adidas AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'RHM', name: 'Rheinmetall AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'MUV2', name: 'Munich Re', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock', aliases: ['Muenchener Rueck'] },
    { symbol: 'HNR1', name: 'Hannover Rueck SE', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock', aliases: ['Hannover Re'] },
    { symbol: 'MRK', name: 'Merck KGaA', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'BEI', name: 'Beiersdorf AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'HEN3', name: 'Henkel AG & Co KGaA Preferred Shares', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Preferred Stock', aliases: ['Henkel'] },
    { symbol: 'P911', name: 'Porsche AG', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'ASML', name: 'ASML Holding NV', exchange: 'Euronext Amsterdam', country: 'Netherlands', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'ADYEN', name: 'Adyen NV', exchange: 'Euronext Amsterdam', country: 'Netherlands', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'PRX', name: 'Prosus NV', exchange: 'Euronext Amsterdam', country: 'Netherlands', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'MC', name: 'LVMH Moet Hennessy Louis Vuitton SE', exchange: 'Euronext Paris', country: 'France', currency: 'EUR', type: 'Common Stock', aliases: ['LVMH'] },
    { symbol: 'OR', name: "L'Oreal SA", exchange: 'Euronext Paris', country: 'France', currency: 'EUR', type: 'Common Stock', aliases: ['Loreal'] },
    { symbol: 'RMS', name: 'Hermes International SCA', exchange: 'Euronext Paris', country: 'France', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'TTE', name: 'TotalEnergies SE', exchange: 'Euronext Paris', country: 'France', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'AI', name: 'Air Liquide SA', exchange: 'Euronext Paris', country: 'France', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'SU', name: 'Schneider Electric SE', exchange: 'Euronext Paris', country: 'France', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'BNP', name: 'BNP Paribas SA', exchange: 'Euronext Paris', country: 'France', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'ENEL', name: 'Enel SpA', exchange: 'Borsa Italiana', country: 'Italy', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'ENI', name: 'Eni SpA', exchange: 'Borsa Italiana', country: 'Italy', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'ISP', name: 'Intesa Sanpaolo SpA', exchange: 'Borsa Italiana', country: 'Italy', currency: 'EUR', type: 'Common Stock' },
    { symbol: 'RACE', name: 'Ferrari NV', exchange: 'Borsa Italiana', country: 'Italy', currency: 'EUR', type: 'Common Stock', aliases: ['Ferrari'] },
    { symbol: 'NESN', name: 'Nestle SA', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock' },
    { symbol: 'NOVN', name: 'Novartis AG', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock' },
    { symbol: 'ROG', name: 'Roche Holding AG', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock' },
    { symbol: 'UBSG', name: 'UBS Group AG', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock', aliases: ['UBS'] },
    { symbol: 'ZURN', name: 'Zurich Insurance Group AG', exchange: 'SIX Swiss Exchange', country: 'Switzerland', currency: 'CHF', type: 'Common Stock' },
    { symbol: 'SHEL', name: 'Shell plc', exchange: 'London Stock Exchange', country: 'United Kingdom', currency: 'GBX', type: 'Common Stock' },
    { symbol: 'AZN', name: 'AstraZeneca plc', exchange: 'London Stock Exchange', country: 'United Kingdom', currency: 'GBX', type: 'Common Stock' },
    { symbol: 'HSBA', name: 'HSBC Holdings plc', exchange: 'London Stock Exchange', country: 'United Kingdom', currency: 'GBX', type: 'Common Stock' },
    { symbol: 'ULVR', name: 'Unilever plc', exchange: 'London Stock Exchange', country: 'United Kingdom', currency: 'GBX', type: 'Common Stock' },
    { symbol: 'BABA', name: 'Alibaba Group Holding Limited ADR', exchange: 'NYSE', country: 'China', currency: 'USD', type: 'ADR', aliases: ['Alibaba'] },
    { symbol: 'PDD', name: 'PDD Holdings Inc ADR', exchange: 'NASDAQ', country: 'China', currency: 'USD', type: 'ADR', aliases: ['Pinduoduo'] },
    { symbol: 'BIDU', name: 'Baidu Inc ADR', exchange: 'NASDAQ', country: 'China', currency: 'USD', type: 'ADR' },
    { symbol: 'JD', name: 'JD.com Inc ADR', exchange: 'NASDAQ', country: 'China', currency: 'USD', type: 'ADR' },
    { symbol: 'NIO', name: 'NIO Inc ADR', exchange: 'NYSE', country: 'China', currency: 'USD', type: 'ADR' },
    { symbol: 'SE', name: 'Sea Limited ADR', exchange: 'NYSE', country: 'Singapore', currency: 'USD', type: 'ADR' },
    { symbol: '7203', name: 'Toyota Motor Corporation', exchange: 'Tokyo Stock Exchange', country: 'Japan', currency: 'JPY', type: 'Common Stock', aliases: ['Toyota'] },
    { symbol: '6758', name: 'Sony Group Corporation', exchange: 'Tokyo Stock Exchange', country: 'Japan', currency: 'JPY', type: 'Common Stock', aliases: ['Sony'] },
    { symbol: '9984', name: 'SoftBank Group Corp', exchange: 'Tokyo Stock Exchange', country: 'Japan', currency: 'JPY', type: 'Common Stock', aliases: ['SoftBank'] },
    { symbol: '6861', name: 'Keyence Corporation', exchange: 'Tokyo Stock Exchange', country: 'Japan', currency: 'JPY', type: 'Common Stock' },
    { symbol: '8306', name: 'Mitsubishi UFJ Financial Group Inc', exchange: 'Tokyo Stock Exchange', country: 'Japan', currency: 'JPY', type: 'Common Stock' },
    { symbol: '0700', name: 'Tencent Holdings Ltd', exchange: 'Hong Kong Exchange', country: 'Hong Kong', currency: 'HKD', type: 'Common Stock', aliases: ['Tencent'] },
    { symbol: '9988', name: 'Alibaba Group Holding Limited', exchange: 'Hong Kong Exchange', country: 'Hong Kong', currency: 'HKD', type: 'Common Stock', aliases: ['Alibaba HK'] },
    { symbol: '3690', name: 'Meituan', exchange: 'Hong Kong Exchange', country: 'Hong Kong', currency: 'HKD', type: 'Common Stock' },
    { symbol: '1299', name: 'AIA Group Limited', exchange: 'Hong Kong Exchange', country: 'Hong Kong', currency: 'HKD', type: 'Common Stock' },
    { symbol: '005930', name: 'Samsung Electronics Co Ltd', exchange: 'Korea Exchange', country: 'South Korea', currency: 'KRW', type: 'Common Stock', aliases: ['Samsung'] },
    { symbol: '000660', name: 'SK Hynix Inc', exchange: 'Korea Exchange', country: 'South Korea', currency: 'KRW', type: 'Common Stock' },
    { symbol: 'DAX', name: 'DAX Performance Index', exchange: 'Deutsche Boerse', country: 'Germany', currency: 'EUR', type: 'Index' },
    { symbol: 'SPX', name: 'S&P 500 Index', exchange: 'CBOE', country: 'United States', currency: 'USD', type: 'Index' },
    { symbol: 'NDX', name: 'NASDAQ 100 Index', exchange: 'NASDAQ', country: 'United States', currency: 'USD', type: 'Index' },
    { symbol: 'DJI', name: 'Dow Jones Industrial Average', exchange: 'NYSE', country: 'United States', currency: 'USD', type: 'Index' },
    { symbol: 'SX5E', name: 'EURO STOXX 50 Index', exchange: 'STOXX', country: 'Europe', currency: 'EUR', type: 'Index' },
    { symbol: 'IWDA', name: 'iShares Core MSCI World UCITS ETF', exchange: 'Euronext Amsterdam', country: 'Netherlands', currency: 'EUR', type: 'ETF' },
    { symbol: 'EUNL', name: 'iShares Core MSCI World UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
    { symbol: 'VWCE', name: 'Vanguard FTSE All-World UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
    { symbol: 'SXR8', name: 'iShares Core S&P 500 UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
    { symbol: 'EXS1', name: 'iShares Core DAX UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' },
    { symbol: 'VUSA', name: 'Vanguard S&P 500 UCITS ETF', exchange: 'London Stock Exchange', country: 'Ireland', currency: 'GBP', type: 'ETF' },
    { symbol: 'CSPX', name: 'iShares Core S&P 500 UCITS ETF', exchange: 'London Stock Exchange', country: 'Ireland', currency: 'GBP', type: 'ETF' },
    { symbol: 'IS3N', name: 'iShares Core MSCI Emerging Markets IMI UCITS ETF', exchange: 'XETRA', country: 'Germany', currency: 'EUR', type: 'ETF' }
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

  function getAliases(item) {
    if (Array.isArray(item.aliases)) return item.aliases.map(alias => String(alias).toLowerCase());
    if (item.aliases) return [String(item.aliases).toLowerCase()];
    return [];
  }

  function scoreSymbol(item, query) {
    const symbol = String(item.symbol || '').toLowerCase();
    const name = String(item.name || '').toLowerCase();
    const exchange = String(item.exchange || '').toLowerCase();
    const country = String(item.country || '').toLowerCase();
    const currency = String(item.currency || '').toLowerCase();
    const type = String(item.type || '').toLowerCase();
    const aliases = getAliases(item);
    let score = 0;

    if (symbol === query) score += 100;
    if (aliases.some(alias => alias === query)) score += 90;
    if (symbol.startsWith(query)) score += 55;
    if (aliases.some(alias => alias.startsWith(query))) score += 45;
    if (name.startsWith(query)) score += 40;
    if (symbol.includes(query)) score += 24;
    if (aliases.some(alias => alias.includes(query))) score += 20;
    if (name.includes(query)) score += 18;
    if (exchange.includes(query) || country.includes(query) || currency === query || type.includes(query)) score += 8;

    return score;
  }

  function searchFallback(query, limit = 10) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];

    return FALLBACK_SYMBOLS
      .map(item => ({ ...item, score: scoreSymbol(item, q) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map(({ score, aliases, ...item }) => normalizeSymbol(item, 'fallback'));
  }

  return { FALLBACK_SYMBOLS, normalizeSymbol, searchFallback };
});
