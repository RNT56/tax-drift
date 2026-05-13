const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationsDir = path.join(__dirname, '..', 'netlify', 'database', 'migrations');
const netlifySql = fs.readdirSync(migrationsDir)
  .flatMap(entry => {
    const migrationPath = path.join(migrationsDir, entry, 'migration.sql');
    return fs.existsSync(migrationPath) ? [fs.readFileSync(migrationPath, 'utf8')] : [];
  })
  .join('\n')
  .toLowerCase();
const supabaseDir = path.join(__dirname, '..', 'supabase', 'migrations');
const supabaseSql = fs.readdirSync(supabaseDir)
  .filter(entry => entry.endsWith('.sql'))
  .map(entry => fs.readFileSync(path.join(supabaseDir, entry), 'utf8'))
  .join('\n')
  .toLowerCase();
const sql = `${netlifySql}\n${supabaseSql}`;

const requiredTables = [
  'portfolio_users',
  'broker_connections',
  'portfolio_accounts',
  'holdings',
  'tax_lots',
  'transactions',
  'cash_balances',
  'prices',
  'fx_rates',
  'target_allocations',
  'scenarios',
  'action_plans',
  'action_items',
  'alerts',
  'reports',
  'sync_runs',
  'audit_events',
  'consent_records',
  'import_runs',
  'import_reconciliation_items'
];

for (const table of requiredTables) {
  assert.match(sql, new RegExp(`create table if not exists ${table}\\b`), `missing ${table}`);
}

assert.match(sql, /encrypted_user_token bytea/, 'broker tokens must be encrypted server-side blobs');
assert.match(sql, /provider_user_id text/, 'provider user id must be tracked separately from app user id');
assert.match(sql, /create index if not exists idx_sync_runs_user_status/, 'sync run status index required');
assert.match(sql, /create index if not exists idx_import_runs_user_status/, 'import run status index required');
assert.match(supabaseSql, /alter table portfolio_users enable row level security/, 'Supabase portfolio users table must use RLS');
assert.match(supabaseSql, /user_id = auth\.uid\(\)::text/, 'Supabase owner policies must bind rows to auth.uid()');
assert.match(supabaseSql, /on_auth_user_created/, 'Supabase auth registration trigger required');
assert.doesNotMatch(sql, /trade_execution|place_order|submit_order/, 'schema must not expose trading execution tables');

console.log('Migration tests passed');
