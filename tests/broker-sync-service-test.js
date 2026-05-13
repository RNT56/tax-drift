const assert = require('node:assert/strict');
const { encryptSecret } = require('../netlify/lib/secret-vault');
const { syncBrokerConnection } = require('../netlify/lib/broker-sync-service');

const env = {
  DATA_ENCRYPTION_KEY: 'test-encryption-key-with-enough-entropy',
  SNAPTRADE_CLIENT_ID: 'client',
  SNAPTRADE_CONSUMER_KEY: 'consumer'
};

const calls = {
  accounts: [],
  holdings: [],
  cash: [],
  transactions: [],
  syncRuns: [],
  errors: []
};

const repository = {
  async getBrokerConnectionForSync() {
    return {
      id: 'conn-1',
      provider: 'snaptrade',
      provider_user_id: 'snap-user-1',
      encrypted_user_token: encryptSecret('snap-secret-1', env)
    };
  },
  async upsertProviderAccount(_userId, provider, connectionId, account) {
    calls.accounts.push({ provider, connectionId, account });
    return { id: 'acct-1', externalAccountId: account.externalId };
  },
  async upsertHolding(_userId, provider, accountId, holding) {
    calls.holdings.push({ provider, accountId, holding });
  },
  async insertCashBalance(_userId, accountId, cash) {
    calls.cash.push({ accountId, cash });
  },
  async upsertTransaction(_userId, provider, accountId, transaction) {
    calls.transactions.push({ provider, accountId, transaction });
  },
  async recordSyncRun(_userId, syncRun) {
    calls.syncRuns.push(syncRun);
  },
  async markBrokerConnectionSyncError(_userId, connectionId, error) {
    calls.errors.push({ connectionId, error });
  }
};

const providerOptions = {
  fetch: async (url) => {
    const href = String(url);
    if (href.includes('/accounts/acct-ext-1/positions')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([
          {
            id: 'pos-1',
            symbol: { symbol: 'SAP.DE', description: 'SAP SE', isin: 'DE0007164600' },
            units: 10,
            price: 100,
            currency: { code: 'EUR' },
            average_purchase_price: 80
          }
        ])
      };
    }
    if (href.includes('/accounts/acct-ext-1/balances')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ currency: { code: 'EUR' }, cash: 500 }])
      };
    }
    if (href.includes('/accounts/acct-ext-1/activities')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ id: 'tx-1', type: 'BUY', trade_date: '2026-05-01', amount: -800, currency: { code: 'EUR' } }])
      };
    }
    if (href.endsWith('/accounts?userId=snap-user-1&userSecret=snap-secret-1')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ id: 'acct-ext-1', name: 'Broker Account', currency: 'EUR' }])
      };
    }
    return { ok: false, status: 404, text: async () => JSON.stringify({ message: href }) };
  }
};

syncBrokerConnection({
  repository,
  userId: 'user-1',
  connectionId: 'conn-1',
  env,
  providerOptions
}).then((syncRun) => {
  assert.equal(syncRun.status, 'succeeded');
  assert.equal(syncRun.accountsSeen, 1);
  assert.equal(syncRun.holdingsSeen, 1);
  assert.equal(syncRun.transactionsSeen, 1);
  assert.equal(calls.accounts[0].account.externalId, 'acct-ext-1');
  assert.equal(calls.holdings[0].holding.symbol, 'SAP.DE');
  assert.equal(calls.cash[0].cash.amount.amount, 500);
  assert.equal(calls.transactions[0].transaction.type, 'BUY');
  assert.equal(calls.errors.length, 0);
  console.log('Broker sync service tests passed');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
