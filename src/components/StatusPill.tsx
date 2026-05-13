interface StatusPillProps {
  label: string;
  tone?: "neutral" | "ok" | "warning" | "danger";
}

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}
