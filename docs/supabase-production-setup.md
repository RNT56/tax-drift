# Supabase Production Setup

TaxSwitch uses Netlify for hosting/functions and Supabase for auth and Postgres.

Hosted project:

- Project ref: `rjozmgfnqzyavumakzkn`
- Project URL: `https://rjozmgfnqzyavumakzkn.supabase.co`

## Local CLI

The Supabase CLI is installed as a local dev dependency.

```sh
npm install
npx supabase --version
npm run supabase:start
npm run supabase:status
npm run supabase:reset
```

The local Supabase config lives in `supabase/config.toml`.

## Migrations

Supabase migrations live in `supabase/migrations`.

- `20260513000100_portfolio_core.sql`
- `20260513000200_sync_imports.sql`
- `20260513000300_supabase_rls.sql`
- `20260513000400_supabase_auth_profile.sql`

The RLS migration enables owner policies for user-scoped tables. The auth profile migration creates a `portfolio_users` row when Supabase Auth creates a user.

Push migrations to a linked Supabase project:

```sh
npx supabase login
npx supabase link --project-ref "<project-ref>"
npm run supabase:push
```

Generate TypeScript database types after migrations are applied:

```sh
npm run supabase:types
```

## Netlify Environment

Set these on Netlify:

```sh
npx netlify env:set SUPABASE_DATABASE_URL "<supabase-connection-pooler-url>" --secret --force
npx netlify env:set SUPABASE_URL "https://<project-ref>.supabase.co" --force
npx netlify env:set SUPABASE_ANON_KEY "<anon-key>" --force
npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "<service-role-key>" --secret --force
npx netlify env:set VITE_SUPABASE_URL "https://<project-ref>.supabase.co" --force
npx netlify env:set VITE_SUPABASE_ANON_KEY "<anon-key>" --force
```

Keep `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DATABASE_URL`, `DATA_ENCRYPTION_KEY`, provider keys, and API token hashes secret.

## Auth Flow

1. Users register or sign in through Supabase Auth.
2. Supabase returns a short-lived access token and refresh token.
3. The frontend sends the access token to Netlify Functions as `Authorization: Bearer <token>`.
4. Netlify Functions verify the token with Supabase Auth before reading or mutating portfolio data.
5. The auth trigger creates or repairs `portfolio_users` for the Supabase user id.

Netlify Identity and API tokens still work as fallback server auth modes during migration, but Supabase Auth is the production direction.

## Encryption

- Supabase encrypts managed data at rest at the platform/storage layer.
- Broker provider tokens are additionally encrypted in application code with AES-256-GCM before being stored in Postgres.
- `DATA_ENCRYPTION_KEY` must be generated outside the repo and stored as a Netlify secret.
- Raw broker credentials are never stored.
- Privacy exports redact encrypted broker token columns.

## AI Access

AI model discovery and research memo APIs require authenticated access. Unauthenticated requests return `401`.
