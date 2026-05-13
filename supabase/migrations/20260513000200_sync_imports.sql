alter table broker_connections
  add column if not exists provider_user_id text,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text;

create table if not exists import_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  source text not null,
  status text not null default 'pending',
  filename text,
  checksum text,
  confidence numeric(6, 5) not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  unique (user_id, checksum)
);

create table if not exists import_reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references import_runs(id) on delete cascade,
  user_id text not null references portfolio_users(id) on delete cascade,
  item_type text not null,
  status text not null default 'needs_review',
  external_id text,
  symbol text,
  isin text,
  payload jsonb not null,
  duplicate_of text,
  confidence numeric(6, 5) not null default 0,
  issue_codes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

create index if not exists idx_broker_connections_provider_user on broker_connections(provider, provider_user_id);
create index if not exists idx_import_runs_user_status on import_runs(user_id, status, created_at desc);
create index if not exists idx_import_items_run_status on import_reconciliation_items(import_run_id, status);
create index if not exists idx_import_items_user_symbol on import_reconciliation_items(user_id, symbol);
