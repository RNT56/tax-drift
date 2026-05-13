import { FormEvent, useMemo, useState } from "react";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { StatusPill } from "../components/StatusPill";
import { generateConstrainedActionPlan } from "../domain/api";
import { generateActionPlan } from "../domain/action-planner";
import { formatMoney, formatPct, minorToNumber, money } from "../domain/money";
import type { ActionPlan, ActionPlanConstraints } from "../domain/types";
import type { RouteProps } from "../App";

function editableConstraints(actionPlan: ActionPlan) {
  return {
    maxTaxCost: String(minorToNumber(actionPlan.constraints.maxTaxCost)),
    maxTurnoverPct: String(actionPlan.constraints.maxTurnoverPct),
    minTradeValue: String(minorToNumber(actionPlan.constraints.minTradeValue)),
    cashReserve: String(minorToNumber(actionPlan.constraints.cashReserve)),
    taxableAccountsOnly: actionPlan.constraints.taxableAccountsOnly
  };
}

export default function ActionPlannerRoute({ snapshot, actionPlan, accessToken }: RouteProps) {
  const [form, setForm] = useState(() => editableConstraints(actionPlan));
  const [serverPlan, setServerPlan] = useState<ActionPlan | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const constraints: ActionPlanConstraints = useMemo(() => ({
    maxTaxCost: money(snapshot.baseCurrency, Number(form.maxTaxCost) || 0),
    maxTurnoverPct: Number(form.maxTurnoverPct) || 0,
    minTradeValue: money(snapshot.baseCurrency, Number(form.minTradeValue) || 0),
    cashReserve: money(snapshot.baseCurrency, Number(form.cashReserve) || 0),
    taxableAccountsOnly: form.taxableAccountsOnly
  }), [form, snapshot.baseCurrency]);
  const localPlan = useMemo(() => generateActionPlan(snapshot, constraints), [snapshot, constraints]);
  const visiblePlan = serverPlan || localPlan;

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSaving(true);
    try {
      const nextPlan = await generateConstrainedActionPlan(constraints, accessToken);
      setServerPlan(nextPlan);
      setStatus(accessToken ? "Constrained action plan generated and saved." : "Demo constrained action plan generated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate constrained action plan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <form className="panel research-form" onSubmit={savePlan}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Optimizer constraints</p>
            <h3>Decision support, no trade execution</h3>
          </div>
          <SlidersHorizontal size={20} aria-hidden="true" />
        </div>
        {error ? <div className="notice-bar danger-notice">{error}</div> : null}
        {status ? <div className="notice-bar success-notice">{status}</div> : null}
        <div className="field-grid">
          <label>
            <span>Max tax cost</span>
            <input value={form.maxTaxCost} onChange={(event) => setForm((current) => ({ ...current, maxTaxCost: event.target.value }))} inputMode="decimal" />
          </label>
          <label>
            <span>Max turnover %</span>
            <input value={form.maxTurnoverPct} onChange={(event) => setForm((current) => ({ ...current, maxTurnoverPct: event.target.value }))} inputMode="decimal" />
          </label>
          <label>
            <span>Min trade</span>
            <input value={form.minTradeValue} onChange={(event) => setForm((current) => ({ ...current, minTradeValue: event.target.value }))} inputMode="decimal" />
          </label>
          <label>
            <span>Cash reserve</span>
            <input value={form.cashReserve} onChange={(event) => setForm((current) => ({ ...current, cashReserve: event.target.value }))} inputMode="decimal" />
          </label>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.taxableAccountsOnly} onChange={(event) => setForm((current) => ({ ...current, taxableAccountsOnly: event.target.checked }))} />
          Taxable accounts only
        </label>
        <div className="button-row">
          <button type="submit" disabled={isSaving}>
            <RefreshCw size={16} aria-hidden="true" />
            {isSaving ? "Generating" : "Generate constrained plan"}
          </button>
        </div>
      </form>

      <section className="metric-grid">
        <div className="metric-tile">
          <p>Before drift</p>
          <strong>{visiblePlan.summary.beforeDriftScore.toFixed(1)} pp</strong>
        </div>
        <div className="metric-tile positive">
          <p>After drift</p>
          <strong>{visiblePlan.summary.afterDriftScore.toFixed(1)} pp</strong>
        </div>
        <div className="metric-tile warning">
          <p>Expected turnover</p>
          <strong>{formatMoney(visiblePlan.summary.expectedTurnover)}</strong>
        </div>
        <div className="metric-tile">
          <p>Blocked actions</p>
          <strong>{visiblePlan.summary.blockedActionCount}</strong>
        </div>
        <div className="metric-tile">
          <p>Max tax</p>
          <strong>{formatMoney(visiblePlan.constraints.maxTaxCost)}</strong>
        </div>
        <div className="metric-tile">
          <p>Min trade</p>
          <strong>{formatMoney(visiblePlan.constraints.minTradeValue)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="action-stack expanded">
          {visiblePlan.actions.map((action) => (
            <article className="action-row" key={action.id}>
              <span className="rank">#{action.rank}</span>
              <div>
                <h4>{action.title}</h4>
                <p>{action.reason}</p>
                <small>
                  Tax {formatMoney(action.impact.estimatedTaxCost)} | Turnover {formatMoney(action.impact.turnover)}
                  {" "}| Drift -{action.impact.driftReductionPct.toFixed(1)} pp | Confidence {formatPct(action.confidence * 100)}
                </small>
                {action.requiredInputs.length ? (
                  <div className="input-chip-row">
                    {action.requiredInputs.map((input) => <span key={input}>{input}</span>)}
                  </div>
                ) : null}
              </div>
              <StatusPill
                label={action.userDecision}
                tone={action.userDecision === "blocked" ? "danger" : action.userDecision === "ready" ? "ok" : "warning"}
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
