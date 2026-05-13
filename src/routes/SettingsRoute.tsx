import { useState } from "react";
import { DatabaseZap, LockKeyhole, Trash2 } from "lucide-react";
import { deletePrivacyData, exportPrivacyData, type PrivacyExport } from "../domain/api";
import type { RouteProps } from "../App";

function downloadJson(filename: string, content: unknown) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function SettingsRoute({ snapshot, accessToken, onWorkspaceRefresh }: RouteProps) {
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function exportData() {
    setError("");
    setStatus("");
    setIsBusy(true);
    try {
      const exported: PrivacyExport = await exportPrivacyData(accessToken);
      downloadJson(`taxswitch-privacy-export-${snapshot.userId}.json`, exported);
      setStatus("Privacy export downloaded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Privacy export failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteData() {
    if (!window.confirm("Delete persisted account data for this signed-in user? This cannot be undone.")) return;
    setError("");
    setStatus("");
    setIsBusy(true);
    try {
      await deletePrivacyData(accessToken);
      setStatus("Persisted account data deleted.");
      await onWorkspaceRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Privacy delete failed.");
    } finally {
      setIsBusy(false);
    }
  }

  function clearLocalState() {
    const keys = Object.keys(localStorage).filter((key) => key.toLowerCase().includes("taxswitch") || key.toLowerCase().includes("tax-drift"));
    keys.forEach((key) => localStorage.removeItem(key));
    setStatus(keys.length ? `Cleared ${keys.length} local TaxSwitch entries.` : "No local TaxSwitch entries were stored.");
  }

  return (
    <div className="page-grid">
      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Privacy and GDPR</p>
              <h3>Account data controls</h3>
            </div>
            <LockKeyhole size={20} aria-hidden="true" />
          </div>
          {!accessToken ? <div className="notice-bar">Unsigned users can preview the demo export. Delete only affects persisted signed-in data.</div> : null}
          {error ? <div className="notice-bar danger-notice">{error}</div> : null}
          {status ? <div className="notice-bar success-notice">{status}</div> : null}
          <div className="checklist">
            <span>Exports redact broker provider secrets.</span>
            <span>Delete requests revoke stored broker connection data.</span>
            <span>Local storage cleanup is browser-local only.</span>
          </div>
          <div className="button-row">
            <button type="button" onClick={exportData} disabled={isBusy}>
              <DatabaseZap size={16} aria-hidden="true" /> Export data
            </button>
            <button type="button" onClick={deleteData} disabled={isBusy || !accessToken}>
              <Trash2 size={16} aria-hidden="true" /> Delete account data
            </button>
            <button type="button" onClick={clearLocalState} disabled={isBusy}>Clear local storage</button>
          </div>
        </div>
        <div className="panel">
          <p className="eyebrow">Loaded workspace</p>
          <h3>Data source and scope</h3>
          <dl className="detail-list">
            <div><dt>User</dt><dd>{snapshot.userId}</dd></div>
            <div><dt>Base currency</dt><dd>{snapshot.baseCurrency}</dd></div>
            <div><dt>Accounts</dt><dd>{snapshot.accounts.length}</dd></div>
            <div><dt>Broker connections</dt><dd>{snapshot.brokerConnections.length}</dd></div>
            <div><dt>Positions</dt><dd>{snapshot.positions.length}</dd></div>
            <div><dt>Open data issues</dt><dd>{snapshot.openIssueCount}</dd></div>
          </dl>
        </div>
      </section>
    </div>
  );
}
