"use strict";

const { getPool } = require("./db");

function money(currency, amount, scale = 2) {
  return {
    currency: currency || "EUR",
    minor: String(Math.round(Number(amount || 0) * 10 ** scale)),
    scale
  };
}

function moneyFromMinor(currency, minor, scale = 2) {
  return {
    currency: currency || "EUR",
    minor: String(Math.round(Number(minor || 0))),
    scale: Number(scale || 2)
  };
}

function normalizeMoney(value, fallbackCurrency = "EUR") {
  if (value && typeof value === "object" && value.minor !== undefined) {
    return {
      currency: value.currency || fallbackCurrency,
      minor: String(value.minor),
      scale: Number(value.scale || 2)
    };
  }
  if (value && typeof value === "object") {
    return money(value.currency || fallbackCurrency, value.amount ?? value.value ?? value.total ?? 0, value.scale || 2);
  }
  return money(fallbackCurrency, Number(value || 0));
}

function minorToNumber(amount) {
  return Number(amount?.minor || 0) / 10 ** Number(amount?.scale || 2);
}

function normalizedExternalId(value, fallback) {
  return String(value || fallback || "").trim().slice(0, 200);
}

function rowTime(value) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }
  return value;
}

function mapConnection(row) {
  return {
    id: String(row.id),
    userId: row.user_id,
    provider: row.provider,
    institutionName: row.institution_name,
    status: row.status,
    externalConnectionId: row.external_connection_id || undefined,
    consentGrantedAt: rowTime(row.consent_granted_at),
    lastSyncedAt: rowTime(row.last_synced_at),
    reconnectRequiredAt: rowTime(row.reconnect_required_at),
    scopes: parseJson(row.scopes, []),
    message: row.message || undefined
  };
}

function mapAccount(row) {
  return {
    id: String(row.id),
    userId: row.user_id,
    name: row.name,
    provider: row.provider,
    brokerConnectionId: row.broker_connection_id ? String(row.broker_connection_id) : undefined,
    externalAccountId: row.external_account_id || undefined,
    currency: row.currency,
    taxTreatment: row.tax_treatment,
    status: row.status,
    consentGrantedAt: rowTime(row.consent_granted_at),
    lastSyncedAt: rowTime(row.last_synced_at),
    staleAfter: rowTime(row.stale_after)
  };
}

function mapLot(row) {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    positionId: String(row.holding_id),
    acquiredAt: rowTime(row.acquired_at)?.slice(0, 10) || "",
    quantity: Number(row.quantity || 0),
    unitCost: moneyFromMinor(row.unit_cost_currency, row.unit_cost_minor, row.unit_cost_scale),
    costBasis: moneyFromMinor(row.cost_basis_currency, row.cost_basis_minor, row.cost_basis_scale),
    source: row.source,
    fifoRank: Number(row.fifo_rank || 0),
    germanTax: {
      partialExemptionPct: row.partial_exemption_pct === null ? undefined : Number(row.partial_exemption_pct),
      lossPot: row.loss_pot || undefined,
      withholdingTaxPaid: row.withholding_tax_minor == null
        ? undefined
        : moneyFromMinor(row.withholding_tax_currency, row.withholding_tax_minor, row.withholding_tax_scale),
      vorabpauschaleBasis: row.vorabpauschale_basis_minor == null
        ? undefined
        : moneyFromMinor(row.vorabpauschale_basis_currency, row.vorabpauschale_basis_minor, row.vorabpauschale_basis_scale)
    }
  };
}

function issue(code, severity, title, detail, entityType, entityId, detectedAt) {
  return {
    id: `${code}-${entityId || "portfolio"}`,
    code,
    severity,
    title,
    detail,
    entityType,
    entityId,
    detectedAt
  };
}

function mapRowsToPortfolioSnapshot(rows, options = {}) {
  const asOf = options.asOf || new Date().toISOString();
  const userId = options.userId || "";
  const baseCurrency = options.baseCurrency || "EUR";
  const stalePriceHours = Number(options.stalePriceHours || 36);
  const capitalGainsTaxPct = Number(options.capitalGainsTaxPct || 26.375);
  const lotRowsByHolding = new Map();
  for (const row of rows.taxLots || []) {
    const key = String(row.holding_id);
    const lots = lotRowsByHolding.get(key) || [];
    lots.push(mapLot(row));
    lotRowsByHolding.set(key, lots);
  }

  const accounts = (rows.accounts || []).map(mapAccount);
  const brokerConnections = (rows.connections || []).map(mapConnection);
  const cashBalances = (rows.cashBalances || []).map((row) => ({
    id: String(row.id),
    accountId: String(row.account_id),
    currency: row.currency,
    amount: moneyFromMinor(row.currency, row.amount_minor, row.amount_scale),
    asOf: rowTime(row.as_of) || asOf
  }));

  const holdings = (rows.holdings || []).map((row) => {
    const costBasis = moneyFromMinor(row.cost_basis_currency, row.cost_basis_minor, row.cost_basis_scale);
    const price = moneyFromMinor(row.price_currency, row.price_minor, row.price_scale);
    const lots = lotRowsByHolding.get(String(row.id)) || [];
    return {
      id: String(row.id),
      accountId: String(row.account_id),
      symbol: row.symbol,
      name: row.name,
      isin: row.isin || undefined,
      instrumentType: row.instrument_type,
      quantity: Number(row.quantity || 0),
      price,
      priceAsOf: rowTime(row.price_as_of) || asOf,
      fxRateToBase: row.fx_rate_to_base === null ? undefined : Number(row.fx_rate_to_base),
      costBasis,
      taxLots: lots,
      sector: row.sector || undefined,
      country: row.country || undefined,
      exposureTags: parseJson(row.exposure_tags, []),
      source: row.source,
      confidence: Number(row.confidence || 1)
    };
  });

  const targets = (rows.targets || []).map((row) => ({
    id: String(row.id),
    scope: row.scope,
    scopeId: row.scope_id || undefined,
    label: row.label,
    symbol: row.symbol || undefined,
    exposureTag: row.exposure_tag || undefined,
    targetWeightPct: Number(row.target_weight_pct || 0),
    minWeightPct: row.min_weight_pct === null ? undefined : Number(row.min_weight_pct),
    maxWeightPct: row.max_weight_pct === null ? undefined : Number(row.max_weight_pct)
  }));

  const holdingValues = holdings.map((holding) => {
    const value = money(baseCurrency, minorToNumber(holding.price) * holding.quantity * Number(holding.fxRateToBase || 1));
    return { holding, value };
  });
  const invested = holdingValues.reduce((sum, item) => sum + minorToNumber(item.value), 0);
  const cash = cashBalances.reduce((sum, item) => sum + minorToNumber(item.amount), 0);
  const total = invested + cash;
  const cost = holdings.reduce((sum, holding) => sum + minorToNumber(holding.costBasis), 0);
  const unrealizedGain = invested - cost;
  const dataQualityIssues = [];

  for (const account of accounts) {
    if (account.status === "reconnect_required" || account.status === "disabled") {
      dataQualityIssues.push(issue("reconnect_required", "critical", "Reconnect broker account", `${account.name} cannot refresh until broker consent is repaired.`, "account", account.id, asOf));
    }
    if (account.staleAfter && new Date(account.staleAfter).getTime() < new Date(asOf).getTime()) {
      dataQualityIssues.push(issue("sync_failed", "warning", "Account data is stale", `${account.name} is past its sync freshness window.`, "account", account.id, asOf));
    }
  }

  const positions = holdingValues.map(({ holding, value }) => {
    const gain = minorToNumber(value) - minorToNumber(holding.costBasis);
    const estimatedSaleTax = money(baseCurrency, Math.max(0, gain * (capitalGainsTaxPct / 100)));
    const target = targets.find((item) => item.symbol === holding.symbol)
      || targets.find((item) => item.exposureTag && holding.exposureTags.includes(item.exposureTag));
    const currentWeightPct = total ? (minorToNumber(value) / total) * 100 : 0;
    const driftPct = currentWeightPct - Number(target?.targetWeightPct || 0);
    const issues = [];
    if (minorToNumber(holding.costBasis) <= 0 || holding.taxLots.length === 0) {
      issues.push(issue("missing_basis", "critical", "Missing tax basis", `${holding.symbol} needs FIFO lots and basis before tax-aware actions.`, "position", holding.id, asOf));
    }
    if ((new Date(asOf).getTime() - new Date(holding.priceAsOf).getTime()) / 3_600_000 > stalePriceHours) {
      issues.push(issue("stale_price", "warning", "Price is stale", `${holding.symbol} price is older than ${stalePriceHours} hours.`, "price", holding.id, asOf));
    }
    if (!target) {
      issues.push(issue("target_missing", "info", "No target allocation", `${holding.symbol} is excluded from target drift scoring.`, "position", holding.id, asOf));
    }
    dataQualityIssues.push(...issues);
    return {
      position: holding,
      marketValue: value,
      unrealizedGain: money(baseCurrency, gain),
      unrealizedGainPct: minorToNumber(holding.costBasis) ? (gain / minorToNumber(holding.costBasis)) * 100 : 0,
      estimatedSaleTax,
      currentWeightPct,
      driftPct,
      dataQualityIssues: issues
    };
  });

  const drift = positions
    .filter((item) => targets.some((target) => target.symbol === item.position.symbol || (target.exposureTag && item.position.exposureTags.includes(target.exposureTag))))
    .map((item) => {
      const target = targets.find((candidate) => candidate.symbol === item.position.symbol)
        || targets.find((candidate) => candidate.exposureTag && item.position.exposureTags.includes(candidate.exposureTag));
      return {
        id: item.position.id,
        label: item.position.symbol,
        currentWeightPct: item.currentWeightPct,
        targetWeightPct: Number(target?.targetWeightPct || 0),
        driftPct: item.driftPct,
        marketValue: item.marketValue
      };
    });

  const estimatedLiquidationTax = positions.reduce((sum, item) => sum + minorToNumber(item.estimatedSaleTax), 0);
  const allocationDriftScore = drift.reduce((sum, item) => sum + Math.abs(item.driftPct), 0);
  const concentrationScore = Math.max(0, ...positions.map((item) => item.currentWeightPct - 22));

  return {
    userId,
    baseCurrency,
    asOf,
    totalValue: money(baseCurrency, total),
    investedValue: money(baseCurrency, invested),
    cashValue: money(baseCurrency, cash),
    unrealizedGain: money(baseCurrency, unrealizedGain),
    unrealizedGainPct: cost ? (unrealizedGain / cost) * 100 : 0,
    estimatedLiquidationTax: money(baseCurrency, estimatedLiquidationTax),
    allocationDriftScore,
    concentrationScore,
    staleDataCount: dataQualityIssues.filter((item) => item.code === "stale_price" || item.code === "stale_fx").length,
    openIssueCount: dataQualityIssues.length,
    accounts,
    brokerConnections,
    positions,
    cashBalances,
    targets,
    drift,
    dataQualityIssues,
    syncRuns: (rows.syncRuns || []).map((row) => ({
      id: String(row.id),
      provider: row.provider,
      connectionId: row.broker_connection_id ? String(row.broker_connection_id) : undefined,
      status: row.status,
      startedAt: rowTime(row.started_at) || asOf,
      finishedAt: rowTime(row.finished_at),
      accountsSeen: Number(row.accounts_seen || 0),
      holdingsSeen: Number(row.holdings_seen || 0),
      transactionsSeen: Number(row.transactions_seen || 0),
      errorCode: row.error_code || undefined,
      errorMessage: row.error_message || undefined
    }))
  };
}

function emptyPortfolioSnapshot(userId, baseCurrency = "EUR") {
  return mapRowsToPortfolioSnapshot(
    { accounts: [], connections: [], holdings: [], taxLots: [], cashBalances: [], targets: [], syncRuns: [] },
    { userId, baseCurrency, asOf: new Date().toISOString() }
  );
}

function createPortfolioRepository(options = {}) {
  const env = options.env || process.env;
  const poolOverride = options.pool;

  async function pool() {
    return poolOverride || getPool(env);
  }

  async function query(sql, params) {
    const activePool = await pool();
    if (!activePool) {
      const error = new Error("Portfolio database is not configured.");
      error.code = "database_not_configured";
      error.statusCode = 503;
      throw error;
    }
    return activePool.query(sql, params);
  }

  return {
    async ensureUser(userId, attrs = {}) {
      await query(
        `insert into portfolio_users (id, email, base_currency, locale)
         values ($1, $2, $3, $4)
         on conflict (id) do update set
           email = coalesce(excluded.email, portfolio_users.email),
           base_currency = excluded.base_currency,
           locale = excluded.locale,
           updated_at = now()`,
        [userId, attrs.email || null, attrs.baseCurrency || "EUR", attrs.locale || "de-DE"]
      );
    },

    async getPortfolioRows(userId) {
      const [
        userResult,
        connections,
        accounts,
        holdings,
        taxLots,
        cashBalances,
        targets,
        syncRuns
      ] = await Promise.all([
        query("select * from portfolio_users where id = $1 and deleted_at is null", [userId]),
        query("select * from broker_connections where user_id = $1 order by created_at desc", [userId]),
        query("select * from portfolio_accounts where user_id = $1 order by name asc", [userId]),
        query("select * from holdings where user_id = $1 order by symbol asc", [userId]),
        query("select * from tax_lots where user_id = $1 order by holding_id, fifo_rank asc", [userId]),
        query("select distinct on (account_id, currency) * from cash_balances where user_id = $1 order by account_id, currency, as_of desc", [userId]),
        query("select * from target_allocations where user_id = $1 order by label asc", [userId]),
        query("select * from sync_runs where user_id = $1 order by started_at desc limit 50", [userId])
      ]);

      return {
        user: userResult.rows[0] || null,
        connections: connections.rows,
        accounts: accounts.rows,
        holdings: holdings.rows,
        taxLots: taxLots.rows,
        cashBalances: cashBalances.rows,
        targets: targets.rows,
        syncRuns: syncRuns.rows
      };
    },

    async getPortfolioSnapshot(userId) {
      const rows = await this.getPortfolioRows(userId);
      if (!rows.user) return null;
      return mapRowsToPortfolioSnapshot(rows, {
        userId,
        baseCurrency: rows.user.base_currency || "EUR",
        asOf: new Date().toISOString()
      });
    },

    async listBrokerConnections(userId) {
      const result = await query(
        "select * from broker_connections where user_id = $1 order by created_at desc",
        [userId]
      );
      return result.rows.map(mapConnection);
    },

    async createBrokerConnection(input) {
      const result = await query(
        `insert into broker_connections (
           user_id, provider, institution_name, external_connection_id, status,
           scopes, consent_granted_at, encrypted_user_token, encrypted_refresh_token,
           provider_user_id
         )
         values ($1, $2, $3, $4, $5, $6::jsonb, now(), $7, $8, $9)
         returning *`,
        [
          input.userId,
          input.provider,
          input.institutionName,
          input.externalConnectionId || null,
          input.status || "pending",
          JSON.stringify(input.scopes || []),
          input.encryptedUserToken || null,
          input.encryptedRefreshToken || null,
          input.providerUserId || null
        ]
      );
      return mapConnection(result.rows[0]);
    },

    async getBrokerConnectionForSync(userId, connectionId) {
      const result = await query(
        `select *
         from broker_connections
         where user_id = $1 and id = $2
         limit 1`,
        [userId, connectionId]
      );
      return result.rows[0] || null;
    },

    async disconnectBrokerConnection(userId, connectionId) {
      const result = await query(
        `update broker_connections
         set status = 'disabled', updated_at = now()
         where user_id = $1 and id = $2
         returning id`,
        [userId, connectionId]
      );
      return result.rowCount > 0;
    },

    async markBrokerConnectionSyncError(userId, connectionId, error) {
      await query(
        `update broker_connections
         set status = case when status = 'disabled' then status else 'stale' end,
             last_error_code = $3,
             last_error_message = $4,
             updated_at = now()
         where user_id = $1 and id = $2`,
        [userId, connectionId, error.code || "sync_failed", String(error.message || "Sync failed.").slice(0, 500)]
      );
    },

    async upsertProviderAccount(userId, provider, connectionId, account) {
      const externalId = normalizedExternalId(account.externalId || account.id || account.accountId, account.name);
      const result = await query(
        `insert into portfolio_accounts (
           user_id, broker_connection_id, provider, external_account_id, name,
           currency, tax_treatment, status, consent_granted_at, last_synced_at, stale_after
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, now(), now(), $9)
         on conflict (provider, external_account_id) do update set
           name = excluded.name,
           currency = excluded.currency,
           status = excluded.status,
           broker_connection_id = excluded.broker_connection_id,
           last_synced_at = now(),
           stale_after = excluded.stale_after,
           updated_at = now()
         returning *`,
        [
          userId,
          connectionId || null,
          provider,
          externalId,
          account.name || account.number || account.institutionName || "Broker account",
          account.currency || "EUR",
          account.taxTreatment || "taxable_de",
          account.status || "active",
          account.staleAfter || null
        ]
      );
      return mapAccount(result.rows[0]);
    },

    async upsertHolding(userId, provider, accountId, holding) {
      const price = normalizeMoney(holding.price ?? holding.marketPrice ?? holding.lastPrice, holding.currency || "EUR");
      const costBasis = normalizeMoney(holding.costBasis ?? holding.averagePurchasePriceTotal ?? holding.bookValue, price.currency);
      const externalId = normalizedExternalId(holding.externalId || holding.id || holding.symbol, holding.name);
      const result = await query(
        `insert into holdings (
           user_id, account_id, provider, external_holding_id, symbol, isin, name,
           instrument_type, quantity, price_currency, price_minor, price_scale,
           price_as_of, fx_rate_to_base, cost_basis_currency, cost_basis_minor,
           cost_basis_scale, sector, country, exposure_tags, source, confidence
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb, $21, $22)
         on conflict (account_id, provider, external_holding_id) do update set
           symbol = excluded.symbol,
           isin = excluded.isin,
           name = excluded.name,
           instrument_type = excluded.instrument_type,
           quantity = excluded.quantity,
           price_currency = excluded.price_currency,
           price_minor = excluded.price_minor,
           price_scale = excluded.price_scale,
           price_as_of = excluded.price_as_of,
           fx_rate_to_base = excluded.fx_rate_to_base,
           cost_basis_currency = excluded.cost_basis_currency,
           cost_basis_minor = excluded.cost_basis_minor,
           cost_basis_scale = excluded.cost_basis_scale,
           sector = excluded.sector,
           country = excluded.country,
           exposure_tags = excluded.exposure_tags,
           source = excluded.source,
           confidence = excluded.confidence,
           updated_at = now()
         returning *`,
        [
          userId,
          accountId,
          provider,
          externalId,
          holding.symbol || holding.ticker || holding.isin || "UNKNOWN",
          holding.isin || null,
          holding.name || holding.symbol || "Holding",
          holding.instrumentType || "stock",
          Number(holding.quantity || 0),
          price.currency,
          price.minor,
          price.scale,
          holding.priceAsOf || new Date().toISOString(),
          holding.fxRateToBase || null,
          costBasis.currency,
          costBasis.minor,
          costBasis.scale,
          holding.sector || null,
          holding.country || null,
          JSON.stringify(holding.exposureTags || []),
          holding.source || provider,
          Number(holding.confidence ?? 0.85)
        ]
      );
      return String(result.rows[0].id);
    },

    async insertCashBalance(userId, accountId, cash) {
      const amount = normalizeMoney(cash.amount ?? cash.cash ?? cash.value, cash.currency || "EUR");
      await query(
        `insert into cash_balances (user_id, account_id, currency, amount_minor, amount_scale, as_of, source)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (account_id, currency, as_of) do update set
           amount_minor = excluded.amount_minor,
           amount_scale = excluded.amount_scale,
           source = excluded.source,
           updated_at = now()`,
        [
          userId,
          accountId,
          amount.currency,
          amount.minor,
          amount.scale,
          cash.asOf || new Date().toISOString(),
          cash.source || "broker"
        ]
      );
    },

    async replaceTaxLotsForHolding(userId, accountId, holdingId, lots = []) {
      await query(
        "delete from tax_lots where user_id = $1 and account_id = $2 and holding_id = $3",
        [userId, accountId, holdingId]
      );
      let rank = 1;
      for (const lot of lots) {
        const unitCost = normalizeMoney(lot.unitCost ?? lot.price ?? lot.unitPrice, lot.currency || "EUR");
        const quantity = Number(lot.quantity || 0);
        const basis = normalizeMoney(
          lot.costBasis ?? (Number.isFinite(quantity) ? minorToNumber(unitCost) * quantity : 0),
          unitCost.currency
        );
        await query(
          `insert into tax_lots (
             user_id, account_id, holding_id, external_lot_id, acquired_at, quantity,
             unit_cost_currency, unit_cost_minor, unit_cost_scale,
             cost_basis_currency, cost_basis_minor, cost_basis_scale,
             source, fifo_rank, partial_exemption_pct, loss_pot
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            userId,
            accountId,
            holdingId,
            lot.externalId || lot.id || null,
            lot.acquiredAt || new Date().toISOString().slice(0, 10),
            quantity,
            unitCost.currency,
            unitCost.minor,
            unitCost.scale,
            basis.currency,
            basis.minor,
            basis.scale,
            lot.source || "manual",
            Number(lot.fifoRank || rank++),
            lot.partialExemptionPct ?? lot.germanTax?.partialExemptionPct ?? null,
            lot.lossPot || lot.germanTax?.lossPot || null
          ]
        );
      }
    },

    async upsertTargetAllocation(userId, target) {
      const result = await query(
        `insert into target_allocations (
           user_id, scope, scope_id, label, symbol, exposure_tag,
           target_weight_pct, min_weight_pct, max_weight_pct
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning *`,
        [
          userId,
          target.scope || "portfolio",
          target.scopeId || null,
          target.label || target.symbol || target.exposureTag || "Target",
          target.symbol || null,
          target.exposureTag || null,
          Number(target.targetWeightPct || 0),
          target.minWeightPct ?? null,
          target.maxWeightPct ?? null
        ]
      );
      return result.rows[0];
    },

    async deleteHolding(userId, holdingId) {
      const result = await query(
        "delete from holdings where user_id = $1 and id = $2 returning id",
        [userId, holdingId]
      );
      return result.rowCount > 0;
    },

    async deleteTargetAllocation(userId, targetId) {
      const result = await query(
        "delete from target_allocations where user_id = $1 and id = $2 returning id",
        [userId, targetId]
      );
      return result.rowCount > 0;
    },

    async upsertTransaction(userId, provider, accountId, transaction) {
      const amount = normalizeMoney(transaction.amount ?? transaction.netAmount ?? transaction.value, transaction.currency || "EUR");
      const fees = transaction.fees === undefined ? null : normalizeMoney(transaction.fees, amount.currency);
      const taxes = transaction.taxes === undefined ? null : normalizeMoney(transaction.taxes, amount.currency);
      const externalId = normalizedExternalId(transaction.externalId || transaction.id, `${transaction.tradeDate}-${transaction.symbol}-${transaction.amount}`);
      await query(
        `insert into transactions (
           user_id, account_id, provider, external_transaction_id, symbol, isin,
           transaction_type, trade_date, settlement_date, quantity, amount_currency,
           amount_minor, amount_scale, fees_currency, fees_minor, fees_scale,
           taxes_currency, taxes_minor, taxes_scale, raw_payload
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb)
         on conflict (provider, external_transaction_id) do nothing`,
        [
          userId,
          accountId,
          provider,
          externalId,
          transaction.symbol || null,
          transaction.isin || null,
          transaction.type || "UNKNOWN",
          transaction.tradeDate || transaction.date || new Date().toISOString().slice(0, 10),
          transaction.settlementDate || null,
          transaction.quantity ?? null,
          amount.currency,
          amount.minor,
          amount.scale,
          fees?.currency || null,
          fees?.minor || null,
          fees?.scale || null,
          taxes?.currency || null,
          taxes?.minor || null,
          taxes?.scale || null,
          JSON.stringify(transaction.raw || transaction)
        ]
      );
    },

    async recordSyncRun(userId, syncRun) {
      const result = await query(
        `insert into sync_runs (
           user_id, provider, broker_connection_id, status, started_at, finished_at,
           accounts_seen, holdings_seen, transactions_seen, error_code, error_message,
           provider_error
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
         returning *`,
        [
          userId,
          syncRun.provider,
          syncRun.connectionId || null,
          syncRun.status,
          syncRun.startedAt || new Date().toISOString(),
          syncRun.finishedAt || null,
          syncRun.accountsSeen || 0,
          syncRun.holdingsSeen || 0,
          syncRun.transactionsSeen || 0,
          syncRun.errorCode || null,
          syncRun.errorMessage || null,
          JSON.stringify(syncRun.providerError || null)
        ]
      );
      return result.rows[0];
    },

    async createImportRun(userId, input) {
      const result = await query(
        `insert into import_runs (user_id, source, status, filename, checksum, confidence, summary)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb)
         on conflict (user_id, checksum) do update set
           status = excluded.status,
           summary = excluded.summary
         returning *`,
        [
          userId,
          input.source || "manual",
          input.status || "pending",
          input.filename || null,
          input.checksum || null,
          Number(input.confidence || 0),
          JSON.stringify(input.summary || {})
        ]
      );
      return result.rows[0];
    },

    async createImportItem(userId, importRunId, item) {
      const result = await query(
        `insert into import_reconciliation_items (
           import_run_id, user_id, item_type, status, external_id, symbol, isin,
           payload, duplicate_of, confidence, issue_codes
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb)
         returning *`,
        [
          importRunId,
          userId,
          item.itemType || "holding",
          item.status || "needs_review",
          item.externalId || null,
          item.symbol || null,
          item.isin || null,
          JSON.stringify(item.payload || item),
          item.duplicateOf || null,
          Number(item.confidence || 0),
          JSON.stringify(item.issueCodes || [])
        ]
      );
      return result.rows[0];
    },

    async listImportRuns(userId) {
      const result = await query(
        "select * from import_runs where user_id = $1 order by created_at desc limit 50",
        [userId]
      );
      return result.rows;
    },

    async listImportItems(userId, importRunId) {
      const result = await query(
        "select * from import_reconciliation_items where user_id = $1 and import_run_id = $2 order by created_at asc",
        [userId, importRunId]
      );
      return result.rows;
    },

    async saveActionPlan(userId, plan) {
      const result = await query(
        `insert into action_plans (user_id, generated_at, constraints, summary)
         values ($1, $2, $3::jsonb, $4::jsonb)
         returning id`,
        [userId, plan.generatedAt || new Date().toISOString(), JSON.stringify(plan.constraints || {}), JSON.stringify(plan.summary || {})]
      );
      const actionPlanId = result.rows[0].id;
      for (const action of plan.actions || []) {
        await query(
          `insert into action_items (
             action_plan_id, user_id, kind, rank, title, reason, confidence,
             impact, required_inputs, related_entity_ids, user_decision
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11)`,
          [
            actionPlanId,
            userId,
            action.kind,
            action.rank,
            action.title,
            action.reason,
            action.confidence,
            JSON.stringify(action.impact || {}),
            JSON.stringify(action.requiredInputs || []),
            JSON.stringify(action.relatedEntityIds || []),
            action.userDecision || "review"
          ]
        );
      }
      return { ...plan, id: String(actionPlanId) };
    },

    async saveReport(userId, report) {
      const result = await query(
        `insert into reports (user_id, report_type, format, payload)
         values ($1, $2, $3, $4::jsonb)
         returning id, created_at`,
        [
          userId,
          report.type,
          report.format,
          JSON.stringify({
            title: report.title,
            contentType: report.contentType,
            filename: report.filename,
            content: report.content
          })
        ]
      );
      return {
        ...report,
        id: String(result.rows[0].id),
        createdAt: rowTime(result.rows[0].created_at)
      };
    },

    async exportUserData(userId) {
      return this.getPortfolioRows(userId);
    },

    async deleteUserData(userId) {
      const result = await query("delete from portfolio_users where id = $1", [userId]);
      return { deleted: result.rowCount > 0, userId };
    },

    async recordAuditEvent(userId, eventType, metadata = {}) {
      await query(
        `insert into audit_events (user_id, actor_id, event_type, metadata)
         values ((select id from portfolio_users where id = $1), $1, $2, $3::jsonb)`,
        [userId, eventType, JSON.stringify(metadata)]
      );
    }
  };
}

module.exports = {
  createPortfolioRepository,
  emptyPortfolioSnapshot,
  mapRowsToPortfolioSnapshot
};
