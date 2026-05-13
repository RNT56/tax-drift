import { PlugZap, RotateCw, ShieldOff } from "lucide-react";
import { StatusPill } from "../components/StatusPill";
import type { RouteProps } from "../App";

export default function BrokerConnectionsRoute({ snapshot }: RouteProps) {
  return (
    <div className="page-grid">
      <section className="hero-band compact">
        <div>
          <p className="eyebrow">Read-only broker linking</p>
          <h2>Connections can sync data, never place trades</h2>
          <p>Provider adapters expose start, list, sync, refresh, and disconnect methods only. Secrets stay server-side.</p>
        </div>
        <button className="button-link" type="button">Connect broker</button>
      </section>

      <section className="connection-grid">
        {snapshot.brokerConnections.map((connection) => (
          <article className="panel" key={connection.id}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{connection.provider}</p>
                <h3>{connection.institutionName}</h3>
              </div>
              <PlugZap size={20} aria-hidden="true" />
            </div>
            <dl className="detail-list compact">
              <div><dt>Status</dt><dd><StatusPill label={connection.status} tone={connection.status === "active" ? "ok" : "danger"} /></dd></div>
              <div><dt>Consent</dt><dd>{connection.consentGrantedAt ? new Date(connection.consentGrantedAt).toLocaleDateString("de-DE") : "Manual"}</dd></div>
              <div><dt>Last sync</dt><dd>{connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString("de-DE") : "Never"}</dd></div>
              <div><dt>Scopes</dt><dd>{connection.scopes.join(", ")}</dd></div>
            </dl>
            <div className="button-row">
              <button type="button"><RotateCw size={16} aria-hidden="true" /> Refresh</button>
              <button type="button"><ShieldOff size={16} aria-hidden="true" /> Revoke</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
