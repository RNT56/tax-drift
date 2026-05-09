const DEFAULT_USER_AGENT = 'TaxSwitch research-memo contact@example.com';

function clean(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function confidence(level) {
  return ['low', 'medium', 'high'].includes(level) ? level : 'medium';
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  const number = Number(String(value).replace(/[%,$\s]/g, '').replace(',', '.'));
  return Number.isFinite(number) ? number : NaN;
}

function evidence({ claim, evidence, sourceUrl, sourceName, sourceDate, confidence: level = 'medium', thesisImpact = 'neutral' }) {
  return {
    claim: clean(claim),
    evidence: clean(evidence),
    sourceUrl: clean(sourceUrl),
    sourceName: clean(sourceName),
    sourceDate: clean(sourceDate),
    confidence: confidence(level),
    thesisImpact: clean(thesisImpact, 'neutral')
  };
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

function normalizeAiEvidence(items = []) {
  return (Array.isArray(items) ? items : []).map(item => evidence(item)).filter(item => item.claim && item.evidence);
}

async function enhanceMemoWithAi(memo, input = {}, options = {}) {
  const env = options.env || {};
  const endpoint = clean(options.aiResearchUrl || env.AI_RESEARCH_URL);
  if (!endpoint) return memo;
  const apiKey = clean(options.aiResearchApiKey || env.AI_RESEARCH_API_KEY);
  const payload = await postJson(endpoint, {
    task: 'taxswitch_research_memo',
    instruction: 'Return evidence-based scenario analysis only. Do not recommend buying, selling, or holding.',
    input,
    memo
  }, {
    ...options,
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
  });
  const aiMemo = payload.memo || payload.data?.memo || payload;
  const aiEvidence = normalizeAiEvidence(aiMemo.evidence || []);
  return {
    ...memo,
    status: memo.status === 'complete' ? 'complete+ai' : `${memo.status || 'partial'}+ai`,
    aiSummary: clean(aiMemo.summary || aiMemo.aiSummary),
    sections: aiMemo.sections && typeof aiMemo.sections === 'object' ? { ...memo.sections, ...aiMemo.sections } : memo.sections,
    evidence: memo.evidence.concat(aiEvidence),
    aiProvider: clean(payload.provider || aiMemo.provider || 'configured AI research endpoint')
  };
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
  enhanceMemoWithAi,
  buildResearchMemo,
  localMemoFallback
};
