import { Calculator, Scale } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { formatMoney } from "../domain/money";
import type { RouteProps } from "../App";

export default function TaxLabRoute({ snapshot }: RouteProps) {
  const etfPositions = snapshot.positions.filter((item) => item.position.instrumentType === "etf");
  const lossCandidates = snapshot.positions.filter((item) => Number(item.unrealizedGain.minor) < 0);
  const taxLots = snapshot.positions.flatMap((item) => item.position.taxLots.map((lot) => ({
    ...lot,
    symbol: item.position.symbol
  })));

  return (
    <div className="page-grid">
      <section className="hero-band compact">
        <div>
          <p className="eyebrow">Germany tax depth</p>
          <h2>FIFO lots, allowance, loss pots, ETF exemptions</h2>
          <p>German tax assumptions are part of the same portfolio decision engine as positions, market data, action planning, reports, and alerts.</p>
        </div>
      </section>

      <section className="metric-grid">
        <MetricTile label="Liquidation tax" value={formatMoney(snapshot.estimatedLiquidationTax)} tone="warning" />
        <MetricTile label="ETF positions" value={etfPositions.length} helper="30% partial exemption tracked where available" />
        <MetricTile label="Loss candidates" value={lossCandidates.length} tone={lossCandidates.length ? "positive" : "default"} />
        <MetricTile label="Tax lots" value={snapshot.positions.reduce((sum, item) => sum + item.position.taxLots.length, 0)} />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">German fields</p>
              <h3>Audit-ready tax inputs</h3>
            </div>
            <Scale size={20} aria-hidden="true" />
          </div>
          <div className="audit-grid">
            {snapshot.positions.map((item) => (
              <article key={item.position.id}>
                <strong>{item.position.symbol}</strong>
                <span>{item.position.taxLots.length} lots</span>
                <span>{item.position.instrumentType === "etf" ? "ETF partial exemption" : "Equity loss pot"}</span>
                <span>{formatMoney(item.estimatedSaleTax)} sale tax</span>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Tax coverage</p>
              <h3>Lot-level assumptions in use</h3>
            </div>
            <Calculator size={20} aria-hidden="true" />
          </div>
          {taxLots.length ? (
            <div className="audit-grid single-column">
              {taxLots.slice(0, 8).map((lot) => (
                <article key={lot.id}>
                  <strong>{lot.symbol} FIFO #{lot.fifoRank}</strong>
                  <span>Acquired {lot.acquiredAt}</span>
                  <span>{lot.germanTax.lossPot || "none"} loss pot</span>
                  <span>{lot.germanTax.partialExemptionPct ? `${lot.germanTax.partialExemptionPct}% partial exemption` : "No partial exemption"}</span>
                </article>
              ))}
            </div>
          ) : <p className="empty-copy">No tax lots are loaded. Import broker data or add cost basis before tax-sensitive actions.</p>}
        </div>
      </section>
    </div>
  );
}
