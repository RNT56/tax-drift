const assert = require('node:assert/strict');
const {
  createPortfolioRepository,
  emptyPortfolioSnapshot,
  mapRowsToPortfolioSnapshot
} = require('../netlify/lib/portfolio-repository');

const now = '2026-05-12T08:00:00.000Z';

const snapshot = mapRowsToPortfolioSnapshot(
  {
    accounts: [
      {
        id: 'acct-1',
        user_id: 'user-1',
        name: 'Taxable Depot',
        provider: 'manual',
        currency: 'EUR',
        tax_treatment: 'taxable_de',
        status: 'active'
      }
    ],
    connections: [
      {
        id: 'conn-1',
        user_id: 'user-1',
        provider: 'manual',
        institution_name: 'Manual',
        status: 'active',
        scopes: JSON.stringify(['accounts.read'])
      }
    ],
    holdings: [
      {
        id: 'holding-1',
        user_id: 'user-1',
        account_id: 'acct-1',
        provider: 'manual',
        symbol: 'SAP.DE',
        isin: 'DE0007164600',
        name: 'SAP SE',
        instrument_type: 'stock',
        quantity: '10',
        price_currency: 'EUR',
        price_minor: '10000',
        price_scale: 2,
        price_as_of: now,
        fx_rate_to_base: null,
        cost_basis_currency: 'EUR',
        cost_basis_minor: '80000',
        cost_basis_scale: 2,
        exposure_tags: JSON.stringify(['Germany', 'Single stock']),
        source: 'manual',
        confidence: '0.95'
      }
    ],
    taxLots: [
      {
        id: 'lot-1',
        user_id: 'user-1',
        account_id: 'acct-1',
        holding_id: 'holding-1',
        acquired_at: '2024-01-01',
        quantity: '10',
        unit_cost_currency: 'EUR',
        unit_cost_minor: '8000',
        unit_cost_scale: 2,
        cost_basis_currency: 'EUR',
        cost_basis_minor: '80000',
        cost_basis_scale: 2,
        source: 'manual',
        fifo_rank: 1,
        partial_exemption_pct: null,
        loss_pot: 'equity',
        withholding_tax_minor: null,
        vorabpauschale_basis_minor: null
      }
    ],
    cashBalances: [
      {
        id: 'cash-1',
        account_id: 'acct-1',
        currency: 'EUR',
        amount_minor: '50000',
        amount_scale: 2,
        as_of: now
      }
    ],
    targets: [
      {
        id: 'target-1',
        scope: 'portfolio',
        label: 'SAP',
        symbol: 'SAP.DE',
        exposure_tag: null,
        target_weight_pct: '60',
        min_weight_pct: null,
        max_weight_pct: null
      }
    ],
    syncRuns: []
  },
  { userId: 'user-1', baseCurrency: 'EUR', asOf: now }
);

assert.equal(snapshot.userId, 'user-1');
assert.equal(snapshot.totalValue.minor, '150000');
assert.equal(snapshot.positions[0].marketValue.minor, '100000');
assert.equal(snapshot.positions[0].estimatedSaleTax.minor, '5275');
assert.equal(snapshot.dataQualityIssues.some((issue) => issue.code === 'missing_basis'), false);
assert.ok(snapshot.allocationDriftScore > 0);

const empty = emptyPortfolioSnapshot('empty-user');
assert.equal(empty.totalValue.minor, '0');
assert.equal(empty.positions.length, 0);

const calls = [];
const fakePool = {
  async query(sql, params) {
    calls.push({ sql, params });
    if (/insert into broker_connections/i.test(sql)) {
      return {
        rowCount: 1,
        rows: [
          {
            id: 'conn-created',
            user_id: params[0],
            provider: params[1],
            institution_name: params[2],
            external_connection_id: params[3],
            status: params[4],
            scopes: params[5],
            consent_granted_at: now
          }
        ]
      };
    }
    return { rowCount: 1, rows: [] };
  }
};

const repository = createPortfolioRepository({ pool: fakePool });
repository.createBrokerConnection({
  userId: 'user-1',
  provider: 'snaptrade',
  institutionName: 'Broker',
  externalConnectionId: 'external-1',
  status: 'pending',
  scopes: ['accounts.read'],
  encryptedUserToken: Buffer.from('encrypted-token')
}).then((connection) => {
  assert.equal(connection.id, 'conn-created');
  const insertCall = calls.find((call) => /insert into broker_connections/i.test(call.sql));
  assert.ok(Buffer.isBuffer(insertCall.params[6]));
  assert.equal(String(insertCall.params[6]).includes('raw-token'), false);
  console.log('Portfolio repository tests passed');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
