import { DatabaseZap, LockKeyhole, Trash2 } from "lucide-react";
import type { RouteProps } from "../App";

export default function SettingsRoute({ snapshot }: RouteProps) {
  return (
    <div className="page-grid">
      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Privacy and GDPR</p>
              <h3>User-controlled data flows</h3>
            </div>
            <LockKeyhole size={20} aria-hidden="true" />
          </div>
          <div className="checklist">
            <span>Export all user data</span>
            <span>Delete account data</span>
            <span>Revoke broker connections</span>
            <span>Clear local storage</span>
            <span>Consent records and retention defaults</span>
          </div>
          <div className="button-row">
            <button type="button"><DatabaseZap size={16} aria-hidden="true" /> Export</button>
            <button type="button"><Trash2 size={16} aria-hidden="true" /> Delete</button>
          </div>
        </div>
        <div className="panel">
          <p className="eyebrow">Rollout controls</p>
          <h3>Feature flags</h3>
          <div className="settings-list">
            <label><input type="checkbox" defaultChecked /> Portfolio command center</label>
            <label><input type="checkbox" defaultChecked /> Action planner</label>
            <label><input type="checkbox" /> SnapTrade provider</label>
            <label><input type="checkbox" defaultChecked /> Demo workspace seed</label>
          </div>
          <p className="muted-copy">{snapshot.userId} | Preview database branches use the same migration chain as production.</p>
        </div>
      </section>
    </div>
  );
}
