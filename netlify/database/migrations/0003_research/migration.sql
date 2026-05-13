create table if not exists research_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  symbol text not null,
  name text,
  isin text,
  exchange text,
  currency text,
  instrument_type text not null default 'stock',
  provider_symbols jsonb not null default '{}'::jsonb,
  issuer_urls jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  subject_id uuid not null references research_subjects(id) on delete cascade,
  target_subject_id uuid references research_subjects(id) on delete set null,
  thesis text,
  status text not null,
  generated_at timestamptz not null default now(),
  completed_at timestamptz,
  horizon text,
  source_policy jsonb not null default '{}'::jsonb,
  coverage jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  ai_payload jsonb not null default '{}'::jsonb,
  source_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists research_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  run_id uuid not null references research_runs(id) on delete cascade,
  source_type text not null,
  source_name text not null,
  status text not null,
  url text,
  fetched_at timestamptz not null default now(),
  source_date timestamptz,
  freshness text,
  content_hash text,
  metadata jsonb not null default '{}'::jsonb,
  raw_payload jsonb,
  error_code text,
  error_message text
);

create table if not exists research_evidence (
  id text not null,
  user_id text not null references portfolio_users(id) on delete cascade,
  run_id uuid not null references research_runs(id) on delete cascade,
  source_snapshot_id uuid references research_source_snapshots(id) on delete set null,
  category text not null,
  claim text not null,
  evidence text not null,
  source_url text,
  source_name text not null,
  source_date text,
  confidence text not null,
  thesis_impact text not null,
  source_evidence_ids jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (run_id, id)
);

create table if not exists research_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  run_id uuid not null references research_runs(id) on delete cascade,
  category text not null,
  label text not null,
  value numeric,
  text_value text,
  unit text,
  period text,
  source_evidence_ids jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists research_events (
  id text not null,
  user_id text not null references portfolio_users(id) on delete cascade,
  run_id uuid not null references research_runs(id) on delete cascade,
  event_type text not null,
  title text not null,
  summary text,
  occurred_at timestamptz,
  source_name text not null,
  source_url text,
  severity text not null,
  directness numeric(8, 5) not null default 0,
  risk_score numeric(8, 5) not null default 0,
  affected_countries jsonb not null default '[]'::jsonb,
  affected_sectors jsonb not null default '[]'::jsonb,
  source_evidence_ids jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (run_id, id)
);

create table if not exists research_copilot_threads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  run_id uuid references research_runs(id) on delete cascade,
  subject_id uuid references research_subjects(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists research_copilot_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references portfolio_users(id) on delete cascade,
  thread_id uuid not null references research_copilot_threads(id) on delete cascade,
  run_id uuid references research_runs(id) on delete cascade,
  role text not null,
  content text not null,
  source_evidence_ids jsonb not null default '[]'::jsonb,
  source_requests jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_research_subjects_user_symbol on research_subjects(user_id, symbol);
create index if not exists idx_research_subjects_user_isin on research_subjects(user_id, isin);
create unique index if not exists idx_research_subjects_user_symbol_isin_unique on research_subjects(user_id, symbol, coalesce(isin, ''));
create index if not exists idx_research_runs_user_subject on research_runs(user_id, subject_id, generated_at desc);
create index if not exists idx_research_runs_user_created on research_runs(user_id, generated_at desc);
create index if not exists idx_research_evidence_run_category on research_evidence(run_id, category);
create index if not exists idx_research_snapshots_run_source on research_source_snapshots(run_id, source_type, status);
create index if not exists idx_research_metrics_run_category on research_metrics(run_id, category);
create index if not exists idx_research_events_run_score on research_events(run_id, risk_score desc);
create index if not exists idx_research_threads_user_run on research_copilot_threads(user_id, run_id, updated_at desc);
create index if not exists idx_research_messages_thread_created on research_copilot_messages(thread_id, created_at asc);
