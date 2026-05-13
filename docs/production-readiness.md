# Production Readiness Notes

## Rollout Controls

- Keep `/` on the unified React portfolio workspace.
- Ship new production capabilities behind `PORTFOLIO_DEMO_MODE` and broker-linking feature flags first.
- Enable SnapTrade-compatible linking only after server-side token encryption and provider webhooks are configured.
- Run Supabase migrations in staging before production with `npm run supabase:push`.
- Keep broker integrations read-only. The provider adapter must not add order placement, order preview, or execution methods.

## Security

- Store broker tokens and provider credentials only in Netlify Function environment variables or encrypted database fields.
- Keep `DATA_ENCRYPTION_KEY` configured before enabling broker connection persistence; provider tokens are encrypted with AES-GCM server-side.
- Never log raw authorization headers, cookies, broker credentials, tokens, or imported broker document contents.
- Use Supabase Auth for private portfolio endpoints. Netlify Identity and API tokens are migration fallbacks only.
- Keep the portfolio CSP strict.
- Rotate `DATA_ENCRYPTION_KEY`, provider keys, and API tokens with a maintenance window and audit event.

## Privacy and GDPR

- Users must be able to export portfolio data, action plans, consent records, reports and audit records.
- Users must be able to delete account data and revoke broker connections.
- Privacy exports must redact encrypted broker token columns.
- Keep consent records separate from broker connection status.
- Retain only legally required audit events after account deletion.
- Default report exports should avoid provider raw payloads unless the user explicitly selects an audit export.

## Observability

- New APIs return `{ ok, data, error, meta }` and include request IDs in metadata.
- Function logs are structured JSON and avoid PII.
- Sync runs should capture provider, status, counts, timings and provider error taxonomy.
- The `/api/health` endpoint reports database reachability and provider configuration without exposing secrets.

## Performance Budgets

- Portfolio routes are split with React lazy imports.
- Position and transaction tables should be virtualized before enabling accounts above 500 positions or 10,000 transactions.
- Import parsing, optimizer variants and Monte Carlo should move to workers before large imports are enabled by default.
- Quote and sync APIs should batch by account/provider and debounce client persistence.
- Keep initial portfolio bundle under 350 kB gzip before enabling the route as the default homepage.

## Smoke Checklist

- `npm run check`
- `npm run test:e2e -- --project=chromium`
- `npm run supabase:status`
- `npx netlify build`
- Open `/`, `/assets`, `/data`, `/decisions`, and `/planner` on desktop and mobile widths.
- Verify `/api/health`, `/api/portfolio?demo=1`, `/api/action-plan?demo=1`, `/api/broker-connections?demo=1`.
- Verify authenticated `/api/broker-sync` against a staging SnapTrade user before enabling broker sync in production.
- Verify authenticated `/api/portfolio-import` persists reconciliation rows before allowing import commit flows.
- Verify `/api/portfolio-report?type=decision_memo&format=html&demo=1`.
- Confirm no broker trading endpoints exist.
- Confirm CSP for the app shell does not include `unsafe-inline`.
