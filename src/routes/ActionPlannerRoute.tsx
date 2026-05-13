import { SlidersHorizontal } from "lucide-react";
import { StatusPill } from "../components/StatusPill";
import { formatMoney, formatPct } from "../domain/money";
import type { RouteProps } from "../App";

export default function ActionPlannerRoute({ actionPlan }: RouteProps) {
  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Optimizer constraints</p>
            <h3>Decision support, no trade execution</h3>
          </div>
          <SlidersHorizontal size={20} aria-hidden="true" />
        </div>
        <div className="constraint-grid">
          <div><span>Max tax</span><strong>{formatMoney(actionPlan.constraints.maxTaxCost)}</strong></div>
          <div><span>Max turnover</span><strong>{actionPlan.constraints.maxTurnoverPct}%</strong></div>
          <div><span>Min trade</span><strong>{formatMoney(actionPlan.constraints.minTradeValue)}</strong></div>
          <div><span>Cash reserve</span><strong>{formatMoney(actionPlan.constraints.cashReserve)}</strong></div>
          <div><span>Scope</span><strong>{actionPlan.constraints.taxableAccountsOnly ? "Taxable only" : "All accounts"}</strong></div>
        </div>
      </section>

      <section className="metric-grid">
        <div className="metric-tile">
          <p>Before drift</p>
          <strong>{actionPlan.summary.beforeDriftScore.toFixed(1)} pp</strong>
        </div>
        <div className="metric-tile positive">
          <p>After drift</p>
          <strong>{actionPlan.summary.afterDriftScore.toFixed(1)} pp</strong>
        </div>
        <div className="metric-tile warning">
          <p>Expected turnover</p>
          <strong>{formatMoney(actionPlan.summary.expectedTurnover)}</strong>
        </div>
        <div className="metric-tile">
          <p>Blocked actions</p>
          <strong>{actionPlan.summary.blockedActionCount}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="action-stack expanded">
          {actionPlan.actions.map((action) => (
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
