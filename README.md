# TaxSwitch — Investment Tax & Rebalance Calculator

A mobile-first, dependency-free web app for evaluating taxable sell/rebuy, stock-switch and risk-aware trade decisions.

The app starts with blank position fields and can be used for any stock, ETF, index or instrument manually. It also includes optional Netlify Functions for multi-provider symbol search and latest-price lookup.

## What is included

- Mobile-first calculator UI
- Blank generic inputs with example placeholders only
- German tax preset at `26.375%`
- German detailed tax mode with saver allowance, church tax, loss pots, ETF partial exemptions, foreign tax credits, prior taxed Vorabpauschale and FIFO lots
- Locale-friendly numeric parsing: `163,26` and `163.26` both work
- Dynamic calculation currency field
- Optional stock / ETF / index search
- Optional multi-provider latest quote, asset snapshot and history through Netlify Functions
- FX-separated calculations for position currency, tax/base currency, stock return, FX return and combined tax-currency outcome
- Multi-lot support with date, shares, unit cost, fees, currency, buy FX and sale-order assumptions
- Decision Lab for scenario analysis, portfolio risk, assumption quality, tax-loss harvesting, ETF/fund assumptions, evidence memos, watch rules and report output
- Probability-weighted bull/base/bear/recession/rate-cut/no-growth/multiple-compression cases plus seeded Monte Carlo sensitivity
- Workspace schema v2 for decision cases, risk profile, research memos, watch rules, exposure and assumptions
- Local fallback symbol catalog if no API key is configured
- No external browser dependencies, fonts or CDN calls
- Netlify-ready `netlify.toml`
- Security headers and SPA fallback redirect

## Deploy on Netlify

### Recommended: Git deploy

1. Push this folder to a GitHub, GitLab, Bitbucket or Azure DevOps repository.
2. Create a new Netlify site from the repository.
3. Netlify reads `netlify.toml` automatically.
4. The publish directory is the project root: `.`
5. The functions directory is `netlify/functions`.
6. No build command is required.

### API keys and environment variables

The app works without API keys in anonymous/manual mode. Netlify Functions and premium backend features use the variables below when you run `npm run dev` or deploy to Netlify.

| Variable | Required? | Used for | Notes |
| --- | --- | --- | --- |
| `TWELVE_DATA_API_KEY` | Optional | Live symbol search and latest prices | Good first market-data key. Current project already supports it. |
| `FMP_API_KEY` | Optional | Live symbol search, latest prices, FX rates | Preferred for broader quote/FX coverage when available. |
| `EODHD_API_KEY` | Optional | Live symbol search, latest prices, FX rates | Additional fallback provider. |
| `ALPHA_VANTAGE_API_KEY` | Optional | Live symbol search fallback | Useful as another fallback; coverage and rate limits vary. |
| `FRED_API_KEY` | Optional | Macro context in research memos | Research memo still works without it, but FRED evidence is skipped. |
| `AI_RESEARCH_URL` | Optional | AI-compatible research memo enhancement | Receives the evidence memo and must return JSON. Disabled unless configured. |
| `AI_RESEARCH_API_KEY` | Optional | Authorization for `AI_RESEARCH_URL` | Sent as a Bearer token only to the configured endpoint. |
| `DATA_ENCRYPTION_KEY` | Required only for persistent premium backend storage | Encrypting workspace/import/report/alert Blobs | Not needed for local anonymous use. Required before relying on Netlify Blobs for user financial data. Use a long random value. |
| `RESEND_API_KEY` | Optional | Email alerts | Not needed unless `email` alert delivery is enabled. In-app/local alerts work without it. |
| `PREMIUM_API_TOKEN_HASHES` | Optional | Non-Identity API access/testing | Format is `sha256(token):userId`, comma-separated for multiple tokens. Netlify Identity is preferred for real users. |

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

## Local development

The static calculator works by opening `index.html`, but Netlify Functions only work through Netlify Dev or a deployed Netlify site.

```bash
npm run check
netlify dev
```

Then open the local Netlify Dev URL.

## Files

```text
index.html
styles.css
app.js
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
app-decision.js
app-research.js
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

Research memos use deterministic source collection and schema validation. They currently support:

- SEC company tickers, submissions and companyfacts APIs for US-listed company context
- configured FMP profile, ratios and licensed-provider news evidence when `FMP_API_KEY` is available
- optional FRED macro evidence when `FRED_API_KEY` is configured
- ECB SDMX FX context
- optional AI memo enhancement through `AI_RESEARCH_URL`
- local fallback memo content when the backend or source collection is unavailable

Analyst revisions, insider transactions, transcripts, detailed event calendars and full valuation-provider synthesis are not bundled. The app leaves those as optional provider integrations rather than scraping.

## Assumptions

The default German tax preset is `26.375%`, reflecting a common model of 25% capital gains tax plus a 5.5% solidarity surcharge.

Simple flat mode intentionally stays approximate. German detailed mode adds church tax calculated on capital gains tax, saver allowance, ETF partial exemptions, loss pots, foreign tax credits, prior taxed Vorabpauschale and FIFO lots, but TaxSwitch remains a planning tool and not tax advice.

## Current limitations

- Research memos are evidence-backed and optionally AI-enhanced, but still constrained to non-advisory scenario analysis.
- PDF output is print-ready HTML/browser print, not a generated binary PDF file.
- ETF/fund handling covers tax-relevant fields and manual fund assumptions, but not full issuer-document research.
- Portfolio risk uses user-entered or scenario-estimated volatility and correlation; it does not infer a full covariance matrix automatically.
- Tax-loss harvesting reports realized loss, estimated offset value, caveats and selected replacement-candidate context; automated candidate sourcing depends on future provider integrations.

## Netlify premium setup

TaxSwitch runs as a static app with Netlify Functions, Netlify Identity, Netlify Blobs, Scheduled Functions and optional Resend email alerts.

```bash
npm install
npm run check
npm run dev
```

For a live site:

```bash
npx netlify login
npx netlify init
npx netlify env:set DATA_ENCRYPTION_KEY "<32+ character secret>"
npx netlify env:set RESEND_API_KEY "<resend key>"
npx netlify env:set FMP_API_KEY "<market data key>"
npm run deploy:preview
npm run deploy:prod
```

For a free/local-only workflow, skip `DATA_ENCRYPTION_KEY` and `RESEND_API_KEY` until you are ready to persist signed-in user data or send email alerts from Netlify.

Enable Netlify Identity in the site dashboard before testing signed-in workspace sync. Netlify Blobs is used as the database, so no separate DB is required.

## Premium features

- local and signed-in workspaces
- encrypted backend workspace/import/report/alert storage
- generic CSV, Trade Republic, Scalable Capital and IBKR import detection
- backend text-PDF parsing for Trade Republic and Scalable Capital confirmations
- FIFO lot accounting from imported transactions
- German detailed tax breakdown
- portfolio positions, targets, scenario comparison and deterministic optimizer
- CSV/JSON/HTML audit reports
- local and scheduled alert evaluation
