const { ok, fail, methodNotAllowed, withApiHandler } = require("../lib/api-response");
const { healthcheck } = require("../lib/db");
const { requirePremiumUserAsync } = require("../lib/premium-auth");
const { createPortfolioRepository } = require("../lib/portfolio-repository");
const { syncBrokerConnection } = require("../lib/broker-sync-service");

exports.handler = withApiHandler(async (event, context, meta) => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(event.httpMethod, ["POST"]);
  }

  let user;
  try {
    user = await requirePremiumUserAsync(event, { context });
  } catch (_error) {
    return fail(401, "auth_required", "Broker sync requires Netlify Identity or an API token.", null, meta);
  }

  const body = meta.body();
  if (!body.connectionId) {
    return fail(400, "missing_connection_id", "connectionId is required.", null, meta);
  }

  const database = await healthcheck().catch((error) => ({
    configured: Boolean(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL),
    reachable: false,
    errorCode: error.code || "database_error"
  }));
  if (!database.configured || !database.reachable) {
    return fail(
      503,
      database.configured ? "database_unreachable" : "database_not_configured",
      database.configured ? "Portfolio database is configured but not reachable." : "Portfolio database is not configured.",
      null,
      { ...meta, database }
    );
  }

  const repository = createPortfolioRepository();
  const syncRun = await syncBrokerConnection({
    repository,
    userId: user.userId,
    connectionId: body.connectionId
  });

  return ok({ syncRun }, { ...meta, database });
});
