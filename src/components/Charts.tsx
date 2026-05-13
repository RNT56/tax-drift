import { formatMoney, minorToNumber } from "../domain/money";
import type { HistoryPoint } from "../domain/api";
import type { MoneyAmount } from "../domain/types";

const palette = ["#2f7d4f", "#6f9f43", "#d09b2c", "#5b8aa0", "#8a6a9f", "#bd6b4f", "#4f6f9f", "#9f8b43"];

export function AllocationBars({
  items
}: {
  items: Array<{ label: string; value: MoneyAmount; weightPct: number }>;
}) {
  const visible = items.filter((item) => minorToNumber(item.value) > 0).slice(0, 8);
  if (!visible.length) return <p className="empty-copy">No allocation data is available.</p>;

  return (
    <div className="chart-list" aria-label="Portfolio allocation chart">
      {visible.map((item, index) => (
        <div className="chart-row" key={item.label}>
          <span>{item.label}</span>
          <div className="chart-track" aria-hidden="true">
            <i style={{ width: `${Math.min(100, item.weightPct)}%`, background: palette[index % palette.length] }} />
          </div>
          <strong>{item.weightPct.toFixed(1)}%</strong>
          <small>{formatMoney(item.value)}</small>
        </div>
      ))}
    </div>
  );
}

export function DriftScatter({
  items
}: {
  items: Array<{ label: string; currentWeightPct: number; targetWeightPct: number; driftPct: number }>;
}) {
  if (!items.length) return <p className="empty-copy">No target allocations are configured.</p>;
  const width = 640;
  const height = 220;
  const maxWeight = Math.max(25, ...items.map((item) => Math.max(item.currentWeightPct, item.targetWeightPct))) * 1.1;
  const x = (value: number) => 44 + (Math.max(0, value) / maxWeight) * (width - 88);
  const y = (index: number) => 30 + index * ((height - 60) / Math.max(1, items.length - 1));

  return (
    <svg className="drift-scatter" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Current allocation compared with targets">
      <line x1={44} y1={height - 24} x2={width - 44} y2={height - 24} />
      {items.map((item, index) => (
        <g key={item.label}>
          <text x={8} y={y(index) + 4}>{item.label}</text>
          <line className="target-line" x1={x(item.targetWeightPct)} y1={y(index) - 10} x2={x(item.targetWeightPct)} y2={y(index) + 10} />
          <circle cx={x(item.currentWeightPct)} cy={y(index)} r={6} className={Math.abs(item.driftPct) > 4 ? "danger-point" : "ok-point"} />
          <text x={width - 98} y={y(index) + 4}>{item.driftPct > 0 ? "+" : ""}{item.driftPct.toFixed(1)} pp</text>
        </g>
      ))}
    </svg>
  );
}

export function HistoryLineChart({ points, currency }: { points: HistoryPoint[]; currency: string }) {
  const cleanPoints = points.filter((point) => Number.isFinite(point.close));
  if (cleanPoints.length < 2) return <p className="empty-copy">No history chart is available for this asset.</p>;

  const width = 720;
  const height = 260;
  const values = cleanPoints.map((point) => point.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const x = (index: number) => 34 + (index / Math.max(1, cleanPoints.length - 1)) * (width - 68);
  const y = (value: number) => 24 + ((max - value) / spread) * (height - 58);
  const path = cleanPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point.close).toFixed(1)}`)
    .join(" ");
  const first = cleanPoints[0];
  const last = cleanPoints[cleanPoints.length - 1];

  return (
    <div className="history-chart-wrap">
      <svg className="history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Historical closing price chart">
        <line x1={34} y1={height - 28} x2={width - 34} y2={height - 28} />
        <line x1={34} y1={24} x2={34} y2={height - 28} />
        <path d={path} />
        <circle cx={x(cleanPoints.length - 1)} cy={y(last.close)} r={5} />
        <text x={40} y={20}>{max.toFixed(2)} {currency}</text>
        <text x={40} y={height - 8}>{min.toFixed(2)} {currency}</text>
      </svg>
      <div className="chart-caption">
        <span>{first.date}</span>
        <strong>{last.close.toFixed(2)} {currency}</strong>
        <span>{last.date}</span>
      </div>
    </div>
  );
}
