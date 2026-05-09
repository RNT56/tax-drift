const { handleApi, json, methodNotAllowed, parseJsonBody } = require('../lib/api-helpers');
const { buildResearchMemo } = require('../lib/research-sources');

async function route(event, context, options = {}) {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  const input = parseJsonBody(event);
  const memo = await buildResearchMemo(input, {
    env: options.env || process.env,
    userAgent: options.userAgent,
    companyTickers: options.companyTickers,
    secSubmissions: options.secSubmissions,
    secCompanyFacts: options.secCompanyFacts,
    fredPayload: options.fredPayload,
    ecbPayload: options.ecbPayload,
    fmpProfile: options.fmpProfile,
    fmpRatios: options.fmpRatios,
    fmpNews: options.fmpNews,
    aiResearchUrl: options.aiResearchUrl,
    aiResearchApiKey: options.aiResearchApiKey
  });
  return json(200, { ok: true, data: { memo }, memo });
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
