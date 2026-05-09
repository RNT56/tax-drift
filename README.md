# TaxSwitch — Investment Tax & Rebalance Calculator

A mobile-first, dependency-free web app for evaluating taxable sell/rebuy and stock-switch decisions.

The app starts with blank position fields and can be used for any stock, ETF, index or instrument manually. It also includes optional Netlify Functions for multi-provider symbol search and latest-price lookup.

## What is included

- Mobile-first calculator UI
- Blank generic inputs with example placeholders only
- German tax preset at `26.375%`
- Locale-friendly numeric parsing: `163,26` and `163.26` both work
- Dynamic calculation currency field
- Optional stock / ETF / index search
- Optional multi-provider latest price fill through Netlify Functions
- Automatic FX conversion from instrument currency into the calculation currency
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

### Environment variables for live market data

The app works without API keys, but live symbol search and latest price lookup need at least one market data provider key.

Supported providers are tried in this order:

```text
TWELVE_DATA_API_KEY=your_twelve_data_key
FMP_API_KEY=your_financial_modeling_prep_key
EODHD_API_KEY=your_eodhd_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
```

You do not need all keys. Configure more than one key for broader coverage, FX conversion coverage and failover when a provider cannot quote a symbol.

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
netlify/functions/api-status.js
netlify/lib/fallback-symbols.js
netlify/lib/market-data-providers.js
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

Provider names are intentionally not shown in the app UI. Netlify Function logs include provider success/failure events such as `market_data.price.success`, `market_data.price.failure`, `market_data.fx.success` and `market_data.search.success` so provider coverage can be reviewed server-side without exposing sources to users.

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

Core formulas:

```text
current_value = n × S
cost_basis = n × B
taxable_gain = max(current_value − cost_basis, 0)
tax_due = taxable_gain × t
cash_after_sale = max(current_value − tax_due − C, 0)
break_even_rebuy_price = cash_after_sale ÷ n
required_drop = S − break_even_rebuy_price
cash_ratio = cash_after_sale ÷ current_value
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
hold_old_future_value = current_value × (1 + r_old)
```

If future new-stock gains are taxed and `r_new > 0`:

```text
new_stock_future_value = cash_after_sale × (1 + r_new × (1 − t))
```

Otherwise:

```text
new_stock_future_value = cash_after_sale × (1 + r_new)
```

## Currency handling

The calculator assumes all money values use the same displayed currency.

If you select a USD instrument and fetch a USD price, the calculator switches the displayed currency to USD. For a German tax calculation, you still need to make sure your buy price, current price and costs are consistently represented in the same currency or converted appropriately by your broker/accounting workflow.

## Assumptions

The default German tax preset is `26.375%`, reflecting a common model of 25% capital gains tax plus a 5.5% solidarity surcharge.

Simple flat mode intentionally stays approximate. German detailed mode adds church tax, saver allowance, ETF partial exemptions, loss pots, foreign tax credits and FIFO lots, but TaxSwitch remains a planning tool and not tax advice.

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
