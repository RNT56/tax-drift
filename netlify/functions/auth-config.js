const { json, methodNotAllowed, handleApi } = require('../lib/api-helpers');

async function route(event) {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const publishableKey = process.env.SUPABASE_ANON_KEY || '';
  return json(200, {
    ok: Boolean(supabaseUrl && publishableKey),
    data: {
      supabaseUrl,
      publishableKey,
      configured: Boolean(supabaseUrl && publishableKey)
    }
  });
}

exports.route = route;
exports.handler = (event, context) => handleApi(route, event, context);

