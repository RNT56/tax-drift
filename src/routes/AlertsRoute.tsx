import { BellRing } from "lucide-react";
import type { RouteProps } from "../App";

const alertTypes = [
  "Price move",
  "Drift breach",
  "Stale data",
  "Tax-loss opportunity",
  "Target breach",
  "Concentration",
  "Sync failure",
  "Action-plan change"
];

export default function AlertsRoute({ snapshot }: RouteProps) {
  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Local and scheduled alerts</p>
            <h3>Signals available for backend scheduling</h3>
          </div>
          <BellRing size={20} aria-hidden="true" />
        </div>
        <div className="alert-grid">
          {alertTypes.map((type, index) => (
            <article key={type}>
              <strong>{type}</strong>
              <span>{index < snapshot.openIssueCount ? "Active signal" : "Ready to configure"}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
