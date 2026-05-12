/* Browser research memo helpers. Uses Netlify function when available, local fallback otherwise. */
(function initTaxResearch(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TaxResearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function taxResearchFactory() {
  function clean(value, fallback = '') {
    return String(value ?? fallback).trim();
  }

  function upper(value) {
    return clean(value).toUpperCase();
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

  function evidence(item) {
    const normalized = {
      id: clean(item.id),
      claim: clean(item.claim),
      evidence: clean(item.evidence),
      sourceUrl: clean(item.sourceUrl),
      sourceName: clean(item.sourceName, 'Manual input'),
      sourceDate: clean(item.sourceDate),
      confidence: ['low', 'medium', 'high'].includes(item.confidence) ? item.confidence : 'medium',
      thesisImpact: clean(item.thesisImpact, 'neutral'),
      sourceEvidenceIds: Array.isArray(item.sourceEvidenceIds) ? item.sourceEvidenceIds.map(clean).filter(Boolean).slice(0, 8) : []
    };
    normalized.id = normalized.id || `ev-${compactHash([normalized.sourceName, normalized.sourceDate, normalized.claim, normalized.evidence].join('|'))}`;
    return normalized;
  }

  function buildLocalMemo(input = {}) {
    const symbol = upper(input.symbol || input.ticker);
    const targetSymbol = upper(input.targetSymbol);
    const thesis = clean(input.thesis || input.userThesis, 'No thesis entered.');
    const evidenceItems = [
      evidence({
        claim: 'Decision output is scenario analysis, not a command.',
        evidence: `The hurdle and margin should be read under the user assumption: ${thesis}`,
        sourceUrl: 'local://assumption',
        sourceName: 'User assumption',
        sourceDate: new Date().toISOString().slice(0, 10),
        confidence: thesis === 'No thesis entered.' ? 'low' : 'medium',
        thesisImpact: 'assumption'
      }),
      evidence({
        claim: 'Forecast error is a key risk.',
        evidence: 'Expected returns are user assumptions and should be checked against filings, guidance, valuation and macro data.',
        sourceUrl: 'local://risk-catalog',
        sourceName: 'TaxSwitch risk catalog',
        sourceDate: new Date().toISOString().slice(0, 10),
        confidence: 'high',
        thesisImpact: 'risk'
      })
    ];
    return {
      symbol,
      targetSymbol,
      generatedAt: new Date().toISOString(),
      status: 'local',
      sections: {
        businessSummary: { title: 'Business summary', bullets: [`Select ${symbol || 'a symbol'} and generate a memo through Netlify dev/deploy for primary-source SEC evidence.`] },
        financialQuality: { title: 'Financial quality snapshot', bullets: ['Revenue, margin, cash flow, debt and dilution require primary-source or configured provider evidence.'] },
        valuation: { title: 'Valuation snapshot', bullets: ['Compare valuation assumptions against the required switch hurdle and scenario margin.'] },
        growthThesis: { title: 'Growth thesis', bullets: [thesis] },
        bearThesis: { title: 'Bear thesis', bullets: ['Check valuation risk, earnings misses, margin compression, regulation, debt, dilution and competition.'] },
        eventCalendar: { title: 'Event calendar', bullets: ['Add earnings, ex-dividend, product, investor-day and regulatory dates to monitor assumptions.'] },
        contradictionCheck: { title: 'Contradiction check', bullets: ['What evidence would make the expected return assumption false?', 'Which assumption has the lowest confidence score?'] }
      },
      evidence: evidenceItems,
      sourceErrors: []
    };
  }

  function buildRateLimitedMemo(input = {}, payload = {}) {
    const retryAfterSeconds = Number(payload.retryAfterSeconds);
    const retryText = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? `Try again in about ${Math.ceil(retryAfterSeconds / 60)} minute${retryAfterSeconds > 60 ? 's' : ''}.`
      : 'Try again later.';
    return {
      symbol: upper(input.symbol || input.ticker),
      targetSymbol: upper(input.targetSymbol),
      generatedAt: new Date().toISOString(),
      status: 'rate-limited',
      rateLimited: true,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 0,
      sections: {
        rateLimit: { title: 'Research memo limit', bullets: [retryText] }
      },
      evidence: [],
      sourceErrors: [clean(payload.error, 'Research memo rate limit exceeded.')]
    };
  }

  async function generateResearchMemo(input = {}) {
    if (typeof window === 'undefined' || window.location?.protocol === 'file:') return buildLocalMemo(input);
    try {
      const response = await fetch('/.netlify/functions/research-memo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) return buildRateLimitedMemo(input, payload);
      if (!response.ok || !payload.memo) return buildLocalMemo(input);
      return payload.memo;
    } catch {
      return buildLocalMemo(input);
    }
  }

  return {
    evidence,
    buildLocalMemo,
    buildRateLimitedMemo,
    generateResearchMemo
  };
});
