const DEFAULT_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function json(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...DEFAULT_HEADERS, ...extraHeaders },
    body: JSON.stringify(payload)
  };
}

function methodNotAllowed(allowed) {
  return json(405, { error: 'Method not allowed.' }, { Allow: allowed.join(', ') });
}

function readQuery(event = {}) {
  return event.queryStringParameters || {};
}

function parseJsonBody(event = {}) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const error = new Error('JSON body must be an object.');
      error.statusCode = 400;
      throw error;
    }
    return parsed;
  } catch (error) {
    if (error.statusCode) throw error;
    const wrapped = new Error('Invalid JSON body.');
    wrapped.statusCode = 400;
    throw wrapped;
  }
}

async function handleApi(handler, event, context, options = {}) {
  try {
    return await handler(event, context);
  } catch (error) {
    const statusCode = Number(error.statusCode || error.status || 500);
    const publicMessage = statusCode >= 500 && !options.exposeServerErrors
      ? 'Internal server error.'
      : error.message || 'Request failed.';
    return json(statusCode, { error: publicMessage });
  }
}

module.exports = {
  json,
  methodNotAllowed,
  parseJsonBody,
  readQuery,
  handleApi
};
