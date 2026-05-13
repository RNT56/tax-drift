const { ok, withApiHandler } = require("../lib/api-response");
const { healthcheck } = require("../lib/db");

exports.handler = withApiHandler(async (_event, _context, meta) => {
  const database = await healthcheck().catch((error) => ({
    configured: Boolean(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL),
    reachable: false,
    errorCode: error.code || "database_error"
  }));

  return ok(
    {
      service: "taxswitch-portfolio",
      status: database.configured && !database.reachable ? "degraded" : "ok",
      database,
      providers: {
        manual: { configured: true, readOnly: true },
        import: { configured: true, readOnly: true },
        snaptrade: {
          configured: Boolean(process.env.SNAPTRADE_CLIENT_ID && process.env.SNAPTRADE_CONSUMER_KEY),
          readOnly: true
        }
      }
    },
    meta
  );
});
