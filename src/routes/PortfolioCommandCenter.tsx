import { AlertTriangle, ArrowRight, BadgeEuro, ShieldCheck } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { StatusPill } from "../components/StatusPill";
import { formatMoney, formatPct, minorToNumber } from "../domain/money";
import type { RouteProps } from "../App";

export default function PortfolioCommandCenter({ snapshot, actionPlan }: RouteProps) {
  const topActions = actionPlan.actions.slice(0, 4);
  const criticalIssues = snapshot.dataQualityIssues.filter((issue) => issue.severity === "critical");

  return (
    <div className="page-grid">
      <section className="hero-band">
        <div>
          <p className="eyebrow">Read-only broker data, tax-aware decisions</p>
          <h2>{formatMoney(snapshot.totalValue)}</h2>
          <p>
            Cash {formatMoney(snapshot.cashValue)}. Unrealized P/L {formatMoney(snapshot.unrealizedGain)}
            {" "}({formatPct(snapshot.unrealizedGainPct)}). Estimated liquidation tax{" "}
            {formatMoney(snapshot.estimatedLiquidationTax)}.
          </p>
        </div>
        <div className="hero-status">
          <StatusPill label={criticalIssues.length ? "Decision blocked" : "Decision ready"} tone={criticalIssues.length ? "danger" : "ok"} />
          <span>Drift {snapshot.allocationDriftScore.toFixed(1)} pp</span>
          <span>Concentration {snapshot.concentrationScore.toFixed(1)} pp</span>
        </div>
      </section>

      <section className="metric-grid" aria-label="Portfolio overview metrics">
        <MetricTile label="Invested" value={formatMoney(snapshot.investedValue)} helper={`${snapshot.positions.length} positions`} />
        <MetricTile label="Cash" value={formatMoney(snapshot.cashValue)} tone={minorToNumber(snapshot.cashValue) > 15000 ? "warning" : "default"} helper="Across linked accounts" />
        <MetricTile label="Unrealized P/L" value={formatMoney(snapshot.unrealizedGain)} tone={minorToNumber(snapshot.unrealizedGain) >= 0 ? "positive" : "danger"} helper={formatPct(snapshot.unrealizedGainPct)} />
        <MetricTile label="Liquidation tax" value={formatMoney(snapshot.estimatedLiquidationTax)} tone="warning" helper="German flat-tax estimate" />
        <MetricTile label="Open issues" value={snapshot.openIssueCount} tone={criticalIssues.length ? "danger" : "warning"} helper={`${snapshot.staleDataCount} stale data`} />
        <MetricTile label="Top action" value={`#${topActions[0]?.rank ?? 0}`} helper={topActions[0]?.title ?? "No action"} />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Ranked next actions</p>
              <h3>What needs attention first</h3>
            </div>
            <ArrowRight size={20} aria-hidden="true" />
          </div>
          <div className="action-stack">
            {topActions.map((action) => (
              <article className="action-row" key={action.id}>
                <span className="rank">#{action.rank}</span>
                <div>
                  <h4>{action.title}</h4>
                  <p>{action.reason}</p>
                  <small>
                    Tax {formatMoney(action.impact.estimatedTaxCost)} | Drift -{action.impact.driftReductionPct.toFixed(1)} pp | Confidence{" "}
                    {formatPct(action.confidence * 100)}
                  </small>
                </div>
                <StatusPill
                  label={action.userDecision}
                  tone={action.userDecision === "blocked" ? "danger" : action.userDecision === "ready" ? "ok" : "warning"}
                />
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Data quality</p>
              <h3>Blocking inputs</h3>
            </div>
            <AlertTriangle size={20} aria-hidden="true" />
          </div>
          <div className="issue-list">
            {snapshot.dataQualityIssues.slice(0, 6).map((issue) => (
              <article key={issue.id} className={`issue-row ${issue.severity}`}>
                <BadgeEuro size={18} aria-hidden="true" />
                <div>
                  <h4>{issue.title}</h4>
                  <p>{issue.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Allocation drift</p>
            <h3>Targets vs current weights</h3>
          </div>
          <ShieldCheck size={20} aria-hidden="true" />
        </div>
        <div className="drift-table">
          {snapshot.drift.map((item) => (
            <div className="drift-row" key={item.id}>
              <span>{item.label}</span>
              <div className="drift-bar" aria-hidden="true">
                <i style={{ width: `${Math.min(100, Math.abs(item.driftPct) * 8)}%` }} />
              </div>
              <strong>{item.driftPct > 0 ? "+" : ""}{item.driftPct.toFixed(1)} pp</strong>
              <small>{item.currentWeightPct.toFixed(1)}% / {item.targetWeightPct.toFixed(1)}%</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
