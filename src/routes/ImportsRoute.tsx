import { ChangeEvent, useEffect, useState } from "react";
import { CheckCircle2, FileSearch, UploadCloud } from "lucide-react";
import { StatusPill } from "../components/StatusPill";
import { listImportRuns, parseImportFile, saveImportReconciliation, type ImportPreview, type ImportRunSummary } from "../domain/api";
import type { RouteProps } from "../App";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.readAsDataURL(file);
  });
}

function previewItems(preview: ImportPreview): Array<Record<string, unknown>> {
  return [
    ...preview.transactions.map((item) => ({
      itemType: "transaction",
      status: Array.isArray(item.errors) && item.errors.length ? "needs_review" : "ready",
      externalId: item.id,
      symbol: item.symbol,
      isin: item.isin,
      confidence: preview.confidence || 0.5,
      issueCodes: Array.isArray(item.errors) && item.errors.length ? ["low_confidence"] : [],
      payload: item
    })),
    ...preview.positions.map((item) => ({
      itemType: "holding",
      status: Array.isArray(item.errors) && item.errors.length ? "needs_review" : "ready",
      externalId: item.id,
      symbol: item.symbol,
      isin: item.isin,
      confidence: preview.confidence || 0.5,
      issueCodes: Array.isArray(item.errors) && item.errors.length ? ["low_confidence"] : [],
      payload: item
    }))
  ];
}

export default function ImportsRoute({ snapshot, accessToken, onWorkspaceRefresh }: RouteProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [filename, setFilename] = useState("");
  const [status, setStatus] = useState("");
  const [runs, setRuns] = useState<ImportRunSummary[]>([]);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const importIssues = snapshot.dataQualityIssues.filter((issue) =>
    ["missing_basis", "duplicate_import", "low_confidence"].includes(issue.code)
  );
  const canSave = Boolean(preview && previewItems(preview).length && accessToken);

  async function refreshRuns() {
    if (!accessToken) {
      setRuns([]);
      return;
    }
    try {
      setRuns(await listImportRuns(accessToken));
    } catch {
      setRuns([]);
    }
  }

  useEffect(() => {
    void refreshRuns();
  }, [accessToken]);

  async function parseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setStatus("");
    setPreview(null);
    setFilename(file.name);
    if (!accessToken) {
      setError("Sign in to parse and save broker imports.");
      return;
    }
    setIsParsing(true);
    try {
      const contentBase64 = await readFileAsBase64(file);
      const nextPreview = await parseImportFile({
        fileName: file.name,
        contentType: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "text/csv"),
        contentBase64,
        currency: snapshot.baseCurrency
      }, accessToken);
      setPreview(nextPreview);
      setStatus(`Parsed ${nextPreview.rowCount || 0} rows from ${nextPreview.detectedBroker || "generic import"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import parsing failed.");
    } finally {
      setIsParsing(false);
    }
  }

  async function savePreview() {
    if (!preview) return;
    setError("");
    setStatus("");
    setIsSaving(true);
    try {
      await saveImportReconciliation({
        source: preview.detectedBroker || "import",
        filename,
        confidence: preview.confidence,
        items: previewItems(preview)
      }, accessToken);
      setStatus("Import reconciliation saved.");
      await refreshRuns();
      await onWorkspaceRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import reconciliation was not saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-band compact">
        <div>
          <p className="eyebrow">Data ingestion</p>
          <h2>Import broker CSV or PDF files into review</h2>
          <p>Files are parsed into a reconciliation queue first. Ambiguous rows stay marked for review instead of silently changing portfolio data.</p>
        </div>
        <label className="button-link file-button">
          <UploadCloud size={18} aria-hidden="true" />
          {isParsing ? "Parsing" : "Choose file"}
          <input type="file" accept=".csv,.pdf,text/csv,application/pdf" onChange={parseFile} disabled={isParsing || !accessToken} />
        </label>
      </section>

      {!accessToken ? <div className="notice-bar">Sign in to parse files and save import reconciliation runs.</div> : null}
      {error ? <div className="notice-bar danger-notice">{error}</div> : null}
      {status ? <div className="notice-bar success-notice">{status}</div> : null}

      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Current reconciliation queue</p>
              <h3>Inputs requiring review</h3>
            </div>
            <FileSearch size={20} aria-hidden="true" />
          </div>
          <div className="issue-list">
            {importIssues.length ? importIssues.map((issue) => (
              <article className={`issue-row ${issue.severity}`} key={issue.id}>
                <div>
                  <h4>{issue.title}</h4>
                  <p>{issue.detail}</p>
                </div>
                <StatusPill label={issue.severity} tone={issue.severity === "critical" ? "danger" : "warning"} />
              </article>
            )) : <p className="empty-copy">No import issues are open in the loaded workspace.</p>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Saved reconciliation runs</p>
              <h3>{runs.length} import runs</h3>
            </div>
          </div>
          <div className="asset-result-list">
            {runs.length ? runs.map((run) => (
              <article className="asset-result static-row" key={run.id}>
                <strong>{run.filename || run.source || run.id}</strong>
                <span>{run.status || "unknown"} | {Math.round(Number(run.confidence || 0) * 100)}% confidence</span>
                <small>
                  {run.summary?.total || 0} rows | {run.summary?.holdings || 0} holdings | {run.summary?.transactions || 0} transactions | {run.summary?.needsReview || 0} needs review
                </small>
              </article>
            )) : <p className="empty-copy">No saved import runs yet.</p>}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Parsed file</p>
            <h3>{filename || "No file selected"}</h3>
          </div>
          <CheckCircle2 size={20} aria-hidden="true" />
        </div>
        {preview ? (
          <>
            <div className="constraint-grid import-summary-grid">
              <div><span>Broker</span><strong>{preview.detectedBroker || "Unknown"}</strong></div>
              <div><span>Rows</span><strong>{preview.rowCount || 0}</strong></div>
              <div><span>Transactions</span><strong>{preview.transactions.length}</strong></div>
              <div><span>Holdings</span><strong>{preview.positions.length}</strong></div>
              <div><span>Confidence</span><strong>{Math.round((preview.confidence || 0) * 100)}%</strong></div>
            </div>
            {preview.mappingRequired ? (
              <div className="notice-bar">Mapping review needed: {(preview.requiredFieldsMissing || []).join(", ") || "parser confidence is low"}.</div>
            ) : null}
            {(preview.errors || []).length ? <div className="notice-bar danger-notice">{preview.errors?.join(" ")}</div> : null}
            {(preview.warnings || []).length ? <p className="empty-copy">{preview.warnings?.join(" ")}</p> : null}
            <div className="table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Symbol</th><th>Name/date</th><th>Quantity</th><th>Status</th></tr></thead>
                <tbody>
                  {previewItems(preview).slice(0, 25).map((item, index) => {
                    const payload = item.payload as Record<string, unknown>;
                    return (
                      <tr key={`${item.externalId || index}`}>
                        <td>{String(item.itemType)}</td>
                        <td>{String(item.symbol || item.isin || "")}</td>
                        <td>{String(payload.name || payload.tradeDate || payload.snapshotDate || "")}</td>
                        <td>{String(payload.quantity || payload.shares || "")}</td>
                        <td>{String(item.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="button-row">
              <button type="button" onClick={savePreview} disabled={!canSave || isSaving}>
                {isSaving ? "Saving" : "Save reconciliation"}
              </button>
            </div>
          </>
        ) : (
          <p className="empty-copy">Choose a broker CSV or PDF to inspect parsed rows before saving.</p>
        )}
      </section>
    </div>
  );
}
