import { Download, Printer } from "lucide-react";
import { formatMoney } from "../domain/money";
import type { RouteProps } from "../App";

export default function ReportsRoute({ snapshot, actionPlan }: RouteProps) {
  const reports = [
    ["Portfolio snapshot", `${snapshot.positions.length} positions | ${formatMoney(snapshot.totalValue)}`],
    ["Tax-lot audit", `${snapshot.positions.reduce((sum, item) => sum + item.position.taxLots.length, 0)} FIFO lots`],
    ["Action-plan report", `${actionPlan.actions.length} ranked actions`],
    ["Import reconciliation", `${snapshot.openIssueCount} open issues`],
    ["Decision memo", `Generated ${new Date(actionPlan.generatedAt).toLocaleDateString("de-DE")}`]
  ];

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Exports</p>
            <h3>JSON, CSV, printable HTML</h3>
          </div>
          <Printer size={20} aria-hidden="true" />
        </div>
        <div className="report-grid">
          {reports.map(([title, detail]) => (
            <article key={title}>
              <div>
                <strong>{title}</strong>
                <span>{detail}</span>
              </div>
              <button type="button" aria-label={`Export ${title}`}>
                <Download size={17} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
