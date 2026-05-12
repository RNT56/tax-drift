const assert = require('node:assert/strict');
const Research = require('../netlify/lib/research-sources');
const ResearchMemoFunction = require('../netlify/functions/research-memo');
const AiModelsFunction = require('../netlify/functions/ai-models');
const { createWorkspaceStore, sanitizeWorkspaceInput } = require('../netlify/lib/workspace-store');
const { createMemoryBackingStore, createSecureStore } = require('../netlify/lib/secure-store');

function event(method, body) {
  return { httpMethod: method, headers: {}, queryStringParameters: {}, body: body ? JSON.stringify(body) : '' };
}

function parse(response) {
  return JSON.parse(response.body);
}

(async () => {
  const companyTickers = {
    0: { cik_str: 123456, ticker: 'TEST', title: 'Test Company Inc.' }
  };
  const secSubmissions = {
    filings: {
      recent: {
        form: ['8-K', '10-K'],
        filingDate: ['2026-01-03', '2026-02-15'],
        reportDate: ['2026-01-03', '2025-12-31'],
        accessionNumber: ['a', 'b'],
        primaryDocument: ['a.htm', 'b.htm']
      }
    }
  };
  const secCompanyFacts = {
    facts: {
      'us-gaap': {
        Revenues: {
          units: {
            USD: [{ val: 1000, end: '2025-12-31', filed: '2026-02-15' }]
          }
        },
        LongTermDebtNoncurrent: {
          units: {
            USD: [{ val: 250, end: '2025-12-31', filed: '2026-02-15' }]
          }
        }
      }
    }
  };

  const memo = await Research.buildResearchMemo({
    symbol: 'TEST',
    positionCurrency: 'EUR',
    taxCurrency: 'EUR',
    thesis: 'Margins improve.'
  }, { companyTickers, secSubmissions, secCompanyFacts });

  assert.equal(memo.symbol, 'TEST');
  assert.equal(memo.status, 'complete');
  assert.ok(memo.evidence.every(item => item.id));
  assert.ok(memo.evidence.some(item => item.sourceName === 'SEC submissions API'));
  assert.ok(memo.evidence.some(item => item.claim.includes('revenue')));
  assert.equal(memo.sections.contradictionCheck.title, 'Contradiction check');

  const providerEvidence = Research.buildMarketDataEvidence(
    { url: 'https://example.test/profile', payload: [{ symbol: 'TEST', marketCap: 1000000, currency: 'USD', sector: 'Technology', industry: 'Software' }] },
    { url: 'https://example.test/ratios', payload: [{ date: '2025-12-31', priceEarningsRatio: 22, freeCashFlowYield: 0.04 }] },
    { url: 'https://example.test/news', payload: [{ title: 'Test Company announces product update', publishedDate: '2026-01-05', site: 'Licensed provider', url: 'https://example.test/news/1' }] }
  );
  assert.ok(providerEvidence.some(item => item.sourceName === 'Financial Modeling Prep profile'));
  assert.ok(providerEvidence.some(item => item.thesisImpact === 'sentiment/news'));

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({
      memo: {
        summary: 'AI contradiction pass completed.',
        evidence: [{ claim: 'AI checked the thesis for contradictions.', evidence: 'No command was generated.', sourceName: 'Configured AI endpoint', confidence: 'medium', thesisImpact: 'contradiction check' }]
      }
    })
  });
  const enhanced = await Research.enhanceMemoWithAi(memo, { symbol: 'TEST' }, { env: { AI_RESEARCH_URL: 'https://ai.example.test/memo' } });
  global.fetch = originalFetch;
  assert.equal(enhanced.aiSummary, 'AI contradiction pass completed.');
  assert.ok(enhanced.evidence.some(item => item.sourceName === 'Configured AI endpoint'));
  assert.ok(enhanced.evidence.find(item => item.sourceName === 'Configured AI endpoint').confidence === 'low');

  const providerEnhanced = await Research.enhanceMemoWithAi(memo, {
    symbol: 'TEST',
    aiProvider: 'openai',
    aiModel: 'gpt-5.5',
    decisionContext: {
      scenarioAnalysis: { expectedMargin: 120, monteCarlo: { runs: 20, switchWinRate: 0.6 } },
      assumptionQuality: [{ assumption: 'New-stock return', confidence: 'low', reason: 'Forecast.' }],
      riskFlags: [{ category: 'model', label: 'Thin margin', message: 'Near hurdle.', severity: 'medium', confidence: 'medium' }],
      taxLossHarvesting: { applicable: false },
      portfolioRisk: { riskAdjustedMargin: 0.3 }
    }
  }, {
    env: { OPENAI_API_KEY: 'test-key' },
    fetchImpl: async (url, init) => {
      assert.equal(String(url), 'https://api.openai.com/v1/chat/completions');
      const body = JSON.parse(init.body);
      assert.equal(body.model, 'gpt-5.5');
      assert.ok(body.messages[1].content.includes('decisionContext'));
      const citedId = memo.evidence[0].id;
      return {
        ok: true,
        text: async () => JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                summary: 'AI suite completed.',
                evidence: [
                  { claim: 'Cited claim', evidence: 'Uses source evidence.', confidence: 'high', sourceEvidenceIds: [citedId] },
                  { claim: 'Uncited claim', evidence: 'No source id.' }
                ],
                contradictionCheck: { summary: 'Watch for margin pressure.', invalidatingEvidence: ['Revenue falls.'], sourceEvidenceIds: [citedId] },
                scenarioGenerator: { cases: [{ id: 'base', name: 'Base', probability: 0.5, oldReturn: 0.04, newReturn: 0.08, sourceEvidenceIds: [citedId] }] },
                assumptionCritic: { drivers: [{ assumption: 'New-stock return', impact: 'Largest swing factor.', weakness: 'Forecast uncertainty.', sourceEvidenceIds: [citedId] }] },
                reportNarrative: { title: 'Narrative', memo: 'Non-advisory narrative.' },
                watchRuleGenerator: { suggestions: [{ type: 'scenario-margin', label: 'Margin watch', threshold: 100, direction: 'above', sourceEvidenceIds: [citedId] }] }
              })
            }
          }]
        })
      };
    }
  });
  assert.equal(providerEnhanced.status, 'complete+ai');
  assert.equal(providerEnhanced.ai.scenarioGenerator.cases.length, 1);
  assert.equal(providerEnhanced.ai.watchRuleGenerator.suggestions.length, 1);
  const uncited = providerEnhanced.evidence.find(item => item.claim === 'Uncited claim');
  assert.equal(uncited.confidence, 'low');
  assert.equal(uncited.thesisImpact, 'uncited AI claim');

  const badAi = await Research.enhanceMemoWithAi(memo, { symbol: 'TEST', aiProvider: 'openai' }, {
    env: { OPENAI_API_KEY: 'test-key' },
    fetchImpl: async () => ({ ok: true, text: async () => 'not json' })
  });
  assert.equal(badAi.status, 'complete');
  assert.ok(badAi.aiErrors[0].includes('JSON'));

  const modelsResponse = await AiModelsFunction.route(event('GET'), {}, {
    env: { OPENAI_API_KEY: 'test-key' },
    fetchImpl: async (url) => {
      assert.equal(String(url), 'https://api.openai.com/v1/models');
      return {
        ok: true,
        text: async () => JSON.stringify({ data: [{ id: 'gpt-5.5' }, { id: 'gpt-test' }, { id: 'text-embedding-3-small' }] })
      };
    }
  });
  assert.equal(modelsResponse.statusCode, 200);
  const openAiModels = parse(modelsResponse).providers.find(provider => provider.id === 'openai').models;
  assert.deepEqual(openAiModels.map(model => model.id), ['gpt-5.5']);

  const disallowedModelResponse = await ResearchMemoFunction.route(event('POST', {
    symbol: 'TEST',
    aiProvider: 'openai',
    aiModel: 'gpt-test'
  }), {}, { env: { OPENAI_API_KEY: 'test-key' } });
  assert.equal(disallowedModelResponse.statusCode, 400);
  assert.match(parse(disallowedModelResponse).error, /not allowed/);

  const response = await ResearchMemoFunction.route(event('POST', {
    symbol: 'TEST',
    positionCurrency: 'EUR',
    taxCurrency: 'EUR'
  }), {}, { companyTickers, secSubmissions, secCompanyFacts });
  assert.equal(response.statusCode, 200);
  assert.equal(parse(response).memo.symbol, 'TEST');

  const rateLimitStore = new Map();
  const firstLimitedEvent = event('POST', { symbol: 'TEST' });
  firstLimitedEvent.headers = { 'x-forwarded-for': '203.0.113.42' };
  const secondLimitedEvent = event('POST', { symbol: 'TEST' });
  secondLimitedEvent.headers = { 'x-forwarded-for': '203.0.113.42' };
  const rateOptions = {
    env: { AI_RESEARCH_RATE_LIMIT: '1', AI_RESEARCH_RATE_WINDOW_SECONDS: '60' },
    rateLimitStore,
    rateLimitNow: 1_700_000_000_000,
    companyTickers,
    secSubmissions,
    secCompanyFacts
  };
  const firstLimitedResponse = await ResearchMemoFunction.route(firstLimitedEvent, {}, rateOptions);
  const secondLimitedResponse = await ResearchMemoFunction.route(secondLimitedEvent, {}, rateOptions);
  assert.equal(firstLimitedResponse.statusCode, 200);
  assert.equal(secondLimitedResponse.statusCode, 429);
  assert.equal(parse(secondLimitedResponse).error, 'Research memo rate limit exceeded.');
  assert.equal(secondLimitedResponse.headers['Retry-After'], '60');

  const aiRateLimitStore = new Map();
  const aiFetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ summary: 'AI ok.' }) } }]
    })
  });
  const firstAiEvent = event('POST', {
    symbol: 'TEST',
    thesis: 'Margins improve.',
    aiProvider: 'openai',
    aiModel: 'gpt-5.5',
    positionCurrency: 'EUR',
    taxCurrency: 'EUR'
  });
  firstAiEvent.headers = { 'x-forwarded-for': '198.51.100.7', authorization: 'Bearer one' };
  const secondAiEvent = event('POST', {
    symbol: 'TEST',
    thesis: 'Margins improve.',
    aiProvider: 'openai',
    aiModel: 'gpt-5.5',
    positionCurrency: 'EUR',
    taxCurrency: 'EUR'
  });
  secondAiEvent.headers = { 'x-forwarded-for': '198.51.100.7', authorization: 'Bearer two' };
  const aiRateOptions = {
    env: { OPENAI_API_KEY: 'test-key', AI_RESEARCH_IP_LIMIT: '1', AI_RESEARCH_IP_WINDOW_SECONDS: '60' },
    rateLimitStore: aiRateLimitStore,
    rateLimitNow: 1_700_000_000_000,
    companyTickers,
    secSubmissions,
    secCompanyFacts,
    fetchImpl: aiFetch
  };
  const firstAiRateResponse = await ResearchMemoFunction.route(firstAiEvent, {}, aiRateOptions);
  const secondAiRateResponse = await ResearchMemoFunction.route(secondAiEvent, {}, aiRateOptions);
  assert.equal(firstAiRateResponse.statusCode, 200);
  assert.equal(secondAiRateResponse.statusCode, 429);
  assert.equal(secondAiRateResponse.headers['X-RateLimit-Store'], 'memory');

  const upgraded = sanitizeWorkspaceInput({
    schemaVersion: 1,
    name: 'Legacy',
    decisionCases: [{ id: 'base' }],
    riskProfile: { maxTolerableLoss: 0.2 },
    researchMemos: [memo],
    watchRules: [{ type: 'target-reached' }]
  });
  assert.equal(upgraded.schemaVersion, 2);
  assert.equal(upgraded.decisionCases.length, 1);
  assert.equal(upgraded.researchMemos.length, 1);

  const backing = createMemoryBackingStore('research-workspace-test');
  const secureStore = createSecureStore({ env: { SECURE_STORE_KEY: 'secret' }, namespace: 'research-workspace-test', store: backing });
  const store = createWorkspaceStore({ secureStore });
  const workspace = await store.create('user-1', upgraded);
  assert.equal(workspace.schemaVersion, 2);
  assert.equal(workspace.watchRules.length, 1);

  console.log('Research source tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
