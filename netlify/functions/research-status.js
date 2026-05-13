const { ok, withApiHandler } = require('../lib/api-response');
const { getResearchStatus } = require('../lib/research-pipeline');

async function route(_event, _context, options = {}) {
  return ok(getResearchStatus(options.env || process.env), {}, { 'Cache-Control': 'private, max-age=300' });
}

exports.route = route;
exports.handler = (event, context) => withApiHandler((innerEvent, innerContext) => route(innerEvent, innerContext))(event, context);
