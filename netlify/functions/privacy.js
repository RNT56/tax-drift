const { ok, fail, methodNotAllowed, withApiHandler } = require("../lib/api-response");
const { healthcheck } = require("../lib/db");
const { requirePremiumUserAsync } = require("../lib/premium-auth");
const { createPortfolioRepository } = require("../lib/portfolio-repository");
const { demoSnapshot, demoActionPlan } = require("../lib/portfolio-demo");

function redactExport(rows) {
  if (!rows) return rows;
  return {
    ...rows,
    connections: (rows.connections || []).map((connection) => {
      const {
        encrypted_user_token: _encryptedUserToken,
        encrypted_refresh_token: _encryptedRefreshToken,
        ...safeConnection
      } = connection;
      return safeConnection;
    })
  };
}

exports.handler = withApiHandler(async (event, context, meta) => {
  let user;
  try {
    user = await requirePremiumUserAsync(event, { context });
  } catch (error) {
    if (event.queryStringParameters?.demo !== "1") {
      return fail(401, "auth_required", "Privacy operations require Netlify Identity or an API token.", null, meta);
    }
    user = { userId: "demo-user", authType: "demo" };
  }

  const database = await healthcheck().catch((error) => ({
    configured: Boolean(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL),
    reachable: false,
    errorCode: error.code || "database_error"
  }));
  const repository = user.authType !== "demo" && database.configured && database.reachable
    ? createPortfolioRepository()
    : null;

  if (event.httpMethod === "GET") {
    if (repository) {
      const exported = await repository.exportUserData(user.userId);
      await repository.recordAuditEvent(user.userId, "privacy_export_requested");
      return ok(
        {
          export: {
            userId: user.userId,
            portfolio: redactExport(exported)
          }
        },
        { ...meta, exportFormat: "json", source: "database", database }
      );
    }
    if (user.authType !== "demo" && event.queryStringParameters?.demo !== "1") {
      return fail(
        503,
        database.configured ? "database_unreachable" : "database_not_configured",
        database.configured ? "Portfolio database is configured but not reachable." : "Portfolio database is not configured.",
        null,
        { ...meta, database }
      );
    }
    return ok(
      {
        export: {
          userId: user.userId,
          portfolio: demoSnapshot,
          actionPlans: [demoActionPlan],
          consentRecords: demoSnapshot.brokerConnections.map((connection) => ({
            provider: connection.provider,
            institutionName: connection.institutionName,
            status: connection.status,
            scopes: connection.scopes
          }))
        }
      },
      { ...meta, exportFormat: "json" }
    );
  }

  if (event.httpMethod === "DELETE") {
    if (repository) {
      await repository.recordAuditEvent(user.userId, "privacy_delete_requested");
      const result = await repository.deleteUserData(user.userId);
      return ok(
        {
          ...result,
          revokedConnections: "all",
          retention: "Audit events retained only where legally required."
        },
        { ...meta, source: "database", database }
      );
    }
    if (user.authType !== "demo" && event.queryStringParameters?.demo !== "1") {
      return fail(
        503,
        database.configured ? "database_unreachable" : "database_not_configured",
        database.configured ? "Portfolio database is configured but not reachable." : "Portfolio database is not configured.",
        null,
        { ...meta, database }
      );
    }
    return ok(
      {
        deleted: true,
        userId: user.userId,
        revokedConnections: demoSnapshot.brokerConnections.length,
        retention: "Audit events retained only where legally required."
      },
      meta
    );
  }

  return methodNotAllowed(event.httpMethod, ["GET", "DELETE"]);
});
