const { ok, fail, methodNotAllowed, withApiHandler } = require("../lib/api-response");
const { healthcheck } = require("../lib/db");
const { requirePremiumUserAsync } = require("../lib/premium-auth");
const { createPortfolioRepository, emptyPortfolioSnapshot } = require("../lib/portfolio-repository");
const { demoSnapshot } = require("../lib/portfolio-demo");

function readQuery(event) {
  return event.queryStringParameters || {};
}

async function optionalUser(event, context) {
  try {
    return await requirePremiumUserAsync(event, { context });
  } catch (error) {
    return null;
  }
}

exports.handler = withApiHandler(async (event, context, meta) => {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(event.httpMethod, ["GET"]);
  }

  const query = readQuery(event);
  const user = await optionalUser(event, context);
  const demoMode = query.demo === "1" || process.env.PORTFOLIO_DEMO_MODE === "true";
  if (!user && !demoMode) {
    return fail(401, "auth_required", "Portfolio data requires Netlify Identity or an API token.", null, meta);
  }

  const database = await healthcheck().catch((error) => ({
    configured: Boolean(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL),
    reachable: false,
    errorCode: error.code || "database_error"
  }));

  if (user && database.configured && database.reachable) {
    const repository = createPortfolioRepository();
    await repository.ensureUser(user.userId);
    const snapshot = await repository.getPortfolioSnapshot(user.userId)
      || emptyPortfolioSnapshot(user.userId);
    return ok(
      { snapshot },
      {
        ...meta,
        demoMode: false,
        source: "database",
        database
      }
    );
  }

  if (user && !demoMode) {
    return fail(
      503,
      database.configured ? "database_unreachable" : "database_not_configured",
      database.configured
        ? "Portfolio database is configured but not reachable."
        : "Portfolio database is not configured.",
      null,
      { ...meta, database }
    );
  }

  return ok(
    {
      snapshot: {
        ...demoSnapshot,
        userId: user?.userId || demoSnapshot.userId
      }
    },
    {
      ...meta,
      demoMode: !user || demoMode,
      database
    }
  );
});
