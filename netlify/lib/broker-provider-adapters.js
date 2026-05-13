"use strict";

const READ_ONLY_METHODS = [
  "startConnection",
  "listConnections",
  "syncAccounts",
  "syncHoldings",
  "syncTransactions",
  "refreshConnection",
  "disconnect"
];

function syncRun(provider, connectionId, status) {
  return {
    id: `${provider}-${connectionId}-${Date.now()}`,
    provider,
    connectionId,
    status,
    startedAt: new Date().toISOString(),
    accountsSeen: 0,
    holdingsSeen: 0,
    transactionsSeen: 0
  };
}

function snapTradeBaseUrl(env = process.env) {
  return String(env.SNAPTRADE_API_BASE_URL || "https://api.snaptrade.com/api/v1").replace(/\/+$/, "");
}

function snapTradeUserId(appUserId, env = process.env) {
  const prefix = String(env.SNAPTRADE_USER_PREFIX || "taxswitch").replace(/[^a-zA-Z0-9_-]/g, "");
  const normalized = String(appUserId || "user").replace(/[^a-zA-Z0-9._:@-]/g, "-").slice(0, 100);
  return `${prefix}-${normalized}`;
}

function providerError(message, code, statusCode, details) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function snapTradeClient(env = process.env, fetchImpl = globalThis.fetch) {
  const clientId = env.SNAPTRADE_CLIENT_ID;
  const consumerKey = env.SNAPTRADE_CONSUMER_KEY;
  if (!fetchImpl) {
    throw providerError("Fetch API is not available in this runtime.", "fetch_unavailable", 500);
  }

  async function request(method, path, options = {}) {
    if (!clientId || !consumerKey) {
      throw providerError("SnapTrade is not configured.", "snaptrade_not_configured", 503);
    }

    const url = new URL(`${snapTradeBaseUrl(env)}${path}`);
    for (const [key, value] of Object.entries(options.query || {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetchImpl(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        clientId,
        consumerKey
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_error) {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      throw providerError(
        data?.message || data?.detail || `SnapTrade request failed with ${response.status}.`,
        data?.code || "snaptrade_request_failed",
        response.status,
        data
      );
    }

    return data;
  }

  return {
    registerUser(userId) {
      return request("POST", "/snapTrade/registerUser", { body: { userId } });
    },
    loginUser(userId, userSecret, options = {}) {
      return request("POST", "/snapTrade/login", {
        query: { userId, userSecret },
        body: {
          broker: options.broker,
          reconnect: options.reconnect,
          immediateRedirect: options.immediateRedirect,
          customRedirect: options.customRedirect,
          showCloseButton: options.showCloseButton,
          darkMode: options.darkMode,
          connectionPortalVersion: "v4"
        }
      });
    },
    listConnections(userId, userSecret) {
      return request("GET", "/authorizations", { query: { userId, userSecret } });
    },
    listAccounts(userId, userSecret) {
      return request("GET", "/accounts", { query: { userId, userSecret } });
    },
    listPositions(userId, userSecret, accountId) {
      return request("GET", `/accounts/${encodeURIComponent(accountId)}/positions`, { query: { userId, userSecret } });
    },
    listBalances(userId, userSecret, accountId) {
      return request("GET", `/accounts/${encodeURIComponent(accountId)}/balances`, { query: { userId, userSecret } });
    },
    listActivities(userId, userSecret, accountId) {
      return request("GET", `/accounts/${encodeURIComponent(accountId)}/activities`, { query: { userId, userSecret } });
    },
    refreshAuthorization(userId, userSecret, authorizationId) {
      return request("POST", `/authorizations/${encodeURIComponent(authorizationId)}/refresh`, { query: { userId, userSecret } });
    },
    deleteAuthorization(userId, userSecret, authorizationId) {
      return request("DELETE", `/authorizations/${encodeURIComponent(authorizationId)}`, { query: { userId, userSecret } });
    }
  };
}

function manualProvider() {
  return {
    id: "manual",
    displayName: "Manual or import",
    methods: READ_ONLY_METHODS,
    async startConnection(userId) {
      return { provider: "manual", connectionId: `manual-${userId}` };
    },
    async listConnections() {
      return [];
    },
    async syncAccounts() {
      return [];
    },
    async syncHoldings() {
      return [];
    },
    async syncTransactions(accountId) {
      return syncRun("manual", accountId, "succeeded");
    },
    async refreshConnection(connectionId) {
      return syncRun("manual", connectionId, "succeeded");
    },
    async disconnect() {
      return undefined;
    }
  };
}

function snapTradeProvider(env = process.env, options = {}) {
  const portalBaseUrl = env.SNAPTRADE_PORTAL_BASE_URL || "";
  const client = options.client || snapTradeClient(env, options.fetch);
  function credentials(methodOptions = {}) {
    const providerUserId = methodOptions.providerUserId || methodOptions.userId;
    const providerUserSecret = methodOptions.providerUserSecret || methodOptions.userSecret;
    if (!providerUserId || !providerUserSecret) {
      throw providerError("SnapTrade user credentials are required for this operation.", "snaptrade_user_secret_required", 400);
    }
    return { providerUserId, providerUserSecret };
  }

  return {
    id: "snaptrade",
    displayName: "SnapTrade",
    methods: READ_ONLY_METHODS,
    configured: Boolean(env.SNAPTRADE_CLIENT_ID && env.SNAPTRADE_CONSUMER_KEY),
    async startConnection(userId, methodOptions = {}) {
      if (this.configured) {
        const providerUserId = methodOptions.providerUserId || snapTradeUserId(userId, env);
        let providerUserSecret = methodOptions.providerUserSecret || "";
        if (!providerUserSecret) {
          const registered = await client.registerUser(providerUserId);
          providerUserSecret = registered?.userSecret || registered?.data?.userSecret;
        }
        const login = await client.loginUser(providerUserId, providerUserSecret, methodOptions);
        const redirectUrl = login?.redirectURI || login?.data?.redirectURI || login?.redirectUrl || null;
        const sessionId = login?.sessionId || login?.data?.sessionId || null;
        return {
          provider: "snaptrade",
          providerUserId,
          providerUserSecret,
          redirectUrl,
          connectionId: sessionId,
          sessionId,
          expiresAt: new Date(Date.now() + 5 * 60_000).toISOString()
        };
      }
      return {
        provider: "snaptrade",
        redirectUrl: portalBaseUrl
          ? `${portalBaseUrl}?userId=${encodeURIComponent(userId)}&scope=read`
          : null,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString()
      };
    },
    async listConnections(userId, methodOptions = {}) {
      if (!this.configured) return [];
      const { providerUserId, providerUserSecret } = credentials({ ...methodOptions, userId });
      return client.listConnections(providerUserId, providerUserSecret);
    },
    async syncAccounts(userId, methodOptions = {}) {
      if (!this.configured) return [];
      const { providerUserId, providerUserSecret } = credentials({ ...methodOptions, userId });
      return client.listAccounts(providerUserId, providerUserSecret);
    },
    async syncHoldings(accountId, methodOptions = {}) {
      if (!this.configured) return { positions: [], balances: [] };
      const { providerUserId, providerUserSecret } = credentials(methodOptions);
      const [positions, balances] = await Promise.all([
        client.listPositions(providerUserId, providerUserSecret, accountId),
        client.listBalances(providerUserId, providerUserSecret, accountId)
      ]);
      return { positions, balances };
    },
    async syncTransactions(accountId, methodOptions = {}) {
      if (!this.configured) return [];
      const { providerUserId, providerUserSecret } = credentials(methodOptions);
      return client.listActivities(providerUserId, providerUserSecret, accountId);
    },
    async refreshConnection(connectionId, methodOptions = {}) {
      if (!this.configured) return syncRun("snaptrade", connectionId, "queued");
      const { providerUserId, providerUserSecret } = credentials(methodOptions);
      await client.refreshAuthorization(providerUserId, providerUserSecret, connectionId);
      return syncRun("snaptrade", connectionId, "queued");
    },
    async disconnect(connectionId, methodOptions = {}) {
      if (this.configured && methodOptions.providerUserId && methodOptions.providerUserSecret) {
        await client.deleteAuthorization(methodOptions.providerUserId, methodOptions.providerUserSecret, connectionId);
      }
      return undefined;
    }
  };
}

function createBrokerProvider(providerId, env = process.env, options = {}) {
  if (providerId === "snaptrade") {
    return snapTradeProvider(env, options);
  }
  return manualProvider();
}

module.exports = {
  READ_ONLY_METHODS,
  createBrokerProvider,
  manualProvider,
  snapTradeClient,
  snapTradeUserId,
  snapTradeProvider
};
