const { callAiProviderJson, providerConfig } = require('./ai-providers');

const DEFAULT_USER_AGENT = 'TaxSwitch research-memo contact@example.com';
const MAX_AI_TEXT_CHARS = 12000;
const MAX_AI_BULLETS = 8;
const MAX_AI_EVIDENCE = 12;
const MAX_AI_SCENARIOS = 7;
const MAX_AI_WATCH_RULES = 8;

function clean(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function confidence(level) {
  return ['low', 'medium', 'high'].includes(level) ? level : 'medium';
}

function compactHash(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function evidenceId(item) {
  return clean(item.id) || `ev-${compactHash([item.sourceName, item.sourceDate, item.claim, item.evidence].join('|'))}`;
}

function truncate(value, max = MAX_AI_TEXT_CHARS) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  const number = Number(String(value).replace(/[%,$\s]/g, '').replace(',', '.'));
  return Number.isFinite(number) ? number : NaN;
}

function evidence({ id, claim, evidence: evidenceText, sourceUrl, sourceName, sourceDate, confidence: level = 'medium', thesisImpact = 'neutral', sourceEvidenceIds = [] }) {
  const item = {
    id: clean(id),
    claim: clean(claim),
    evidence: clean(evidenceText),
    sourceUrl: clean(sourceUrl),
    sourceName: clean(sourceName),
    sourceDate: clean(sourceDate),
    confidence: confidence(level),
    thesisImpact: clean(thesisImpact, 'neutral'),
    sourceEvidenceIds: Array.isArray(sourceEvidenceIds) ? sourceEvidenceIds.map(clean).filter(Boolean).slice(0, 8) : []
  };
  item.id = evidenceId(item);
  return item;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': options.userAgent || DEFAULT_USER_AGENT,
      'Accept': 'application/json',
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || `${response.status} from ${url}`);
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

async function postJson(url, body, options = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': options.userAgent || DEFAULT_USER_AGENT,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: JSON.stringify(body)
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

async function lookupSecCompany(symbol, options = {}) {
  const ticker = upper(symbol);
  if (!ticker) return null;
  const url = 'https://www.sec.gov/files/company_tickers.json';
  const payload = options.companyTickers || await fetchJson(url, options);
  const rows = Array.isArray(payload) ? payload : Object.values(payload || {});
  const found = rows.find(item => upper(item.ticker) === ticker);
  if (!found) return null;
  return {
    cik: String(found.cik_str || found.cik || '').padStart(10, '0'),
    ticker: upper(found.ticker),
    title: found.title || found.name || ticker,
    sourceUrl: url
  };
}

async function fetchSecSubmissions(cik, options = {}) {
  if (!cik) return null;
  const url = `https://data.sec.gov/submissions/CIK${String(cik).padStart(10, '0')}.json`;
  return {
    url,
    payload: options.secSubmissions || await fetchJson(url, options)
  };
}

async function fetchSecCompanyFacts(cik, options = {}) {
  if (!cik) return null;
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, '0')}.json`;
  return {
    url,
    payload: options.secCompanyFacts || await fetchJson(url, options)
  };
}

function latestFiling(submissions, forms = ['10-K', '10-Q', '20-F', '40-F']) {
  const recent = submissions?.filings?.recent;
  if (!recent?.form) return null;
  for (let i = 0; i < recent.form.length; i += 1) {
    if (forms.includes(recent.form[i])) {
      return {
        form: recent.form[i],
        filingDate: recent.filingDate?.[i] || '',
        reportDate: recent.reportDate?.[i] || '',
        accessionNumber: recent.accessionNumber?.[i] || '',
        primaryDocument: recent.primaryDocument?.[i] || ''
      };
    }
  }
  return null;
}

function latestUsdFact(companyFacts, conceptNames) {
  const facts = companyFacts?.facts?.['us-gaap'] || companyFacts?.facts?.['ifrs-full'] || {};
  for (const concept of conceptNames) {
    const units = facts[concept]?.units || {};
    const values = units.USD || units.EUR || Object.values(units)[0] || [];
    const sorted = values
      .filter(item => Number.isFinite(Number(item.val)) && item.filed)
      .sort((a, b) => String(b.filed).localeCompare(String(a.filed)));
    if (sorted[0]) return { concept, ...sorted[0] };
  }
  return null;
}

async function fetchFredSeries(seriesId, options = {}) {
  const id = upper(seriesId);
  const apiKey = clean(options.apiKey || options.env?.FRED_API_KEY);
  if (!id || !apiKey) return null;
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.searchParams.set('series_id', id);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', '2');
  return {
    url: url.toString(),
    payload: options.fredPayload || await fetchJson(url, options)
  };
}

async function fetchEcbFxSeries(fromCurrency, toCurrency = 'EUR', options = {}) {
  const from = upper(fromCurrency);
  const to = upper(toCurrency);
  if (!from || !to || from === to) return null;
  const key = `D.${from}.${to}.SP00.A`;
  const url = `https://data-api.ecb.europa.eu/service/data/EXR/${key}?lastNObservations=2&format=jsondata`;
  return {
    url,
    payload: options.ecbPayload || await fetchJson(url, options)
  };
}

async function fetchFmpProfile(symbol, options = {}) {
  const apiKey = clean(options.apiKey || options.env?.FMP_API_KEY);
  const ticker = upper(symbol);
  if (!ticker || !apiKey) return null;
  const url = new URL(`https://financialmodelingprep.com/stable/profile`);
  url.searchParams.set('symbol', ticker);
  url.searchParams.set('apikey', apiKey);
  return {
    url: url.toString(),
    payload: options.fmpProfile || await fetchJson(url, options)
  };
}

async function fetchFmpRatios(symbol, options = {}) {
  const apiKey = clean(options.apiKey || options.env?.FMP_API_KEY);
  const ticker = upper(symbol);
  if (!ticker || !apiKey) return null;
  const url = new URL(`https://financialmodelingprep.com/stable/ratios`);
  url.searchParams.set('symbol', ticker);
  url.searchParams.set('period', 'annual');
  url.searchParams.set('limit', '1');
  url.searchParams.set('apikey', apiKey);
  return {
    url: url.toString(),
    payload: options.fmpRatios || await fetchJson(url, options)
  };
}

async function fetchFmpNews(symbol, options = {}) {
  const apiKey = clean(options.apiKey || options.env?.FMP_API_KEY);
  const ticker = upper(symbol);
  if (!ticker || !apiKey) return null;
  const url = new URL('https://financialmodelingprep.com/stable/news/stock');
  url.searchParams.set('symbols', ticker);
  url.searchParams.set('limit', '5');
  url.searchParams.set('apikey', apiKey);
  return {
    url: url.toString(),
    payload: options.fmpNews || await fetchJson(url, options)
  };
}

function buildBusinessEvidence(company, submissionsResult, factsResult) {
  const items = [];
  const filing = latestFiling(submissionsResult?.payload);
  if (company) {
    items.push(evidence({
      claim: `${company.ticker} has an SEC company record.`,
      evidence: `${company.title} maps to CIK ${company.cik}.`,
      sourceUrl: company.sourceUrl,
      sourceName: 'SEC company tickers',
      sourceDate: '',
      confidence: 'high',
      thesisImpact: 'context'
    }));
  }
  if (filing) {
    items.push(evidence({
      claim: 'Recent filing is available for primary-source review.',
      evidence: `${filing.form} filed ${filing.filingDate || 'recently'}${filing.reportDate ? ` for period ${filing.reportDate}` : ''}.`,
      sourceUrl: submissionsResult.url,
      sourceName: 'SEC submissions API',
      sourceDate: filing.filingDate,
      confidence: 'high',
      thesisImpact: 'context'
    }));
  }
  const revenue = latestUsdFact(factsResult?.payload, ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet']);
  if (revenue) {
    items.push(evidence({
      claim: 'Recent revenue fact is available from XBRL.',
      evidence: `${revenue.concept} reported ${Number(revenue.val).toLocaleString('en-US')} for period ending ${revenue.end || revenue.fy || 'unknown'}.`,
      sourceUrl: factsResult.url,
      sourceName: 'SEC companyfacts API',
      sourceDate: revenue.filed || revenue.end || '',
      confidence: 'medium',
      thesisImpact: 'supports quality review'
    }));
  }
  const debt = latestUsdFact(factsResult?.payload, ['LongTermDebtCurrent', 'LongTermDebtNoncurrent', 'DebtCurrent']);
  if (debt) {
    items.push(evidence({
      claim: 'Debt facts should be checked in the balance-sheet risk review.',
      evidence: `${debt.concept} reported ${Number(debt.val).toLocaleString('en-US')} for period ending ${debt.end || debt.fy || 'unknown'}.`,
      sourceUrl: factsResult.url,
      sourceName: 'SEC companyfacts API',
      sourceDate: debt.filed || debt.end || '',
      confidence: 'medium',
      thesisImpact: 'risk'
    }));
  }
  return items;
}

function buildMarketDataEvidence(profileResult, ratiosResult, newsResult) {
  const items = [];
  const profileRows = Array.isArray(profileResult?.payload) ? profileResult.payload : profileResult?.payload ? [profileResult.payload] : [];
  const profile = profileRows[0];
  if (profile) {
    const mcap = parseNumber(profile.marketCap);
    if (Number.isFinite(mcap)) {
      items.push(evidence({
        claim: 'Market capitalization is available from a configured provider.',
        evidence: `${profile.symbol || ''} market cap ${mcap.toLocaleString('en-US')} ${profile.currency || ''}.`.trim(),
        sourceUrl: profileResult.url,
        sourceName: 'Financial Modeling Prep profile',
        sourceDate: new Date().toISOString().slice(0, 10),
        confidence: 'medium',
        thesisImpact: 'valuation context'
      }));
    }
    if (profile.sector || profile.industry) {
      items.push(evidence({
        claim: 'Sector and industry context are available.',
        evidence: [profile.sector, profile.industry].filter(Boolean).join(' / '),
        sourceUrl: profileResult.url,
        sourceName: 'Financial Modeling Prep profile',
        sourceDate: new Date().toISOString().slice(0, 10),
        confidence: 'medium',
        thesisImpact: 'risk context'
      }));
    }
  }
  const ratioRows = Array.isArray(ratiosResult?.payload) ? ratiosResult.payload : ratiosResult?.payload ? [ratiosResult.payload] : [];
  const ratio = ratioRows[0];
  if (ratio) {
    [
      ['P/E ratio', ratio.priceEarningsRatio ?? ratio.peRatio, 'valuation context'],
      ['Free-cash-flow yield', ratio.freeCashFlowYield, 'quality context'],
      ['Debt-to-equity ratio', ratio.debtEquityRatio, 'balance-sheet risk']
    ].forEach(([label, raw, impact]) => {
      const number = parseNumber(raw);
      if (Number.isFinite(number)) {
        items.push(evidence({
          claim: `${label} is available from a configured fundamentals provider.`,
          evidence: `${label}: ${number.toLocaleString('en-US', { maximumFractionDigits: 4 })}.`,
          sourceUrl: ratiosResult.url,
          sourceName: 'Financial Modeling Prep ratios',
          sourceDate: ratio.date || new Date().toISOString().slice(0, 10),
          confidence: 'medium',
          thesisImpact: impact
        }));
      }
    });
  }
  const newsRows = Array.isArray(newsResult?.payload) ? newsResult.payload : [];
  newsRows.slice(0, 3).forEach((item) => {
    if (!item?.title) return;
    items.push(evidence({
      claim: 'Recent licensed-provider news item should be reviewed.',
      evidence: item.title,
      sourceUrl: item.url || newsResult.url,
      sourceName: item.site || 'Financial Modeling Prep news',
      sourceDate: item.publishedDate || item.date || '',
      confidence: 'medium',
      thesisImpact: 'sentiment/news'
    }));
  });
  return items;
}

function localMemoFallback(input = {}, sourceErrors = []) {
  const symbol = upper(input.symbol || input.ticker);
  const targetSymbol = upper(input.targetSymbol);
  const thesis = clean(input.thesis || input.userThesis, 'No thesis entered.');
  const items = [
    evidence({
      claim: 'The app should evaluate the hurdle, not issue a command.',
      evidence: `User thesis: ${thesis}`,
      sourceUrl: 'local://user-assumption',
      sourceName: 'User assumption',
      sourceDate: new Date().toISOString().slice(0, 10),
      confidence: thesis === 'No thesis entered.' ? 'low' : 'medium',
      thesisImpact: 'assumption'
    })
  ];
  if (sourceErrors.length) {
    items.push(evidence({
      claim: 'Some primary sources were unavailable.',
      evidence: sourceErrors.slice(0, 3).map(error => error.message || String(error)).join(' | '),
      sourceUrl: '',
      sourceName: 'Research source adapter',
      sourceDate: new Date().toISOString().slice(0, 10),
      confidence: 'medium',
      thesisImpact: 'weakens evidence quality'
    }));
  }
  return {
    symbol,
    targetSymbol,
    generatedAt: new Date().toISOString(),
    status: 'fallback',
    sections: buildMemoSections(items, input),
    evidence: items,
    sourceErrors: sourceErrors.map(error => error.message || String(error))
  };
}

function buildMemoSections(items, input = {}) {
  const symbol = upper(input.symbol || input.ticker) || 'Selected instrument';
  const targetSymbol = upper(input.targetSymbol) || 'Target instrument';
  return {
    businessSummary: {
      title: 'Business summary',
      bullets: [`Primary-source context collected for ${symbol}.`, 'Use the evidence table for dates and sources.']
    },
    financialQuality: {
      title: 'Financial quality snapshot',
      bullets: items.filter(item => /revenue|debt|XBRL/i.test(`${item.claim} ${item.evidence}`)).map(item => item.evidence).slice(0, 4)
    },
    valuation: {
      title: 'Valuation snapshot',
      bullets: items.filter(item => /valuation|P\/E|market cap|free-cash-flow/i.test(`${item.claim} ${item.evidence} ${item.thesisImpact}`)).map(item => item.evidence).slice(0, 4)
        .concat(['Compare the required hurdle with valuation-sensitive scenario cases.']).slice(0, 5)
    },
    growthThesis: {
      title: 'Growth thesis',
      bullets: [clean(input.thesis || input.userThesis, 'Enter a thesis to test growth assumptions.')]
    },
    bearThesis: {
      title: 'Bear thesis',
      bullets: ['Check valuation risk, earnings miss risk, margin compression, regulation, debt, dilution and competitive pressure.']
    },
    eventCalendar: {
      title: 'Event calendar',
      bullets: ['Use latest filings and configured market-data provider for earnings/dividend event follow-up.']
    },
    sentimentNews: {
      title: 'Sentiment and news',
      bullets: items.filter(item => /news|sentiment/i.test(`${item.sourceName} ${item.thesisImpact}`)).map(item => item.evidence).slice(0, 5)
    },
    contradictionCheck: {
      title: 'Contradiction check',
      bullets: [`What evidence would make the ${targetSymbol} return assumption too optimistic?`, 'Which assumption has the lowest confidence score in the Decision Lab?']
    }
  };
}

function safeJsonParse(text) {
  const raw = clean(text);
  if (!raw) throw new Error('AI provider returned an empty response.');
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI provider did not return JSON.');
    return JSON.parse(match[0]);
  }
}

function sanitizeTextList(values, limit = MAX_AI_BULLETS, maxChars = 500) {
  return (Array.isArray(values) ? values : [])
    .map(value => truncate(value, maxChars))
    .filter(Boolean)
    .slice(0, limit);
}

function validEvidenceIdSet(memo = {}) {
  return new Set((memo.evidence || []).map(item => item.id).filter(Boolean));
}

function normalizeCitations(ids, allowedIds) {
  return (Array.isArray(ids) ? ids : [])
    .map(clean)
    .filter(id => allowedIds.has(id))
    .slice(0, 8);
}

function normalizeAiEvidence(items = [], memo = {}) {
  const allowedIds = validEvidenceIdSet(memo);
  return (Array.isArray(items) ? items : [])
    .slice(0, MAX_AI_EVIDENCE)
    .map((item, index) => {
      const sourceEvidenceIds = normalizeCitations(item.sourceEvidenceIds || item.citations || item.evidenceIds, allowedIds);
      const hasCitation = sourceEvidenceIds.length > 0;
      return evidence({
        id: item.id || `ai-ev-${index + 1}`,
        claim: truncate(item.claim, 280),
        evidence: truncate(item.evidence || item.text, 700),
        sourceUrl: clean(item.sourceUrl),
        sourceName: clean(item.sourceName, 'AI analysis'),
        sourceDate: clean(item.sourceDate, new Date().toISOString().slice(0, 10)),
        confidence: hasCitation ? confidence(item.confidence) : 'low',
        thesisImpact: hasCitation ? clean(item.thesisImpact, 'AI synthesis') : 'uncited AI claim',
        sourceEvidenceIds
      });
    })
    .filter(item => item.claim && item.evidence);
}

function normalizeAiSections(sections = {}) {
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) return {};
  return Object.entries(sections).slice(0, 10).reduce((acc, [key, section]) => {
    if (!section || typeof section !== 'object') return acc;
    const title = truncate(section.title || key, 80);
    const bullets = sanitizeTextList(section.bullets, MAX_AI_BULLETS, 450);
    if (title && bullets.length) acc[clean(key).replace(/[^\w-]/g, '') || `section${Object.keys(acc).length + 1}`] = { title, bullets };
    return acc;
  }, {});
}

function normalizeScenarioCases(rawCases = [], memo = {}) {
  const allowedIds = validEvidenceIdSet(memo);
  return (Array.isArray(rawCases) ? rawCases : [])
    .slice(0, MAX_AI_SCENARIOS)
    .map((item, index) => {
      const number = (value, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };
      return {
        id: clean(item.id, `ai-case-${index + 1}`).replace(/[^\w-]/g, '-').slice(0, 40),
        name: truncate(item.name || `AI case ${index + 1}`, 80),
        probability: Math.min(Math.max(number(item.probability, 0), 0), 1),
        oldReturn: Math.min(Math.max(number(item.oldReturn, 0), -0.95), 5),
        newReturn: Math.min(Math.max(number(item.newReturn, 0), -0.95), 5),
        oldDividendYield: Math.min(Math.max(number(item.oldDividendYield, 0), 0), 1),
        newDividendYield: Math.min(Math.max(number(item.newDividendYield, 0), 0), 1),
        fxReturn: Math.min(Math.max(number(item.fxReturn, 0), -0.95), 5),
        targetReachProbability: Math.min(Math.max(number(item.targetReachProbability, 0.5), 0), 1),
        rationale: truncate(item.rationale, 400),
        sourceEvidenceIds: normalizeCitations(item.sourceEvidenceIds || item.citations || item.evidenceIds, allowedIds)
      };
    })
    .filter(item => item.name);
}

function normalizeWatchSuggestions(rawSuggestions = [], memo = {}) {
  const allowedIds = validEvidenceIdSet(memo);
  const validTypes = new Set(['tax-due-above', 'tax-drag-above', 'rebuy-break-even-reached', 'switch-hurdle-reached', 'price-above', 'price-below', 'target-reached', 'position-weight', 'scenario-margin']);
  return (Array.isArray(rawSuggestions) ? rawSuggestions : [])
    .slice(0, MAX_AI_WATCH_RULES)
    .map((item, index) => {
      const type = clean(item.type || item.metric || 'scenario-margin');
      const threshold = Number(item.threshold);
      return {
        id: clean(item.id, `ai-watch-${index + 1}`),
        type: validTypes.has(type) ? type : 'scenario-margin',
        label: truncate(item.label || type, 100),
        threshold: Number.isFinite(threshold) ? threshold : NaN,
        direction: ['above', 'below', 'crosses'].includes(item.direction) ? item.direction : 'above',
        rationale: truncate(item.rationale, 400),
        sourceEvidenceIds: normalizeCitations(item.sourceEvidenceIds || item.citations || item.evidenceIds, allowedIds)
      };
    })
    .filter(item => item.label && Number.isFinite(item.threshold));
}

function normalizeContradictionCheck(raw = {}, memo = {}) {
  const allowedIds = validEvidenceIdSet(memo);
  const object = raw && typeof raw === 'object' ? raw : {};
  return {
    summary: truncate(object.summary, 700),
    invalidatingEvidence: sanitizeTextList(object.invalidatingEvidence, 8, 450),
    keyQuestions: sanitizeTextList(object.keyQuestions, 8, 300),
    sourceEvidenceIds: normalizeCitations(object.sourceEvidenceIds || object.citations || object.evidenceIds, allowedIds)
  };
}

function normalizeAssumptionCritic(raw = {}, memo = {}) {
  const allowedIds = validEvidenceIdSet(memo);
  const object = raw && typeof raw === 'object' ? raw : {};
  return {
    summary: truncate(object.summary, 700),
    drivers: (Array.isArray(object.drivers) ? object.drivers : []).slice(0, 10).map((item, index) => ({
      assumption: truncate(item.assumption || `Driver ${index + 1}`, 100),
      impact: truncate(item.impact, 350),
      weakness: truncate(item.weakness, 350),
      sourceEvidenceIds: normalizeCitations(item.sourceEvidenceIds || item.citations || item.evidenceIds, allowedIds)
    })).filter(item => item.assumption && (item.impact || item.weakness))
  };
}

function normalizeReportNarrative(raw = {}) {
  const object = raw && typeof raw === 'object' ? raw : {};
  return {
    title: truncate(object.title || 'AI report narrative', 100),
    memo: truncate(object.memo || object.text, 2500)
  };
}

function validateAiMemoPayload(payload = {}, memo = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('AI response JSON must be an object.');
  }
  const scenarioGenerator = payload.scenarioGenerator || payload.scenarios || {};
  const watchRuleGenerator = payload.watchRuleGenerator || payload.watchRules || {};
  const normalized = {
    provider: truncate(payload.provider, 80),
    summary: truncate(payload.summary || payload.aiSummary, 1100),
    sections: normalizeAiSections(payload.sections),
    evidence: normalizeAiEvidence(payload.evidence, memo),
    contradictionCheck: normalizeContradictionCheck(payload.contradictionCheck || payload.contradictions, memo),
    scenarioGenerator: {
      summary: truncate(scenarioGenerator.summary, 700),
      cases: normalizeScenarioCases(scenarioGenerator.cases || scenarioGenerator.scenarioCases || [], memo)
    },
    assumptionCritic: normalizeAssumptionCritic(payload.assumptionCritic || payload.assumptions, memo),
    reportNarrative: normalizeReportNarrative(payload.reportNarrative || payload.narrative),
    watchRuleGenerator: {
      summary: truncate(watchRuleGenerator.summary, 700),
      suggestions: normalizeWatchSuggestions(watchRuleGenerator.suggestions || watchRuleGenerator.rules || [], memo)
    }
  };
  if (!normalized.summary && !Object.keys(normalized.sections).length && !normalized.evidence.length
    && !normalized.contradictionCheck.summary && !normalized.scenarioGenerator.cases.length
    && !normalized.assumptionCritic.drivers.length && !normalized.reportNarrative.memo
    && !normalized.watchRuleGenerator.suggestions.length) {
    throw new Error('AI response did not include any usable memo fields.');
  }
  return normalized;
}

function sanitizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(6)) : null;
}

function sanitizeDecisionContext(decision = {}) {
  if (!decision || typeof decision !== 'object') return null;
  const scenario = decision.scenarioAnalysis || {};
  return {
    generatedAt: clean(decision.generatedAt),
    valueCurrency: clean(decision.valueCurrency),
    summary: {
      expectedMargin: sanitizeNumber(scenario.expectedMargin),
      expectedOldValue: sanitizeNumber(scenario.expectedOldValue),
      expectedNewValue: sanitizeNumber(scenario.expectedNewValue),
      expectedCashValue: sanitizeNumber(scenario.expectedCashValue),
      maximumLoss: sanitizeNumber(scenario.maximumLoss),
      winnerCounts: scenario.winnerCounts || {},
      monteCarlo: {
        runs: sanitizeNumber(scenario.monteCarlo?.runs),
        switchWinRate: sanitizeNumber(scenario.monteCarlo?.switchWinRate),
        p10Margin: sanitizeNumber(scenario.monteCarlo?.p10Margin),
        p50Margin: sanitizeNumber(scenario.monteCarlo?.p50Margin),
        p90Margin: sanitizeNumber(scenario.monteCarlo?.p90Margin)
      }
    },
    assumptionQuality: (decision.assumptionQuality || []).slice(0, 12).map(item => ({
      assumption: truncate(item.assumption, 100),
      confidence: confidence(item.confidence),
      reason: truncate(item.reason, 260)
    })),
    riskFlags: (decision.riskFlags || []).slice(0, 12).map(item => ({
      category: truncate(item.category, 60),
      label: truncate(item.label, 100),
      message: truncate(item.message, 260),
      severity: confidence(item.severity),
      confidence: confidence(item.confidence)
    })),
    taxLossHarvesting: decision.taxLossHarvesting ? {
      applicable: Boolean(decision.taxLossHarvesting.applicable),
      realizedLoss: sanitizeNumber(decision.taxLossHarvesting.realizedLoss),
      estimatedTaxValue: sanitizeNumber(decision.taxLossHarvesting.estimatedTaxValue),
      lossPotType: truncate(decision.taxLossHarvesting.lossPotType, 100),
      caveat: truncate(decision.taxLossHarvesting.caveat, 300)
    } : null,
    portfolioRisk: decision.portfolioRisk ? {
      currentWeight: sanitizeNumber(decision.portfolioRisk.currentWeight),
      switchWeight: sanitizeNumber(decision.portfolioRisk.switchWeight),
      beforeVolatility: sanitizeNumber(decision.portfolioRisk.beforeVolatility),
      afterVolatility: sanitizeNumber(decision.portfolioRisk.afterVolatility),
      portfolioVolatilityChange: sanitizeNumber(decision.portfolioRisk.portfolioVolatilityChange),
      riskAdjustedMargin: sanitizeNumber(decision.portfolioRisk.riskAdjustedMargin),
      drawdownVsTolerance: sanitizeNumber(decision.portfolioRisk.drawdownVsTolerance),
      correlationToPortfolio: sanitizeNumber(decision.portfolioRisk.correlationToPortfolio)
    } : null
  };
}

function buildAiPrompt(input = {}, memo = {}) {
  const evidenceIndex = (memo.evidence || []).map(item => ({
    id: item.id,
    claim: item.claim,
    evidence: item.evidence,
    sourceName: item.sourceName,
    sourceDate: item.sourceDate,
    confidence: item.confidence,
    thesisImpact: item.thesisImpact
  }));
  const decisionContext = sanitizeDecisionContext(input.decisionContext || input.decisionResult);
  const system = [
    'You are TaxSwitch research analysis. Return JSON only.',
    'You must provide evidence-based scenario analysis only. Do not recommend buying, selling, or holding.',
    'Every AI evidence item, scenario rationale, assumption driver, contradiction check, and watch rule should cite sourceEvidenceIds from the provided evidenceIndex when possible.',
    'If you cannot cite sourceEvidenceIds for a claim, keep it cautious and mark low confidence.',
    'Use decimal returns and probabilities, not percentages.'
  ].join(' ');
  const user = JSON.stringify({
    task: 'taxswitch_ai_research_suite',
    requestedOutputs: ['summary', 'sections', 'evidence', 'contradictionCheck', 'scenarioGenerator', 'assumptionCritic', 'reportNarrative', 'watchRuleGenerator'],
    schema: {
      summary: 'string',
      sections: { key: { title: 'string', bullets: ['string'] } },
      evidence: [{ claim: 'string', evidence: 'string', confidence: 'low|medium|high', thesisImpact: 'string', sourceEvidenceIds: ['ev-id'] }],
      contradictionCheck: { summary: 'string', invalidatingEvidence: ['string'], keyQuestions: ['string'], sourceEvidenceIds: ['ev-id'] },
      scenarioGenerator: { summary: 'string', cases: [{ id: 'bull|base|bear', name: 'string', probability: 0.33, oldReturn: 0.05, newReturn: 0.08, oldDividendYield: 0, newDividendYield: 0, fxReturn: 0, targetReachProbability: 0.5, rationale: 'string', sourceEvidenceIds: ['ev-id'] }] },
      assumptionCritic: { summary: 'string', drivers: [{ assumption: 'string', impact: 'string', weakness: 'string', sourceEvidenceIds: ['ev-id'] }] },
      reportNarrative: { title: 'string', memo: 'string' },
      watchRuleGenerator: { summary: 'string', suggestions: [{ type: 'scenario-margin', label: 'string', threshold: 0, direction: 'above|below|crosses', rationale: 'string', sourceEvidenceIds: ['ev-id'] }] }
    },
    input: {
      symbol: upper(input.symbol || input.ticker),
      targetSymbol: upper(input.targetSymbol),
      thesis: clean(input.thesis || input.userThesis),
      positionCurrency: upper(input.positionCurrency || input.currency),
      taxCurrency: upper(input.taxCurrency || input.currency)
    },
    evidenceIndex,
    decisionContext
  });
  return { system, user };
}

async function enhanceMemoWithAi(memo, input = {}, options = {}) {
  const env = options.env || {};
  const requestedProvider = clean(input.aiProvider || options.aiProvider);
  const requestedModel = clean(input.aiModel || options.aiModel);
  const endpoint = clean(options.aiResearchUrl || env.AI_RESEARCH_URL);
  if (!requestedProvider && !endpoint) return memo;
  try {
    let payload;
    let providerLabel = '';
    let modelLabel = requestedModel;
    if (requestedProvider) {
      const config = providerConfig(requestedProvider);
      if (!config) throw new Error('Unknown AI provider.');
      const prompt = buildAiPrompt(input, memo);
      const response = await callAiProviderJson({
        provider: requestedProvider,
        model: requestedModel,
        system: prompt.system,
        user: prompt.user,
        maxOutputTokens: options.maxOutputTokens
      }, {
        env,
        fetchImpl: options.fetchImpl,
        timeoutMs: Number(options.aiTimeoutMs || env.AI_RESEARCH_TIMEOUT_MS) || 20000
      });
      payload = safeJsonParse(response.text);
      providerLabel = config.label;
      modelLabel = response.model || requestedModel;
    } else {
      const apiKey = clean(options.aiResearchApiKey || env.AI_RESEARCH_API_KEY);
      payload = await postJson(endpoint, {
        task: 'taxswitch_research_memo',
        instruction: 'Return evidence-based scenario analysis only. Do not recommend buying, selling, or holding.',
        input,
        memo,
        decisionContext: sanitizeDecisionContext(input.decisionContext || input.decisionResult)
      }, {
        ...options,
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
      });
      providerLabel = 'configured AI research endpoint';
    }
    const aiMemo = validateAiMemoPayload(payload.memo || payload.data?.memo || payload, memo);
    const aiEvidence = aiMemo.evidence || [];
    return {
      ...memo,
      status: memo.status === 'complete' ? 'complete+ai' : `${memo.status || 'partial'}+ai`,
      aiSummary: aiMemo.summary,
      ai: {
        provider: aiMemo.provider || providerLabel,
        model: modelLabel,
        contradictionCheck: aiMemo.contradictionCheck,
        scenarioGenerator: aiMemo.scenarioGenerator,
        assumptionCritic: aiMemo.assumptionCritic,
        reportNarrative: aiMemo.reportNarrative,
        watchRuleGenerator: aiMemo.watchRuleGenerator
      },
      sections: { ...memo.sections, ...aiMemo.sections },
      evidence: memo.evidence.concat(aiEvidence),
      aiProvider: clean(aiMemo.provider || providerLabel),
      aiModel: clean(modelLabel)
    };
  } catch (error) {
    return {
      ...memo,
      aiErrors: (memo.aiErrors || []).concat(error.message || 'AI enhancement failed.'),
      sourceErrors: (memo.sourceErrors || []).concat(`AI enhancement skipped: ${error.message || 'request failed'}`)
    };
  }
}

async function buildResearchMemo(input = {}, options = {}) {
  const sourceErrors = [];
  const symbol = upper(input.symbol || input.ticker);
  let company = null;
  let submissions = null;
  let facts = null;
  let profile = null;
  let ratios = null;
  let news = null;
  try {
    company = await lookupSecCompany(symbol, options);
  } catch (error) {
    sourceErrors.push(error);
  }
  if (company?.cik) {
    try {
      submissions = await fetchSecSubmissions(company.cik, options);
    } catch (error) {
      sourceErrors.push(error);
    }
    try {
      facts = await fetchSecCompanyFacts(company.cik, options);
    } catch (error) {
      sourceErrors.push(error);
    }
  }
  try {
    profile = await fetchFmpProfile(symbol, options);
  } catch (error) {
    sourceErrors.push(error);
  }
  try {
    ratios = await fetchFmpRatios(symbol, options);
  } catch (error) {
    sourceErrors.push(error);
  }
  try {
    news = await fetchFmpNews(symbol, options);
  } catch (error) {
    sourceErrors.push(error);
  }
  const evidenceItems = buildBusinessEvidence(company, submissions, facts);
  const providerEvidence = buildMarketDataEvidence(profile, ratios, news);
  if (!evidenceItems.length && !providerEvidence.length) return enhanceMemoWithAi(localMemoFallback(input, sourceErrors), input, options);
  const macroItems = [];
  try {
    const fred = await fetchFredSeries(input.fredSeries || 'UNRATE', options);
    const observation = fred?.payload?.observations?.[0];
    if (observation) {
      macroItems.push(evidence({
        claim: 'Macro context is available through FRED.',
        evidence: `${input.fredSeries || 'UNRATE'} latest observation ${observation.value} on ${observation.date}.`,
        sourceUrl: fred.url,
        sourceName: 'FRED API',
        sourceDate: observation.date,
        confidence: 'high',
        thesisImpact: 'macro context'
      }));
    }
  } catch (error) {
    sourceErrors.push(error);
  }
  try {
    const ecb = await fetchEcbFxSeries(input.positionCurrency || input.currency || 'USD', input.taxCurrency || 'EUR', options);
    if (ecb?.url) {
      macroItems.push(evidence({
        claim: 'FX should be separated from stock return.',
        evidence: `ECB SDMX series requested for ${upper(input.positionCurrency || input.currency || 'USD')}/${upper(input.taxCurrency || 'EUR')}.`,
        sourceUrl: ecb.url,
        sourceName: 'ECB SDMX API',
        sourceDate: new Date().toISOString().slice(0, 10),
        confidence: 'medium',
        thesisImpact: 'risk'
      }));
    }
  } catch (error) {
    sourceErrors.push(error);
  }
  const allEvidence = evidenceItems.concat(providerEvidence, macroItems);
  const memo = {
    symbol,
    targetSymbol: upper(input.targetSymbol),
    generatedAt: new Date().toISOString(),
    status: sourceErrors.length ? 'partial' : 'complete',
    sections: buildMemoSections(allEvidence, input),
    evidence: allEvidence,
    sourceErrors: sourceErrors.map(error => error.message || String(error))
  };
  return enhanceMemoWithAi(memo, input, options);
}

module.exports = {
  DEFAULT_USER_AGENT,
  evidence,
  lookupSecCompany,
  fetchSecSubmissions,
  fetchSecCompanyFacts,
  fetchFredSeries,
  fetchEcbFxSeries,
  fetchFmpProfile,
  fetchFmpRatios,
  fetchFmpNews,
  latestFiling,
  latestUsdFact,
  buildBusinessEvidence,
  buildMarketDataEvidence,
  buildMemoSections,
  validateAiMemoPayload,
  sanitizeDecisionContext,
  enhanceMemoWithAi,
  buildResearchMemo,
  localMemoFallback
};
