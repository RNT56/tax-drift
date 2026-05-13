import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Database,
  FileText,
  Gauge,
  Layers3,
  RefreshCw,
  SearchCheck,
  Send,
  ShieldAlert
} from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { StatusPill } from "../components/StatusPill";
import {
  createResearchRun,
  listResearchRuns,
  loadResearchStatus,
  sendResearchCopilotMessage
} from "../domain/api";
import type {
  ResearchEvidence,
  ResearchEvent,
  ResearchMetric,
  ResearchRun,
  ResearchSourceStatus,
  ResearchStatus
} from "../domain/types";
import type { RouteProps } from "../App";

type ResearchTab =
  | "overview"
  | "fundamentals"
  | "valuation"
  | "events"
  | "etf"
  | "copilot"
  | "evidence"
  | "reports";

const tabs: Array<{ id: ResearchTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "fundamentals", label: "Fundamentals" },
  { id: "valuation", label: "Valuation" },
  { id: "events", label: "Events/Risks" },
  { id: "etf", label: "ETF/Fund" },
  { id: "copilot", label: "Thesis/Copilot" },
  { id: "evidence", label: "Evidence" },
  { id: "reports", label: "Reports" }
];

function splitTerms(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function sourceTone(status = ""): "neutral" | "ok" | "warning" | "danger" {
  if (["available", "complete"].includes(status)) return "ok";
  if (["partial", "stale", "premium-key-missing", "not-configured", "not-found"].includes(status)) return "warning";
  if (["provider-unavailable", "source-error", "rate-limited"].includes(status)) return "danger";
  return "neutral";
}

function confidenceTone(confidence = ""): "neutral" | "ok" | "warning" | "danger" {
  if (confidence === "high") return "ok";
  if (confidence === "low") return "warning";
  return "neutral";
}

function formatDate(value?: string): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("de-DE") : value;
}

function formatMetric(metric: ResearchMetric): string {
  if (metric.textValue) return metric.textValue;
  if (metric.value === null || metric.value === undefined) return "n/a";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(metric.value) >= 100 ? 0 : 2
  }).format(metric.value);
  return metric.unit ? `${formatted} ${metric.unit}` : formatted;
}

function groupByCategory<T extends { category?: string }>(items: T[] = []): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = item.category || "context";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function renderBullets(section?: { title: string; bullets: string[] }) {
  if (!section?.bullets?.length) return <p className="empty-copy">No grounded summary is available for this section yet.</p>;
  return (
    <ul className="research-bullet-list">
      {section.bullets.map((bullet) => (
        <li key={bullet}>{bullet}</li>
      ))}
    </ul>
  );
}

function EvidenceCards({ evidence }: { evidence: ResearchEvidence[] }) {
  if (!evidence.length) return <p className="empty-copy">No evidence has been captured for this view.</p>;
  return (
    <div className="evidence-list">
      {evidence.map((item) => (
        <article className="evidence-card" key={item.id}>
          <div className="evidence-card-header">
            <strong>{item.claim}</strong>
            <StatusPill label={item.confidence} tone={confidenceTone(item.confidence)} />
          </div>
          <p>{item.evidence}</p>
          <div className="evidence-meta">
            <span>{item.sourceName}</span>
            <span>{item.sourceDate || "undated"}</span>
            <span>{item.thesisImpact}</span>
            {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">Source</a> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function MetricTable({ metrics }: { metrics: ResearchMetric[] }) {
  if (!metrics.length) return <p className="empty-copy">No normalized metrics were available from configured sources.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Period</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, index) => (
            <tr key={`${metric.category}-${metric.label}-${index}`}>
              <td>
                <strong>{metric.label}</strong>
                <small>{metric.category}</small>
              </td>
              <td>{formatMetric(metric)}</td>
              <td>{metric.period || "latest"}</td>
              <td>{metric.sourceEvidenceIds.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventList({ events }: { events: ResearchEvent[] }) {
  if (!events.length) return <p className="empty-copy">No current event risk has been captured for this run.</p>;
  return (
    <div className="event-list">
      {events.map((event) => (
        <article className={`event-row ${event.severity}`} key={event.id}>
          <div className="event-score">
            <strong>{Math.round(event.riskScore * 100)}</strong>
            <span>risk</span>
          </div>
          <div>
            <h4>{event.title}</h4>
            <p>{event.summary || "No summary provided."}</p>
            <div className="evidence-meta">
              <span>{event.sourceName}</span>
              <span>{formatDate(event.occurredAt)}</span>
              <span>{event.type}</span>
              {event.sourceUrl ? <a href={event.sourceUrl} target="_blank" rel="noreferrer">Source</a> : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function CoveragePanel({
  status,
  coverage
}: {
  status: ResearchStatus | null;
  coverage: ResearchSourceStatus[];
}) {
  const capabilityEntries = Object.entries(status?.capabilities || {});
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Source coverage first</p>
          <h3>Configured capabilities and latest run status</h3>
        </div>
        <Database size={20} aria-hidden="true" />
      </div>
      <div className="coverage-grid">
        {capabilityEntries.length ? capabilityEntries.map(([key, value]) => (
          <div key={key}>
            <strong>{key}</strong>
            <StatusPill label={String(value)} tone={sourceTone(String(value))} />
          </div>
        )) : <p className="empty-copy">Research status endpoint is unavailable.</p>}
      </div>
      <div className="source-ledger">
        {coverage.length ? coverage.map((source) => (
          <article className="source-status-row" key={`${source.sourceType}-${source.sourceName}`}>
            <div>
              <strong>{source.sourceName}</strong>
              <span>{source.sourceType} | {source.freshness || "unknown freshness"}</span>
            </div>
            <StatusPill label={source.status} tone={sourceTone(source.status)} />
          </article>
        )) : <p className="empty-copy">Run a subject to see per-source freshness and errors.</p>}
      </div>
    </section>
  );
}

export default function ResearchRoute({ snapshot, accessToken }: RouteProps) {
  const preferredPosition = useMemo(
    () => snapshot.positions.find((item) => ["stock", "etf", "fund"].includes(item.position.instrumentType))?.position,
    [snapshot.positions]
  );
  const [form, setForm] = useState<{
    symbol: string;
    name: string;
    instrumentType: string;
    thesis: string;
    issuerUrl: string;
    watchKeywords: string;
    comparisonSymbol: string;
  }>({
    symbol: preferredPosition?.symbol || "",
    name: preferredPosition?.name || "",
    instrumentType: preferredPosition?.instrumentType || "stock",
    thesis: "",
    issuerUrl: "",
    watchKeywords: "",
    comparisonSymbol: ""
  });
  const [status, setStatus] = useState<ResearchStatus | null>(null);
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ResearchRun | null>(null);
  const [activeTab, setActiveTab] = useState<ResearchTab>("overview");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [error, setError] = useState("");
  const [copilotMessage, setCopilotMessage] = useState("Challenge my thesis and identify missing evidence.");
  const [copilotLog, setCopilotLog] = useState<Array<{ role: string; content: string; evidenceIds?: string[] }>>([]);
  const [isSendingCopilot, setIsSendingCopilot] = useState(false);

  useEffect(() => {
    if (!form.symbol && preferredPosition?.symbol) {
      setForm((current) => ({
        ...current,
        symbol: preferredPosition.symbol,
        name: preferredPosition.name,
        instrumentType: String(preferredPosition.instrumentType)
      }));
    }
  }, [form.symbol, preferredPosition]);

  useEffect(() => {
    let mounted = true;
    loadResearchStatus().then((nextStatus) => {
      if (mounted) setStatus(nextStatus);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setRuns([]);
      setSelectedRun(null);
      return;
    }
    let mounted = true;
    setIsLoadingRuns(true);
    listResearchRuns(accessToken)
      .then((nextRuns) => {
        if (!mounted) return;
        setRuns(nextRuns);
        setSelectedRun((current) => current || nextRuns[0] || null);
      })
      .catch((caught) => {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load research runs.");
      })
      .finally(() => {
        if (mounted) setIsLoadingRuns(false);
      });
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  const evidence = selectedRun?.evidence || [];
  const metrics = selectedRun?.metrics || [];
  const events = selectedRun?.events || [];
  const metricsByCategory = useMemo(() => groupByCategory(metrics), [metrics]);
  const evidenceByCategory = useMemo(() => groupByCategory(evidence), [evidence]);
  const sourceCount = selectedRun?.summary?.sourceCounts || {};
  const businessEvidence = [
    ...(evidenceByCategory.business || []),
    ...(evidenceByCategory.profile || []),
    ...(evidenceByCategory.filings || [])
  ];
  const fundamentals = [
    ...(metricsByCategory.fundamentals || []),
    ...(metricsByCategory.ratios || [])
  ];
  const valuation = [
    ...(metricsByCategory.valuation || []),
    ...(metricsByCategory.ratios || []).filter((metric) => /ratio|yield|margin|beta|pe|price/i.test(metric.label))
  ];
  const etfMetrics = [
    ...(metricsByCategory.etf || []),
    ...(metricsByCategory.holdings || [])
  ];
  const etfEvidence = [
    ...(evidenceByCategory.etf || []),
    ...(evidenceByCategory.holdings || [])
  ];
  const highRiskCount = events.filter((event) => event.severity === "high").length;
  const averageRisk = events.length
    ? Math.round(events.reduce((sum, event) => sum + Number(event.riskScore || 0), 0) / events.length * 100)
    : 0;

  async function submitResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      setError("Sign in to create persisted research runs.");
      return;
    }
    setError("");
    setIsCreating(true);
    try {
      const run = await createResearchRun({
        symbol: form.symbol,
        name: form.name || form.symbol,
        instrumentType: form.instrumentType,
        currency: snapshot.baseCurrency,
        thesis: form.thesis,
        targetSymbol: form.comparisonSymbol || undefined,
        issuerUrls: form.issuerUrl ? [{ url: form.issuerUrl, name: "Issuer feed" }] : [],
        watchKeywords: splitTerms(form.watchKeywords)
      }, accessToken);
      setSelectedRun(run);
      setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]);
      setCopilotLog([]);
      setActiveTab("overview");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Research run failed.");
    } finally {
      setIsCreating(false);
    }
  }

  async function submitCopilot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRun || !copilotMessage.trim()) return;
    if (!accessToken) {
      setError("Sign in to use the research copilot.");
      return;
    }
    setIsSendingCopilot(true);
    setError("");
    const userMessage = copilotMessage.trim();
    setCopilotLog((current) => current.concat({ role: "user", content: userMessage }));
    try {
      const response = await sendResearchCopilotMessage({
        runId: selectedRun.id,
        message: userMessage
      }, accessToken);
      const assistant = response.response || response.messages?.find((message) => message.role === "assistant");
      if (assistant) {
        const content = "answer" in assistant ? assistant.answer : assistant.content;
        setCopilotLog((current) => current.concat({
          role: "assistant",
          content,
          evidenceIds: assistant.sourceEvidenceIds
        }));
      }
      setCopilotMessage("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Copilot request failed.");
    } finally {
      setIsSendingCopilot(false);
    }
  }

  return (
    <div className="research-workspace">
      <section className="hero-band compact research-hero">
        <div>
          <p className="eyebrow">Evidence-first equity and ETF research</p>
          <h2>{selectedRun ? `${selectedRun.subject.symbol} research run` : "Research a public stock, ETF, or fund"}</h2>
          <p>Coverage, evidence, events, and AI synthesis are separated so missing sources are visible before any narrative output.</p>
        </div>
        <div className="hero-status">
          <span>{status?.advisoryMode || "non-advisory"}</span>
          <span>{selectedRun?.status || "no run selected"}</span>
        </div>
      </section>

      {!accessToken ? (
        <div className="notice-bar">
          Research APIs persist runs per user. Sign in to create runs and use the cited copilot.
        </div>
      ) : null}
      {error ? <div className="notice-bar danger-notice">{error}</div> : null}

      <section className="research-command-grid">
        <form className="panel research-form" onSubmit={submitResearch}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Subject setup</p>
              <h3>Create a research run</h3>
            </div>
            <SearchCheck size={20} aria-hidden="true" />
          </div>
          <div className="field-grid">
            <label>
              <span>Symbol</span>
              <input value={form.symbol} onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))} placeholder="AAPL" required />
            </label>
            <label>
              <span>Name</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Company or fund name" />
            </label>
            <label>
              <span>Type</span>
              <select value={form.instrumentType} onChange={(event) => setForm((current) => ({ ...current, instrumentType: event.target.value }))}>
                <option value="stock">Stock</option>
                <option value="etf">ETF</option>
                <option value="fund">Fund</option>
              </select>
            </label>
            <label>
              <span>Compare</span>
              <input value={form.comparisonSymbol} onChange={(event) => setForm((current) => ({ ...current, comparisonSymbol: event.target.value.toUpperCase() }))} placeholder="Optional peer" />
            </label>
          </div>
          <label>
            <span>Thesis to test</span>
            <textarea value={form.thesis} onChange={(event) => setForm((current) => ({ ...current, thesis: event.target.value }))} rows={3} placeholder="Example: revenue quality is improving, but macro and valuation risk may offset the upside." />
          </label>
          <div className="field-grid two">
            <label>
              <span>Issuer RSS or document URL</span>
              <input value={form.issuerUrl} onChange={(event) => setForm((current) => ({ ...current, issuerUrl: event.target.value }))} placeholder="https://issuer.example/feed.xml" />
            </label>
            <label>
              <span>Watch keywords</span>
              <input value={form.watchKeywords} onChange={(event) => setForm((current) => ({ ...current, watchKeywords: event.target.value }))} placeholder="sanctions, supply chain, China" />
            </label>
          </div>
          <div className="button-row">
            <button type="submit" disabled={isCreating || !accessToken}>
              <RefreshCw size={16} aria-hidden="true" />
              {isCreating ? "Collecting" : "Run research"}
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Saved runs</p>
              <h3>Durable research ledger</h3>
            </div>
            <BookOpenCheck size={20} aria-hidden="true" />
          </div>
          <div className="research-saved-list">
            {isLoadingRuns ? <p className="empty-copy">Loading saved research runs...</p> : null}
            {!isLoadingRuns && !runs.length ? <p className="empty-copy">No saved runs yet.</p> : null}
            {runs.map((run) => (
              <button
                type="button"
                className={selectedRun?.id === run.id ? "saved-run active" : "saved-run"}
                key={run.id}
                onClick={() => {
                  setSelectedRun(run);
                  setActiveTab("overview");
                  setCopilotLog([]);
                }}
              >
                <strong>{run.subject.symbol}</strong>
                <span>{run.subject.name || run.subject.instrumentType}</span>
                <small>{run.status} | {formatDate(run.generatedAt)}</small>
              </button>
            ))}
          </div>
        </section>
      </section>

      <section className="metric-grid research-kpis">
        <MetricTile label="Evidence items" value={evidence.length} helper="Claims require source metadata" />
        <MetricTile label="Sources" value={Object.values(sourceCount).reduce((sum, count) => sum + Number(count || 0), 0)} helper={`${sourceCount.available || 0} available`} />
        <MetricTile label="Metrics" value={metrics.length} helper="Fundamentals, ratios, ETF fields" />
        <MetricTile label="Events" value={events.length} tone={highRiskCount ? "warning" : "default"} helper={`${highRiskCount} high severity`} />
        <MetricTile label="Avg risk" value={`${averageRisk}%`} tone={averageRisk > 70 ? "danger" : averageRisk > 40 ? "warning" : "default"} />
        <MetricTile label="AI mode" value={selectedRun?.summary?.aiSummary ? "Grounded" : "Evidence"} helper="No buy/sell/hold output" />
      </section>

      <div className="research-tabs" role="tablist" aria-label="Research views">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "research-tab active" : "research-tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="research-content">
        {activeTab === "overview" ? (
          <div className="research-detail-grid">
            <CoveragePanel status={status} coverage={selectedRun?.coverage || []} />
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Run synthesis</p>
                  <h3>{selectedRun?.summary?.title || "No run selected"}</h3>
                </div>
                <Layers3 size={20} aria-hidden="true" />
              </div>
              {selectedRun ? (
                <>
                  {selectedRun.summary?.aiSummary ? <p className="research-summary">{selectedRun.summary.aiSummary}</p> : null}
                  {renderBullets(selectedRun.summary?.sections?.overview)}
                  <h4 className="section-label">Top risks</h4>
                  <EventList events={events.slice(0, 3)} />
                </>
              ) : <p className="empty-copy">Create or select a run to inspect research output.</p>}
            </section>
          </div>
        ) : null}

        {activeTab === "fundamentals" ? (
          <div className="research-detail-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Business and filings</p>
                  <h3>Product, value proposition, risk factors</h3>
                </div>
                <FileText size={20} aria-hidden="true" />
              </div>
              {renderBullets(selectedRun?.summary?.sections?.business)}
              {renderBullets(selectedRun?.summary?.sections?.fundamentals)}
              <EvidenceCards evidence={businessEvidence.slice(0, 8)} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Normalized metrics</p>
                  <h3>Fundamental data</h3>
                </div>
                <BarChart3 size={20} aria-hidden="true" />
              </div>
              <MetricTable metrics={fundamentals} />
            </section>
          </div>
        ) : null}

        {activeTab === "valuation" ? (
          <div className="research-detail-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Valuation context</p>
                  <h3>Ratios, estimates, peer signals</h3>
                </div>
                <Gauge size={20} aria-hidden="true" />
              </div>
              {renderBullets(selectedRun?.summary?.sections?.valuation)}
              <MetricTable metrics={valuation} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Thesis pressure</p>
                  <h3>Evidence touching valuation</h3>
                </div>
                <ShieldAlert size={20} aria-hidden="true" />
              </div>
              <EvidenceCards evidence={[...(evidenceByCategory.valuation || []), ...(evidenceByCategory.estimates || []), ...(evidenceByCategory.peers || [])]} />
            </section>
          </div>
        ) : null}

        {activeTab === "events" ? (
          <div className="research-detail-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Current events</p>
                  <h3>Deterministic risk scoring</h3>
                </div>
                <AlertTriangle size={20} aria-hidden="true" />
              </div>
              {renderBullets(selectedRun?.summary?.sections?.events)}
              <EventList events={events} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Risk evidence</p>
                  <h3>Events, sanctions, macro, filings</h3>
                </div>
                <ShieldAlert size={20} aria-hidden="true" />
              </div>
              <EvidenceCards evidence={[...(evidenceByCategory.events || []), ...(evidenceByCategory.sanctions || []), ...(evidenceByCategory.macro || []), ...(evidenceByCategory.risks || [])]} />
            </section>
          </div>
        ) : null}

        {activeTab === "etf" ? (
          <div className="research-detail-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">ETF and fund structure</p>
                  <h3>Holdings, expense, issuer documents</h3>
                </div>
                <Layers3 size={20} aria-hidden="true" />
              </div>
              {selectedRun?.subject.instrumentType === "stock" ? <p className="empty-copy">This subject is marked as a stock. ETF and fund data will appear when the subject type is ETF or fund and provider data is available.</p> : null}
              {renderBullets(selectedRun?.summary?.sections?.etf)}
              <MetricTable metrics={etfMetrics} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Fund evidence</p>
                  <h3>Issuer and provider signals</h3>
                </div>
                <Database size={20} aria-hidden="true" />
              </div>
              <EvidenceCards evidence={etfEvidence} />
            </section>
          </div>
        ) : null}

        {activeTab === "copilot" ? (
          <div className="research-detail-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Thesis testing</p>
                  <h3>Challenge, compare, ask what changed</h3>
                </div>
                <Send size={20} aria-hidden="true" />
              </div>
              <form className="copilot-form" onSubmit={submitCopilot}>
                <textarea value={copilotMessage} onChange={(event) => setCopilotMessage(event.target.value)} rows={4} placeholder="Ask a cited research question." />
                <div className="button-row">
                  <button type="submit" disabled={!selectedRun || isSendingCopilot || !accessToken}>
                    <Send size={16} aria-hidden="true" />
                    {isSendingCopilot ? "Sending" : "Send"}
                  </button>
                  <button type="button" disabled={!selectedRun} onClick={() => setCopilotMessage("What evidence would invalidate my thesis?")}>Challenge</button>
                  <button type="button" disabled={!selectedRun} onClick={() => setCopilotMessage("What changed since the last run?")}>Changed</button>
                  <button type="button" disabled={!selectedRun} onClick={() => setCopilotMessage("Generate follow-up research questions with source requests.")}>Questions</button>
                </div>
              </form>
              <div className="copilot-log">
                {!copilotLog.length ? <p className="empty-copy">Copilot answers are saved with citations and source requests.</p> : null}
                {copilotLog.map((message, index) => (
                  <article className={`message-row ${message.role}`} key={`${message.role}-${index}`}>
                    <strong>{message.role === "user" ? "You" : "Copilot"}</strong>
                    <p>{message.content}</p>
                    {message.evidenceIds?.length ? <small>Evidence: {message.evidenceIds.join(", ")}</small> : null}
                  </article>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Editable outputs</p>
                  <h3>Scenarios and watch rules</h3>
                </div>
                <BookOpenCheck size={20} aria-hidden="true" />
              </div>
              <h4 className="section-label">Scenario cases</h4>
              <pre className="report-preview">{JSON.stringify(selectedRun?.aiPayload?.scenarioGenerator?.cases || [], null, 2)}</pre>
              <h4 className="section-label">Watch rule suggestions</h4>
              <pre className="report-preview">{JSON.stringify(selectedRun?.aiPayload?.watchRuleGenerator?.suggestions || [], null, 2)}</pre>
            </section>
          </div>
        ) : null}

        {activeTab === "evidence" ? (
          <div className="research-detail-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Evidence ledger</p>
                  <h3>Mandatory citations and confidence</h3>
                </div>
                <Database size={20} aria-hidden="true" />
              </div>
              <EvidenceCards evidence={evidence} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Source snapshots</p>
                  <h3>Hashes, freshness, errors</h3>
                </div>
                <ShieldAlert size={20} aria-hidden="true" />
              </div>
              <div className="source-ledger">
                {(selectedRun?.sourceSnapshots || []).map((snapshotItem) => (
                  <article className="source-status-row" key={snapshotItem.id}>
                    <div>
                      <strong>{snapshotItem.sourceName}</strong>
                      <span>{snapshotItem.contentHash || "no hash"} | {formatDate(snapshotItem.fetchedAt)}</span>
                      {snapshotItem.errorMessage ? <small>{snapshotItem.errorMessage}</small> : null}
                    </div>
                    <StatusPill label={snapshotItem.status} tone={sourceTone(snapshotItem.status)} />
                  </article>
                ))}
                {!selectedRun?.sourceSnapshots?.length ? <p className="empty-copy">No source snapshots available.</p> : null}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "reports" ? (
          <div className="research-detail-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Report export</p>
                  <h3>Non-advisory research packet</h3>
                </div>
                <FileText size={20} aria-hidden="true" />
              </div>
              <pre className="report-preview">{JSON.stringify({
                subject: selectedRun?.subject,
                thesis: selectedRun?.thesis,
                generatedAt: selectedRun?.generatedAt,
                status: selectedRun?.status,
                summary: selectedRun?.summary,
                evidenceCount: evidence.length,
                eventCount: events.length,
                sourceErrors: selectedRun?.sourceErrors || []
              }, null, 2)}</pre>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Policy</p>
                  <h3>Research boundaries</h3>
                </div>
                <ShieldAlert size={20} aria-hidden="true" />
              </div>
              <div className="checklist">
                <span>No buy, sell, or hold recommendation is generated.</span>
                <span>Uncited claims are downgraded or omitted.</span>
                <span>Provider errors and premium-key gaps remain visible.</span>
                <span>News and RSS store metadata, excerpts, links, and hashes.</span>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
