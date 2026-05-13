const assert = require('node:assert/strict');
const Research = require('../netlify/lib/research-pipeline');
const ResearchFunction = require('../netlify/functions/research');
const CopilotFunction = require('../netlify/functions/research-copilot');
const StatusFunction = require('../netlify/functions/research-status');

function event(method, body, queryStringParameters = {}) {
  return {
    httpMethod: method,
    headers: { 'x-forwarded-for': '203.0.113.99' },
    queryStringParameters,
    body: body ? JSON.stringify(body) : ''
  };
}

function parse(response) {
  return JSON.parse(response.body);
}

function authEnv(extra = {}) {
  return {
    PREMIUM_AUTH_MODE: 'mock',
    PREMIUM_TEST_USER_ID: 'user-1',
    RESEARCH_FETCH_SEC_HTML: 'false',
    ...extra
  };
}

function fixtures() {
  return {
    companyTickers: {
      0: { cik_str: 123456, ticker: 'TEST', title: 'Test Company Inc.' }
    },
    secSubmissions: {
      filings: {
        recent: {
          form: ['10-K', '8-K'],
          filingDate: ['2026-02-15', '2026-01-03'],
          reportDate: ['2025-12-31', '2026-01-03'],
          accessionNumber: ['0000123456-26-000001', '0000123456-26-000002'],
          primaryDocument: ['test-20251231.htm', 'test-8k.htm']
        }
      }
    },
    secCompanyFacts: {
      facts: {
        'us-gaap': {
          Revenues: { units: { USD: [{ val: 1_200_000_000, end: '2025-12-31', filed: '2026-02-15' }] } },
          NetIncomeLoss: { units: { USD: [{ val: 210_000_000, end: '2025-12-31', filed: '2026-02-15' }] } },
          LongTermDebtNoncurrent: { units: { USD: [{ val: 340_000_000, end: '2025-12-31', filed: '2026-02-15' }] } },
          CommonStockSharesOutstanding: { units: { shares: [{ val: 85_000_000, end: '2025-12-31', filed: '2026-02-15' }] } }
        }
      }
    },
    secFilingHtml: `
      <html><body>
        <h1>Item 1. Business</h1>
        <p>Test Company sells workflow software and industrial data products to enterprise customers.</p>
        <h1>Item 1A. Risk Factors</h1>
        <p>Export restrictions, tariffs, cybersecurity incidents and supplier shortages could affect operations.</p>
        <h1>Item 2. Properties</h1>
      </body></html>
    `,
    fmpProfile: [{ symbol: 'TEST', companyName: 'Test Company Inc.', marketCap: 4_200_000_000, currency: 'USD', sector: 'Technology', industry: 'Software', country: 'US' }],
    fmpRatios: [{ date: '2025-12-31', priceEarningsRatio: 20, freeCashFlowYield: 0.06, debtEquityRatio: 0.4, operatingProfitMargin: 0.22 }],
    fmpNews: [{ title: 'Test Company announces supply chain mitigation plan', publishedDate: '2026-05-12', site: 'Licensed provider', url: 'https://example.test/news/1' }],
    fmpPeers: { peersList: ['PEER', 'COMP'] },
    fmpEstimates: [{ date: '2026', estimatedRevenueAvg: 1_350_000_000, estimatedEpsAvg: 2.5 }],
    fmpEarningsCalendar: [{ date: '2026-07-20', epsEstimated: 0.62, revenueEstimated: 340_000_000 }],
    fmpInsider: [{ transactionDate: '2026-03-20', transactionType: 'P-Purchase' }],
    fmpEtfHoldings: [{ symbol: 'TEST', weightPercentage: 7.3, sector: 'Technology', country: 'US' }],
    alphaOverview: { Name: 'Test Company Inc.', Description: 'Test Company provides enterprise automation software.', PERatio: '21', DividendYield: '0.01', ProfitMargin: '0.16' },
    alphaEtfProfile: { holdings: [{ symbol: 'TEST', weight: '7.3' }, { symbol: 'PEER', weight: '3.1' }] },
    alphaNews: { feed: [{ title: 'Regulatory investigation affects Test Company supplier', summary: 'Supplier review may delay delivery.', url: 'https://example.test/alpha/1', source: 'Alpha source', time_published: '20260512T120000' }] },
    rssFeeds: [{
      url: 'https://issuer.example/feed.xml',
      xml: `<?xml version="1.0"?><rss><channel><title>Issuer feed</title><item><title>Test Company product update</title><description>New release references export control review.</description><link>https://issuer.example/1</link><pubDate>Tue, 12 May 2026 10:00:00 GMT</pubDate></item></channel></rss>`
    }],
    gdeltPayload: { articles: [{ title: 'Test Company faces tariff risk in Europe', summary: 'Tariff dispute creates risk.', url: 'https://gdelt.example/1', domain: 'GDELT source', seendate: '2026-05-12T12:00:00Z', sourcecountry: 'US' }] },
    reliefWebPayload: { data: [{ fields: { title: 'Flood disrupts semiconductor suppliers', summary: 'Regional flooding affects supplier logistics.', url: 'https://reliefweb.example/1', date: { created: '2026-05-10T00:00:00Z' }, country: [{ name: 'Taiwan' }] } }] },
    ofacXml: '<sdnList><sdnEntry><firstName>Unrelated</firstName><lastName>Name</lastName></sdnEntry></sdnList>',
    fredPayload: { observations: [{ date: '2026-04-01', value: '4.1' }] }
  };
}

function createFakeRepository() {
  const state = { runs: [], exchanges: [] };
  return {
    state,
    async createRun(userId, bundle) {
      const run = {
        id: `run-${state.runs.length + 1}`,
        userId,
        subjectId: 'subject-1',
        subject: bundle.subject,
        targetSubject: bundle.targetSubject,
        thesis: bundle.thesis,
        status: bundle.status,
        generatedAt: bundle.generatedAt,
        completedAt: bundle.completedAt,
        horizon: bundle.horizon,
        sourcePolicy: bundle.sourcePolicy,
        coverage: bundle.coverage,
        summary: bundle.summary,
        aiPayload: bundle.aiPayload,
        sourceErrors: bundle.sourceErrors,
        sourceSnapshots: bundle.sourceSnapshots,
        evidence: bundle.evidence,
        metrics: bundle.metrics,
        events: bundle.events
      };
      state.runs.unshift(run);
      return run;
    },
    async getRun(userId, runId) {
      return state.runs.find((run) => run.userId === userId && run.id === runId) || null;
    },
    async listRuns(userId, filters = {}) {
      return state.runs
        .filter((run) => run.userId === userId)
        .filter((run) => !filters.symbol || run.subject.symbol === String(filters.symbol).toUpperCase())
        .slice(0, filters.limit || 20);
    },
    async appendCopilotExchange(userId, input, response) {
      const thread = { id: 'thread-1', userId, runId: input.runId, title: input.message, status: 'active' };
      const messages = [
        { id: 'msg-user', userId, threadId: thread.id, runId: input.runId, role: 'user', content: input.message, sourceEvidenceIds: [], sourceRequests: [] },
        { id: 'msg-assistant', userId, threadId: thread.id, runId: input.runId, role: 'assistant', content: response.answer, sourceEvidenceIds: response.sourceEvidenceIds, sourceRequests: response.sourceRequests }
      ];
      state.exchanges.push({ thread, messages });
      return { thread, messages };
    }
  };
}

(async () => {
  const parsedRss = Research.parseRssFeed(fixtures().rssFeeds[0].xml, 'https://issuer.example/feed.xml');
  assert.equal(parsedRss[0].title, 'Test Company product update');

  const filingSections = Research.extractFilingSections(fixtures().secFilingHtml);
  assert.match(filingSections.business, /workflow software/);
  assert.match(filingSections.riskFactors, /Export restrictions/);

  const holdings = Research.normalizeEtfHoldings([{ holdingSymbol: 'ABC', holdingPercent: '4.5', holdingName: 'ABC Corp' }]);
  assert.deepEqual(holdings[0], { symbol: 'ABC', name: 'ABC Corp', weight: 4.5, sector: '', country: '' });

  const normalizedGdelt = Research.normalizeGdeltEvents({ articles: [{ title: 'TEST tariff investigation', seendate: new Date().toISOString(), domain: 'example.test' }] }, { symbol: 'TEST', name: 'Test Company' });
  assert.equal(normalizedGdelt[0].severity, 'high');
  assert.ok(normalizedGdelt[0].riskScore > 0.5);

  const scored = Research.scoreResearchEvent(Research.makeEvent({
    title: 'TEST faces sanctions and export ban',
    occurredAt: new Date().toISOString(),
    sourceName: 'event source',
    directness: 0.2
  }), { symbol: 'TEST' });
  assert.equal(scored.severity, 'high');
  assert.ok(scored.directness >= 0.85);

  assert.doesNotMatch(Research.scrubAdvisoryLanguage('You should buy TEST.'), /should buy/i);

  const bundle = await Research.buildResearchBundle({
    symbol: 'TEST',
    name: 'Test Company Inc.',
    instrumentType: 'etf',
    currency: 'USD',
    taxCurrency: 'EUR',
    thesis: 'Recurring revenue growth can offset macro risk.',
    issuerUrls: [{ url: 'https://issuer.example/feed.xml' }],
    watchKeywords: ['tariff', 'supplier']
  }, {
    env: authEnv(),
    ...fixtures()
  });
  assert.equal(bundle.subject.symbol, 'TEST');
  assert.ok(bundle.evidence.some((item) => item.category === 'business'));
  assert.ok(bundle.evidence.some((item) => item.category === 'etf'));
  assert.ok(bundle.evidence.some((item) => item.category === 'global-events'));
  assert.ok(bundle.metrics.some((item) => item.label === 'Revenue'));
  assert.ok(bundle.events.some((item) => item.riskScore > 0));
  assert.equal(bundle.summary.nonAdvisory, true);
  assert.doesNotMatch(JSON.stringify(bundle), /\b(strong buy|buy rating|sell rating)\b/i);

  const unauth = await ResearchFunction.route(event('POST', { symbol: 'TEST' }), {}, {
    env: {},
    researchRepository: createFakeRepository()
  });
  assert.equal(unauth.statusCode, 401);

  const lowCostStatus = Research.getResearchStatus(authEnv());
  assert.equal(lowCostStatus.capabilities.etfHoldings, 'premium-key-missing');

  const repository = createFakeRepository();
  const createResponse = await ResearchFunction.route(event('POST', {
    symbol: 'TEST',
    name: 'Test Company Inc.',
    instrumentType: 'stock',
    thesis: 'Margins improve.',
    watchKeywords: ['tariff']
  }), {}, {
    env: authEnv(),
    researchRepository: repository,
    rateLimitStore: new Map(),
    ...fixtures()
  });
  assert.equal(createResponse.statusCode, 201);
  const createdRun = parse(createResponse).data.run;
  assert.equal(createdRun.subject.symbol, 'TEST');
  assert.ok(createdRun.evidence.length > 0);

  const limitedRepository = createFakeRepository();
  const limitedStore = new Map();
  const limitedOptions = {
    env: authEnv({ RESEARCH_RATE_LIMIT: '1', RESEARCH_RATE_WINDOW_SECONDS: '60' }),
    researchRepository: limitedRepository,
    rateLimitStore: limitedStore,
    rateLimitNow: 1_700_000_000_000,
    ...fixtures()
  };
  const firstLimited = await ResearchFunction.route(event('POST', { symbol: 'TEST' }), {}, limitedOptions);
  const secondLimited = await ResearchFunction.route(event('POST', { symbol: 'TEST' }), {}, limitedOptions);
  assert.equal(firstLimited.statusCode, 201);
  assert.equal(secondLimited.statusCode, 429);
  assert.equal(secondLimited.headers['Retry-After'], '60');

  const listResponse = await ResearchFunction.route(event('GET', null, { symbol: 'TEST' }), {}, {
    env: authEnv(),
    researchRepository: repository
  });
  assert.equal(listResponse.statusCode, 200);
  assert.equal(parse(listResponse).data.runs.length, 1);

  const getResponse = await ResearchFunction.route(event('GET', null, { id: createdRun.id }), {}, {
    env: authEnv(),
    researchRepository: repository
  });
  assert.equal(getResponse.statusCode, 200);
  assert.equal(parse(getResponse).data.run.id, createdRun.id);

  const statusResponse = await StatusFunction.route(event('GET'), {}, { env: authEnv({ FMP_API_KEY: 'key', RESEARCH_RSS_FEEDS: 'https://issuer.example/feed.xml' }) });
  assert.equal(statusResponse.statusCode, 200);
  assert.equal(parse(statusResponse).data.advisoryMode, 'non-advisory');
  assert.equal(parse(statusResponse).data.capabilities.globalEvents, 'available');

  const copilotResponse = await CopilotFunction.route(event('POST', {
    runId: createdRun.id,
    message: 'Challenge my thesis.'
  }), {}, {
    env: authEnv(),
    researchRepository: repository,
    rateLimitStore: new Map()
  });
  assert.equal(copilotResponse.statusCode, 200);
  const copilotPayload = parse(copilotResponse).data;
  assert.ok(copilotPayload.response.answer.includes('I can analyze the saved evidence'));
  assert.ok(copilotPayload.messages.some((message) => message.role === 'assistant'));

  const missingMessage = await CopilotFunction.route(event('POST', { runId: createdRun.id }), {}, {
    env: authEnv(),
    researchRepository: repository,
    rateLimitStore: new Map()
  });
  assert.equal(missingMessage.statusCode, 400);

  console.log('Research product tests passed');
})();
