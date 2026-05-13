import { Calculator, Scale } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { formatMoney } from "../domain/money";
import type { RouteProps } from "../App";

export default function TaxLabRoute({ snapshot }: RouteProps) {
  const etfPositions = snapshot.positions.filter((item) => item.position.instrumentType === "etf");
  const lossCandidates = snapshot.positions.filter((item) => Number(item.unrealizedGain.minor) < 0);

  return (
    <div className="page-grid">
      <section className="hero-band compact">
        <div>
          <p className="eyebrow">Germany tax depth</p>
          <h2>FIFO lots, allowance, loss pots, ETF exemptions</h2>
          <p>TaxSwitch keeps the calculator engine available while portfolio decisions surface the German tax fields that change action rankings.</p>
        </div>
        <a className="button-link" href="/#tax-calculator">Open calculator</a>
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
              <p className="eyebrow">Scenario lab</p>
              <h3>Plan variants to add next</h3>
            </div>
            <Calculator size={20} aria-hidden="true" />
          </div>
          <div className="checklist">
            <span>Max tax budget scenarios</span>
            <span>Loss-pot offset simulation</span>
            <span>Vorabpauschale audit export</span>
            <span>ETF partial exemption sensitivity</span>
            <span>Printable tax-lot decision memo</span>
          </div>
        </div>
      </section>
    </div>
  );
}
