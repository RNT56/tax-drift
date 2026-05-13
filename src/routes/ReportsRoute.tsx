import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { generatePortfolioReport, type PortfolioReport } from "../domain/api";
import { formatMoney } from "../domain/money";
import type { RouteProps } from "../App";

const reports = [
  { type: "portfolio_snapshot", title: "Portfolio snapshot", format: "json" },
  { type: "tax_lot_audit", title: "Tax-lot audit", format: "csv" },
  { type: "action_plan", title: "Action-plan report", format: "json" },
  { type: "import_reconciliation", title: "Import reconciliation", format: "csv" },
  { type: "decision_memo", title: "Decision memo", format: "html" }
] as const;

function reportBlob(report: PortfolioReport): Blob {
  const content = typeof report.content === "string"
    ? report.content
    : JSON.stringify(report.content, null, 2);
  return new Blob([content], { type: report.contentType || "application/octet-stream" });
}

function downloadReport(report: PortfolioReport) {
  const url = URL.createObjectURL(reportBlob(report));
  const link = document.createElement("a");
  link.href = url;
  link.download = report.filename || `${report.type}.${report.format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsRoute({ snapshot, actionPlan, accessToken }: RouteProps) {
  const [busyType, setBusyType] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const details: Record<string, string> = {
    portfolio_snapshot: `${snapshot.positions.length} positions | ${formatMoney(snapshot.totalValue)}`,
    tax_lot_audit: `${snapshot.positions.reduce((sum, item) => sum + item.position.taxLots.length, 0)} FIFO lots`,
    action_plan: `${actionPlan.actions.length} ranked actions`,
    import_reconciliation: `${snapshot.openIssueCount} open issues`,
    decision_memo: `Generated ${new Date(actionPlan.generatedAt).toLocaleDateString("de-DE")}`
  };

  async function exportReport(type: string, format: "json" | "csv" | "html") {
    setError("");
    setStatus("");
    setBusyType(type);
    try {
      const report = await generatePortfolioReport(type, format, accessToken);
      downloadReport(report);
      setStatus(`${report.title} exported as ${report.format.toUpperCase()}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Report export failed.");
    } finally {
      setBusyType(null);
    }
  }

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Exports</p>
            <h3>Portfolio reports generated from the backend</h3>
          </div>
          <Printer size={20} aria-hidden="true" />
        </div>
        {!accessToken ? <div className="notice-bar">Unsigned users receive demo report exports. Sign in to export your persisted portfolio.</div> : null}
        {error ? <div className="notice-bar danger-notice">{error}</div> : null}
        {status ? <div className="notice-bar success-notice">{status}</div> : null}
        <div className="report-grid">
          {reports.map((report) => (
            <article key={report.type}>
              <div>
                <strong>{report.title}</strong>
                <span>{details[report.type]}</span>
              </div>
              <button
                type="button"
                aria-label={`Export ${report.title}`}
                onClick={() => exportReport(report.type, report.format)}
                disabled={busyType === report.type}
              >
                <Download size={17} aria-hidden="true" />
                {busyType === report.type ? "Exporting" : report.format.toUpperCase()}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
