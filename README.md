# TaxSwitch - Portfolio Workspace

TaxSwitch is one Germany-first portfolio workspace for taxable sell/rebuy analysis, asset selection, FIFO basis, broker/import data, portfolio decisions, alerts, reports and research.

The public app now runs from `/` with direct workspace URLs such as `/assets`, `/positions`, `/data`, `/decisions`, `/planner`, `/tax`, `/imports`, `/connections`, `/alerts`, `/reports` and `/settings`. TaxSwitch does not expose broker trade execution endpoints.

## What is included

- Unified React + Vite + TypeScript multi-page workspace
- Blank generic inputs with example placeholders only where manual data entry is needed
- German tax preset at `26.375%`
- German detailed tax mode with saver allowance, church tax, loss pots, ETF partial exemptions, foreign tax credits, prior taxed Vorabpauschale and FIFO lots
- Locale-friendly numeric parsing: `163,26` and `163.26` both work
- Dynamic calculation currency field
- Stock / ETF / index / crypto / FX search
- Optional multi-provider latest quote, asset snapshot and history through Netlify Functions
- FX-separated calculations for position currency, tax/base currency, stock return, FX return and combined tax-currency outcome
- Multi-lot support with date, shares, unit cost, fees, currency, buy FX and sale-order assumptions
- Decision workspace for scenario analysis, portfolio risk, assumption quality, tax-loss harvesting, ETF/fund assumptions, evidence memos, watch rules and report output
- Probability-weighted bull/base/bear/recession/rate-cut/no-growth/multiple-compression cases plus seeded Monte Carlo sensitivity
- Workspace schema v2 for decision cases, risk profile, research memos, watch rules, exposure and assumptions
- Local fallback symbol catalog if no API key is configured
- No external fonts or market-data calls from the browser; Supabase Auth is the production auth target
- Netlify-ready `netlify.toml`
- Security headers and SPA fallback redirect
- Route-level screens for Overview, Assets, Decisions, Planner, Positions, Data, Imports, Connections, Tax, Research, Alerts, Reports and Settings
- Typed portfolio domain model for accounts, broker connections, holdings, FIFO tax lots, cash, targets, snapshots, action plans, sync runs and data-quality issues
- Supabase/Postgres migrations in `supabase/migrations`
- Standardized new API response envelope: `{ ok, data, error, meta }`
- Read-only broker provider boundary with manual/import and SnapTrade-compatible adapters

## Deploy on Netlify

### Recommended: Git deploy

1. Push this folder to a GitHub, GitLab, Bitbucket or Azure DevOps repository.
2. Create a new Netlify site from the repository.
3. Netlify reads `netlify.toml` automatically.
4. Netlify runs `npm run build`.
5. The publish directory is `dist`.
6. The functions directory is `netlify/functions`.
7. Supabase migrations are stored under `supabase/migrations` and are pushed with `npm run supabase:push`.

### API keys and environment variables

The app works without API keys in anonymous/manual mode. Netlify Functions and premium backend features use the variables below when you run `npm run dev` or deploy to Netlify.

| Variable | Required? | Used for | Notes |
| --- | --- | --- | --- |
| `TWELVE_DATA_API_KEY` | Optional | Live symbol search and latest prices | Good first market-data key. Current project already supports it. |
| `FMP_API_KEY` | Optional | Live symbol search, latest prices, FX rates | Preferred for broader quote/FX coverage when available. |
| `EODHD_API_KEY` | Optional | Live symbol search, latest prices, FX rates | Additional fallback provider. |
| `ALPHA_VANTAGE_API_KEY` | Optional | Live symbol search fallback | Useful as another fallback; coverage and rate limits vary. |
| `FINNHUB_API_KEY` | Optional | Premium-ready research datasets | Enables future transcript, estimate, ownership and ETF integrations where implemented. |
| `FRED_API_KEY` | Optional | Macro context in research | Research still works without it, but FRED evidence is skipped. |
| `OPENAI_API_KEY` | Optional | Hosted AI research provider | Enables OpenAI provider/model selection in the AI Research tab. |
| `ANTHROPIC_API_KEY` | Optional | Hosted AI research provider | Enables Anthropic provider/model selection in the AI Research tab. |
| `GEMINI_API_KEY` | Optional | Hosted AI research provider | Enables Google Gemini provider/model selection in the AI Research tab. |
| `XAI_API_KEY` | Optional | Hosted AI research provider | Enables xAI Grok provider/model selection in the AI Research tab. |
| `PERPLEXITY_API_KEY` | Optional | Hosted AI research provider | Enables Perplexity provider/model selection in the AI Research tab. |
| `AI_RESEARCH_URL` | Optional | AI-compatible research memo enhancement | Receives the evidence memo and must return JSON. Disabled unless configured. |
| `AI_RESEARCH_API_KEY` | Optional | Authorization for `AI_RESEARCH_URL` | Sent as a Bearer token only to the configured endpoint. |
| `AI_RESEARCH_RATE_LIMIT` | Optional | Research memo request limit | Defaults to 5/hour when AI enhancement is configured, otherwise 20/hour. |
| `AI_RESEARCH_RATE_WINDOW_SECONDS` | Optional | Research memo rate-limit window | Defaults to 3600 seconds. |
| `AI_RESEARCH_TIMEOUT_MS` | Optional | AI provider timeout | Defaults to 20 seconds. Timeout falls back to the evidence memo. |
| `AI_RESEARCH_IP_LIMIT` | Optional | AI request quota per IP | Defaults to 5/hour. Uses persistent Netlify Blobs when `DATA_ENCRYPTION_KEY` is configured; memory fallback is local/dev only. |
| `AI_RESEARCH_IP_WINDOW_SECONDS` | Optional | AI request quota window | Defaults to 3600 seconds. |
| `AI_ALLOWED_MODELS` | Optional | Override hosted AI allowlist | Comma-separated `provider:model` pairs. Defaults to `openai:gpt-5.5, anthropic:claude-4.6-sonnet, gemini:gemini-3.1-pro, xai:grok-4.2`. |
| `RESEARCH_RSS_FEEDS` | Optional | Allowlisted RSS/Atom research feeds | Comma-separated URLs or JSON array. Per-subject issuer feeds can also be submitted from the portfolio Research route. |
| `RESEARCH_FETCH_SEC_HTML` | Optional | SEC filing section extraction | Defaults to enabled. Set `false` to skip filing HTML fetches. |
| `RESEARCH_RATE_LIMIT` | Optional | Evidence-only research run quota | Defaults to 20/hour. |
| `RESEARCH_AI_RATE_LIMIT` | Optional | AI-enhanced research run quota | Defaults to 5/hour. |
| `RESEARCH_COPILOT_RATE_LIMIT` | Optional | Cited research copilot quota | Defaults to 10/hour. |
| `OFAC_SDN_URL` | Optional | Sanctions source URL | Defaults to OFAC SDN XML. Matches are low-confidence flags requiring manual verification. |
| `DATA_ENCRYPTION_KEY` | Required for broker token persistence | Encrypting provider tokens before database storage | Not needed for local anonymous use. Required before broker linking. Use a long random value. |
| `RESEND_API_KEY` | Optional | Email alerts | Not needed unless `email` alert delivery is enabled. In-app/local alerts work without it. |
| `PREMIUM_API_TOKEN_HASHES` | Optional | API access/testing fallback | Format is `sha256(token):userId`, comma-separated for multiple tokens. Supabase Auth is preferred for real users. |
| `ALERT_SCHEDULER_SECRET` | Recommended | Manual alert scheduler runs | Scheduled Netlify runs work without a browser user. Direct HTTP calls must include this value as `x-alert-scheduler-secret` or a Bearer token when configured. |
| `TESSERACT_BIN` | Optional | Local OCR fallback for scanned broker PDFs | Defaults to `tesseract`. The OCR path needs a Tesseract binary in the runtime, but no external OCR API key. |
| `OCR_LANGUAGES` | Optional | OCR language preference | Defaults to `deu+eng` and automatically falls back to installed languages such as `eng`. |
| `OCR_PSM` | Optional | Tesseract page segmentation mode | Defaults to `6`, which works best for statement-like blocks and tables. |
| `SUPABASE_DATABASE_URL` / `DATABASE_URL` / `POSTGRES_URL` | Required for production portfolio persistence | Supabase Postgres | Use the Supabase connection pooler URL in production. The app falls back to demo portfolio data when no database URL is configured. |
| `SUPABASE_URL` | Required for Supabase Auth | Server-side token verification | Used by Netlify Functions to verify user access tokens. |
| `SUPABASE_ANON_KEY` | Required for Supabase Auth | Server/browser auth client | Public anon key; safe for browser usage. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for server token verification | Netlify Functions only | Keep secret. Never expose to browser code. |
| `VITE_SUPABASE_URL` | Required for browser auth | React/Vite client | Same URL as `SUPABASE_URL`. |
| `VITE_SUPABASE_ANON_KEY` | Required for browser auth | React/Vite client | Same value as `SUPABASE_ANON_KEY`. |
| `PORTFOLIO_DEMO_MODE=true` | Optional | Portfolio API demo mode | Allows unauthenticated demo responses for preview/dev. Disable for production user data. |
| `SNAPTRADE_CLIENT_ID` | Optional | SnapTrade-compatible read-only provider | Required before enabling real SnapTrade connection flows. |
| `SNAPTRADE_CONSUMER_KEY` | Optional | SnapTrade-compatible read-only provider | Store only in Netlify Functions environment variables. Never expose to the browser. |
| `SNAPTRADE_PORTAL_BASE_URL` | Optional | Broker connection portal URL | Used by the provider adapter to start a read-only connection flow. |

Developer/test-only variables:

| Variable | Required? | Used for | Notes |
| --- | --- | --- | --- |
| `PREMIUM_TEST_USER_ID` | Test only | Mock premium auth | Only honored in test/mock auth contexts. |
| `PREMIUM_AUTH_MODE=mock` | Test only | Enables mock auth mode | Do not use in production. |
| `PREMIUM_TRUST_USER_HEADER=true` | Local/internal only | Trusts `x-user-id` style headers | Do not use in production unless the app is behind a trusted auth proxy. |
| `SECURE_STORE_ALLOW_PLAINTEXT=true` | Local/dev only | Allows persistent store without encryption | Do not use for real user financial data. |

You do not need all market-data keys. Configure more than one key for broader coverage, FX conversion coverage and failover when a provider cannot quote a symbol.

Supported providers are tried in this order:

```text
TWELVE_DATA_API_KEY=your_twelve_data_key
FMP_API_KEY=your_financial_modeling_prep_key
EODHD_API_KEY=your_eodhd_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
```

Set it under:

```text
Site configuration → Environment variables
```

Make sure the variable is available to **Functions**.

Do **not** put the API key in client-side JavaScript.

Authenticated portfolio, broker and privacy endpoints require a reachable database unless demo mode is explicitly enabled. Broker provider tokens are encrypted with `DATA_ENCRYPTION_KEY` before storage and are never returned by export APIs.

New portfolio endpoints:

```text
GET  /api/portfolio?demo=1
GET  /api/action-plan?demo=1
POST /api/action-plan
GET  /api/broker-connections?demo=1
POST /api/broker-connections
POST /api/broker-sync
GET  /api/portfolio-import
POST /api/portfolio-import
GET  /api/portfolio-report?type=portfolio_snapshot&format=json&demo=1
POST /api/portfolio-report
GET  /api/privacy?demo=1
DELETE /api/privacy
GET  /api/health
```

SnapTrade account data uses read-only API surfaces: connection portal login, accounts, positions, balances, activities and authorization refresh. TaxSwitch does not call or expose SnapTrade trading/order APIs.

## Local development

The unified portfolio workspace is served by Vite at `/`. Netlify Functions work through Netlify Dev or a deployed Netlify site.

```bash
npm run check
npm run dev:vite
```

Then open `http://127.0.0.1:5173/`.

For Netlify Functions and Supabase locally:

```bash
npm run supabase:start
npm run dev
```

### Production readiness checks

```bash
npm run typecheck
npm run lint
npm run build
npm run test:portfolio
npm run test:migrations
npm run test:api-contracts
npm run test:e2e
```

The GitHub Actions workflow runs the full check suite plus Playwright Chromium smoke tests. CI uses Node 22 to match the Netlify/Supabase runtime target.

## Files

```text
index.html
portfolio.html
src/App.tsx
src/routes/
src/components/
symbol-catalog.js
site.webmanifest
netlify.toml
package.json
netlify/functions/search-symbols.js
netlify/functions/get-price.js
netlify/functions/get-history.js
netlify/functions/api-status.js
netlify/functions/research-memo.js
netlify/lib/fallback-symbols.js
netlify/lib/market-data-providers.js
netlify/lib/research-sources.js
app-core.js
app-decision.js
app-ledger.js
app-workspace.js
tax-germany.js
```

## API flow

The browser never calls market data providers directly.

```text
Browser
  → /.netlify/functions/search-symbols?q=apple
  → Netlify Function
  → local curated catalog + configured providers
    → Twelve Data /symbol_search
    → FMP /search-symbol + /search-name
    → EODHD /search
    → Alpha Vantage SYMBOL_SEARCH
```

For prices:

```text
Browser
  → /.netlify/functions/get-price?symbol=AAPL&exchange=NASDAQ&currency=USD
  → Netlify Function
  → first successful configured provider
    → Twelve Data /price
    → FMP /quote
    → EODHD /real-time
    → Alpha Vantage GLOBAL_QUOTE
```

If no provider key is configured, `search-symbols` falls back to the local symbol list and `get-price` returns a clear configuration message. If a provider key is configured but that provider cannot quote the selected symbol, `get-price` tries the next configured provider.

For historical prices:

```text
Browser
  → /.netlify/functions/get-history?symbol=AAPL&range=1Y&currency=EUR
  → Netlify Function
  → first successful configured provider
    → Twelve Data /time_series
    → FMP /historical-price-full
    → EODHD /eod
    → Alpha Vantage TIME_SERIES_DAILY_ADJUSTED
```

Provider names are intentionally not shown in the app UI. Netlify Function logs include provider success/failure events such as `market_data.price.success`, `market_data.history.success`, `market_data.price.failure`, `market_data.fx.success` and `market_data.search.success` so provider coverage can be reviewed server-side without exposing sources to users.

When the selected instrument currency differs from the calculation currency, `get-price` fetches the instrument quote in its native currency, fetches a live FX rate, and returns a converted current price in the calculation currency. If FX conversion is unavailable, the app does not fill an unconverted price.

## Calculation model

Variables:

- `n` = shares
- `B` = buy price per share
- `S` = current price per share
- `t` = tax rate on realized gains
- `C` = total transaction costs
- `r_old` = expected return of the current stock if held
- `r_new` = expected return of the new stock
- `fx_buy` = tax/base-currency units per unit of position currency at purchase
- `fx_now` = tax/base-currency units per unit of position currency at sale/current value

Core formulas:

```text
current_value_position = n × S
cost_basis_position = n × B
current_value_tax = current_value_position × fx_now
cost_basis_tax = cost_basis_position × fx_buy
taxable_gain = max(current_value_tax − cost_basis_tax, 0)
tax_due = taxable_gain × t
cash_after_sale_tax = max(current_value_tax − tax_due − C, 0)
break_even_rebuy_price_position = (cash_after_sale_tax ÷ fx_now) ÷ n
required_drop = S − break_even_rebuy_price_position
cash_ratio = cash_after_sale_tax ÷ current_value_tax
```

Switch-stock hurdle:

```text
required_net_return = (1 + r_old) ÷ cash_ratio − 1
```

If future new-stock gains are taxed and the required return is positive:

```text
required_gross_new_return = required_net_return ÷ (1 − t)
```

Otherwise:

```text
required_gross_new_return = required_net_return
```

Future-value comparison:

```text
hold_old_future_value = current_value_tax × (1 + r_old)
```

If future new-stock gains are taxed and `r_new > 0`:

```text
new_stock_future_value = cash_after_sale_tax × (1 + r_new × (1 − t))
```

Otherwise:

```text
new_stock_future_value = cash_after_sale_tax × (1 + r_new)
```

## Currency handling

The calculator separates position currency from tax/base currency when manual FX mode is enabled.

Example: a USD stock can be entered with USD buy/current prices while German tax values are shown in EUR using purchase and sale FX rates. The UI reports stock-only return, FX return and combined tax-currency outcome. If manual FX mode is off, values are treated as already being in the displayed calculation currency.

Lot calculations also carry per-lot buy FX rates. Sale order is shown explicitly; FIFO is the default, with manual selected lots, tax-efficient/highest-cost and lowest-cost estimates available for comparison.

## Decision Lab

Decision Lab is non-advisory. It reports what wins or loses under user assumptions; it does not tell the user to buy, sell or hold.

It includes:

- seven scenario types: hold, sell now and switch, sell at target, sell/rebuy same stock, partial trim, move to cash and use fresh cash
- tax-loss harvesting scenario output when the selected sale realizes a loss
- ETF/fund-specific inputs for distribution policy, domicile, distribution yield, withholding tax, TER, tracking difference, currency exposure and index methodology
- probability-weighted scenario cases with expected value, worst case, winner counts and seeded Monte Carlo margins
- portfolio context for concentration, target allocation, cash reserve, tolerable loss, time horizon and manual sector/country exposure
- correlation-aware portfolio risk metrics using user-entered or scenario-estimated volatility assumptions
- assumption quality scoring for tax inputs, cost basis, prices, return forecasts, scenarios and FX
- risk flags across stock-specific, market, execution, timing, tax, behavioral and data/model categories
- evidence-first research memos with claim, evidence, source, date, confidence and thesis impact
- report-ready JSON output and print-friendly report rendering

## Research sources

The app includes a dedicated Research workspace at `/research`. It stores durable research runs, source snapshots, evidence, normalized metrics, events and copilot messages in Postgres/Supabase tables.

Research uses deterministic source collection and schema validation before AI synthesis. It currently supports:

- SEC company tickers, submissions and companyfacts APIs for US-listed company context
- SEC filing HTML extraction for business/value-proposition and risk-factor evidence when reliable
- configured FMP profile, ratios, peers, estimates, earnings calendar, insider records, ETF holdings and licensed-provider news evidence when `FMP_API_KEY` is available
- configured Alpha Vantage overview, ETF profile and news/sentiment evidence when `ALPHA_VANTAGE_API_KEY` is available
- optional FRED macro evidence when `FRED_API_KEY` is configured
- ECB SDMX FX context
- allowlisted RSS/Atom feeds through `RESEARCH_RSS_FEEDS` and per-subject issuer feed URLs
- GDELT and ReliefWeb global-event context
- OFAC sanctions-list text matching for low-confidence risk flags that require manual verification
- optional hosted AI memo enhancement through OpenAI, Anthropic, Google Gemini, xAI Grok or Perplexity
- optional custom AI memo enhancement through `AI_RESEARCH_URL`
- local fallback memo content when the backend or source collection is unavailable

AI-enhanced memos keep the deterministic evidence memo as the base. Provider responses are size-limited, timeout-limited and schema-validated; every evidence item receives an ID, and uncited AI claims are downgraded to low confidence. The frontend sends sanitized context so AI output can support contradiction checks, scenario suggestions, assumption critique, report narrative and watch-rule suggestions without becoming a buy/sell/hold recommendation.

Premium-only datasets such as transcripts, detailed ownership, richer ETF holdings and estimate history are treated as provider-key-gated integrations rather than scraped data. Missing sources remain visible as partial, stale, provider-unavailable or premium-key-missing states.

## Assumptions

The default German tax preset is `26.375%`, reflecting a common model of 25% capital gains tax plus a 5.5% solidarity surcharge.

Simple flat mode intentionally stays approximate. German detailed mode adds church tax calculated on capital gains tax, saver allowance, ETF partial exemptions, loss pots, foreign tax credits, prior taxed Vorabpauschale and FIFO lots, but TaxSwitch remains a planning tool and not tax advice.

## Current limitations

- Research is evidence-backed and optionally AI-enhanced, but still constrained to non-advisory scenario analysis.
- PDF output is print-ready HTML/browser print, not a generated binary PDF file.
- ETF/fund handling covers tax-relevant fields, provider holdings where configured and user-supplied issuer feeds/documents; universal automatic issuer-document coverage is not assumed.
- Portfolio risk uses user-entered or scenario-estimated volatility and correlation; it does not infer a full covariance matrix automatically.
- Tax-loss harvesting reports realized loss, estimated offset value, caveats and selected replacement-candidate context; automated candidate sourcing depends on future provider integrations.

## Netlify premium setup

TaxSwitch runs as a static app with Netlify Functions, Supabase Auth/Postgres, Scheduled Functions and optional Resend email alerts.

```bash
npm install
npm run check
npm run dev
```

For a live site:

```bash
npx netlify login
npx netlify init
npx supabase login
npx supabase link --project-ref "<project-ref>"
npm run supabase:push
npx netlify env:set SUPABASE_DATABASE_URL "<supabase-connection-pooler-url>" --secret
npx netlify env:set SUPABASE_URL "https://<project-ref>.supabase.co"
npx netlify env:set SUPABASE_ANON_KEY "<anon-key>"
npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "<service-role-key>" --secret
npx netlify env:set DATA_ENCRYPTION_KEY "<32+ character secret>"
npx netlify env:set RESEND_API_KEY "<resend key>"
npx netlify env:set FMP_API_KEY "<market data key>"
npm run deploy:preview
npm run deploy:prod
```

For a free/local-only workflow, use `npm run supabase:start` and skip production secrets until you are ready to persist signed-in user data or send email alerts from Netlify.

## Premium features

- local and signed-in workspaces
- encrypted backend workspace/import/report/alert storage
- generic CSV import for transaction histories and portfolio position snapshots
- broker detection for Trade Republic, Scalable/Baader, IBKR, Consorsbank, comdirect/Commerzbank, DKB, ING, flatex, finanzen.net zero, smartbroker, S-Broker and maxblue/Deutsche Bank
- backend text-PDF parsing for supported broker confirmations and textual portfolio snapshots
- no-key local OCR fallback for scanned PDFs via PDF.js page rendering and Tesseract, with confidence diagnostics and review warnings
- FIFO lot accounting from imported transactions, with snapshot imports materialized as holdings when no transaction lots are available
- unified portfolio data workspace with broker/account grouping, multi-source import materialization and adapter status
- German detailed tax breakdown
- portfolio positions, targets, scenario comparison and deterministic optimizer
- CSV/JSON/HTML audit reports
- local and scheduled alert evaluation
