import { generateActionPlan } from "./action-planner";
import { derivePortfolioSnapshot } from "./portfolio";
import { money } from "./money";
import { demoPortfolioInput } from "./sample-data";
import type {
  ActionPlan,
  ActionPlanConstraints,
  BrokerConnection,
  PortfolioInput,
  PortfolioSnapshot,
  ResearchRun,
  ResearchStatus
} from "./types";

export interface PortfolioWorkspace {
  snapshot: PortfolioSnapshot;
  actionPlan: ActionPlan;
  source: "api" | "local-empty" | "sample-demo";
  warning?: string;
}

export interface AlertRule {
  id: string;
  userId?: string;
  symbol: string;
  type: string;
  metric: string;
  direction: "above" | "below" | "crosses" | string;
  threshold: number;
  currency: string;
  channel: string;
  enabled: boolean;
  lastValue?: number | null;
  lastCheckedAt?: string | null;
  lastTriggeredAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ImportPreview {
  importId?: string;
  detectedBroker?: string;
  adapter?: string;
  confidence?: number;
  reason?: string;
  importKind?: string;
  rowCount?: number;
  mappingRequired?: boolean;
  requiredFieldsMissing?: string[];
  transactions: Array<Record<string, unknown>>;
  positions: Array<Record<string, unknown>>;
  warnings?: string[];
  errors?: string[];
}

export interface PortfolioReport {
  type: string;
  format: "json" | "csv" | "html" | string;
  title: string;
  generatedAt: string;
  contentType: string;
  filename: string;
  content: unknown;
}

export interface PrivacyExport {
  userId: string;
  portfolio: unknown;
  actionPlans?: unknown[];
  consentRecords?: unknown[];
}

export interface SymbolSearchResult {
  id?: string;
  symbol: string;
  name: string;
  exchange?: string;
  micCode?: string;
  country?: string;
  currency?: string;
  type?: string;
  provider?: string;
  providerSymbol?: string;
  twelvedataSymbol?: string;
  fmpSymbol?: string;
  eodhdSymbol?: string;
  alphavantageSymbol?: string;
}

export interface MarketQuote {
  symbol: string;
  exchange?: string;
  currency: string;
  price: number;
  source?: string;
  fetchedAt?: string;
  converted?: boolean;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  originalPrice?: number;
  originalCurrency?: string;
  fxRate?: number;
}

export interface HistoryPoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface MarketHistory {
  symbol: string;
  exchange?: string;
  currency: string;
  range: string;
  source?: string;
  fetchedAt?: string;
  points: HistoryPoint[];
}

export interface FxRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  provider?: string;
  effectiveDate?: string | null;
  fetchedAt?: string;
}

export interface ImportRunSummary {
  id: string;
  source?: string;
  status?: string;
  filename?: string;
  confidence?: number;
  summary?: {
    total?: number;
    holdings?: number;
    transactions?: number;
    cash?: number;
    needsReview?: number;
  };
  created_at?: string;
  createdAt?: string;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: Record<string, unknown>;
}

export const emptyPortfolioInput: PortfolioInput = {
  userId: "anonymous",
  baseCurrency: "EUR",
  accounts: [],
  brokerConnections: [],
  positions: [],
  cashBalances: [],
  targets: [],
  syncRuns: [],
  asOf: new Date().toISOString(),
  saverAllowanceRemaining: money("EUR", 0),
  assumptions: {
    capitalGainsTaxPct: 25,
    solidaritySurchargePct: 5.5,
    churchTaxPct: 0,
    concentrationLimitPct: 22,
    stalePriceHours: 36
  }
};

const emptySnapshot = derivePortfolioSnapshot(emptyPortfolioInput);
const emptyActionPlan = generateActionPlan(emptySnapshot);
const sampleSnapshot = derivePortfolioSnapshot(demoPortfolioInput);
const sampleActionPlan = generateActionPlan(sampleSnapshot);

function isPortfolioSnapshot(value: unknown): value is PortfolioSnapshot {
  const snapshot = value as PortfolioSnapshot;
  return Boolean(
    snapshot
      && snapshot.totalValue
      && Array.isArray(snapshot.positions)
      && snapshot.positions.every((item) => item.position && item.marketValue)
      && Array.isArray(snapshot.dataQualityIssues)
  );
}

function isActionPlan(value: unknown): value is ActionPlan {
  const plan = value as ActionPlan;
  return Boolean(plan && Array.isArray(plan.actions) && plan.summary && plan.constraints);
}

async function getJson<T>(url: string, accessToken?: string): Promise<ApiEnvelope<T>> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    credentials: "same-origin"
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json() as Promise<ApiEnvelope<T>>;
}

async function postJson<T>(url: string, body: Record<string, unknown>, accessToken?: string): Promise<ApiEnvelope<T>> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    credentials: "same-origin",
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok) {
    const message = payload?.error?.message || `${url} returned ${response.status}`;
    throw new Error(message);
  }
  if (!payload) throw new Error(`${url} returned an invalid JSON response`);
  return payload;
}

async function deleteJson<T>(url: string, accessToken?: string): Promise<ApiEnvelope<T>> {
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    credentials: "same-origin"
  });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok) {
    const message = payload?.error?.message || `${url} returned ${response.status}`;
    throw new Error(message);
  }
  if (!payload) throw new Error(`${url} returned an invalid JSON response`);
  return payload;
}

async function getPlainJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    credentials: "same-origin"
  });
  const payload = await response.json().catch(() => null) as (T & { error?: string; message?: string }) | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.message || payload?.error || `${url} returned ${response.status}`);
  }
  return payload;
}

function localWorkspace(warning?: string, useSample = false): PortfolioWorkspace {
  return {
    snapshot: useSample ? sampleSnapshot : emptySnapshot,
    actionPlan: useSample ? sampleActionPlan : emptyActionPlan,
    source: useSample ? "sample-demo" : "local-empty",
    warning
  };
}

export async function loadPortfolioWorkspace(accessToken?: string): Promise<PortfolioWorkspace> {
  const explicitDemoRequested = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1";
  const demoQuery = !accessToken && explicitDemoRequested ? "?demo=1" : "";
  try {
    const portfolio = await getJson<{ snapshot: PortfolioSnapshot }>(`/api/portfolio${demoQuery}`, accessToken);
    const apiSnapshot = portfolio.data?.snapshot;
    if (!portfolio.ok || !isPortfolioSnapshot(apiSnapshot)) {
      return localWorkspace(
        explicitDemoRequested
          ? "Portfolio API returned an incomplete sample snapshot; using bundled sample data."
          : "Portfolio API returned an incomplete snapshot. Sign in or configure the API to load portfolio data.",
        explicitDemoRequested
      );
    }

    const separator = demoQuery ? "&" : "?";
    const action = await getJson<{ actionPlan: ActionPlan }>(`/api/action-plan${demoQuery}${separator}source=portfolio`, accessToken);
    const apiActionPlan = action.data?.actionPlan;
    return {
      snapshot: apiSnapshot,
      actionPlan: action.ok && isActionPlan(apiActionPlan)
        ? apiActionPlan
        : generateActionPlan(apiSnapshot),
      source: "api",
      warning: action.ok && isActionPlan(apiActionPlan) ? undefined : "Action-plan API unavailable; generated locally."
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Portfolio API unavailable.";
    return localWorkspace(
      explicitDemoRequested
        ? `${detail}; using bundled sample data.`
        : `${detail}. Sign in or configure the API to load portfolio data.`,
      explicitDemoRequested
    );
  }
}

export async function generateConstrainedActionPlan(
  constraints: ActionPlanConstraints,
  accessToken?: string
): Promise<ActionPlan> {
  const demoQuery = accessToken || import.meta.env.VITE_PORTFOLIO_API_DEMO === "false" ? "" : "?demo=1";
  const response = await postJson<{ actionPlan: ActionPlan }>(`/api/action-plan${demoQuery}`, { constraints }, accessToken);
  const plan = response.data?.actionPlan;
  if (!response.ok || !plan) throw new Error(response.error?.message || "Action plan generation failed.");
  return plan;
}

export async function loadResearchStatus(): Promise<ResearchStatus> {
  try {
    const response = await getJson<ResearchStatus>("/api/research-status");
    return response.data || {
      scope: ["equity", "etf"],
      advisoryMode: "non-advisory",
      configured: {},
      capabilities: {}
    };
  } catch {
    return {
      scope: ["equity", "etf"],
      advisoryMode: "non-advisory",
      configured: {},
      capabilities: { research: "unavailable" }
    };
  }
}

export async function listResearchRuns(accessToken?: string, symbol?: string): Promise<ResearchRun[]> {
  if (!accessToken) return [];
  const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
  const response = await getJson<{ runs: ResearchRun[] }>(`/api/research${query}`, accessToken);
  return response.ok && Array.isArray(response.data?.runs) ? response.data.runs : [];
}

export async function createResearchRun(input: Record<string, unknown>, accessToken?: string): Promise<ResearchRun> {
  if (!accessToken) throw new Error("Sign in to create persisted research runs.");
  const response = await postJson<{ run: ResearchRun }>("/api/research", input, accessToken);
  const run = response.data?.run;
  if (!response.ok || !run) throw new Error(response.error?.message || "Research run was not created.");
  return run;
}

export async function sendResearchCopilotMessage(input: Record<string, unknown>, accessToken?: string): Promise<{
  response?: { answer: string; sourceEvidenceIds: string[]; sourceRequests: Array<{ type: string; reason: string }> };
  messages?: Array<{ role: string; content: string; sourceEvidenceIds?: string[]; sourceRequests?: Array<{ type: string; reason: string }> }>;
}> {
  if (!accessToken) throw new Error("Sign in to use the research copilot.");
  const response = await postJson<{
    response: { answer: string; sourceEvidenceIds: string[]; sourceRequests: Array<{ type: string; reason: string }> };
    messages: Array<{ role: string; content: string; sourceEvidenceIds?: string[]; sourceRequests?: Array<{ type: string; reason: string }> }>;
  }>("/api/research-copilot", input, accessToken);
  return response.data || {};
}

export async function parseImportFile(input: Record<string, unknown>, accessToken?: string): Promise<ImportPreview> {
  if (!accessToken) throw new Error("Sign in to parse broker imports.");
  const response = await postJson<ImportPreview>("/api/import-parse", input, accessToken);
  if (!response.ok || !response.data) throw new Error(response.error?.message || "Import parsing failed.");
  return {
    ...response.data,
    transactions: response.data.transactions || [],
    positions: response.data.positions || []
  };
}

export async function saveImportReconciliation(input: {
  source?: string;
  filename?: string;
  confidence?: number;
  items: Array<Record<string, unknown>>;
}, accessToken?: string): Promise<{ importRun?: unknown; reconciliationItems?: unknown[] }> {
  if (!accessToken) throw new Error("Sign in to save broker imports.");
  const response = await postJson<{ importRun: unknown; reconciliationItems: unknown[] }>("/api/portfolio-import", input, accessToken);
  if (!response.ok) throw new Error(response.error?.message || "Import reconciliation was not saved.");
  return response.data || {};
}

export async function listImportRuns(accessToken?: string): Promise<ImportRunSummary[]> {
  if (!accessToken) return [];
  const response = await getJson<{ imports: ImportRunSummary[] }>("/api/portfolio-import", accessToken);
  return response.ok && Array.isArray(response.data?.imports) ? response.data.imports : [];
}

export async function upsertManualPortfolio(input: Record<string, unknown>, accessToken?: string): Promise<Record<string, unknown>> {
  if (!accessToken) throw new Error("Sign in to edit portfolio data.");
  const response = await postJson<Record<string, unknown>>("/api/portfolio-manual", input, accessToken);
  if (!response.ok) throw new Error(response.error?.message || "Portfolio edit failed.");
  return response.data || {};
}

export async function deleteManualPortfolioItem(type: "holding" | "target", id: string, accessToken?: string): Promise<void> {
  if (!accessToken) throw new Error("Sign in to delete portfolio data.");
  const query = new URLSearchParams({ type, id });
  const response = await deleteJson<{ deleted: boolean }>(`/api/portfolio-manual?${query.toString()}`, accessToken);
  if (!response.ok) throw new Error(response.error?.message || "Portfolio delete failed.");
}

export async function startBrokerConnection(input: Record<string, unknown>, accessToken?: string): Promise<{
  connection?: BrokerConnection;
  connectionPortal?: { redirectUrl: string; expiresAt?: string } | null;
}> {
  if (!accessToken) throw new Error("Sign in to connect a broker.");
  const response = await postJson<{
    connection: BrokerConnection;
    connectionPortal?: { redirectUrl: string; expiresAt?: string } | null;
  }>("/api/broker-connections", input, accessToken);
  if (!response.ok) throw new Error(response.error?.message || "Broker connection was not started.");
  return response.data || {};
}

export async function syncBrokerConnection(connectionId: string, accessToken?: string): Promise<{ syncRun?: unknown }> {
  if (!accessToken) throw new Error("Sign in to sync broker data.");
  const response = await postJson<{ syncRun: unknown }>("/api/broker-sync", { connectionId }, accessToken);
  if (!response.ok) throw new Error(response.error?.message || "Broker sync failed.");
  return response.data || {};
}

export async function revokeBrokerConnection(connectionId: string, provider: string, accessToken?: string): Promise<{ disconnected?: boolean }> {
  if (!accessToken) throw new Error("Sign in to revoke broker connections.");
  const query = new URLSearchParams({ id: connectionId, provider });
  const response = await deleteJson<{ disconnected: boolean }>(`/api/broker-connections?${query.toString()}`, accessToken);
  if (!response.ok) throw new Error(response.error?.message || "Broker connection was not revoked.");
  return response.data || {};
}

export async function listAlerts(accessToken?: string): Promise<AlertRule[]> {
  if (!accessToken) return [];
  const response = await getJson<{ alerts: AlertRule[] }>("/api/alerts", accessToken);
  return response.ok && Array.isArray(response.data?.alerts) ? response.data.alerts : [];
}

export async function createAlert(input: Record<string, unknown>, accessToken?: string): Promise<AlertRule> {
  if (!accessToken) throw new Error("Sign in to create scheduled alerts.");
  const response = await postJson<{ alert: AlertRule }>("/api/alerts", input, accessToken);
  const alert = response.data?.alert;
  if (!response.ok || !alert) throw new Error(response.error?.message || "Alert was not created.");
  return alert;
}

export async function updateAlert(alertId: string, input: Record<string, unknown>, accessToken?: string): Promise<AlertRule> {
  if (!accessToken) throw new Error("Sign in to update scheduled alerts.");
  const response = await fetch(`/api/alerts?id=${encodeURIComponent(alertId)}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    credentials: "same-origin",
    body: JSON.stringify(input)
  });
  const payload = await response.json().catch(() => null) as ApiEnvelope<{ alert: AlertRule }> | null;
  if (!response.ok || !payload?.data?.alert) {
    throw new Error(payload?.error?.message || "Alert was not updated.");
  }
  return payload.data.alert;
}

export async function deleteAlert(alertId: string, accessToken?: string): Promise<void> {
  if (!accessToken) throw new Error("Sign in to delete scheduled alerts.");
  const response = await deleteJson<{ deleted: boolean }>(`/api/alerts?id=${encodeURIComponent(alertId)}`, accessToken);
  if (!response.ok) throw new Error(response.error?.message || "Alert was not deleted.");
}

export async function generatePortfolioReport(type: string, format: "json" | "csv" | "html", accessToken?: string): Promise<PortfolioReport> {
  const query = new URLSearchParams({ type, format });
  if (!accessToken) query.set("demo", "1");
  const response = await getJson<{ report: PortfolioReport }>(`/api/portfolio-report?${query.toString()}`, accessToken);
  const report = response.data?.report;
  if (!response.ok || !report) throw new Error(response.error?.message || "Report generation failed.");
  return report;
}

export async function exportPrivacyData(accessToken?: string): Promise<PrivacyExport> {
  const query = accessToken ? "" : "?demo=1";
  const response = await getJson<{ export: PrivacyExport }>(`/api/privacy${query}`, accessToken);
  const exported = response.data?.export;
  if (!response.ok || !exported) throw new Error(response.error?.message || "Privacy export failed.");
  return exported;
}

export async function deletePrivacyData(accessToken?: string): Promise<Record<string, unknown>> {
  const query = accessToken ? "" : "?demo=1";
  const response = await deleteJson<Record<string, unknown>>(`/api/privacy${query}`, accessToken);
  if (!response.ok) throw new Error(response.error?.message || "Privacy delete failed.");
  return response.data || {};
}

export async function searchSymbols(query: string, options: { type?: string; country?: string; limit?: number } = {}): Promise<{
  results: SymbolSearchResult[];
  source?: string;
  hasLiveProvider?: boolean;
}> {
  if (query.trim().length < 2) return { results: [], source: "none" };
  const params = new URLSearchParams({
    q: query.trim(),
    type: options.type || "all",
    country: options.country || "all",
    limit: String(options.limit || 10)
  });
  const response = await getPlainJson<{
    results: SymbolSearchResult[];
    source?: string;
    hasLiveProvider?: boolean;
  }>(`/api/search-symbols?${params.toString()}`);
  return {
    ...response,
    results: Array.isArray(response.results) ? response.results : []
  };
}

function marketParams(asset: SymbolSearchResult, targetCurrency: string): URLSearchParams {
  const params = new URLSearchParams({
    symbol: asset.symbol,
    currency: targetCurrency,
    sourceCurrency: asset.currency || targetCurrency,
    exchange: asset.exchange || "",
    type: asset.type || "",
    providerSymbol: asset.providerSymbol || "",
    twelvedataSymbol: asset.twelvedataSymbol || "",
    fmpSymbol: asset.fmpSymbol || "",
    eodhdSymbol: asset.eodhdSymbol || "",
    alphavantageSymbol: asset.alphavantageSymbol || ""
  });
  if (asset.micCode) params.set("micCode", asset.micCode);
  return params;
}

export async function getMarketQuote(asset: SymbolSearchResult, targetCurrency: string): Promise<MarketQuote> {
  return getPlainJson<MarketQuote>(`/api/get-price?${marketParams(asset, targetCurrency).toString()}`);
}

export async function getMarketHistory(asset: SymbolSearchResult, targetCurrency: string, range = "1Y"): Promise<MarketHistory> {
  const params = marketParams(asset, targetCurrency);
  params.set("range", range);
  const response = await getPlainJson<MarketHistory>(`/api/get-history?${params.toString()}`);
  return {
    ...response,
    points: Array.isArray(response.points) ? response.points : []
  };
}

export async function getFxRate(fromCurrency: string, toCurrency: string): Promise<FxRate> {
  const params = new URLSearchParams({ from: fromCurrency, to: toCurrency });
  return getPlainJson<FxRate>(`/api/get-fx-rate?${params.toString()}`);
}
