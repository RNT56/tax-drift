import { FormEvent, useEffect, useMemo, useState } from "react";
import { BellRing, Trash2 } from "lucide-react";
import { CustomSelect } from "../components/CustomSelect";
import { StatusPill } from "../components/StatusPill";
import { createAlert, deleteAlert, listAlerts, updateAlert, type AlertRule } from "../domain/api";
import type { RouteProps } from "../App";

const metricOptions = [
  { value: "price", label: "Price" },
  { value: "position-weight", label: "Position weight" },
  { value: "tax-loss-value", label: "Tax-loss value" },
  { value: "rebuy-break-even", label: "Rebuy break-even" }
];

export default function AlertsRoute({ snapshot, accessToken }: RouteProps) {
  const firstSymbol = snapshot.positions[0]?.position.symbol || "";
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [form, setForm] = useState({
    symbol: firstSymbol,
    metric: "price",
    direction: "above",
    threshold: "",
    channel: "local"
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const symbols = useMemo(
    () => [...new Set(snapshot.positions.map((item) => item.position.symbol).filter(Boolean))],
    [snapshot.positions]
  );

  useEffect(() => {
    if (!form.symbol && firstSymbol) setForm((current) => ({ ...current, symbol: firstSymbol }));
  }, [firstSymbol, form.symbol]);

  useEffect(() => {
    if (!accessToken) {
      setAlerts([]);
      return;
    }
    let mounted = true;
    setIsLoading(true);
    listAlerts(accessToken)
      .then((nextAlerts) => {
        if (mounted) setAlerts(nextAlerts);
      })
      .catch((caught) => {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load alerts.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSaving(true);
    try {
      const alert = await createAlert({
        symbol: form.symbol,
        metric: form.metric,
        type: form.metric,
        direction: form.direction,
        threshold: Number(form.threshold),
        currency: snapshot.baseCurrency,
        channel: form.channel
      }, accessToken);
      setAlerts((current) => [alert, ...current]);
      setStatus("Alert created.");
      setForm((current) => ({ ...current, threshold: "" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Alert was not created.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggle(alert: AlertRule) {
    setError("");
    try {
      const updated = await updateAlert(alert.id, { ...alert, enabled: !alert.enabled }, accessToken);
      setAlerts((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Alert was not updated.");
    }
  }

  async function remove(alertId: string) {
    setError("");
    try {
      await deleteAlert(alertId, accessToken);
      setAlerts((current) => current.filter((item) => item.id !== alertId));
      setStatus("Alert deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Alert was not deleted.");
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-band compact">
        <div>
          <p className="eyebrow">Local and scheduled alerts</p>
          <h2>Watch portfolio signals with explicit alert rules</h2>
          <p>Alerts are stored per signed-in user and evaluated by the scheduled backend. No alert is inferred from unrelated data-quality issues.</p>
        </div>
      </section>

      {!accessToken ? <div className="notice-bar">Sign in to create and manage scheduled alerts.</div> : null}
      {error ? <div className="notice-bar danger-notice">{error}</div> : null}
      {status ? <div className="notice-bar success-notice">{status}</div> : null}

      <section className="two-column">
        <form className="panel research-form" onSubmit={submit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">New alert</p>
              <h3>Signal rule</h3>
            </div>
            <BellRing size={20} aria-hidden="true" />
          </div>
          <div className="field-grid two">
            <CustomSelect
              label="Symbol"
              value={form.symbol}
              onChange={(value) => setForm((current) => ({ ...current, symbol: value }))}
              options={symbols.length ? symbols.map((symbol) => ({ value: symbol, label: symbol })) : [{ value: "", label: "No positions", disabled: true }]}
            />
            <CustomSelect
              label="Metric"
              value={form.metric}
              onChange={(value) => setForm((current) => ({ ...current, metric: value }))}
              options={metricOptions}
            />
            <CustomSelect
              label="Direction"
              value={form.direction}
              onChange={(value) => setForm((current) => ({ ...current, direction: value }))}
              options={[
                { value: "above", label: "Above" },
                { value: "below", label: "Below" },
                { value: "crosses", label: "Crosses" }
              ]}
            />
            <label>
              <span>Threshold</span>
              <input value={form.threshold} onChange={(event) => setForm((current) => ({ ...current, threshold: event.target.value }))} inputMode="decimal" required />
            </label>
          </div>
          <div className="button-row">
            <button type="submit" disabled={!accessToken || isSaving || !form.symbol || !form.threshold}>
              {isSaving ? "Saving" : "Create alert"}
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Saved rules</p>
              <h3>{isLoading ? "Loading alerts" : `${alerts.length} alert rules`}</h3>
            </div>
          </div>
          <div className="alert-list">
            {alerts.length ? alerts.map((alert) => (
              <article className="alert-row" key={alert.id}>
                <div>
                  <strong>{alert.symbol} {alert.metric} {alert.direction} {alert.threshold}</strong>
                  <span>{alert.channel} | {alert.lastCheckedAt ? `checked ${new Date(alert.lastCheckedAt).toLocaleString("de-DE")}` : "not checked yet"}</span>
                </div>
                <StatusPill label={alert.enabled ? "enabled" : "paused"} tone={alert.enabled ? "ok" : "warning"} />
                <div className="button-row inline-actions">
                  <button type="button" onClick={() => toggle(alert)}>{alert.enabled ? "Pause" : "Enable"}</button>
                  <button type="button" onClick={() => remove(alert.id)} aria-label={`Delete alert for ${alert.symbol}`}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </article>
            )) : <p className="empty-copy">{accessToken ? "No saved alerts yet." : "Alerts appear here after sign-in."}</p>}
          </div>
        </section>
      </section>
    </div>
  );
}
