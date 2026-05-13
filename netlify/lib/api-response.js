"use strict";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function requestId(event) {
  return event?.headers?.["x-nf-request-id"]
    || event?.headers?.["x-request-id"]
    || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function jsonResponse(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: { ...DEFAULT_HEADERS, ...headers },
    body: JSON.stringify(payload)
  };
}

function ok(data, meta = {}, headers = {}) {
  return jsonResponse(200, { ok: true, data, error: null, meta }, headers);
}

function created(data, meta = {}, headers = {}) {
  return jsonResponse(201, { ok: true, data, error: null, meta }, headers);
}

function fail(statusCode, code, message, details, meta = {}) {
  return jsonResponse(statusCode, {
    ok: false,
    data: null,
    error: { code, message, details: details || null },
    meta
  });
}

function methodNotAllowed(method, allowed) {
  return jsonResponse(
    405,
    {
      ok: false,
      data: null,
      error: {
        code: "method_not_allowed",
        message: `${method} is not supported for this endpoint.`,
        details: { allowed }
      },
      meta: {}
    },
    { Allow: allowed.join(", ") }
  );
}

function parseJsonBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (error) {
    const parseError = new Error("Request body must be valid JSON.");
    parseError.code = "invalid_json";
    parseError.cause = error;
    throw parseError;
  }
}

function logEvent(level, message, fields) {
  const safeFields = { ...fields };
  delete safeFields.authorization;
  delete safeFields.cookie;
  console[level](
    JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...safeFields
    })
  );
}

function withApiHandler(handler, options = {}) {
  return async function apiHandler(event, context) {
    const startedAt = Date.now();
    const id = requestId(event);
    const meta = {
      requestId: id,
      runtime: "netlify-functions"
    };

    try {
      const response = await handler(event, context, { ...meta, body: () => parseJsonBody(event) });
      const statusCode = response?.statusCode || 200;
      logEvent(statusCode >= 500 ? "error" : "info", "api_request", {
        requestId: id,
        method: event.httpMethod,
        path: event.path,
        statusCode,
        durationMs: Date.now() - startedAt
      });
      return response;
    } catch (error) {
      const code = error.code || "internal_error";
      const statusCode = code === "invalid_json" ? 400 : error.statusCode || 500;
      logEvent("error", "api_error", {
        requestId: id,
        method: event.httpMethod,
        path: event.path,
        statusCode,
        code,
        durationMs: Date.now() - startedAt
      });
      return fail(statusCode, code, statusCode >= 500 ? "Unexpected API error." : error.message, null, meta);
    }
  };
}

module.exports = {
  ok,
  created,
  fail,
  methodNotAllowed,
  parseJsonBody,
  withApiHandler
};
