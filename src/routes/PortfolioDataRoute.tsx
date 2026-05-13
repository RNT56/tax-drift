import { FormEvent, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { CustomSelect } from "../components/CustomSelect";
import { deleteManualPortfolioItem, upsertManualPortfolio } from "../domain/api";
import { formatMoney } from "../domain/money";
import type { RouteProps } from "../App";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PortfolioDataRoute({ snapshot, accessToken, onWorkspaceRefresh }: RouteProps) {
  const accountOptions = [
    { value: "", label: "Default manual account" },
    ...snapshot.accounts.map((account) => ({ value: account.id, label: account.name, description: account.provider || account.currency }))
  ];
  const [holding, setHolding] = useState({
    accountId: snapshot.accounts[0]?.id || "",
    symbol: "",
    name: "",
    instrumentType: "stock",
    quantity: "",
    price: "",
    costBasis: "",
    currency: snapshot.baseCurrency,
    acquiredAt: today(),
    exposureTags: ""
  });
  const [cash, setCash] = useState({
    accountId: snapshot.accounts[0]?.id || "",
    amount: "",
    currency: snapshot.baseCurrency
  });
  const [target, setTarget] = useState({
    label: "",
    symbol: "",
    exposureTag: "",
    targetWeightPct: ""
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function runMutation(label: string, mutation: () => Promise<void>) {
    setError("");
    setStatus("");
    setIsSaving(true);
    try {
      await mutation();
      await onWorkspaceRefresh();
      setStatus(`${label} saved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `${label} failed.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveHolding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(holding.quantity);
    const costBasis = Number(holding.costBasis);
    await runMutation("Holding", async () => {
      await upsertManualPortfolio({
        action: "upsertHolding",
        ...holding,
        quantity,
        price: Number(holding.price),
        costBasis,
        taxLots: quantity > 0 && costBasis > 0 ? [{
          acquiredAt: holding.acquiredAt,
          quantity,
          unitCost: { amount: costBasis / quantity, currency: holding.currency },
          costBasis: { amount: costBasis, currency: holding.currency },
          lossPot: holding.instrumentType === "stock" ? "equity" : "other",
          partialExemptionPct: holding.instrumentType === "etf" ? 30 : undefined,
          source: "manual"
        }] : []
      }, accessToken);
    });
  }

  async function saveCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runMutation("Cash balance", async () => {
      await upsertManualPortfolio({
        action: "upsertCash",
        ...cash,
        amount: Number(cash.amount)
      }, accessToken);
    });
  }

  async function saveTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runMutation("Target allocation", async () => {
      await upsertManualPortfolio({
        action: "upsertTarget",
        ...target,
        targetWeightPct: Number(target.targetWeightPct)
      }, accessToken);
    });
  }

  async function deleteHolding(id: string) {
    if (!window.confirm("Delete this holding and its tax lots?")) return;
    await runMutation("Holding delete", async () => {
      await deleteManualPortfolioItem("holding", id, accessToken);
    });
  }

  async function deleteTarget(id: string) {
    await runMutation("Target delete", async () => {
      await deleteManualPortfolioItem("target", id, accessToken);
    });
  }

  return (
    <div className="page-grid">
      <section className="hero-band compact">
        <div>
          <p className="eyebrow">Portfolio data management</p>
          <h2>Add and maintain accounts, holdings, cash, targets, and FIFO basis</h2>
          <p>Manual entries use the same portfolio snapshot and action-plan pipeline as broker and import data.</p>
        </div>
      </section>

      {!accessToken ? <div className="notice-bar">Sign in to persist manual portfolio edits. Demo data remains read-only.</div> : null}
      {error ? <div className="notice-bar danger-notice">{error}</div> : null}
      {status ? <div className="notice-bar success-notice">{status}</div> : null}

      <section className="two-column">
        <form className="panel research-form" onSubmit={saveHolding}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Manual holding</p>
              <h3>Position and FIFO basis</h3>
            </div>
            <Save size={20} aria-hidden="true" />
          </div>
          <div className="field-grid two">
            <CustomSelect label="Account" value={holding.accountId} onChange={(value) => setHolding((current) => ({ ...current, accountId: value }))} options={accountOptions} />
            <label><span>Symbol</span><input value={holding.symbol} onChange={(event) => setHolding((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))} required /></label>
            <label><span>Name</span><input value={holding.name} onChange={(event) => setHolding((current) => ({ ...current, name: event.target.value }))} /></label>
            <CustomSelect
              label="Type"
              value={holding.instrumentType}
              onChange={(value) => setHolding((current) => ({ ...current, instrumentType: value }))}
              options={[
                { value: "stock", label: "Stock", description: "Equity loss pot" },
                { value: "etf", label: "ETF", description: "Partial exemption aware" },
                { value: "fund", label: "Fund" },
                { value: "bond", label: "Bond" },
                { value: "crypto", label: "Crypto" }
              ]}
            />
            <label><span>Quantity</span><input value={holding.quantity} onChange={(event) => setHolding((current) => ({ ...current, quantity: event.target.value }))} inputMode="decimal" required /></label>
            <label><span>Current price</span><input value={holding.price} onChange={(event) => setHolding((current) => ({ ...current, price: event.target.value }))} inputMode="decimal" required /></label>
            <label><span>Total cost basis</span><input value={holding.costBasis} onChange={(event) => setHolding((current) => ({ ...current, costBasis: event.target.value }))} inputMode="decimal" required /></label>
            <label><span>Acquired at</span><input type="date" value={holding.acquiredAt} onChange={(event) => setHolding((current) => ({ ...current, acquiredAt: event.target.value }))} /></label>
            <label><span>Currency</span><input value={holding.currency} onChange={(event) => setHolding((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} /></label>
            <label><span>Exposure tags</span><input value={holding.exposureTags} onChange={(event) => setHolding((current) => ({ ...current, exposureTags: event.target.value }))} placeholder="Germany, Quality, Tech" /></label>
          </div>
          <div className="button-row">
            <button type="submit" disabled={!accessToken || isSaving}>Save holding</button>
          </div>
        </form>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Loaded holdings</p>
              <h3>{snapshot.positions.length} positions</h3>
            </div>
          </div>
          <div className="asset-result-list">
            {snapshot.positions.map((item) => (
              <article className="asset-result static-row" key={item.position.id}>
                <strong>{item.position.symbol}</strong>
                <span>{item.position.name} | {formatMoney(item.marketValue)}</span>
                <small>{item.position.taxLots.length} lots | basis {formatMoney(item.position.costBasis)}</small>
                <button type="button" onClick={() => deleteHolding(item.position.id)} disabled={!accessToken || isSaving} aria-label={`Delete ${item.position.symbol}`}>
                  <Trash2 size={16} aria-hidden="true" /> Delete
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="two-column">
        <form className="panel research-form" onSubmit={saveCash}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Cash</p>
              <h3>Manual cash balance</h3>
            </div>
          </div>
          <div className="field-grid two">
            <CustomSelect label="Account" value={cash.accountId} onChange={(value) => setCash((current) => ({ ...current, accountId: value }))} options={accountOptions} />
            <label><span>Amount</span><input value={cash.amount} onChange={(event) => setCash((current) => ({ ...current, amount: event.target.value }))} inputMode="decimal" required /></label>
            <label><span>Currency</span><input value={cash.currency} onChange={(event) => setCash((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} /></label>
          </div>
          <div className="button-row"><button type="submit" disabled={!accessToken || isSaving}>Save cash</button></div>
          <p className="empty-copy">Current cash: {formatMoney(snapshot.cashValue)}</p>
        </form>

        <form className="panel research-form" onSubmit={saveTarget}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Targets</p>
              <h3>Allocation target</h3>
            </div>
          </div>
          <div className="field-grid two">
            <label><span>Label</span><input value={target.label} onChange={(event) => setTarget((current) => ({ ...current, label: event.target.value }))} required /></label>
            <label><span>Symbol</span><input value={target.symbol} onChange={(event) => setTarget((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))} /></label>
            <label><span>Exposure tag</span><input value={target.exposureTag} onChange={(event) => setTarget((current) => ({ ...current, exposureTag: event.target.value }))} /></label>
            <label><span>Target weight %</span><input value={target.targetWeightPct} onChange={(event) => setTarget((current) => ({ ...current, targetWeightPct: event.target.value }))} inputMode="decimal" required /></label>
          </div>
          <div className="button-row"><button type="submit" disabled={!accessToken || isSaving}>Save target</button></div>
          <div className="target-list">
            {snapshot.targets.map((item) => (
              <div className="target-row" key={item.id}>
                <span>{item.label}</span>
                <strong>{item.targetWeightPct.toFixed(1)}%</strong>
                <small>{item.symbol || item.exposureTag || "portfolio"}</small>
                <button type="button" onClick={() => deleteTarget(item.id)} disabled={!accessToken || isSaving}>Delete</button>
              </div>
            ))}
            <p className="empty-copy">Total target weight: {snapshot.targets.reduce((sum, item) => sum + item.targetWeightPct, 0).toFixed(1)}%</p>
          </div>
        </form>
      </section>
    </div>
  );
}
