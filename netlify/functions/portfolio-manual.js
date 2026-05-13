const { ok, created, fail, methodNotAllowed, withApiHandler } = require("../lib/api-response");
const { healthcheck } = require("../lib/db");
const { requirePremiumUserAsync } = require("../lib/premium-auth");
const { createPortfolioRepository } = require("../lib/portfolio-repository");

async function requireReadyRepository(event, context, meta) {
  let user;
  try {
    user = await requirePremiumUserAsync(event, { context });
  } catch (_error) {
    return { response: fail(401, "auth_required", "Manual portfolio edits require sign-in.", null, meta) };
  }
  const database = await healthcheck().catch((error) => ({
    configured: Boolean(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL),
    reachable: false,
    errorCode: error.code || "database_error"
  }));
  if (!database.configured || !database.reachable) {
    return {
      response: fail(
        503,
        database.configured ? "database_unreachable" : "database_not_configured",
        database.configured ? "Portfolio database is configured but not reachable." : "Portfolio database is not configured.",
        null,
        { ...meta, database }
      )
    };
  }
  const repository = createPortfolioRepository();
  await repository.ensureUser(user.userId);
  return { user, repository, database };
}

exports.handler = withApiHandler(async (event, context, meta) => {
  if (!["POST", "DELETE"].includes(event.httpMethod)) {
    return methodNotAllowed(event.httpMethod, ["POST", "DELETE"]);
  }

  const ready = await requireReadyRepository(event, context, meta);
  if (ready.response) return ready.response;
  const { user, repository, database } = ready;
  const body = meta.body();

  if (event.httpMethod === "DELETE") {
    const target = event.queryStringParameters || {};
    if (target.type === "holding" && target.id) {
      const deleted = await repository.deleteHolding(user.userId, target.id);
      await repository.recordAuditEvent(user.userId, "manual_holding_deleted", { holdingId: target.id, deleted });
      return ok({ deleted }, { ...meta, database });
    }
    if (target.type === "target" && target.id) {
      const deleted = await repository.deleteTargetAllocation(user.userId, target.id);
      await repository.recordAuditEvent(user.userId, "manual_target_deleted", { targetId: target.id, deleted });
      return ok({ deleted }, { ...meta, database });
    }
    return fail(400, "unsupported_delete", "Manual delete requires type=holding or type=target and an id.", null, meta);
  }

  const action = body.action || "upsertHolding";

  if (action === "upsertAccount") {
    const account = await repository.upsertProviderAccount(user.userId, "manual", null, {
      externalId: body.externalId || body.name,
      name: body.name,
      currency: body.currency || "EUR",
      taxTreatment: body.taxTreatment || "taxable_de",
      status: "active"
    });
    await repository.recordAuditEvent(user.userId, "manual_account_upserted", { accountId: account.id });
    return created({ account }, { ...meta, database });
  }

  if (action === "upsertHolding") {
    let accountId = body.accountId;
    if (!accountId) {
      const account = await repository.upsertProviderAccount(user.userId, "manual", null, {
        externalId: "manual-default",
        name: "Manual Portfolio",
        currency: body.currency || "EUR",
        taxTreatment: "taxable_de",
        status: "active"
      });
      accountId = account.id;
    }
    const holdingId = await repository.upsertHolding(user.userId, "manual", accountId, {
      externalId: body.externalId || body.symbol,
      symbol: body.symbol,
      isin: body.isin,
      name: body.name || body.symbol,
      instrumentType: body.instrumentType || "stock",
      quantity: Number(body.quantity || 0),
      price: { amount: Number(body.price || 0), currency: body.currency || "EUR" },
      priceAsOf: body.priceAsOf || new Date().toISOString(),
      costBasis: { amount: Number(body.costBasis || 0), currency: body.currency || "EUR" },
      sector: body.sector,
      country: body.country,
      exposureTags: Array.isArray(body.exposureTags) ? body.exposureTags : String(body.exposureTags || "").split(",").map((item) => item.trim()).filter(Boolean),
      source: "manual",
      confidence: 0.98
    });
    if (Array.isArray(body.taxLots)) {
      await repository.replaceTaxLotsForHolding(user.userId, accountId, holdingId, body.taxLots);
    }
    await repository.recordAuditEvent(user.userId, "manual_holding_upserted", { holdingId, symbol: body.symbol });
    return created({ holdingId }, { ...meta, database });
  }

  if (action === "upsertCash") {
    let accountId = body.accountId;
    if (!accountId) {
      const account = await repository.upsertProviderAccount(user.userId, "manual", null, {
        externalId: "manual-cash",
        name: "Manual Cash",
        currency: body.currency || "EUR",
        taxTreatment: "taxable_de",
        status: "active"
      });
      accountId = account.id;
    }
    await repository.insertCashBalance(user.userId, accountId, {
      amount: { amount: Number(body.amount || 0), currency: body.currency || "EUR" },
      currency: body.currency || "EUR",
      asOf: body.asOf || new Date().toISOString(),
      source: "manual"
    });
    await repository.recordAuditEvent(user.userId, "manual_cash_upserted", { accountId, currency: body.currency });
    return created({ accountId }, { ...meta, database });
  }

  if (action === "upsertTarget") {
    const target = await repository.upsertTargetAllocation(user.userId, {
      label: body.label,
      symbol: body.symbol,
      exposureTag: body.exposureTag,
      targetWeightPct: Number(body.targetWeightPct || 0),
      minWeightPct: body.minWeightPct === "" ? null : body.minWeightPct,
      maxWeightPct: body.maxWeightPct === "" ? null : body.maxWeightPct
    });
    await repository.recordAuditEvent(user.userId, "manual_target_upserted", { targetId: target.id });
    return created({ target }, { ...meta, database });
  }

  return fail(400, "unsupported_action", "Unsupported manual portfolio action.", null, meta);
});
