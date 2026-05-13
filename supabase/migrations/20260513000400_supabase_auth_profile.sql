create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.portfolio_users (id, email, base_currency, locale)
  values (new.id::text, new.email, 'EUR', 'de-DE')
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now(),
    deleted_at = null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

