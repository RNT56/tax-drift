"use strict";

const { createBrokerProvider } = require("./broker-provider-adapters");
const { decryptSecret } = require("./secret-vault");

function readPath(object, paths, fallback) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], object);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function classifyInstrument(raw) {
  const text = String(readPath(raw, ["type", "security.type", "symbol.type", "assetClass"], "stock")).toLowerCase();
  if (text.includes("etf")) return "etf";
  if (text.includes("fund")) return "fund";
  if (text.includes("bond") || text.includes("fixed")) return "bond";
  if (text.includes("crypto")) return "crypto";
  return "stock";
}

function normalizeAccount(raw) {
  const externalId = readPath(raw, ["id", "accountId", "account_id"], "");
  const institution = readPath(raw, ["institution_name", "institutionName", "brokerage_authorization.name"], "");
  return {
    externalId,
    name: readPath(raw, ["name", "number", "meta.name"], institution || "Broker account"),
    currency: readPath(raw, ["balance.currency", "currency", "meta.currency"], "EUR"),
    status: readPath(raw, ["status", "sync_status.holdings.status"], "active"),
    staleAfter: null,
    raw
  };
}

function normalizePosition(raw) {
  const symbol = readPath(raw, ["symbol.symbol", "symbol.raw_symbol", "symbol", "ticker"], "UNKNOWN");
  const price = readPath(raw, ["price", "last_price", "market_price", "symbol.last_price"], 0);
  const currency = readPath(raw, ["currency.code", "currency", "symbol.currency.code"], "EUR");
  const quantity = Number(readPath(raw, ["units", "quantity", "shares"], 0));
  return {
    externalId: readPath(raw, ["id", "symbol.id", "symbol.symbol"], symbol),
    symbol,
    isin: readPath(raw, ["symbol.isin", "isin"], undefined),
    name: readPath(raw, ["symbol.description", "symbol.name", "name"], symbol),
    instrumentType: classifyInstrument(raw),
    quantity,
    price: { currency, amount: Number(price || 0) },
    priceAsOf: readPath(raw, ["price_as_of", "updated_date", "symbol.updated_date"], new Date().toISOString()),
    costBasis: { currency, amount: Number(readPath(raw, ["average_purchase_price", "book_value", "cost_basis"], 0)) * Math.max(1, quantity) },
    exposureTags: [readPath(raw, ["symbol.exchange.code", "exchange"], ""), classifyInstrument(raw)].filter(Boolean),
    source: "broker",
    confidence: 0.9,
    raw
  };
}

function normalizeBalance(raw) {
  return {
    currency: readPath(raw, ["currency.code", "currency"], "EUR"),
    amount: {
      currency: readPath(raw, ["currency.code", "currency"], "EUR"),
      amount: Number(readPath(raw, ["cash", "amount", "total", "balance"], 0))
    },
    asOf: readPath(raw, ["as_of", "updated_date"], new Date().toISOString()),
    source: "broker",
    raw
  };
}

function normalizeTransaction(raw) {
  const symbol = readPath(raw, ["symbol.symbol", "symbol", "ticker"], null);
  return {
    externalId: readPath(raw, ["id", "trade_id", "external_id"], undefined),
    symbol,
    isin: readPath(raw, ["symbol.isin", "isin"], undefined),
    type: String(readPath(raw, ["type", "activity_type", "action"], "UNKNOWN")).toUpperCase(),
    tradeDate: String(readPath(raw, ["trade_date", "date", "settlement_date"], new Date().toISOString().slice(0, 10))).slice(0, 10),
    settlementDate: readPath(raw, ["settlement_date"], null),
    quantity: readPath(raw, ["units", "quantity"], null),
    amount: {
      currency: readPath(raw, ["currency.code", "currency"], "EUR"),
      amount: Number(readPath(raw, ["amount", "net_amount", "price"], 0))
    },
    fees: readPath(raw, ["fee", "fees"], undefined),
    taxes: readPath(raw, ["tax", "taxes"], undefined),
    raw
  };
}

async function syncBrokerConnection({ repository, userId, connectionId, env = process.env, providerOptions = {} }) {
  const startedAt = new Date().toISOString();
  const connection = await repository.getBrokerConnectionForSync(userId, connectionId);
  if (!connection) {
    const error = new Error("Broker connection not found.");
    error.code = "connection_not_found";
    error.statusCode = 404;
    throw error;
  }

  const provider = createBrokerProvider(connection.provider, env, providerOptions);
  const providerUserId = connection.provider_user_id || connection.external_connection_id || userId;
  const providerUserSecret = decryptSecret(connection.encrypted_user_token, env);
  const methodOptions = { providerUserId, providerUserSecret };
  let accountsSeen = 0;
  let holdingsSeen = 0;
  let transactionsSeen = 0;

  try {
    const accounts = await provider.syncAccounts(providerUserId, methodOptions);
    for (const rawAccount of accounts || []) {
      const account = await repository.upsertProviderAccount(
        userId,
        provider.id,
        connection.id,
        normalizeAccount(rawAccount)
      );
      accountsSeen += 1;
      const externalAccountId = readPath(rawAccount, ["id", "accountId", "account_id"], account.externalAccountId);
      const holdings = await provider.syncHoldings(externalAccountId, methodOptions);
      for (const rawPosition of holdings.positions || []) {
        await repository.upsertHolding(userId, provider.id, account.id, normalizePosition(rawPosition));
        holdingsSeen += 1;
      }
      for (const rawBalance of holdings.balances || []) {
        await repository.insertCashBalance(userId, account.id, normalizeBalance(rawBalance));
      }
      const transactions = await provider.syncTransactions(externalAccountId, methodOptions);
      for (const rawTransaction of transactions || []) {
        await repository.upsertTransaction(userId, provider.id, account.id, normalizeTransaction(rawTransaction));
        transactionsSeen += 1;
      }
    }
    const syncRun = {
      provider: provider.id,
      connectionId: connection.id,
      status: "succeeded",
      startedAt,
      finishedAt: new Date().toISOString(),
      accountsSeen,
      holdingsSeen,
      transactionsSeen
    };
    await repository.recordSyncRun(userId, syncRun);
    return syncRun;
  } catch (error) {
    const syncRun = {
      provider: provider.id,
      connectionId: connection.id,
      status: accountsSeen || holdingsSeen || transactionsSeen ? "partial" : "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      accountsSeen,
      holdingsSeen,
      transactionsSeen,
      errorCode: error.code || "sync_failed",
      errorMessage: String(error.message || "Broker sync failed."),
      providerError: error.details || null
    };
    await repository.recordSyncRun(userId, syncRun);
    await repository.markBrokerConnectionSyncError(userId, connection.id, error);
    return syncRun;
  }
}

module.exports = {
  normalizeAccount,
  normalizeBalance,
  normalizePosition,
  normalizeTransaction,
  syncBrokerConnection
};
