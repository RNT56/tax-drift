# TaxSwitch — Investment Tax & Rebalance Calculator

A mobile-first, dependency-free web app for evaluating taxable sell/rebuy and stock-switch decisions.

The app starts with blank position fields and can be used for any stock, ETF, index or instrument manually. It also includes optional Netlify Functions for symbol search and latest-price lookup using Twelve Data.

## What is included

- Mobile-first calculator UI
- Blank generic inputs with example placeholders only
- German tax preset at `26.375%`
- Locale-friendly numeric parsing: `163,26` and `163.26` both work
- Dynamic calculation currency field
- Optional stock / ETF / index search
- Optional latest price fill through Netlify Functions
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

### Environment variable for live market data

The app works without an API key, but live symbol search and latest price lookup need a Twelve Data key.

Set this in Netlify:

```text
TWELVE_DATA_API_KEY=your_key_here
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
site.webmanifest
netlify.toml
package.json
netlify/functions/search-symbols.js
netlify/functions/get-price.js
netlify/lib/fallback-symbols.js
```

## API flow

The browser never calls Twelve Data directly.

```text
Browser
  → /.netlify/functions/search-symbols?q=apple
  → Netlify Function
  → Twelve Data /symbol_search
```

For prices:

```text
Browser
  → /.netlify/functions/get-price?symbol=AAPL&exchange=NASDAQ&currency=USD
  → Netlify Function
  → Twelve Data /price
```

If `TWELVE_DATA_API_KEY` is missing, `search-symbols` falls back to the local symbol list and `get-price` returns a clear configuration message.

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

The calculator does not model:

- church tax
- saver’s allowance
- ETF partial exemptions
- loss carry-forward
- broker-specific tax handling
- foreign exchange conversion
- currency conversion dates
- multi-lot FIFO cost basis

## Notes for future upgrades

Good next additions:

- multi-lot / FIFO mode
- optional unused German saver’s allowance
- ETF partial-exemption mode
- portfolio target weights
- CSV import from broker exports
- saved scenarios with shareable URLs
