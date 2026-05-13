const { createBrokerProvider } = require("../lib/broker-provider-adapters");
const { ok, created, fail, methodNotAllowed, withApiHandler } = require("../lib/api-response");
const { healthcheck } = require("../lib/db");
const { requirePremiumUserAsync } = require("../lib/premium-auth");
const { createPortfolioRepository } = require("../lib/portfolio-repository");
const { encryptSecret, secretFingerprint } = require("../lib/secret-vault");
const { demoSnapshot } = require("../lib/portfolio-demo");

async function optionalUser(event, context) {
  try {
    return await requirePremiumUserAsync(event, { context });
  } catch (error) {
    return null;
  }
}

function publicConnectionResult(result) {
  const { providerUserSecret: _providerUserSecret, ...safeResult } = result || {};
  return safeResult;
}

exports.handler = withApiHandler(async (event, context, meta) => {
  const user = await optionalUser(event, context);
  const demoMode = event.queryStringParameters?.demo === "1";
  if (!user && !demoMode) {
    return fail(401, "auth_required", "Broker connections require Netlify Identity or an API token.", null, meta);
  }

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
      return ok(
        {
          connections: await repository.listBrokerConnections(user.userId),
          providers: ["manual", "import", "snaptrade"]
        },
        { ...meta, demoMode: false, source: "database", database }
      );
    }
    if (!demoMode) {
      return fail(
        503,
        database.configured ? "database_unreachable" : "database_not_configured",
        database.configured ? "Broker database is configured but not reachable." : "Broker database is not configured.",
        null,
        { ...meta, database }
      );
    }
    return ok(
      {
        connections: demoSnapshot.brokerConnections,
        providers: ["manual", "import", "snaptrade"]
      },
      { ...meta, demoMode }
    );
  }

  if (event.httpMethod === "POST") {
    const body = meta.body();
    const provider = createBrokerProvider(body.provider || "manual");
    const result = await provider.startConnection(user?.userId || "demo-user", {
      providerUserId: body.providerUserId,
      providerUserSecret: body.providerUserSecret,
      broker: body.broker,
      reconnect: body.reconnect,
      customRedirect: body.customRedirect,
      immediateRedirect: body.immediateRedirect,
      showCloseButton: body.showCloseButton,
      darkMode: body.darkMode
    });
    if (repository) {
      await repository.ensureUser(user.userId);
      const providerUserSecret = result.providerUserSecret || body.providerUserSecret || body.providerUserToken;
      const encryptedUserToken = providerUserSecret
        ? encryptSecret(providerUserSecret)
        : null;
      const encryptedRefreshToken = body.providerRefreshToken
        ? encryptSecret(body.providerRefreshToken)
        : null;
      const connection = await repository.createBrokerConnection({
        userId: user.userId,
        provider: provider.id,
        institutionName: body.institutionName || provider.displayName,
        externalConnectionId: result.connectionId || body.externalConnectionId,
        providerUserId: result.providerUserId || body.providerUserId,
        status: "pending",
        scopes: body.scopes || ["accounts.read", "holdings.read", "transactions.read"],
        encryptedUserToken,
        encryptedRefreshToken
      });
      await repository.recordAuditEvent(user.userId, "broker_connection_started", {
        provider: provider.id,
        connectionId: connection.id,
        tokenFingerprint: providerUserSecret ? secretFingerprint(providerUserSecret) : undefined
      });
      return created(
        {
          connection,
          connectionPortal: result.redirectUrl ? { redirectUrl: result.redirectUrl, expiresAt: result.expiresAt } : null,
          provider: {
            id: provider.id,
            displayName: provider.displayName,
            methods: provider.methods
          }
        },
        { ...meta, readOnly: true, source: "database", database }
      );
    }
    if (!demoMode) {
      return fail(
        503,
        database.configured ? "database_unreachable" : "database_not_configured",
        database.configured ? "Broker database is configured but not reachable." : "Broker database is not configured.",
        null,
        { ...meta, database }
      );
    }
    return created(
      {
        connection: publicConnectionResult(result),
        provider: {
          id: provider.id,
          displayName: provider.displayName,
          methods: provider.methods
        }
      },
      { ...meta, readOnly: true }
    );
  }

  if (event.httpMethod === "DELETE") {
    const query = event.queryStringParameters || {};
    if (!query.id) {
      return fail(400, "missing_connection_id", "Connection id is required.", null, meta);
    }
    if (repository) {
      const disconnected = await repository.disconnectBrokerConnection(user.userId, query.id);
      await repository.recordAuditEvent(user.userId, "broker_connection_revoked", {
        provider: query.provider || "manual",
        connectionId: query.id,
        disconnected
      });
      return ok({ disconnected, connectionId: query.id }, { ...meta, readOnly: true, source: "database", database });
    }
    if (!demoMode) {
      return fail(
        503,
        database.configured ? "database_unreachable" : "database_not_configured",
        database.configured ? "Broker database is configured but not reachable." : "Broker database is not configured.",
        null,
        { ...meta, database }
      );
    }
    const provider = createBrokerProvider(query.provider || "manual");
    await provider.disconnect(query.id);
    return ok({ disconnected: true, connectionId: query.id }, { ...meta, readOnly: true });
  }

  return methodNotAllowed(event.httpMethod, ["GET", "POST", "DELETE"]);
});
