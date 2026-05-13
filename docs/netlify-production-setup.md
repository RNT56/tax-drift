# Netlify Production Setup

## Current Project

- Netlify project: `tax-drift`
- Project ID: `ac0601ad-2132-4eaf-833f-0236a4b14bed`
- Project URL: `https://tax-drift.netlify.app`
- Admin URL: `https://app.netlify.com/projects/tax-drift`

## CLI Setup

The repository uses the local Netlify CLI from `node_modules`.

```sh
npm install
npx netlify --version
npx netlify status
```

Expected CLI package: `netlify-cli`.

## Database Setup

The production path now uses Supabase Postgres instead of Netlify Database because Netlify Database is not available on this account. See `docs/supabase-production-setup.md`.

The old Netlify Database migration folder is retained only as a compatibility/reference copy:

```sh
npx netlify database status
```

Applied local migrations:

- `0001_portfolio_core`
- `0002_sync_imports`

Do not install `@netlify/database`; that package triggers Netlify Database provisioning during build.

## Required Environment Variables

Base variables configured through the CLI:

```sh
npx netlify env:set NODE_VERSION 22 --force
npx netlify env:set VITE_PORTFOLIO_API_DEMO true --force
npx netlify env:set PORTFOLIO_DEMO_MODE false --force
npx netlify env:set SUPABASE_URL "https://<project-ref>.supabase.co" --force
npx netlify env:set SUPABASE_ANON_KEY "<anon-key>" --force
npx netlify env:set VITE_SUPABASE_URL "https://<project-ref>.supabase.co" --force
npx netlify env:set VITE_SUPABASE_ANON_KEY "<anon-key>" --force
npx netlify env:set SNAPTRADE_API_BASE_URL https://api.snaptrade.com/api/v1 --force
npx netlify env:set SNAPTRADE_USER_PREFIX taxswitch --force
```

Generate and set the encryption key as a secret for deployed contexts:

```sh
DATA_ENCRYPTION_KEY="$(openssl rand -base64 48)"
npx netlify env:set DATA_ENCRYPTION_KEY "$DATA_ENCRYPTION_KEY" \
  --context production deploy-preview branch-deploy \
  --secret \
  --force

npx netlify env:set SUPABASE_DATABASE_URL "<supabase-connection-pooler-url>" \
  --context production deploy-preview branch-deploy \
  --secret \
  --force

npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "<service-role-key>" \
  --context production deploy-preview branch-deploy \
  --secret \
  --force
```

Provider credentials must be supplied by the operator:

```sh
npx netlify env:set SNAPTRADE_CLIENT_ID "<snaptrade-client-id>" \
  --context production deploy-preview branch-deploy \
  --secret \
  --force

npx netlify env:set SNAPTRADE_CONSUMER_KEY "<snaptrade-consumer-key>" \
  --context production deploy-preview branch-deploy \
  --secret \
  --force
```

If API-token access is enabled, set a comma-separated list of SHA-256 token hashes:

```sh
npx netlify env:set PREMIUM_API_TOKEN_HASHES "<sha256-token-hash>[,<sha256-token-hash>]" \
  --context production deploy-preview branch-deploy \
  --secret \
  --force
```

Verify configured keys without printing values:

```sh
npx netlify env:list --context production --json \
  | node -e 'let s=""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => console.log(Object.keys(JSON.parse(s)).sort().join("\n")))'
```

## Deploy

Run full local verification before deploying:

```sh
npm run check
npx netlify build
npx netlify deploy --build
npx netlify deploy --prod --build
```

## Current Netlify Blocker

`npx netlify build` failed while `@netlify/database` was installed because Netlify tried to provision Netlify Database:

```text
database feature not available for this account
```

This is an account or team feature gate, not a repository migration error. Local migrations apply successfully.

The project now removes that dependency and uses Supabase through `SUPABASE_DATABASE_URL`.
