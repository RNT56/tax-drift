const crypto = require("node:crypto");
const { ok, created, fail, methodNotAllowed, withApiHandler } = require("../lib/api-response");
const { healthcheck } = require("../lib/db");
const { requirePremiumUserAsync } = require("../lib/premium-auth");
const { createPortfolioRepository } = require("../lib/portfolio-repository");

function checksumFor(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function summarizeItems(items) {
  return {
    total: items.length,
    holdings: items.filter((item) => (item.itemType || item.type) === "holding").length,
    transactions: items.filter((item) => (item.itemType || item.type) === "transaction").length,
    cash: items.filter((item) => (item.itemType || item.type) === "cash").length,
    needsReview: items.filter((item) => item.status !== "ready").length
  };
}

exports.handler = withApiHandler(async (event, context, meta) => {
  let user;
  try {
    user = await requirePremiumUserAsync(event, { context });
  } catch (_error) {
    return fail(401, "auth_required", "Imports require Netlify Identity or an API token.", null, meta);
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
  await repository.ensureUser(user.userId);

  if (event.httpMethod === "GET") {
    return ok({ imports: await repository.listImportRuns(user.userId) }, { ...meta, database });
  }

  if (event.httpMethod === "POST") {
    const body = meta.body();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return fail(400, "missing_import_items", "items must include at least one normalized import item.", null, meta);
    }
    const summary = summarizeItems(items);
    const importRun = await repository.createImportRun(user.userId, {
      source: body.source || "manual",
      status: body.status || "needs_review",
      filename: body.filename,
      checksum: body.checksum || checksumFor({ source: body.source, filename: body.filename, items }),
      confidence: body.confidence || Math.min(...items.map((item) => Number(item.confidence || 0.5))),
      summary
    });
    const reconciliationItems = [];
    for (const item of items) {
      reconciliationItems.push(await repository.createImportItem(user.userId, importRun.id, {
        itemType: item.itemType || item.type || "holding",
        status: item.status || "needs_review",
        externalId: item.externalId,
        symbol: item.symbol || item.payload?.symbol,
        isin: item.isin || item.payload?.isin,
        payload: item.payload || item,
        duplicateOf: item.duplicateOf,
        confidence: item.confidence || 0.5,
        issueCodes: item.issueCodes || []
      }));
    }
    await repository.recordAuditEvent(user.userId, "import_reconciliation_created", {
      importRunId: importRun.id,
      itemCount: reconciliationItems.length
    });
    return created(
      {
        importRun,
        reconciliationItems
      },
      { ...meta, database }
    );
  }

  return methodNotAllowed(event.httpMethod, ["GET", "POST"]);
});
