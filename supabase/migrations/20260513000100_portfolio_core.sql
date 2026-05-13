create table if not exists portfolio_users (
  id text primary key,
  email text,
  base_currency text not null default 'EUR',
  locale text not null default 'de-DE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  provider text not null,
  institution_name text not null,
  external_connection_id text,
  status text not null,
  scopes jsonb not null default '[]'::jsonb,
  consent_granted_at timestamptz,
  reconnect_required_at timestamptz,
  last_synced_at timestamptz,
  encrypted_user_token bytea,
  encrypted_refresh_token bytea,
  token_ciphertext_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_connection_id)
);

create table if not exists portfolio_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  broker_connection_id uuid references broker_connections(id) on delete set null,
  provider text not null,
  external_account_id text,
  name text not null,
  currency text not null default 'EUR',
  tax_treatment text not null default 'taxable_de',
  status text not null default 'active',
  consent_granted_at timestamptz,
  last_synced_at timestamptz,
  stale_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_account_id)
);

create table if not exists holdings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  account_id uuid not null references portfolio_accounts(id) on delete cascade,
  provider text not null,
  external_holding_id text,
  symbol text not null,
  isin text,
  name text not null,
  instrument_type text not null,
  quantity numeric(30, 10) not null,
  price_currency text not null,
  price_minor numeric(30, 0) not null,
  price_scale integer not null default 2,
  price_as_of timestamptz not null,
  fx_rate_to_base numeric(24, 12),
  cost_basis_currency text not null,
  cost_basis_minor numeric(30, 0) not null,
  cost_basis_scale integer not null default 2,
  sector text,
  country text,
  exposure_tags jsonb not null default '[]'::jsonb,
  source text not null,
  confidence numeric(6, 5) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, provider, external_holding_id)
);

create table if not exists tax_lots (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  account_id uuid not null references portfolio_accounts(id) on delete cascade,
  holding_id uuid not null references holdings(id) on delete cascade,
  external_lot_id text,
  acquired_at date not null,
  quantity numeric(30, 10) not null,
  unit_cost_currency text not null,
  unit_cost_minor numeric(30, 0) not null,
  unit_cost_scale integer not null default 2,
  cost_basis_currency text not null,
  cost_basis_minor numeric(30, 0) not null,
  cost_basis_scale integer not null default 2,
  source text not null,
  fifo_rank integer not null,
  partial_exemption_pct numeric(6, 3),
  loss_pot text,
  withholding_tax_currency text,
  withholding_tax_minor numeric(30, 0),
  withholding_tax_scale integer,
  vorabpauschale_basis_currency text,
  vorabpauschale_basis_minor numeric(30, 0),
  vorabpauschale_basis_scale integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  account_id uuid not null references portfolio_accounts(id) on delete cascade,
  provider text not null,
  external_transaction_id text,
  symbol text,
  isin text,
  transaction_type text not null,
  trade_date date not null,
  settlement_date date,
  quantity numeric(30, 10),
  amount_currency text not null,
  amount_minor numeric(30, 0) not null,
  amount_scale integer not null default 2,
  fees_currency text,
  fees_minor numeric(30, 0),
  fees_scale integer,
  taxes_currency text,
  taxes_minor numeric(30, 0),
  taxes_scale integer,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, external_transaction_id)
);

create table if not exists cash_balances (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  account_id uuid not null references portfolio_accounts(id) on delete cascade,
  currency text not null,
  amount_minor numeric(30, 0) not null,
  amount_scale integer not null default 2,
  as_of timestamptz not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, currency, as_of)
);

create table if not exists prices (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  isin text,
  currency text not null,
  price_minor numeric(30, 0) not null,
  price_scale integer not null default 2,
  as_of timestamptz not null,
  provider text not null,
  confidence numeric(6, 5) not null default 1,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (symbol, provider, as_of)
);

create table if not exists fx_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric(24, 12) not null,
  as_of timestamptz not null,
  provider text not null,
  created_at timestamptz not null default now(),
  unique (base_currency, quote_currency, provider, as_of)
);

create table if not exists target_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  scope text not null,
  scope_id text,
  label text not null,
  symbol text,
  exposure_tag text,
  target_weight_pct numeric(8, 5) not null,
  min_weight_pct numeric(8, 5),
  max_weight_pct numeric(8, 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  name text not null,
  constraints jsonb not null,
  assumptions jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists action_plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  scenario_id uuid references scenarios(id) on delete set null,
  generated_at timestamptz not null default now(),
  constraints jsonb not null,
  summary jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  action_plan_id uuid not null references action_plans(id) on delete cascade,
  user_id text not null references portfolio_users(id) on delete cascade,
  kind text not null,
  rank integer not null,
  title text not null,
  reason text not null,
  confidence numeric(6, 5) not null,
  impact jsonb not null,
  required_inputs jsonb not null default '[]'::jsonb,
  related_entity_ids jsonb not null default '[]'::jsonb,
  user_decision text not null default 'review',
  created_at timestamptz not null default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  alert_type text not null,
  status text not null default 'active',
  rule jsonb not null,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  report_type text not null,
  format text not null,
  storage_key text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  provider text not null,
  broker_connection_id uuid references broker_connections(id) on delete set null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  accounts_seen integer not null default 0,
  holdings_seen integer not null default 0,
  transactions_seen integer not null default 0,
  error_code text,
  error_message text,
  provider_error jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id text references portfolio_users(id) on delete set null,
  actor_id text,
  event_type text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  provider text not null,
  consent_type text not null,
  consent_version text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_accounts_user on portfolio_accounts(user_id);
create index if not exists idx_connections_user_status on broker_connections(user_id, status);
create index if not exists idx_holdings_user_account on holdings(user_id, account_id);
create index if not exists idx_tax_lots_holding_fifo on tax_lots(holding_id, fifo_rank);
create index if not exists idx_transactions_user_account_date on transactions(user_id, account_id, trade_date desc);
create index if not exists idx_cash_balances_user_account on cash_balances(user_id, account_id, as_of desc);
create index if not exists idx_prices_symbol_asof on prices(symbol, as_of desc);
create index if not exists idx_fx_rates_pair_asof on fx_rates(base_currency, quote_currency, as_of desc);
create index if not exists idx_targets_user on target_allocations(user_id);
create index if not exists idx_action_items_plan_rank on action_items(action_plan_id, rank);
create index if not exists idx_alerts_user_status on alerts(user_id, status);
create index if not exists idx_sync_runs_user_status on sync_runs(user_id, status, started_at desc);
create index if not exists idx_audit_user_created on audit_events(user_id, created_at desc);
