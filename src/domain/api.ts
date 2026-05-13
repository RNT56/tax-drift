import { generateActionPlan } from "./action-planner";
import { derivePortfolioSnapshot } from "./portfolio";
import { money } from "./money";
import type { ActionPlan, PortfolioInput, PortfolioSnapshot } from "./types";

export interface PortfolioWorkspace {
  snapshot: PortfolioSnapshot;
  actionPlan: ActionPlan;
  source: "api" | "local-demo";
  warning?: string;
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

const localSnapshot = derivePortfolioSnapshot(emptyPortfolioInput);
const localActionPlan = generateActionPlan(localSnapshot);

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

function localWorkspace(warning?: string): PortfolioWorkspace {
  return {
    snapshot: localSnapshot,
    actionPlan: localActionPlan,
    source: "local-demo",
    warning
  };
}

export async function loadPortfolioWorkspace(accessToken?: string): Promise<PortfolioWorkspace> {
  const demoQuery = accessToken || import.meta.env.VITE_PORTFOLIO_API_DEMO === "false" ? "" : "?demo=1";
  try {
    const portfolio = await getJson<{ snapshot: PortfolioSnapshot }>(`/api/portfolio${demoQuery}`, accessToken);
    const apiSnapshot = portfolio.data?.snapshot;
    if (!portfolio.ok || !isPortfolioSnapshot(apiSnapshot)) {
      return localWorkspace("Portfolio API returned an incomplete snapshot; using local demo data.");
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
    return localWorkspace(error instanceof Error ? error.message : "Portfolio API unavailable.");
  }
}
