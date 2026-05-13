import { useMemo, useState } from "react";
import { History, Landmark, ReceiptText } from "lucide-react";
import { StatusPill } from "../components/StatusPill";
import { formatMoney, formatPct, minorToNumber } from "../domain/money";
import type { RouteProps } from "../App";

export default function PositionsRoute({ snapshot, actionPlan }: RouteProps) {
  const [selectedId, setSelectedId] = useState(snapshot.positions[0]?.position.id);
  const selected = useMemo(
    () => snapshot.positions.find((item) => item.position.id === selectedId) ?? snapshot.positions[0],
    [selectedId, snapshot.positions]
  );
  const relatedActions = actionPlan.actions.filter((action) => action.relatedEntityIds.includes(selected?.position.id ?? ""));

  return (
    <div className="positions-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Position ledger</p>
            <h3>Lots, basis, price freshness</h3>
          </div>
          <Landmark size={20} aria-hidden="true" />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Value</th>
                <th>P/L</th>
                <th>Weight</th>
                <th>Drift</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.positions.map((item) => (
                <tr
                  key={item.position.id}
                  className={item.position.id === selected?.position.id ? "selected" : ""}
                  onClick={() => setSelectedId(item.position.id)}
                >
                  <td>
                    <strong>{item.position.symbol}</strong>
                    <small>{item.position.name}</small>
                  </td>
                  <td>{formatMoney(item.marketValue)}</td>
                  <td className={minorToNumber(item.unrealizedGain) >= 0 ? "positive-text" : "danger-text"}>
                    {formatMoney(item.unrealizedGain)}
                  </td>
                  <td>{item.currentWeightPct.toFixed(1)}%</td>
                  <td>{item.driftPct > 0 ? "+" : ""}{item.driftPct.toFixed(1)} pp</td>
                  <td>
                    <StatusPill
                      label={item.dataQualityIssues.length ? `${item.dataQualityIssues.length} issue` : "clean"}
                      tone={item.dataQualityIssues.some((issue) => issue.severity === "critical") ? "danger" : item.dataQualityIssues.length ? "warning" : "ok"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <aside className="detail-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{selected.position.source} source</p>
              <h3>{selected.position.symbol}</h3>
            </div>
            <ReceiptText size={20} aria-hidden="true" />
          </div>
          <dl className="detail-list">
            <div>
              <dt>Market value</dt>
              <dd>{formatMoney(selected.marketValue)}</dd>
            </div>
            <div>
              <dt>Cost basis</dt>
              <dd>{formatMoney(selected.position.costBasis)}</dd>
            </div>
            <div>
              <dt>Estimated sale tax</dt>
              <dd>{formatMoney(selected.estimatedSaleTax)}</dd>
            </div>
            <div>
              <dt>Unrealized P/L</dt>
              <dd>{formatMoney(selected.unrealizedGain)} | {formatPct(selected.unrealizedGainPct)}</dd>
            </div>
            <div>
              <dt>Price as of</dt>
              <dd>{new Date(selected.position.priceAsOf).toLocaleString("de-DE")}</dd>
            </div>
            <div>
              <dt>Exposure</dt>
              <dd>{selected.position.exposureTags.join(", ")}</dd>
            </div>
          </dl>
          <h4 className="section-label">FIFO lots</h4>
          <div className="lot-stack">
            {selected.position.taxLots.length ? selected.position.taxLots.map((lot) => (
              <article key={lot.id} className="lot-row">
                <History size={16} aria-hidden="true" />
                <div>
                  <strong>{lot.quantity} units | {lot.acquiredAt}</strong>
                  <small>{formatMoney(lot.costBasis)} | source {lot.source} | FIFO #{lot.fifoRank}</small>
                </div>
              </article>
            )) : <p className="empty-copy">No lots recorded. Set basis before tax-sensitive actions.</p>}
          </div>
          <h4 className="section-label">Related actions</h4>
          {relatedActions.length ? relatedActions.map((action) => (
            <article className="mini-action" key={action.id}>
              <strong>{action.title}</strong>
              <small>{action.reason}</small>
            </article>
          )) : <p className="empty-copy">No ranked action targets this position.</p>}
        </aside>
      ) : null}
    </div>
  );
}
