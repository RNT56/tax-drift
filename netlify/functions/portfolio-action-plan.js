const { ok, created, fail, methodNotAllowed, withApiHandler } = require("../lib/api-response");
const { healthcheck } = require("../lib/db");
const { requirePremiumUserAsync } = require("../lib/premium-auth");
const { generateActionPlan } = require("../lib/action-plan-generator");
const { createPortfolioRepository, emptyPortfolioSnapshot } = require("../lib/portfolio-repository");
const { demoActionPlan } = require("../lib/portfolio-demo");

async function optionalUser(event, context) {
  try {
    return await requirePremiumUserAsync(event, { context });
  } catch (error) {
    return null;
  }
}

exports.handler = withApiHandler(async (event, context, meta) => {
  const user = await optionalUser(event, context);
  const demoMode = event.queryStringParameters?.demo === "1" || process.env.PORTFOLIO_DEMO_MODE === "true";
  const database = await healthcheck().catch((error) => ({
    configured: Boolean(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL),
    reachable: false,
    errorCode: error.code || "database_error"
  }));
  const repository = user && database.configured && database.reachable
    ? createPortfolioRepository()
    : null;

  if (event.httpMethod === "GET") {
    if (repository) {
      await repository.ensureUser(user.userId);
      const snapshot = await repository.getPortfolioSnapshot(user.userId) || emptyPortfolioSnapshot(user.userId);
      return ok({ actionPlan: generateActionPlan(snapshot) }, { ...meta, source: "database", database });
    }
    if (!user && !demoMode) {
      return fail(401, "auth_required", "Action plans require Netlify Identity or an API token.", null, meta);
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
    return ok({ actionPlan: { ...demoActionPlan, userId: user?.userId || demoActionPlan.userId } }, meta);
  }

  if (event.httpMethod === "POST") {
    if (!user && !demoMode) {
      return fail(401, "auth_required", "Action plan generation requires Netlify Identity or an API token.", null, meta);
    }
    const body = meta.body();
    if (repository) {
      await repository.ensureUser(user.userId);
      const snapshot = await repository.getPortfolioSnapshot(user.userId) || emptyPortfolioSnapshot(user.userId);
      const plan = generateActionPlan(snapshot, body.constraints);
      const savedPlan = await repository.saveActionPlan(user.userId, plan);
      await repository.recordAuditEvent(user.userId, "action_plan_generated", {
        actionPlanId: savedPlan.id,
        actionCount: savedPlan.actions.length
      });
      return created({ actionPlan: savedPlan }, { ...meta, persisted: true, source: "database", database });
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
    return created(
      {
        actionPlan: {
          ...demoActionPlan,
          userId: user?.userId || demoActionPlan.userId,
          constraints: body.constraints || demoActionPlan.constraints || {}
        }
      },
      { ...meta, persisted: Boolean(user) }
    );
  }

  return methodNotAllowed(event.httpMethod, ["GET", "POST"]);
});
