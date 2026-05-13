const { ok, created, fail, methodNotAllowed, withApiHandler } = require("../lib/api-response");
const { generateActionPlan } = require("../lib/action-plan-generator");
const { healthcheck } = require("../lib/db");
const { requirePremiumUserAsync } = require("../lib/premium-auth");
const { createPortfolioRepository, emptyPortfolioSnapshot } = require("../lib/portfolio-repository");
const { generatePortfolioReport } = require("../lib/portfolio-report-generator");
const { demoActionPlan, demoSnapshot } = require("../lib/portfolio-demo");

async function optionalUser(event, context) {
  try {
    return await requirePremiumUserAsync(event, { context });
  } catch (error) {
    return null;
  }
}

exports.handler = withApiHandler(async (event, context, meta) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return methodNotAllowed(event.httpMethod, ["GET", "POST"]);
  }

  const query = event.queryStringParameters || {};
  const body = event.httpMethod === "POST" ? meta.body() : {};
  const type = body.type || query.type || "portfolio_snapshot";
  const format = body.format || query.format || "json";
  const user = await optionalUser(event, context);
  const demoMode = query.demo === "1" || process.env.PORTFOLIO_DEMO_MODE === "true";
  const database = await healthcheck().catch((error) => ({
    configured: Boolean(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL),
    reachable: false,
    errorCode: error.code || "database_error"
  }));
  const repository = user && database.configured && database.reachable
    ? createPortfolioRepository()
    : null;

  if (repository) {
    await repository.ensureUser(user.userId);
    const snapshot = await repository.getPortfolioSnapshot(user.userId) || emptyPortfolioSnapshot(user.userId);
    const actionPlan = generateActionPlan(snapshot, body.constraints);
    const report = generatePortfolioReport({ type, format, snapshot, actionPlan });
    const savedReport = event.httpMethod === "POST"
      ? await repository.saveReport(user.userId, report)
      : report;
    if (event.httpMethod === "POST") {
      await repository.recordAuditEvent(user.userId, "report_generated", {
        reportId: savedReport.id,
        type: savedReport.type,
        format: savedReport.format
      });
    }
    return (event.httpMethod === "POST" ? created : ok)(
      { report: savedReport },
      { ...meta, persisted: event.httpMethod === "POST", source: "database", database }
    );
  }

  if (!user && !demoMode) {
    return fail(401, "auth_required", "Reports require Netlify Identity or an API token.", null, meta);
  }

  if (user && !demoMode) {
    return fail(
      503,
      database.configured ? "database_unreachable" : "database_not_configured",
      database.configured ? "Portfolio database is configured but not reachable." : "Portfolio database is not configured.",
      null,
      { ...meta, database }
    );
  }

  const report = generatePortfolioReport({
    type,
    format,
    snapshot: { ...demoSnapshot, userId: user?.userId || demoSnapshot.userId },
    actionPlan: { ...demoActionPlan, userId: user?.userId || demoActionPlan.userId }
  });

  return ok({ report }, { ...meta, demoMode: true });
});
