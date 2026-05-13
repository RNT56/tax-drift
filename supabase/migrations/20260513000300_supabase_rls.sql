alter table portfolio_users enable row level security;
alter table broker_connections enable row level security;
alter table portfolio_accounts enable row level security;
alter table holdings enable row level security;
alter table tax_lots enable row level security;
alter table transactions enable row level security;
alter table cash_balances enable row level security;
alter table target_allocations enable row level security;
alter table scenarios enable row level security;
alter table action_plans enable row level security;
alter table action_items enable row level security;
alter table alerts enable row level security;
alter table reports enable row level security;
alter table sync_runs enable row level security;
alter table audit_events enable row level security;
alter table import_runs enable row level security;
alter table import_reconciliation_items enable row level security;

create policy portfolio_users_owner_all
  on portfolio_users
  for all
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

create policy broker_connections_owner_all
  on broker_connections
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy portfolio_accounts_owner_all
  on portfolio_accounts
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy holdings_owner_all
  on holdings
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy tax_lots_owner_all
  on tax_lots
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy transactions_owner_all
  on transactions
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy cash_balances_owner_all
  on cash_balances
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy target_allocations_owner_all
  on target_allocations
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy scenarios_owner_all
  on scenarios
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy action_plans_owner_all
  on action_plans
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy action_items_owner_all
  on action_items
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy alerts_owner_all
  on alerts
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy reports_owner_all
  on reports
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy sync_runs_owner_all
  on sync_runs
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy audit_events_owner_all
  on audit_events
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy import_runs_owner_all
  on import_runs
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy import_reconciliation_items_owner_all
  on import_reconciliation_items
  for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

