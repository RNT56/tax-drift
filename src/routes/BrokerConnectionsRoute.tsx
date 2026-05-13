import { useState } from "react";
import { PlugZap, RotateCw, ShieldOff } from "lucide-react";
import { StatusPill } from "../components/StatusPill";
import { revokeBrokerConnection, startBrokerConnection, syncBrokerConnection } from "../domain/api";
import type { RouteProps } from "../App";

export default function BrokerConnectionsRoute({ snapshot, accessToken, onWorkspaceRefresh }: RouteProps) {
  const [institutionName, setInstitutionName] = useState("Manual import connection");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  async function connectManualBroker() {
    setError("");
    setStatus("");
    setIsConnecting(true);
    try {
      const result = await startBrokerConnection({
        provider: "manual",
        institutionName,
        scopes: ["accounts.read", "holdings.read", "transactions.read"]
      }, accessToken);
      if (result.connectionPortal?.redirectUrl) {
        window.location.assign(result.connectionPortal.redirectUrl);
        return;
      }
      setStatus(`${result.connection?.institutionName || institutionName} connection created.`);
      await onWorkspaceRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Broker connection was not created.");
    } finally {
      setIsConnecting(false);
    }
  }

  async function syncConnection(connectionId: string) {
    setError("");
    setStatus("");
    setBusyId(connectionId);
    try {
      await syncBrokerConnection(connectionId, accessToken);
      setStatus("Broker sync queued and completed by the provider adapter.");
      await onWorkspaceRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Broker sync failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function revokeConnection(connectionId: string, provider: string) {
    if (!window.confirm("Revoke this read-only broker connection?")) return;
    setError("");
    setStatus("");
    setBusyId(connectionId);
    try {
      await revokeBrokerConnection(connectionId, provider, accessToken);
      setStatus("Broker connection revoked.");
      await onWorkspaceRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Broker connection was not revoked.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-band compact">
        <div>
          <p className="eyebrow">Read-only broker linking</p>
          <h2>Sync holdings and transactions without trade permissions</h2>
          <p>Connections expose read, refresh, sync, and disconnect operations only. Secrets stay server-side.</p>
        </div>
      </section>

      {!accessToken ? <div className="notice-bar">Sign in to create, sync, or revoke broker connections.</div> : null}
      {error ? <div className="notice-bar danger-notice">{error}</div> : null}
      {status ? <div className="notice-bar success-notice">{status}</div> : null}

      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">New connection</p>
              <h3>Manual or import-backed broker source</h3>
            </div>
            <PlugZap size={20} aria-hidden="true" />
          </div>
          <label className="form-label">
            <span>Institution name</span>
            <input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} />
          </label>
          <div className="button-row">
            <button type="button" onClick={connectManualBroker} disabled={!accessToken || isConnecting || !institutionName.trim()}>
              <PlugZap size={16} aria-hidden="true" />
              {isConnecting ? "Connecting" : "Connect read-only source"}
            </button>
          </div>
          <p className="empty-copy">Use this for manual/import-backed data. SnapTrade stays unavailable until provider credentials are configured server-side.</p>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Loaded connections</p>
              <h3>{snapshot.brokerConnections.length} broker sources</h3>
            </div>
          </div>
          <div className="connection-list">
            {snapshot.brokerConnections.length ? snapshot.brokerConnections.map((connection) => (
              <article className="connection-card" key={connection.id}>
                <div className="panel-heading compact-heading">
                  <div>
                    <p className="eyebrow">{connection.provider}</p>
                    <h3>{connection.institutionName}</h3>
                  </div>
                  <StatusPill label={connection.status} tone={connection.status === "active" ? "ok" : connection.status === "pending" ? "warning" : "danger"} />
                </div>
                <dl className="detail-list compact">
                  <div><dt>Consent</dt><dd>{connection.consentGrantedAt ? new Date(connection.consentGrantedAt).toLocaleDateString("de-DE") : "Manual"}</dd></div>
                  <div><dt>Last sync</dt><dd>{connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString("de-DE") : "Never"}</dd></div>
                  <div><dt>Scopes</dt><dd>{connection.scopes.join(", ")}</dd></div>
                </dl>
                <div className="button-row">
                  <button type="button" onClick={() => syncConnection(connection.id)} disabled={!accessToken || busyId === connection.id}>
                    <RotateCw size={16} aria-hidden="true" /> Sync
                  </button>
                  <button type="button" onClick={() => revokeConnection(connection.id, connection.provider)} disabled={!accessToken || busyId === connection.id}>
                    <ShieldOff size={16} aria-hidden="true" /> Revoke
                  </button>
                </div>
              </article>
            )) : <p className="empty-copy">No broker connections are loaded for this workspace.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
