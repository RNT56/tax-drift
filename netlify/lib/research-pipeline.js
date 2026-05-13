const crypto = require('node:crypto');
const { XMLParser } = require('fast-xml-parser');
const cheerio = require('cheerio');
const {
  enhanceMemoWithAi,
  lookupSecCompany,
  fetchSecSubmissions,
  fetchSecCompanyFacts,
  latestFiling,
  latestUsdFact,
  validateAiMemoPayload
} = require('./research-sources');
const { callAiProviderJson, providerConfig, getConfiguredAiProviders } = require('./ai-providers');
const { getConfiguredProviders } = require('./market-data-providers');

const DEFAULT_USER_AGENT = 'TaxSwitch research-suite contact@example.com';
const MAX_TEXT_CHARS = 12000;
const MAX_EVIDENCE_TEXT = 900;
const MAX_EVENTS = 24;
const MAX_RSS_ITEMS = 8;
const MAX_SOURCE_PAYLOAD_CHARS = 40000;

function clean(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function truncate(value, max = MAX_TEXT_CHARS) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24);
}

function nowIso() {
  return new Date().toISOString();
}

function dateOnly(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : nowIso().slice(0, 10);
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const number = Number(String(value).replace(/[%,$\s]/g, '').replace(',', '.'));
  return Number.isFinite(number) ? number : NaN;
}

function confidence(value) {
  return ['low', 'medium', 'high'].includes(value) ? value : 'medium';
}

function safeArray(value) {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function safeJson(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return '';
  }
}

function compactPayload(value) {
  const text = safeJson(value);
  if (!text) return null;
  if (text.length <= MAX_SOURCE_PAYLOAD_CHARS) return value;
  return {
    truncated: true,
    sha256: hash(text),
    excerpt: text.slice(0, MAX_SOURCE_PAYLOAD_CHARS)
  };
}

function sourceId(sourceType, sourceName, url = '', extra = '') {
  return `src-${hash([sourceType, sourceName, url, extra].join('|'))}`;
}

function evidenceId(sourceName, claim, evidenceText) {
  return `ev-${hash([sourceName, claim, evidenceText].join('|'))}`;
}

function makeSnapshot(input = {}) {
  const payloadText = safeJson(input.rawPayload ?? input.metadata ?? {});
  return {
    id: input.id || sourceId(input.sourceType, input.sourceName, input.url, input.status),
    sourceType: clean(input.sourceType, 'unknown'),
    sourceName: clean(input.sourceName, input.sourceType || 'Source'),
    status: clean(input.status, 'available'),
    url: clean(input.url),
    fetchedAt: input.fetchedAt || nowIso(),
    sourceDate: clean(input.sourceDate),
    freshness: clean(input.freshness, input.status === 'available' ? 'current' : 'unknown'),
    contentHash: input.contentHash || (payloadText ? hash(payloadText) : ''),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    rawPayload: input.storeRaw ? compactPayload(input.rawPayload) : null,
    errorCode: clean(input.errorCode),
    errorMessage: truncate(input.errorMessage, 500)
  };
}

function makeEvidence(input = {}) {
  const item = {
    id: input.id || evidenceId(input.sourceName, input.claim, input.evidence),
    category: clean(input.category, 'context'),
    claim: truncate(input.claim, 260),
    evidence: truncate(input.evidence, MAX_EVIDENCE_TEXT),
    sourceUrl: clean(input.sourceUrl),
    sourceName: clean(input.sourceName, 'Research source'),
    sourceDate: clean(input.sourceDate),
    confidence: confidence(input.confidence),
    thesisImpact: truncate(input.thesisImpact || 'neutral', 160),
    sourceSnapshotId: clean(input.sourceSnapshotId),
    sourceEvidenceIds: safeArray(input.sourceEvidenceIds).map(clean).filter(Boolean).slice(0, 8),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
  if (!item.claim || !item.evidence) return null;
  return item;
}

function makeMetric(input = {}) {
  const value = parseNumber(input.value);
  return {
    category: clean(input.category, 'fundamentals'),
    label: truncate(input.label, 120),
    value: Number.isFinite(value) ? value : null,
    textValue: clean(input.textValue),
    unit: clean(input.unit),
    period: clean(input.period),
    sourceEvidenceIds: safeArray(input.sourceEvidenceIds).map(clean).filter(Boolean).slice(0, 8),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
}

function makeEvent(input = {}) {
  const riskScore = Math.min(Math.max(parseNumber(input.riskScore), 0), 1);
  const directness = Math.min(Math.max(parseNumber(input.directness), 0), 1);
  const severity = ['low', 'medium', 'high'].includes(input.severity) ? input.severity : riskScore > 0.72 ? 'high' : riskScore > 0.42 ? 'medium' : 'low';
  return {
    id: input.id || `event-${hash([input.sourceName, input.title, input.occurredAt].join('|'))}`,
    type: clean(input.type || input.eventType, 'news'),
    title: truncate(input.title, 180),
    summary: truncate(input.summary, 600),
    occurredAt: clean(input.occurredAt),
    sourceName: clean(input.sourceName, 'Event source'),
    sourceUrl: clean(input.sourceUrl),
    severity,
    directness: Number.isFinite(directness) ? directness : 0,
    riskScore: Number.isFinite(riskScore) ? riskScore : 0,
    affectedCountries: safeArray(input.affectedCountries).map(clean).filter(Boolean).slice(0, 12),
    affectedSectors: safeArray(input.affectedSectors).map(clean).filter(Boolean).slice(0, 12),
    sourceEvidenceIds: safeArray(input.sourceEvidenceIds).map(clean).filter(Boolean).slice(0, 8),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
}

async function fetchJson(url, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl(url, {
    method: options.method || 'GET',
    headers: {
      'User-Agent': options.userAgent || DEFAULT_USER_AGENT,
      Accept: 'application/json',
      ...(options.headers || {})
    },
    body: options.body
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error?.message || `${response.status} from ${url}`);
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

async function fetchText(url, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': options.userAgent || DEFAULT_USER_AGENT,
      Accept: options.accept || 'text/html, application/xml, text/xml, */*',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`${response.status} from ${url}`);
    error.statusCode = response.status;
    throw error;
  }
  return text;
}

function sourceStatus(sourceType, sourceName, status, details = {}) {
  return {
    sourceType,
    sourceName,
    status,
    configured: status !== 'premium-key-missing' && status !== 'provider-unavailable',
    freshness: details.freshness || (status === 'available' ? 'current' : 'unknown'),
    premium: Boolean(details.premium),
    message: clean(details.message),
    checkedAt: nowIso()
  };
}

function getResearchStatus(env = process.env) {
  const marketProviders = getConfiguredProviders(env).map(provider => provider.id);
  const aiProviders = getConfiguredAiProviders(env).map(provider => provider.id);
  const rssFeeds = parseFeedConfig(env.RESEARCH_RSS_FEEDS);
  return {
    scope: ['equity', 'etf'],
    advisoryMode: 'non-advisory',
    configured: {
      marketDataProviders: marketProviders,
      aiProviders,
      rssFeedCount: rssFeeds.length,
      fmp: Boolean(env.FMP_API_KEY),
      alphaVantage: Boolean(env.ALPHA_VANTAGE_API_KEY),
      finnhub: Boolean(env.FINNHUB_API_KEY),
      fred: Boolean(env.FRED_API_KEY),
      secHtmlExtraction: env.RESEARCH_FETCH_SEC_HTML !== 'false'
    },
    capabilities: {
      filings: 'available',
      fundamentals: 'available',
      historicalPrices: marketProviders.length ? 'available' : 'provider-key-missing',
      valuation: env.FMP_API_KEY || env.ALPHA_VANTAGE_API_KEY ? 'available' : 'partial',
      etfHoldings: env.FMP_API_KEY || env.ALPHA_VANTAGE_API_KEY || env.FINNHUB_API_KEY ? 'available' : 'premium-key-missing',
      transcripts: env.FMP_API_KEY || env.FINNHUB_API_KEY || env.ALPHA_VANTAGE_API_KEY ? 'available' : 'premium-key-missing',
      insiderOwnership: env.FMP_API_KEY || env.FINNHUB_API_KEY || env.ALPHA_VANTAGE_API_KEY ? 'available' : 'premium-key-missing',
      globalEvents: 'available',
      sanctions: 'available',
      rss: rssFeeds.length ? 'available' : 'not-configured',
      aiResearch: aiProviders.length ? 'available' : 'evidence-only'
    }
  };
}

function buildSecArchiveUrl(cik, filing) {
  if (!cik || !filing?.accessionNumber || !filing?.primaryDocument) return '';
  const compactAccession = String(filing.accessionNumber).replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${compactAccession}/${filing.primaryDocument}`;
}

function normalizeWhitespace(text) {
  return clean(text).replace(/\s+/g, ' ');
}

function extractBetween(text, startPatterns, endPatterns) {
  const lowerText = text.toLowerCase();
  const starts = startPatterns
    .map(pattern => lowerText.search(pattern))
    .filter(index => index >= 0)
    .sort((a, b) => a - b);
  if (!starts.length) return '';
  const start = starts[0];
  const nextEnd = endPatterns
    .map(pattern => {
      const sliced = lowerText.slice(start + 20);
      const index = sliced.search(pattern);
      return index >= 0 ? start + 20 + index : -1;
    })
    .filter(index => index > start)
    .sort((a, b) => a - b)[0];
  return truncate(normalizeWhitespace(text.slice(start, nextEnd > start ? nextEnd : start + 7000)), 1800);
}

function extractFilingSections(html) {
  const $ = cheerio.load(String(html || ''));
  $('script, style, noscript').remove();
  const text = normalizeWhitespace($('body').text() || $.text());
  if (!text) return {};
  return {
    business: extractBetween(text, [/item\s+1[\.\s]+business/i, /business overview/i], [/item\s+1a[\.\s]+risk/i, /item\s+2[\.\s]+properties/i]),
    riskFactors: extractBetween(text, [/item\s+1a[\.\s]+risk factors/i, /risk factors/i], [/item\s+1b/i, /item\s+2[\.\s]+properties/i]),
    mdna: extractBetween(text, [/item\s+7[\.\s]+management/i, /management.?s discussion/i], [/item\s+7a/i, /item\s+8[\.\s]+financial/i])
  };
}

function factMetric(companyFacts, concepts, input) {
  const fact = latestUsdFact(companyFacts, concepts);
  if (!fact) return null;
  const value = parseNumber(fact.val);
  if (!Number.isFinite(value)) return null;
  return makeMetric({
    category: input.category,
    label: input.label,
    value,
    unit: fact.unit || 'reported',
    period: fact.end || String(fact.fy || ''),
    sourceEvidenceIds: input.sourceEvidenceIds,
    metadata: { concept: fact.concept, filed: fact.filed || '' }
  });
}

async function collectSecEvidence(subject, options, ctx) {
  const snapshots = [];
  const evidence = [];
  const metrics = [];
  const sourceErrors = [];
  let company = null;
  let submissions = null;
  let facts = null;

  try {
    company = await lookupSecCompany(subject.symbol, options);
    snapshots.push(makeSnapshot({
      sourceType: 'filings',
      sourceName: 'SEC company tickers',
      status: company ? 'available' : 'not-found',
      url: 'https://www.sec.gov/files/company_tickers.json',
      rawPayload: company,
      metadata: { symbol: subject.symbol }
    }));
    if (company) {
      evidence.push(makeEvidence({
        category: 'identity',
        claim: `${subject.symbol} maps to an SEC company record.`,
        evidence: `${company.title} maps to CIK ${company.cik}.`,
        sourceUrl: company.sourceUrl,
        sourceName: 'SEC company tickers',
        confidence: 'high',
        thesisImpact: 'identity',
        sourceSnapshotId: snapshots[snapshots.length - 1].id
      }));
    }
  } catch (error) {
    sourceErrors.push(`SEC company lookup failed: ${error.message || error}`);
    snapshots.push(makeSnapshot({
      sourceType: 'filings',
      sourceName: 'SEC company tickers',
      status: 'source-error',
      errorCode: 'sec_lookup_failed',
      errorMessage: error.message || String(error)
    }));
  }

  if (!company?.cik) return { snapshots, evidence, metrics, events: [], sourceErrors, company: null };

  try {
    submissions = await fetchSecSubmissions(company.cik, options);
    const filing = latestFiling(submissions?.payload);
    const snapshot = makeSnapshot({
      sourceType: 'filings',
      sourceName: 'SEC submissions API',
      status: filing ? 'available' : 'not-found',
      url: submissions?.url,
      sourceDate: filing?.filingDate || '',
      rawPayload: submissions?.payload,
      metadata: { cik: company.cik, latestForm: filing?.form || '' }
    });
    snapshots.push(snapshot);
    if (filing) {
      const filingUrl = buildSecArchiveUrl(company.cik, filing);
      const filingEvidence = makeEvidence({
        category: 'filings',
        claim: 'Recent primary filing is available.',
        evidence: `${filing.form} filed ${filing.filingDate || 'recently'}${filing.reportDate ? ` for period ${filing.reportDate}` : ''}.`,
        sourceUrl: filingUrl || submissions.url,
        sourceName: 'SEC submissions API',
        sourceDate: filing.filingDate,
        confidence: 'high',
        thesisImpact: 'primary-source context',
        sourceSnapshotId: snapshot.id,
        metadata: filing
      });
      evidence.push(filingEvidence);
      if (filingEvidence) {
        ctx.latestFiling = { ...filing, url: filingUrl, evidenceId: filingEvidence.id };
      }
    }
  } catch (error) {
    sourceErrors.push(`SEC submissions failed: ${error.message || error}`);
    snapshots.push(makeSnapshot({
      sourceType: 'filings',
      sourceName: 'SEC submissions API',
      status: 'source-error',
      errorCode: 'sec_submissions_failed',
      errorMessage: error.message || String(error),
      metadata: { cik: company.cik }
    }));
  }

  try {
    facts = await fetchSecCompanyFacts(company.cik, options);
    const snapshot = makeSnapshot({
      sourceType: 'fundamentals',
      sourceName: 'SEC companyfacts API',
      status: facts?.payload ? 'available' : 'not-found',
      url: facts?.url,
      rawPayload: facts?.payload,
      metadata: { cik: company.cik }
    });
    snapshots.push(snapshot);
    const factsPayload = facts?.payload;
    const concepts = [
      [['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'], 'fundamentals', 'Revenue'],
      [['NetIncomeLoss', 'ProfitLoss'], 'fundamentals', 'Net income'],
      [['OperatingIncomeLoss'], 'fundamentals', 'Operating income'],
      [['NetCashProvidedByUsedInOperatingActivities'], 'quality', 'Operating cash flow'],
      [['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'], 'balance-sheet', 'Cash and equivalents'],
      [['LongTermDebtCurrent', 'LongTermDebtNoncurrent', 'DebtCurrent'], 'balance-sheet', 'Debt'],
      [['CommonStocksIncludingAdditionalPaidInCapital', 'CommonStockSharesOutstanding'], 'dilution', 'Share count / equity capital'],
      [['PaymentsOfDividends', 'PaymentsOfDividendsCommonStock'], 'capital-return', 'Dividends paid']
    ];
    for (const [conceptNames, category, label] of concepts) {
      const metric = factMetric(factsPayload, conceptNames, { category, label });
      if (!metric) continue;
      const ev = makeEvidence({
        category,
        claim: `${label} fact is available from SEC XBRL.`,
        evidence: `${metric.label}: ${Number(metric.value).toLocaleString('en-US')} for ${metric.period || 'latest reported period'}.`,
        sourceUrl: facts.url,
        sourceName: 'SEC companyfacts API',
        sourceDate: metric.metadata?.filed || metric.period || '',
        confidence: 'medium',
        thesisImpact: category,
        sourceSnapshotId: snapshot.id
      });
      if (ev) {
        metric.sourceEvidenceIds = [ev.id];
        evidence.push(ev);
        metrics.push(metric);
      }
    }
  } catch (error) {
    sourceErrors.push(`SEC companyfacts failed: ${error.message || error}`);
    snapshots.push(makeSnapshot({
      sourceType: 'fundamentals',
      sourceName: 'SEC companyfacts API',
      status: 'source-error',
      errorCode: 'sec_companyfacts_failed',
      errorMessage: error.message || String(error),
      metadata: { cik: company.cik }
    }));
  }

  const htmlSource = options.secFilingHtml
    ? String(options.secFilingHtml)
    : ctx.latestFiling?.url && options.env?.RESEARCH_FETCH_SEC_HTML !== 'false'
      ? await fetchText(ctx.latestFiling.url, options).catch((error) => {
        sourceErrors.push(`SEC filing HTML extraction skipped: ${error.message || error}`);
        return '';
      })
      : '';
  if (htmlSource) {
    const sections = extractFilingSections(htmlSource);
    const snapshot = makeSnapshot({
      sourceType: 'filing-text',
      sourceName: 'SEC filing document',
      status: sections.business || sections.riskFactors || sections.mdna ? 'available' : 'partial',
      url: ctx.latestFiling?.url || '',
      metadata: { extractedSections: Object.keys(sections).filter(key => sections[key]) }
    });
    snapshots.push(snapshot);
    if (sections.business) {
      evidence.push(makeEvidence({
        category: 'business',
        claim: 'Business and product/value proposition text is available from the latest filing.',
        evidence: sections.business,
        sourceUrl: ctx.latestFiling?.url || '',
        sourceName: 'SEC filing document',
        sourceDate: ctx.latestFiling?.filingDate || '',
        confidence: 'medium',
        thesisImpact: 'business model',
        sourceSnapshotId: snapshot.id,
        sourceEvidenceIds: ctx.latestFiling?.evidenceId ? [ctx.latestFiling.evidenceId] : []
      }));
    }
    if (sections.riskFactors) {
      evidence.push(makeEvidence({
        category: 'risk',
        claim: 'Risk-factor disclosure is available from the latest filing.',
        evidence: sections.riskFactors,
        sourceUrl: ctx.latestFiling?.url || '',
        sourceName: 'SEC filing document',
        sourceDate: ctx.latestFiling?.filingDate || '',
        confidence: 'medium',
        thesisImpact: 'risk',
        sourceSnapshotId: snapshot.id,
        sourceEvidenceIds: ctx.latestFiling?.evidenceId ? [ctx.latestFiling.evidenceId] : []
      }));
    }
  }

  return { snapshots, evidence: evidence.filter(Boolean), metrics, events: [], sourceErrors, company };
}

async function fetchFmpStable(path, params, options = {}, overrideKey) {
  const env = options.env || {};
  const apiKey = clean(options.apiKey || env.FMP_API_KEY);
  const override = overrideKey ? options[overrideKey] : undefined;
  if (override !== undefined) return { url: `mock://fmp/${path}`, payload: override };
  if (!apiKey) return null;
  const url = new URL(`https://financialmodelingprep.com/stable/${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  url.searchParams.set('apikey', apiKey);
  return { url: url.toString(), payload: await fetchJson(url.toString(), options) };
}

function firstRow(payload) {
  return Array.isArray(payload) ? payload[0] : payload && typeof payload === 'object' ? payload : null;
}

function normalizeEtfHoldings(payload) {
  return safeArray(payload).map((item) => ({
    symbol: clean(item.symbol || item.asset || item.holdingSymbol || item.ticker),
    name: clean(item.name || item.assetName || item.holdingName || item.description),
    weight: parseNumber(item.weightPercentage ?? item.weight ?? item.percent ?? item.holdingPercent),
    sector: clean(item.sector),
    country: clean(item.country)
  })).filter(item => item.symbol || item.name).slice(0, 25);
}

function addProviderMetric(evidence, metrics, metricInput, evidenceInput) {
  const metric = makeMetric(metricInput);
  const ev = makeEvidence(evidenceInput);
  if (!metric.label || !ev) return;
  metric.sourceEvidenceIds = [ev.id];
  evidence.push(ev);
  metrics.push(metric);
}

async function collectFmpEvidence(subject, options) {
  const snapshots = [];
  const evidence = [];
  const metrics = [];
  const events = [];
  const sourceErrors = [];
  const env = options.env || {};
  const configured = Boolean(env.FMP_API_KEY || options.fmpProfile || options.fmpRatios || options.fmpNews);

  if (!configured) {
    snapshots.push(makeSnapshot({
      sourceType: 'provider',
      sourceName: 'Financial Modeling Prep',
      status: 'premium-key-missing',
      errorCode: 'fmp_key_missing',
      errorMessage: 'FMP_API_KEY is not configured.'
    }));
    return { snapshots, evidence, metrics, events, sourceErrors };
  }

  const symbol = subject.providerSymbols?.fmp || subject.symbol;
  const calls = [
    ['profile', { symbol }, 'fmpProfile'],
    ['ratios', { symbol, period: 'annual', limit: 1 }, 'fmpRatios'],
    ['news/stock', { symbols: symbol, limit: 10 }, 'fmpNews'],
    ['stock-peers', { symbol }, 'fmpPeers'],
    ['analyst-estimates', { symbol, period: 'annual', limit: 2 }, 'fmpEstimates'],
    ['earnings-calendar', { symbol, limit: 4 }, 'fmpEarningsCalendar'],
    ['insider-trading', { symbol, limit: 5 }, 'fmpInsider'],
    ['etf-holder', { symbol }, 'fmpEtfHoldings']
  ];

  for (const [path, params, overrideKey] of calls) {
    try {
      const result = await fetchFmpStable(path, params, options, overrideKey);
      if (!result) continue;
      const status = result.payload && (!Array.isArray(result.payload) || result.payload.length) ? 'available' : 'not-found';
      const snapshot = makeSnapshot({
        sourceType: path.includes('news') ? 'news' : path.includes('etf') ? 'etf' : 'provider',
        sourceName: `Financial Modeling Prep ${path}`,
        status,
        url: result.url,
        rawPayload: path.includes('news')
          ? { items: safeArray(result.payload).slice(0, 10).map(item => ({ title: item.title, url: item.url, site: item.site, publishedDate: item.publishedDate || item.date })) }
          : result.payload,
        metadata: { symbol, path, rawPayloadLimited: path.includes('news') }
      });
      snapshots.push(snapshot);

      if (path === 'profile') {
        const profile = firstRow(result.payload);
        if (profile) {
          const profileText = [profile.companyName || profile.companyName, profile.sector, profile.industry, profile.country].filter(Boolean).join(' / ');
          evidence.push(makeEvidence({
            category: 'business',
            claim: 'Provider profile supplies company, sector and industry context.',
            evidence: profileText || `${symbol} provider profile is available.`,
            sourceUrl: result.url,
            sourceName: snapshot.sourceName,
            sourceDate: dateOnly(),
            confidence: 'medium',
            thesisImpact: 'business context',
            sourceSnapshotId: snapshot.id
          }));
          addProviderMetric(evidence, metrics, {
            category: 'valuation',
            label: 'Market capitalization',
            value: profile.marketCap,
            unit: profile.currency || subject.currency || '',
            period: dateOnly()
          }, {
            category: 'valuation',
            claim: 'Market capitalization is available from configured provider.',
            evidence: `${symbol} market cap ${parseNumber(profile.marketCap).toLocaleString('en-US')} ${profile.currency || ''}.`.trim(),
            sourceUrl: result.url,
            sourceName: snapshot.sourceName,
            sourceDate: dateOnly(),
            confidence: 'medium',
            thesisImpact: 'valuation',
            sourceSnapshotId: snapshot.id
          });
        }
      }

      if (path === 'ratios') {
        const ratio = firstRow(result.payload);
        if (ratio) {
          [
            ['valuation', 'P/E ratio', ratio.priceEarningsRatio ?? ratio.peRatio, 'x'],
            ['quality', 'Free-cash-flow yield', ratio.freeCashFlowYield, 'fraction'],
            ['balance-sheet', 'Debt-to-equity ratio', ratio.debtEquityRatio, 'x'],
            ['profitability', 'Gross margin', ratio.grossProfitMargin, 'fraction'],
            ['profitability', 'Operating margin', ratio.operatingProfitMargin, 'fraction']
          ].forEach(([category, label, value, unit]) => {
            if (!Number.isFinite(parseNumber(value))) return;
            addProviderMetric(evidence, metrics, { category, label, value, unit, period: ratio.date || dateOnly() }, {
              category,
              claim: `${label} is available from configured provider.`,
              evidence: `${label}: ${parseNumber(value).toLocaleString('en-US', { maximumFractionDigits: 4 })}.`,
              sourceUrl: result.url,
              sourceName: snapshot.sourceName,
              sourceDate: ratio.date || dateOnly(),
              confidence: 'medium',
              thesisImpact: category,
              sourceSnapshotId: snapshot.id
            });
          });
        }
      }

      if (path === 'news/stock') {
        safeArray(result.payload).slice(0, 8).forEach((item) => {
          if (!item?.title) return;
          const ev = makeEvidence({
            category: 'news',
            claim: 'Recent provider news item is available for review.',
            evidence: item.title,
            sourceUrl: item.url || result.url,
            sourceName: item.site || snapshot.sourceName,
            sourceDate: item.publishedDate || item.date || '',
            confidence: 'medium',
            thesisImpact: 'current events',
            sourceSnapshotId: snapshot.id
          });
          if (ev) {
            evidence.push(ev);
            events.push(scoreResearchEvent(makeEvent({
              type: 'company-news',
              title: item.title,
              summary: item.text || item.title,
              occurredAt: item.publishedDate || item.date || '',
              sourceName: item.site || snapshot.sourceName,
              sourceUrl: item.url || result.url,
              directness: 0.9,
              affectedSectors: subject.sector ? [subject.sector] : [],
              sourceEvidenceIds: [ev.id]
            }), subject));
          }
        });
      }

      if (path === 'stock-peers') {
        const peers = safeArray(result.payload?.peersList || result.payload).map(item => clean(item.symbol || item)).filter(Boolean).slice(0, 12);
        if (peers.length) {
          evidence.push(makeEvidence({
            category: 'valuation',
            claim: 'Peer set is available from configured provider.',
            evidence: `Peers: ${peers.join(', ')}.`,
            sourceUrl: result.url,
            sourceName: snapshot.sourceName,
            sourceDate: dateOnly(),
            confidence: 'medium',
            thesisImpact: 'valuation comparison',
            sourceSnapshotId: snapshot.id,
            metadata: { peers }
          }));
        }
      }

      if (path === 'analyst-estimates') {
        const estimate = firstRow(result.payload);
        if (estimate) {
          evidence.push(makeEvidence({
            category: 'outlook',
            claim: 'Analyst estimate data is available from configured provider.',
            evidence: `Estimate period ${estimate.date || estimate.period || 'latest'} includes revenue/EPS estimate fields where licensed by provider.`,
            sourceUrl: result.url,
            sourceName: snapshot.sourceName,
            sourceDate: estimate.date || dateOnly(),
            confidence: 'medium',
            thesisImpact: 'future outlook',
            sourceSnapshotId: snapshot.id
          }));
        }
      }

      if (path === 'earnings-calendar') {
        safeArray(result.payload).slice(0, 4).forEach((item) => {
          const title = `${symbol} earnings event${item.date ? ` on ${item.date}` : ''}`;
          const ev = makeEvent({
            type: 'earnings',
            title,
            summary: `EPS estimate ${item.epsEstimated ?? item.epsEstimate ?? 'n/a'}; revenue estimate ${item.revenueEstimated ?? 'n/a'}.`,
            occurredAt: item.date || '',
            sourceName: snapshot.sourceName,
            sourceUrl: result.url,
            directness: 1,
            riskScore: 0.58,
            severity: 'medium'
          });
          events.push(ev);
        });
      }

      if (path === 'insider-trading') {
        const rows = safeArray(result.payload).slice(0, 5);
        if (rows.length) {
          evidence.push(makeEvidence({
            category: 'ownership',
            claim: 'Insider transaction records are available from configured provider.',
            evidence: `${rows.length} recent insider transaction record${rows.length === 1 ? '' : 's'} returned for review.`,
            sourceUrl: result.url,
            sourceName: snapshot.sourceName,
            sourceDate: rows[0]?.transactionDate || dateOnly(),
            confidence: 'medium',
            thesisImpact: 'governance/ownership',
            sourceSnapshotId: snapshot.id
          }));
        }
      }

      if (path === 'etf-holder') {
        const holdings = normalizeEtfHoldings(result.payload);
        if (holdings.length) {
          const top = holdings.slice(0, 8).map(item => `${item.symbol || item.name}${Number.isFinite(item.weight) ? ` ${item.weight}%` : ''}`).join(', ');
          evidence.push(makeEvidence({
            category: 'etf',
            claim: 'ETF holdings are available from configured provider.',
            evidence: `Top holdings: ${top}.`,
            sourceUrl: result.url,
            sourceName: snapshot.sourceName,
            sourceDate: dateOnly(),
            confidence: 'medium',
            thesisImpact: 'ETF exposure',
            sourceSnapshotId: snapshot.id,
            metadata: { holdings }
          }));
        }
      }
    } catch (error) {
      sourceErrors.push(`FMP ${path} failed: ${error.message || error}`);
      snapshots.push(makeSnapshot({
        sourceType: 'provider',
        sourceName: `Financial Modeling Prep ${path}`,
        status: 'source-error',
        errorCode: 'fmp_source_failed',
        errorMessage: error.message || String(error),
        metadata: { path, symbol }
      }));
    }
  }

  return { snapshots, evidence: evidence.filter(Boolean), metrics, events, sourceErrors };
}

async function collectAlphaEvidence(subject, options) {
  const snapshots = [];
  const evidence = [];
  const metrics = [];
  const events = [];
  const sourceErrors = [];
  const env = options.env || {};
  const apiKey = clean(env.ALPHA_VANTAGE_API_KEY);
  const configured = Boolean(apiKey || options.alphaOverview || options.alphaEtfProfile || options.alphaNews);
  if (!configured) {
    snapshots.push(makeSnapshot({
      sourceType: 'provider',
      sourceName: 'Alpha Vantage',
      status: 'premium-key-missing',
      errorCode: 'alpha_key_missing',
      errorMessage: 'ALPHA_VANTAGE_API_KEY is not configured.'
    }));
    return { snapshots, evidence, metrics, events, sourceErrors };
  }
  async function alpha(functionName, extraParams, overrideKey) {
    if (options[overrideKey] !== undefined) return { url: `mock://alpha/${functionName}`, payload: options[overrideKey] };
    const url = new URL('https://www.alphavantage.co/query');
    url.searchParams.set('function', functionName);
    url.searchParams.set('symbol', subject.providerSymbols?.alphavantage || subject.symbol);
    Object.entries(extraParams || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    url.searchParams.set('apikey', apiKey);
    return { url: url.toString(), payload: await fetchJson(url.toString(), options) };
  }
  const calls = [
    ['OVERVIEW', {}, 'alphaOverview'],
    ['ETF_PROFILE', {}, 'alphaEtfProfile'],
    ['NEWS_SENTIMENT', { tickers: subject.symbol, limit: 10 }, 'alphaNews']
  ];
  for (const [functionName, params, overrideKey] of calls) {
    try {
      const result = await alpha(functionName, params, overrideKey);
      const snapshot = makeSnapshot({
        sourceType: functionName === 'NEWS_SENTIMENT' ? 'news' : functionName === 'ETF_PROFILE' ? 'etf' : 'provider',
        sourceName: `Alpha Vantage ${functionName}`,
        status: result.payload ? 'available' : 'not-found',
        url: result.url,
        rawPayload: result.payload,
        metadata: { functionName }
      });
      snapshots.push(snapshot);
      if (functionName === 'OVERVIEW') {
        const overview = result.payload || {};
        if (overview.Name || overview.Description) {
          evidence.push(makeEvidence({
            category: 'business',
            claim: 'Company overview is available from configured provider.',
            evidence: overview.Description || [overview.Name, overview.Sector, overview.Industry].filter(Boolean).join(' / '),
            sourceUrl: result.url,
            sourceName: snapshot.sourceName,
            sourceDate: dateOnly(),
            confidence: 'medium',
            thesisImpact: 'business context',
            sourceSnapshotId: snapshot.id
          }));
        }
        [
          ['valuation', 'P/E ratio', overview.PERatio, 'x'],
          ['valuation', 'PEG ratio', overview.PEGRatio, 'x'],
          ['capital-return', 'Dividend yield', overview.DividendYield, 'fraction'],
          ['profitability', 'Profit margin', overview.ProfitMargin, 'fraction']
        ].forEach(([category, label, value, unit]) => {
          if (!Number.isFinite(parseNumber(value))) return;
          addProviderMetric(evidence, metrics, { category, label, value, unit, period: dateOnly() }, {
            category,
            claim: `${label} is available from Alpha Vantage overview.`,
            evidence: `${label}: ${parseNumber(value).toLocaleString('en-US', { maximumFractionDigits: 4 })}.`,
            sourceUrl: result.url,
            sourceName: snapshot.sourceName,
            sourceDate: dateOnly(),
            confidence: 'medium',
            thesisImpact: category,
            sourceSnapshotId: snapshot.id
          });
        });
      }
      if (functionName === 'ETF_PROFILE') {
        const holdings = normalizeEtfHoldings(result.payload?.holdings || result.payload?.top_holdings || []);
        if (holdings.length) {
          evidence.push(makeEvidence({
            category: 'etf',
            claim: 'ETF profile and holdings are available from Alpha Vantage.',
            evidence: `Holdings returned: ${holdings.slice(0, 8).map(item => item.symbol || item.name).join(', ')}.`,
            sourceUrl: result.url,
            sourceName: snapshot.sourceName,
            sourceDate: dateOnly(),
            confidence: 'medium',
            thesisImpact: 'ETF exposure',
            sourceSnapshotId: snapshot.id,
            metadata: { holdings }
          }));
        }
      }
      if (functionName === 'NEWS_SENTIMENT') {
        safeArray(result.payload?.feed).slice(0, 8).forEach((item) => {
          const ev = makeEvidence({
            category: 'news',
            claim: 'News and sentiment item is available from configured provider.',
            evidence: item.title,
            sourceUrl: item.url || result.url,
            sourceName: item.source || snapshot.sourceName,
            sourceDate: item.time_published || '',
            confidence: 'medium',
            thesisImpact: 'current events',
            sourceSnapshotId: snapshot.id
          });
          if (ev) {
            evidence.push(ev);
            events.push(scoreResearchEvent(makeEvent({
              type: 'news-sentiment',
              title: item.title,
              summary: item.summary,
              occurredAt: item.time_published || '',
              sourceName: item.source || snapshot.sourceName,
              sourceUrl: item.url || result.url,
              directness: 0.8,
              sourceEvidenceIds: [ev.id],
              metadata: { sentiment: item.overall_sentiment_label || '' }
            }), subject));
          }
        });
      }
    } catch (error) {
      sourceErrors.push(`Alpha Vantage ${functionName} failed: ${error.message || error}`);
      snapshots.push(makeSnapshot({
        sourceType: 'provider',
        sourceName: `Alpha Vantage ${functionName}`,
        status: 'source-error',
        errorCode: 'alpha_source_failed',
        errorMessage: error.message || String(error)
      }));
    }
  }
  return { snapshots, evidence: evidence.filter(Boolean), metrics, events, sourceErrors };
}

function parseFeedConfig(value) {
  const text = clean(value);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return safeArray(parsed).map(item => typeof item === 'string' ? { url: item } : item).filter(item => item?.url);
  } catch {
    return text.split(',').map(url => ({ url: clean(url) })).filter(item => item.url);
  }
}

function parseRssFeed(xml, sourceUrl = '') {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: 'text',
    trimValues: true
  });
  const parsed = parser.parse(String(xml || ''));
  const channel = parsed?.rss?.channel || parsed?.feed || {};
  const sourceTitle = clean(channel.title?.text || channel.title || parsed?.rss?.channel?.title, sourceUrl || 'RSS feed');
  const rawItems = safeArray(channel.item || channel.entry);
  return rawItems.map((item) => {
    const link = typeof item.link === 'string'
      ? item.link
      : safeArray(item.link).find(entry => entry?.href)?.href || item.guid?.text || item.guid || sourceUrl;
    return {
      title: clean(item.title?.text || item.title),
      summary: truncate(item.description?.text || item.description || item.summary?.text || item.summary || item.content?.text || item.content, 700),
      url: clean(link),
      publishedAt: clean(item.pubDate || item.published || item.updated || item['dc:date']),
      sourceName: sourceTitle
    };
  }).filter(item => item.title);
}

function itemMatchesSubject(item, subject, watchKeywords = []) {
  const haystack = lower([item.title, item.summary, item.sourceName].join(' '));
  const terms = [subject.symbol, subject.name, subject.isin, ...(watchKeywords || [])].map(lower).filter(term => term.length > 2);
  return !terms.length || terms.some(term => haystack.includes(term));
}

async function collectRssEvidence(subject, options) {
  const env = options.env || {};
  const configuredFeeds = parseFeedConfig(env.RESEARCH_RSS_FEEDS).concat(safeArray(options.issuerUrls || options.inputIssuerUrls || subject.issuerUrls)
    .map(item => typeof item === 'string' ? { url: item } : item)
    .filter(item => item?.url));
  const uniqueFeeds = configuredFeeds.filter((item, index, all) => all.findIndex(candidate => candidate.url === item.url) === index).slice(0, 8);
  const snapshots = [];
  const evidence = [];
  const events = [];
  const sourceErrors = [];
  if (!uniqueFeeds.length && !options.rssFeeds) {
    snapshots.push(makeSnapshot({
      sourceType: 'rss',
      sourceName: 'RSS/Atom feeds',
      status: 'not-configured',
      errorCode: 'rss_not_configured',
      errorMessage: 'RESEARCH_RSS_FEEDS or issuer feed URLs are not configured.'
    }));
    return { snapshots, evidence, metrics: [], events, sourceErrors };
  }
  const feeds = options.rssFeeds ? safeArray(options.rssFeeds) : uniqueFeeds;
  for (const feed of feeds) {
    try {
      const xml = feed.xml || await fetchText(feed.url, { ...options, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' });
      const items = parseRssFeed(xml, feed.url).filter(item => itemMatchesSubject(item, subject, options.watchKeywords)).slice(0, MAX_RSS_ITEMS);
      const snapshot = makeSnapshot({
        sourceType: 'rss',
        sourceName: feed.name || items[0]?.sourceName || 'RSS/Atom feed',
        status: items.length ? 'available' : 'not-found',
        url: feed.url,
        metadata: { matchedItems: items.length },
        rawPayload: { items }
      });
      snapshots.push(snapshot);
      items.forEach((item) => {
        const ev = makeEvidence({
          category: 'news',
          claim: 'Allowlisted RSS/Atom item matched the research subject or watch terms.',
          evidence: item.title,
          sourceUrl: item.url,
          sourceName: item.sourceName || snapshot.sourceName,
          sourceDate: item.publishedAt,
          confidence: 'medium',
          thesisImpact: 'current events',
          sourceSnapshotId: snapshot.id,
          metadata: { summary: item.summary }
        });
        if (ev) {
          evidence.push(ev);
          events.push(scoreResearchEvent(makeEvent({
            type: 'rss',
            title: item.title,
            summary: item.summary,
            occurredAt: item.publishedAt,
            sourceName: item.sourceName || snapshot.sourceName,
            sourceUrl: item.url,
            directness: 0.72,
            sourceEvidenceIds: [ev.id]
          }), subject));
        }
      });
    } catch (error) {
      sourceErrors.push(`RSS feed failed: ${error.message || error}`);
      snapshots.push(makeSnapshot({
        sourceType: 'rss',
        sourceName: feed.name || 'RSS/Atom feed',
        status: 'source-error',
        url: feed.url,
        errorCode: 'rss_fetch_failed',
        errorMessage: error.message || String(error)
      }));
    }
  }
  return { snapshots, evidence, metrics: [], events, sourceErrors };
}

function scoreResearchEvent(event, subject = {}) {
  const text = lower([event.title, event.summary, event.sourceName].join(' '));
  const directTerms = [subject.symbol, subject.name, subject.isin].map(lower).filter(Boolean);
  const directness = directTerms.some(term => term.length > 2 && text.includes(term)) ? Math.max(event.directness, 0.85) : event.directness;
  const severityTerms = [
    ['high', /(war|invasion|sanction|default|bankrupt|fraud|lawsuit|recall|cyberattack|strike|blocked|suspended|earthquake|flood|hurricane|tariff|export ban)/i],
    ['medium', /(investigation|regulatory|guidance|earnings|inflation|rate|supply|shortage|protest|conflict|fine|approval|delay)/i]
  ];
  const termSeverity = severityTerms.find(([, pattern]) => pattern.test(text))?.[0] || event.severity;
  const recencyDays = event.occurredAt ? Math.max((Date.now() - new Date(event.occurredAt).getTime()) / 86_400_000, 0) : 30;
  const recencyScore = recencyDays <= 7 ? 0.3 : recencyDays <= 30 ? 0.18 : 0.08;
  const severityScore = termSeverity === 'high' ? 0.45 : termSeverity === 'medium' ? 0.28 : 0.12;
  const directnessScore = Math.max(directness, event.directness) * 0.25;
  return {
    ...event,
    directness: Math.max(event.directness, directness),
    severity: termSeverity,
    riskScore: Math.min(1, Math.max(event.riskScore, severityScore + directnessScore + recencyScore))
  };
}

function normalizeGdeltEvents(payload, subject = {}) {
  return safeArray(payload?.articles || payload?.results || payload).slice(0, 10).map((item) => scoreResearchEvent(makeEvent({
    type: 'global-news',
    title: item.title || item.seendate || 'Global news event',
    summary: item.summary || item.domain || '',
    occurredAt: item.seendate || item.date || '',
    sourceName: item.domain || 'GDELT DOC API',
    sourceUrl: item.url || '',
    directness: 0.55,
    affectedCountries: item.sourcecountry ? [item.sourcecountry] : []
  }), subject)).filter(item => item.title);
}

async function collectGlobalEventEvidence(subject, options) {
  const snapshots = [];
  const evidence = [];
  const events = [];
  const sourceErrors = [];
  const queryTerms = [subject.name, subject.symbol, ...(options.watchKeywords || [])].filter(Boolean).slice(0, 4);
  const query = queryTerms.map(term => `"${term}"`).join(' OR ') || subject.symbol;

  try {
    const payload = options.gdeltPayload || await fetchJson(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=10&sort=HybridRel`, options);
    const snapshot = makeSnapshot({
      sourceType: 'global-events',
      sourceName: 'GDELT DOC API',
      status: payload ? 'available' : 'not-found',
      url: 'https://api.gdeltproject.org/api/v2/doc/doc',
      rawPayload: payload,
      metadata: { query }
    });
    snapshots.push(snapshot);
    normalizeGdeltEvents(payload, subject).forEach((event) => {
      const ev = makeEvidence({
        category: 'global-events',
        claim: 'Global news/event result matched the research subject or watch terms.',
        evidence: event.title,
        sourceUrl: event.sourceUrl,
        sourceName: event.sourceName || 'GDELT DOC API',
        sourceDate: event.occurredAt,
        confidence: 'medium',
        thesisImpact: 'event risk',
        sourceSnapshotId: snapshot.id
      });
      if (ev) {
        evidence.push(ev);
        events.push({ ...event, sourceEvidenceIds: [ev.id] });
      }
    });
  } catch (error) {
    sourceErrors.push(`GDELT event search failed: ${error.message || error}`);
    snapshots.push(makeSnapshot({
      sourceType: 'global-events',
      sourceName: 'GDELT DOC API',
      status: 'source-error',
      errorCode: 'gdelt_failed',
      errorMessage: error.message || String(error)
    }));
  }

  try {
    const reliefUrl = new URL('https://api.reliefweb.int/v2/reports');
    reliefUrl.searchParams.set('appname', 'taxswitch');
    reliefUrl.searchParams.set('query[value]', queryTerms.join(' ') || subject.symbol);
    reliefUrl.searchParams.set('limit', '5');
    reliefUrl.searchParams.set('sort[]', 'date:desc');
    const payload = options.reliefWebPayload || await fetchJson(reliefUrl.toString(), options);
    const snapshot = makeSnapshot({
      sourceType: 'global-events',
      sourceName: 'ReliefWeb API',
      status: payload ? 'available' : 'not-found',
      url: reliefUrl.toString(),
      rawPayload: payload,
      metadata: { query: queryTerms.join(' ') || subject.symbol }
    });
    snapshots.push(snapshot);
    safeArray(payload?.data).slice(0, 5).forEach((row) => {
      const fields = row.fields || row;
      const title = fields.title || '';
      const ev = makeEvidence({
        category: 'global-events',
        claim: 'ReliefWeb report matched the research subject or watch terms.',
        evidence: title,
        sourceUrl: fields.url || snapshot.url,
        sourceName: 'ReliefWeb API',
        sourceDate: fields.date?.created || fields.date || '',
        confidence: 'medium',
        thesisImpact: 'humanitarian/geopolitical risk',
        sourceSnapshotId: snapshot.id
      });
      if (ev) {
        evidence.push(ev);
        events.push(scoreResearchEvent(makeEvent({
          type: 'humanitarian-risk',
          title,
          summary: fields.summary || '',
          occurredAt: fields.date?.created || fields.date || '',
          sourceName: 'ReliefWeb API',
          sourceUrl: fields.url || snapshot.url,
          directness: 0.45,
          affectedCountries: safeArray(fields.country).map(item => item.name || item).filter(Boolean),
          sourceEvidenceIds: [ev.id]
        }), subject));
      }
    });
  } catch (error) {
    sourceErrors.push(`ReliefWeb event search failed: ${error.message || error}`);
    snapshots.push(makeSnapshot({
      sourceType: 'global-events',
      sourceName: 'ReliefWeb API',
      status: 'source-error',
      errorCode: 'reliefweb_failed',
      errorMessage: error.message || String(error)
    }));
  }

  return { snapshots, evidence, metrics: [], events, sourceErrors };
}

function extractSanctionsMatches(payload, subject = {}) {
  const text = safeJson(payload);
  const terms = [subject.name, subject.symbol, subject.isin].map(clean).filter(term => term.length > 3);
  if (!terms.length || !text) return [];
  return terms.filter(term => lower(text).includes(lower(term))).map(term => ({
    term,
    title: `Sanctions dataset matched ${term}`
  }));
}

async function collectSanctionsEvidence(subject, options) {
  const snapshots = [];
  const evidence = [];
  const events = [];
  const sourceErrors = [];
  const env = options.env || {};
  const url = clean(env.OFAC_SDN_URL, 'https://www.treasury.gov/ofac/downloads/sdn.xml');
  try {
    const xml = options.ofacXml || await fetchText(url, { ...options, accept: 'application/xml, text/xml' });
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const payload = parser.parse(xml);
    const matches = extractSanctionsMatches(payload, subject);
    const snapshot = makeSnapshot({
      sourceType: 'sanctions',
      sourceName: 'OFAC sanctions list',
      status: matches.length ? 'available' : 'available',
      url,
      metadata: { matchCount: matches.length },
      rawPayload: matches
    });
    snapshots.push(snapshot);
    if (matches.length) {
      const ev = makeEvidence({
        category: 'sanctions',
        claim: 'Sanctions-list text matched the research subject.',
        evidence: `Matched terms: ${matches.map(item => item.term).join(', ')}. Verify manually before relying on this risk flag.`,
        sourceUrl: url,
        sourceName: 'OFAC sanctions list',
        sourceDate: dateOnly(),
        confidence: 'low',
        thesisImpact: 'sanctions risk',
        sourceSnapshotId: snapshot.id
      });
      if (ev) {
        evidence.push(ev);
        events.push(makeEvent({
          type: 'sanctions',
          title: 'Potential sanctions-list text match',
          summary: ev.evidence,
          occurredAt: dateOnly(),
          sourceName: 'OFAC sanctions list',
          sourceUrl: url,
          severity: 'high',
          directness: 0.35,
          riskScore: 0.74,
          sourceEvidenceIds: [ev.id]
        }));
      }
    }
  } catch (error) {
    sourceErrors.push(`Sanctions source failed: ${error.message || error}`);
    snapshots.push(makeSnapshot({
      sourceType: 'sanctions',
      sourceName: 'OFAC sanctions list',
      status: 'source-error',
      url,
      errorCode: 'ofac_failed',
      errorMessage: error.message || String(error)
    }));
  }
  return { snapshots, evidence, metrics: [], events, sourceErrors };
}

async function collectMacroEvidence(subject, options) {
  const snapshots = [];
  const evidence = [];
  const metrics = [];
  const sourceErrors = [];
  const env = options.env || {};
  if (!env.FRED_API_KEY && !options.fredPayload) {
    snapshots.push(makeSnapshot({
      sourceType: 'macro',
      sourceName: 'FRED API',
      status: 'premium-key-missing',
      errorCode: 'fred_key_missing',
      errorMessage: 'FRED_API_KEY is not configured.'
    }));
  } else {
    try {
      const seriesId = upper(options.fredSeries || 'UNRATE');
      let payload;
      let url = `mock://fred/${seriesId}`;
      if (options.fredPayload) {
        payload = options.fredPayload;
      } else {
        const fredUrl = new URL('https://api.stlouisfed.org/fred/series/observations');
        fredUrl.searchParams.set('series_id', seriesId);
        fredUrl.searchParams.set('api_key', env.FRED_API_KEY);
        fredUrl.searchParams.set('file_type', 'json');
        fredUrl.searchParams.set('sort_order', 'desc');
        fredUrl.searchParams.set('limit', '2');
        url = fredUrl.toString();
        payload = await fetchJson(url, options);
      }
      const observation = payload?.observations?.[0];
      const snapshot = makeSnapshot({
        sourceType: 'macro',
        sourceName: 'FRED API',
        status: observation ? 'available' : 'not-found',
        url,
        sourceDate: observation?.date || '',
        rawPayload: payload,
        metadata: { seriesId }
      });
      snapshots.push(snapshot);
      if (observation) {
        const ev = makeEvidence({
          category: 'macro',
          claim: 'Macro context is available from FRED.',
          evidence: `${seriesId} latest observation ${observation.value} on ${observation.date}.`,
          sourceUrl: url,
          sourceName: 'FRED API',
          sourceDate: observation.date,
          confidence: 'high',
          thesisImpact: 'macro context',
          sourceSnapshotId: snapshot.id
        });
        if (ev) {
          evidence.push(ev);
          metrics.push(makeMetric({
            category: 'macro',
            label: seriesId,
            value: observation.value,
            period: observation.date,
            sourceEvidenceIds: [ev.id]
          }));
        }
      }
    } catch (error) {
      sourceErrors.push(`FRED macro source failed: ${error.message || error}`);
      snapshots.push(makeSnapshot({
        sourceType: 'macro',
        sourceName: 'FRED API',
        status: 'source-error',
        errorCode: 'fred_failed',
        errorMessage: error.message || String(error)
      }));
    }
  }

  const from = upper(subject.currency || options.positionCurrency || 'USD');
  const to = upper(options.taxCurrency || options.currency || 'EUR');
  if (from && to && from !== to) {
    const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${from}.${to}.SP00.A?lastNObservations=2&format=jsondata`;
    snapshots.push(makeSnapshot({
      sourceType: 'fx',
      sourceName: 'ECB SDMX API',
      status: 'available',
      url,
      metadata: { fromCurrency: from, toCurrency: to }
    }));
    evidence.push(makeEvidence({
      category: 'fx',
      claim: 'FX exposure should be separated from asset return.',
      evidence: `ECB SDMX exchange-rate series requested for ${from}/${to}.`,
      sourceUrl: url,
      sourceName: 'ECB SDMX API',
      sourceDate: dateOnly(),
      confidence: 'medium',
      thesisImpact: 'FX risk',
      sourceSnapshotId: snapshots[snapshots.length - 1].id
    }));
  }

  return { snapshots, evidence: evidence.filter(Boolean), metrics, events: [], sourceErrors };
}

function buildSections(evidence, events, metrics, input = {}) {
  const byCategory = (category) => evidence.filter(item => item.category === category).map(item => item.evidence).slice(0, 5);
  const topEvents = [...events].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
  return {
    overview: {
      title: 'Research overview',
      bullets: [
        `${upper(input.symbol || input.ticker)} research run collected ${evidence.length} evidence item${evidence.length === 1 ? '' : 's'} and ${events.length} event signal${events.length === 1 ? '' : 's'}.`,
        'Outputs are research context and scenario support, not buy/sell/hold advice.'
      ]
    },
    business: { title: 'Business and value proposition', bullets: byCategory('business') },
    fundamentals: {
      title: 'Fundamentals',
      bullets: metrics.filter(item => ['fundamentals', 'quality', 'profitability', 'balance-sheet'].includes(item.category)).slice(0, 8)
        .map(item => `${item.label}: ${item.value !== null ? Number(item.value).toLocaleString('en-US', { maximumFractionDigits: 4 }) : item.textValue || 'available'}${item.unit ? ` ${item.unit}` : ''}${item.period ? ` (${item.period})` : ''}`)
    },
    valuation: { title: 'Valuation context', bullets: byCategory('valuation') },
    etf: { title: 'ETF/fund structure', bullets: byCategory('etf') },
    events: { title: 'Current events and global risk', bullets: topEvents.map(item => `${item.severity.toUpperCase()}: ${item.title}`) },
    thesis: {
      title: 'Thesis test',
      bullets: [
        clean(input.thesis, 'No thesis entered.'),
        'Challenge the thesis by reviewing uncited assumptions, risk-factor evidence, event risk and scenario sensitivity.'
      ]
    }
  };
}

function buildCoverage(snapshots = []) {
  const bySource = new Map();
  for (const item of snapshots) {
    const key = `${item.sourceType}:${item.sourceName}`;
    const current = bySource.get(key);
    if (!current || current.status !== 'available') bySource.set(key, sourceStatus(item.sourceType, item.sourceName, item.status, { freshness: item.freshness, message: item.errorMessage }));
  }
  return [...bySource.values()];
}

function researchStatusFromSnapshots(snapshots = [], aiEnhanced = false) {
  const available = snapshots.some(item => item.status === 'available');
  const errors = snapshots.filter(item => item.status === 'source-error').length;
  const missingOnly = snapshots.length && snapshots.every(item => ['premium-key-missing', 'not-configured', 'not-found'].includes(item.status));
  if (aiEnhanced && available && errors) return 'partial+ai';
  if (aiEnhanced && available) return 'complete+ai';
  if (missingOnly) return 'fallback';
  if (available && errors) return 'partial';
  return available ? 'complete' : 'fallback';
}

function safeAiPayload(aiMemo = {}) {
  if (!aiMemo || typeof aiMemo !== 'object') return {};
  return {
    provider: clean(aiMemo.aiProvider || aiMemo.ai?.provider),
    model: clean(aiMemo.aiModel || aiMemo.ai?.model),
    summary: truncate(aiMemo.aiSummary || aiMemo.summary, 1100),
    sections: aiMemo.sections || {},
    contradictionCheck: aiMemo.ai?.contradictionCheck,
    scenarioGenerator: aiMemo.ai?.scenarioGenerator,
    assumptionCritic: aiMemo.ai?.assumptionCritic,
    reportNarrative: aiMemo.ai?.reportNarrative,
    watchRuleGenerator: aiMemo.ai?.watchRuleGenerator,
    errors: aiMemo.aiErrors || []
  };
}

function scrubAdvisoryLanguage(text) {
  return truncate(String(text || '')
    .replace(/\b(you should|we recommend|recommendation is to|must)\s+(buy|sell|hold)\b/gi, 'this would require separate suitability review to $2')
    .replace(/\b(strong buy|buy rating|sell rating|hold rating)\b/gi, 'non-advisory research signal'), 3000);
}

async function buildResearchBundle(input = {}, options = {}) {
  const env = options.env || process.env;
  const subject = {
    symbol: upper(input.symbol || input.ticker),
    name: clean(input.name || input.companyName || input.symbol || input.ticker),
    isin: upper(input.isin),
    exchange: clean(input.exchange),
    currency: upper(input.currency || input.positionCurrency || 'USD'),
    instrumentType: lower(input.instrumentType || input.assetType || 'stock') || 'stock',
    providerSymbols: input.providerSymbols && typeof input.providerSymbols === 'object' ? input.providerSymbols : {},
    issuerUrls: safeArray(input.issuerUrls).map(item => typeof item === 'string' ? { url: item } : item).filter(item => item?.url),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
  if (!subject.symbol) {
    const error = new Error('Research symbol is required.');
    error.statusCode = 400;
    throw error;
  }

  const targetSubject = input.targetSymbol ? {
    symbol: upper(input.targetSymbol),
    name: clean(input.targetName || input.targetSymbol),
    instrumentType: lower(input.targetInstrumentType || 'stock')
  } : null;

  const ctx = {};
  const collectors = [
    collectSecEvidence,
    collectFmpEvidence,
    collectAlphaEvidence,
    collectRssEvidence,
    collectGlobalEventEvidence,
    collectSanctionsEvidence,
    collectMacroEvidence
  ];
  const parts = [];
  for (const collector of collectors) {
    // Keep source failures local to the relevant source; the run should still be useful.
    parts.push(await collector(subject, { ...options, env, issuerUrls: subject.issuerUrls, watchKeywords: input.watchKeywords || [] }, ctx).catch((error) => ({
      snapshots: [makeSnapshot({ sourceType: 'collector', sourceName: collector.name, status: 'source-error', errorCode: 'collector_failed', errorMessage: error.message || String(error) })],
      evidence: [],
      metrics: [],
      events: [],
      sourceErrors: [`${collector.name} failed: ${error.message || error}`]
    })));
  }

  const snapshots = parts.flatMap(part => part.snapshots || []);
  let evidence = parts.flatMap(part => part.evidence || []).filter(Boolean);
  const metrics = parts.flatMap(part => part.metrics || []).filter(Boolean);
  const events = parts.flatMap(part => part.events || []).filter(Boolean)
    .filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, MAX_EVENTS);
  const sourceErrors = parts.flatMap(part => part.sourceErrors || []);
  const sections = buildSections(evidence, events, metrics, { ...input, symbol: subject.symbol });
  const memo = {
    symbol: subject.symbol,
    targetSymbol: targetSubject?.symbol || '',
    generatedAt: nowIso(),
    status: researchStatusFromSnapshots(snapshots),
    sections,
    evidence,
    sourceErrors
  };
  const aiMemo = await enhanceMemoWithAi(memo, {
    ...input,
    symbol: subject.symbol,
    targetSymbol: targetSubject?.symbol || '',
    thesis: clean(input.thesis),
    positionCurrency: subject.currency,
    taxCurrency: upper(input.taxCurrency || input.currency || 'EUR')
  }, { ...options, env });
  const aiEnhanced = Boolean(aiMemo.aiSummary || aiMemo.ai);
  const aiPayload = safeAiPayload(aiMemo);
  if (Array.isArray(aiMemo.evidence) && aiMemo.evidence.length > evidence.length) {
    const existing = new Set(evidence.map(item => item.id));
    const aiEvidence = aiMemo.evidence
      .filter(item => !existing.has(item.id))
      .map(item => makeEvidence({
        ...item,
        category: 'ai',
        evidence: scrubAdvisoryLanguage(item.evidence),
        sourceName: item.sourceName || 'AI analysis'
      }))
      .filter(Boolean);
    evidence = evidence.concat(aiEvidence);
  }
  return {
    subject,
    targetSubject,
    thesis: clean(input.thesis),
    status: researchStatusFromSnapshots(snapshots, aiEnhanced),
    generatedAt: memo.generatedAt,
    completedAt: nowIso(),
    horizon: clean(input.horizon || '12m'),
    sourcePolicy: {
      posture: 'free-low-cost-with-premium-ready-adapters',
      rssFeedCount: parseFeedConfig(env.RESEARCH_RSS_FEEDS).length,
      noTradingAdvice: true
    },
    coverage: buildCoverage(snapshots),
    summary: {
      title: `${subject.symbol} evidence research`,
      nonAdvisory: true,
      sections: buildSections(evidence, events, metrics, { ...input, symbol: subject.symbol }),
      topRisks: events.slice(0, 5),
      sourceCounts: snapshots.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {}),
      aiSummary: aiPayload.summary || ''
    },
    aiPayload,
    evidence,
    metrics,
    events,
    sourceSnapshots: snapshots,
    sourceErrors
  };
}

function fallbackCopilotAnswer(message, run = {}) {
  const evidence = safeArray(run.evidence);
  const topRisk = safeArray(run.events).sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0))[0];
  const cited = evidence.slice(0, 4).map(item => item.id).filter(Boolean);
  const answer = [
    `I can analyze the saved evidence for ${run.subject?.symbol || run.symbol || 'this subject'}, but no hosted AI provider is configured for deeper synthesis.`,
    topRisk ? `Highest current event risk in the run: ${topRisk.title}.` : 'No high-signal event risk is available in this run.',
    message ? `Your question: ${truncate(message, 220)}` : '',
    'Next useful research step: refresh missing premium sources or add issuer/RSS sources if the current evidence is thin.'
  ].filter(Boolean).join('\n');
  return {
    answer,
    sourceEvidenceIds: cited,
    sourceRequests: evidence.length ? [] : [{ type: 'evidence-refresh', reason: 'No evidence available for grounded copilot response.' }]
  };
}

async function generateResearchCopilotResponse(input = {}, run = {}, options = {}) {
  const env = options.env || process.env;
  const provider = clean(input.aiProvider || options.aiProvider);
  const endpoint = clean(options.aiResearchUrl || env.AI_RESEARCH_URL);
  const evidenceIndex = safeArray(run.evidence).slice(0, 40).map(item => ({
    id: item.id,
    category: item.category,
    claim: item.claim,
    evidence: item.evidence,
    sourceName: item.sourceName,
    sourceDate: item.sourceDate,
    confidence: item.confidence
  }));
  if (!provider && !endpoint) return fallbackCopilotAnswer(input.message, run);
  try {
    if (provider) {
      if (!providerConfig(provider)) throw new Error('Unknown AI provider.');
      const response = await callAiProviderJson({
        provider,
        model: input.aiModel,
        system: [
          'You are the TaxSwitch research copilot. Return JSON only.',
          'Use only the provided evidenceIndex unless requesting missing sources.',
          'Do not recommend buying, selling, or holding. Stay non-advisory.',
          'If evidence is missing, return sourceRequests instead of inventing facts.'
        ].join(' '),
        user: JSON.stringify({
          task: 'research_copilot',
          message: clean(input.message),
          subject: run.subject || {},
          thesis: run.thesis || '',
          evidenceIndex,
          schema: {
            answer: 'string',
            sourceEvidenceIds: ['ev-id'],
            sourceRequests: [{ type: 'string', reason: 'string' }]
          }
        }),
        maxOutputTokens: options.maxOutputTokens || 1800
      }, {
        env,
        fetchImpl: options.fetchImpl,
        timeoutMs: Number(options.aiTimeoutMs || env.AI_RESEARCH_TIMEOUT_MS) || 20000
      });
      const parsed = JSON.parse(clean(response.text).match(/\{[\s\S]*\}/)?.[0] || response.text);
      const allowed = new Set(evidenceIndex.map(item => item.id));
      return {
        answer: scrubAdvisoryLanguage(parsed.answer || parsed.message || ''),
        sourceEvidenceIds: safeArray(parsed.sourceEvidenceIds || parsed.citations).map(clean).filter(id => allowed.has(id)).slice(0, 8),
        sourceRequests: safeArray(parsed.sourceRequests).slice(0, 6).map(item => ({
          type: truncate(item.type || 'source-request', 80),
          reason: truncate(item.reason, 300)
        })).filter(item => item.reason)
      };
    }
    const payload = await fetchJson(endpoint, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'research_copilot', message: input.message, run, evidenceIndex })
    });
    const normalized = validateAiMemoPayload(payload.memo || payload.data?.memo || payload, { evidence: run.evidence || [] });
    return {
      answer: scrubAdvisoryLanguage(normalized.summary || normalized.reportNarrative?.memo || ''),
      sourceEvidenceIds: normalized.contradictionCheck?.sourceEvidenceIds || [],
      sourceRequests: []
    };
  } catch (error) {
    const fallback = fallbackCopilotAnswer(input.message, run);
    return {
      ...fallback,
      answer: `${fallback.answer}\n\nAI copilot enhancement failed: ${error.message || error}`
    };
  }
}

module.exports = {
  buildResearchBundle,
  generateResearchCopilotResponse,
  getResearchStatus,
  parseRssFeed,
  normalizeEtfHoldings,
  normalizeGdeltEvents,
  scoreResearchEvent,
  extractFilingSections,
  makeEvidence,
  makeEvent,
  makeMetric,
  makeSnapshot,
  scrubAdvisoryLanguage
};
