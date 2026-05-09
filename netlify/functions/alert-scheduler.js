const { handleApi, json } = require('../lib/api-helpers');
const { runScheduledAlertCheck } = require('../lib/alert-store');

exports.config = {
  schedule: '@hourly'
};

async function route(event, context, options = {}) {
  const result = await runScheduledAlertCheck({ env: options.env || process.env });
  return json(200, result);
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);
