import { useMemo, useState } from "react";
import { Calculator, ShieldAlert } from "lucide-react";
import { CustomSelect } from "../components/CustomSelect";
import { MetricTile } from "../components/MetricTile";
import { minorToNumber } from "../domain/money";
import type { RouteProps } from "../App";

const defaultCases = [
  { id: "bear", label: "Bear", probability: 25, holdReturn: -15, switchReturn: -12 },
  { id: "base", label: "Base", probability: 50, holdReturn: 5, switchReturn: 8 },
  { id: "bull", label: "Bull", probability: 25, holdReturn: 18, switchReturn: 24 }
];

function afterTaxGain(value: number, returnPct: number, taxRate: number) {
  const gain = value * returnPct;
  return value + (gain > 0 ? gain * (1 - taxRate) : gain);
}

export default function DecisionLabRoute({ snapshot }: RouteProps) {
  const [positionId, setPositionId] = useState(snapshot.positions[0]?.position.id || "");
  const selected = snapshot.positions.find((item) => item.position.id === positionId) || snapshot.positions[0];
  const [input, setInput] = useState({
    sellPct: "100",
    transactionCost: "0",
    buyPrice: "",
    targetPrice: "",
    oldReturn: "5",
    newReturn: "8",
    maxLoss: "25",
    portfolioVolatility: "15",
    newVolatility: "20",
    correlation: "60"
  });
  const [cases, setCases] = useState(defaultCases);
  const result = useMemo(() => {
    const marketValue = selected ? minorToNumber(selected.marketValue) : 0;
    const costBasis = selected ? minorToNumber(selected.position.costBasis) : 0;
    const sellFraction = Math.max(0, Math.min(1, Number(input.sellPct) / 100 || 0));
    const saleValue = marketValue * sellFraction;
    const soldBasis = costBasis * sellFraction;
    const transactionCost = Number(input.transactionCost) || 0;
    const gain = saleValue - soldBasis - transactionCost;
    const partialExemption = selected?.position.instrumentType === "etf" ? 0.7 : 1;
    const taxRate = 0.26375;
    const taxDue = Math.max(0, gain * partialExemption * taxRate);
    const cashAfterTax = Math.max(0, saleValue - taxDue - transactionCost);
    const sellShares = (selected?.position.quantity || 0) * sellFraction;
    const breakEvenRebuy = sellShares > 0 ? cashAfterTax / sellShares : NaN;
    const oldReturn = Number(input.oldReturn) / 100 || 0;
    const newReturn = Number(input.newReturn) / 100 || 0;
    const buyPrice = Number(input.buyPrice);
    const targetPrice = Number(input.targetPrice);
    const targetReturn = buyPrice > 0 && targetPrice > 0 ? targetPrice / buyPrice - 1 : newReturn;
    const holdFuture = afterTaxGain(saleValue, oldReturn, taxRate);
    const switchFuture = afterTaxGain(cashAfterTax, targetReturn, taxRate);
    const requiredNewReturn = cashAfterTax > 0 ? (holdFuture / cashAfterTax - 1) * 100 : NaN;
    const normalizedProbability = cases.reduce((sum, item) => sum + Math.max(0, Number(item.probability) || 0), 0) || 1;
    const scenarioRows = cases.map((item) => {
      const probability = Math.max(0, Number(item.probability) || 0) / normalizedProbability;
      const holdValue = afterTaxGain(saleValue, Number(item.holdReturn) / 100 || 0, taxRate);
      const switchValue = afterTaxGain(cashAfterTax, Number(item.switchReturn) / 100 || 0, taxRate);
      return {
        ...item,
        probability,
        holdValue,
        switchValue,
        margin: switchValue - holdValue,
        winner: switchValue > holdValue && switchValue > cashAfterTax ? "switch" : holdValue >= cashAfterTax ? "hold" : "cash"
      };
    });
    const expectedHold = scenarioRows.reduce((sum, item) => sum + item.holdValue * item.probability, 0);
    const expectedSwitch = scenarioRows.reduce((sum, item) => sum + item.switchValue * item.probability, 0);
    const maxLoss = Math.abs(Number(input.maxLoss) / 100 || 0.25);
    const currentWeight = marketValue / Math.max(1, minorToNumber(snapshot.totalValue));
    const switchWeight = cashAfterTax / Math.max(1, minorToNumber(snapshot.totalValue));
    const portfolioVol = Number(input.portfolioVolatility) / 100 || 0.15;
    const newVol = Number(input.newVolatility) / 100 || 0.2;
    const rho = Number(input.correlation) / 100 || 0.6;
    const combinedVol = Math.sqrt(Math.max(0, (switchWeight * newVol) ** 2 + ((1 - switchWeight) * portfolioVol) ** 2 + 2 * switchWeight * (1 - switchWeight) * newVol * portfolioVol * rho));
    const riskFlags = [
      currentWeight > 0.22 ? `Concentration is ${(currentWeight * 100).toFixed(1)}% before sale.` : "",
      taxDue / Math.max(1, saleValue) > 0.05 ? `Tax drag is ${(taxDue / Math.max(1, saleValue) * 100).toFixed(1)}% of sale value.` : "",
      scenarioRows.some((item) => item.switchValue < saleValue * (1 - maxLoss)) ? "At least one switch case breaches max-loss tolerance." : "",
      Math.abs((targetReturn * 100) - requiredNewReturn) < 2 ? "Expected return is within 2 pp of the hurdle." : "",
      combinedVol > portfolioVol + 0.02 ? "Correlation-adjusted portfolio volatility rises materially." : ""
    ].filter(Boolean);
    return {
      saleValue,
      taxDue,
      cashAfterTax,
      breakEvenRebuy,
      holdFuture,
      switchFuture,
      switchEdge: switchFuture - holdFuture,
      requiredNewReturn,
      expectedHold,
      expectedSwitch,
      expectedMargin: expectedSwitch - expectedHold,
      scenarioRows,
      combinedVol,
      riskFlags
    };
  }, [cases, input, selected, snapshot.totalValue]);

  return (
    <div className="page-grid">
      <section className="hero-band compact">
        <div>
          <p className="eyebrow">Decision Lab</p>
          <h2>Compare hold, sell, rebuy, switch, and cash outcomes</h2>
          <p>All outputs are scenario math under your assumptions. Nothing here is a buy, sell, or hold recommendation.</p>
        </div>
      </section>

      <section className="two-column">
        <form className="panel research-form">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Inputs</p>
              <h3>Position and switch assumptions</h3>
            </div>
            <Calculator size={20} aria-hidden="true" />
          </div>
          <div className="field-grid two">
            <CustomSelect
              label="Position"
              value={selected?.position.id || ""}
              onChange={setPositionId}
              options={snapshot.positions.map((item) => ({
                value: item.position.id,
                label: item.position.symbol,
                description: item.position.name
              }))}
            />
            <label><span>Sell size %</span><input value={input.sellPct} onChange={(event) => setInput((current) => ({ ...current, sellPct: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Transaction cost</span><input value={input.transactionCost} onChange={(event) => setInput((current) => ({ ...current, transactionCost: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Switch buy price</span><input value={input.buyPrice} onChange={(event) => setInput((current) => ({ ...current, buyPrice: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Switch target price</span><input value={input.targetPrice} onChange={(event) => setInput((current) => ({ ...current, targetPrice: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Hold return %</span><input value={input.oldReturn} onChange={(event) => setInput((current) => ({ ...current, oldReturn: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Switch return %</span><input value={input.newReturn} onChange={(event) => setInput((current) => ({ ...current, newReturn: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Max loss %</span><input value={input.maxLoss} onChange={(event) => setInput((current) => ({ ...current, maxLoss: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Portfolio vol %</span><input value={input.portfolioVolatility} onChange={(event) => setInput((current) => ({ ...current, portfolioVolatility: event.target.value }))} inputMode="decimal" /></label>
            <label><span>New asset vol %</span><input value={input.newVolatility} onChange={(event) => setInput((current) => ({ ...current, newVolatility: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Correlation %</span><input value={input.correlation} onChange={(event) => setInput((current) => ({ ...current, correlation: event.target.value }))} inputMode="decimal" /></label>
          </div>
        </form>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Risk flags</p>
              <h3>What can break the decision</h3>
            </div>
            <ShieldAlert size={20} aria-hidden="true" />
          </div>
          <div className="issue-list">
            {result.riskFlags.length ? result.riskFlags.map((flag) => (
              <article className="issue-row warning" key={flag}><div><h4>{flag}</h4></div></article>
            )) : <p className="empty-copy">No material risk flags under the current assumptions.</p>}
          </div>
        </section>
      </section>

      <section className="metric-grid">
        <MetricTile label="Sale value" value={`${result.saleValue.toFixed(2)} ${snapshot.baseCurrency}`} />
        <MetricTile label="Tax now" value={`${result.taxDue.toFixed(2)} ${snapshot.baseCurrency}`} tone={result.taxDue > 0 ? "warning" : "default"} />
        <MetricTile label="Cash after tax" value={`${result.cashAfterTax.toFixed(2)} ${snapshot.baseCurrency}`} />
        <MetricTile label="Break-even rebuy" value={Number.isFinite(result.breakEvenRebuy) ? `${result.breakEvenRebuy.toFixed(2)} ${snapshot.baseCurrency}` : "n/a"} />
        <MetricTile label="Required new return" value={Number.isFinite(result.requiredNewReturn) ? `${result.requiredNewReturn.toFixed(2)}%` : "n/a"} />
        <MetricTile label="Expected margin" value={`${result.expectedMargin.toFixed(2)} ${snapshot.baseCurrency}`} tone={result.expectedMargin >= 0 ? "positive" : "danger"} />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Scenario analysis</p>
            <h3>Probability-weighted hold vs switch cases</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Case</th><th>Probability</th><th>Hold return</th><th>Switch return</th><th>Hold value</th><th>Switch value</th><th>Winner</th></tr></thead>
            <tbody>
              {cases.map((item, index) => {
                const row = result.scenarioRows[index];
                return (
                  <tr key={item.id}>
                    <td>{item.label}</td>
                    <td><input className="table-input" value={item.probability} onChange={(event) => setCases((current) => current.map((candidate, i) => i === index ? { ...candidate, probability: Number(event.target.value) } : candidate))} inputMode="decimal" /></td>
                    <td><input className="table-input" value={item.holdReturn} onChange={(event) => setCases((current) => current.map((candidate, i) => i === index ? { ...candidate, holdReturn: Number(event.target.value) } : candidate))} inputMode="decimal" /></td>
                    <td><input className="table-input" value={item.switchReturn} onChange={(event) => setCases((current) => current.map((candidate, i) => i === index ? { ...candidate, switchReturn: Number(event.target.value) } : candidate))} inputMode="decimal" /></td>
                    <td>{row.holdValue.toFixed(2)}</td>
                    <td>{row.switchValue.toFixed(2)}</td>
                    <td>{row.winner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
