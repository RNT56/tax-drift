import type { ReactNode } from "react";

interface MetricTileProps {
  label: string;
  value: ReactNode;
  tone?: "default" | "positive" | "warning" | "danger";
  helper?: ReactNode;
}

export function MetricTile({ label, value, tone = "default", helper }: MetricTileProps) {
  return (
    <section className={`metric-tile ${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </section>
  );
}
