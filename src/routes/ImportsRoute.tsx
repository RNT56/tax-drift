import { FileSearch, UploadCloud } from "lucide-react";
import { StatusPill } from "../components/StatusPill";
import type { RouteProps } from "../App";

export default function ImportsRoute({ snapshot }: RouteProps) {
  const importIssues = snapshot.dataQualityIssues.filter((issue) =>
    ["missing_basis", "duplicate_import", "low_confidence"].includes(issue.code)
  );

  return (
    <div className="page-grid">
      <section className="hero-band compact">
        <div>
          <p className="eyebrow">Data ingestion</p>
          <h2>Broker links, CSV/PDF imports, manual holdings</h2>
          <p>New data lands in reconciliation first, with duplicate detection, missing-basis warnings, confidence scoring, and source provenance.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Upload import file">
          <UploadCloud size={22} aria-hidden="true" />
        </button>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Reconciliation queue</p>
              <h3>Inputs requiring review</h3>
            </div>
            <FileSearch size={20} aria-hidden="true" />
          </div>
          <div className="issue-list">
            {importIssues.map((issue) => (
              <article className={`issue-row ${issue.severity}`} key={issue.id}>
                <div>
                  <h4>{issue.title}</h4>
                  <p>{issue.detail}</p>
                </div>
                <StatusPill label={issue.severity} tone={issue.severity === "critical" ? "danger" : "warning"} />
              </article>
            ))}
          </div>
        </div>
        <div className="panel">
          <p className="eyebrow">Import confidence</p>
          <h3>Source quality by position</h3>
          <div className="confidence-stack">
            {snapshot.positions.map((item) => (
              <div key={item.position.id}>
                <span>{item.position.symbol}</span>
                <meter min="0" max="1" value={item.position.confidence} />
                <strong>{Math.round(item.position.confidence * 100)}%</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
