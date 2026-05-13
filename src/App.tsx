import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChartCandlestick,
  BriefcaseBusiness,
  Cable,
  ChevronRight,
  DatabaseZap,
  GitCompareArrows,
  FileText,
  FlaskConical,
  Import,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  Mail,
  SearchCheck,
  Settings,
  TableProperties
} from "lucide-react";
import { CustomSelect } from "./components/CustomSelect";
import { generateActionPlan } from "./domain/action-planner";
import { emptyPortfolioInput, loadPortfolioWorkspace, type PortfolioWorkspace } from "./domain/api";
import { getAuthState, onAuthChange, signIn, signOut, signUp, type AuthState } from "./domain/auth";
import { derivePortfolioSnapshot } from "./domain/portfolio";
import type { ActionPlan, PortfolioSnapshot } from "./domain/types";

const PortfolioCommandCenter = lazy(() => import("./routes/PortfolioCommandCenter"));
const MarketRoute = lazy(() => import("./routes/MarketRoute"));
const PortfolioDataRoute = lazy(() => import("./routes/PortfolioDataRoute"));
const DecisionLabRoute = lazy(() => import("./routes/DecisionLabRoute"));
const PositionsRoute = lazy(() => import("./routes/PositionsRoute"));
const ActionPlannerRoute = lazy(() => import("./routes/ActionPlannerRoute"));
const TaxLabRoute = lazy(() => import("./routes/TaxLabRoute"));
const ResearchRoute = lazy(() => import("./routes/ResearchRoute"));
const ImportsRoute = lazy(() => import("./routes/ImportsRoute"));
const BrokerConnectionsRoute = lazy(() => import("./routes/BrokerConnectionsRoute"));
const AlertsRoute = lazy(() => import("./routes/AlertsRoute"));
const ReportsRoute = lazy(() => import("./routes/ReportsRoute"));
const SettingsRoute = lazy(() => import("./routes/SettingsRoute"));

export type RouteId =
  | "overview"
  | "assets"
  | "data"
  | "decision"
  | "positions"
  | "planner"
  | "tax"
  | "research"
  | "imports"
  | "brokers"
  | "alerts"
  | "reports"
  | "settings";

export interface RouteProps {
  snapshot: PortfolioSnapshot;
  actionPlan: ActionPlan;
  accessToken?: string;
  onWorkspaceRefresh: () => Promise<void>;
}

const routes = [
  { id: "overview", label: "Overview", path: "/", group: "Command", description: "Portfolio status and ranked next actions", icon: LayoutDashboard },
  { id: "assets", label: "Assets", path: "/assets", group: "Command", description: "Search, quotes, charts, and switch math", icon: ChartCandlestick },
  { id: "decision", label: "Decisions", path: "/decisions", group: "Command", description: "Hold, sell, rebuy, switch, and cash scenarios", icon: GitCompareArrows },
  { id: "planner", label: "Planner", path: "/planner", group: "Command", description: "Constrained action planning", icon: ListChecks },
  { id: "positions", label: "Positions", path: "/positions", group: "Portfolio Data", description: "Holdings, lots, basis, and quality", icon: TableProperties },
  { id: "data", label: "Data", path: "/data", group: "Portfolio Data", description: "Manual holdings, cash, targets, and FIFO inputs", icon: DatabaseZap },
  { id: "imports", label: "Imports", path: "/imports", group: "Portfolio Data", description: "Broker files and reconciliation queues", icon: Import },
  { id: "brokers", label: "Connections", path: "/connections", group: "Portfolio Data", description: "Broker connections and sync controls", icon: Cable },
  { id: "tax", label: "Tax", path: "/tax", group: "Intelligence", description: "German tax lots, allowances, and loss pots", icon: FlaskConical },
  { id: "research", label: "Research", path: "/research", group: "Intelligence", description: "Cited research runs and copilot", icon: SearchCheck },
  { id: "alerts", label: "Alerts", path: "/alerts", group: "Operations", description: "Portfolio signal rules", icon: Bell },
  { id: "reports", label: "Reports", path: "/reports", group: "Operations", description: "Exports and decision memos", icon: FileText },
  { id: "settings", label: "Settings", path: "/settings", group: "Operations", description: "Account, privacy, and local data", icon: Settings }
] as const satisfies ReadonlyArray<{
  id: RouteId;
  label: string;
  path: string;
  group: "Command" | "Portfolio Data" | "Intelligence" | "Operations";
  description: string;
  icon: typeof LayoutDashboard;
}>;

const routeGroups = ["Command", "Portfolio Data", "Intelligence", "Operations"] as const;

function routeFromPath(pathname: string): RouteId {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/portfolio" || normalized === "/portfolio.html" || normalized === "/overview") return "overview";
  return routes.find((route) => route.path === normalized)?.id || "overview";
}

function routePath(routeId: RouteId): string {
  return routes.find((route) => route.id === routeId)?.path || "/";
}

function Screen({ route, snapshot, actionPlan, accessToken, onWorkspaceRefresh }: RouteProps & { route: RouteId }) {
  const props = { snapshot, actionPlan, accessToken, onWorkspaceRefresh };
  if (route === "assets") return <MarketRoute {...props} />;
  if (route === "data") return <PortfolioDataRoute {...props} />;
  if (route === "decision") return <DecisionLabRoute {...props} />;
  if (route === "positions") return <PositionsRoute {...props} />;
  if (route === "planner") return <ActionPlannerRoute {...props} />;
  if (route === "tax") return <TaxLabRoute {...props} />;
  if (route === "research") return <ResearchRoute {...props} />;
  if (route === "imports") return <ImportsRoute {...props} />;
  if (route === "brokers") return <BrokerConnectionsRoute {...props} />;
  if (route === "alerts") return <AlertsRoute {...props} />;
  if (route === "reports") return <ReportsRoute {...props} />;
  if (route === "settings") return <SettingsRoute {...props} />;
  return <PortfolioCommandCenter {...props} />;
}

function AuthControl({
  auth,
  onAuthUpdate
}: {
  auth: AuthState;
  onAuthUpdate: (auth: AuthState) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const nextAuth = mode === "signin"
        ? await signIn({ email, password })
        : await signUp({ email, password });
      onAuthUpdate(nextAuth);
      setIsOpen(false);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await signOut();
    onAuthUpdate({ configured: auth.configured, session: null, user: null });
  }

  if (!auth.configured) {
    return <span className="auth-chip muted">Demo</span>;
  }

  if (auth.user) {
    return (
      <div className="auth-control">
        <span className="auth-chip">
          <Mail size={14} aria-hidden="true" />
          {auth.user.email || "Signed in"}
        </span>
        <button className="icon-action" type="button" onClick={logout} aria-label="Sign out" title="Sign out">
          <LogOut size={17} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="auth-control">
      <button
        className="auth-button"
        type="button"
        onClick={() => setIsOpen((value) => !value)}
      >
        <LogIn size={16} aria-hidden="true" />
        Sign in
      </button>
      {isOpen ? (
        <form className="auth-popover" onSubmit={submit}>
          <div className="segmented">
            <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Register</button>
          </div>
          <label>
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Password</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Working" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function App() {
  const [activeRoute, setActiveRoute] = useState<RouteId>(() => routeFromPath(window.location.pathname));
  const initialSnapshot = useMemo(() => derivePortfolioSnapshot(emptyPortfolioInput), []);
  const initialActionPlan = useMemo(() => generateActionPlan(initialSnapshot), [initialSnapshot]);
  const [workspaceState, setWorkspaceState] = useState<PortfolioWorkspace>({
    snapshot: initialSnapshot,
    actionPlan: initialActionPlan,
    source: "local-demo"
  });
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [auth, setAuth] = useState<AuthState>({ configured: false, session: null, user: null });
  const snapshot = workspaceState.snapshot;
  const actionPlan = workspaceState.actionPlan;
  const accessToken = auth.session?.access_token;
  const activeRouteMeta = routes.find((route) => route.id === activeRoute) ?? routes[0];

  async function refreshWorkspace(token = accessToken) {
    setIsLoadingWorkspace(true);
    try {
      setWorkspaceState(await loadPortfolioWorkspace(token));
    } finally {
      setIsLoadingWorkspace(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    getAuthState().then((nextAuth) => {
      if (mounted) setAuth(nextAuth);
      return loadPortfolioWorkspace(nextAuth.session?.access_token);
    })
      .then((workspace) => {
        if (mounted) setWorkspaceState(workspace);
      })
      .finally(() => {
        if (mounted) setIsLoadingWorkspace(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => onAuthChange((nextAuth) => {
    setAuth(nextAuth);
    refreshWorkspace(nextAuth.session?.access_token);
  }), []);

  useEffect(() => {
    function syncFromLocation() {
      setActiveRoute(routeFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  function navigate(routeId: RouteId) {
    const nextPath = routePath(routeId);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setActiveRoute(routeId);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="TaxSwitch navigation">
        <a className="brand" href="/" aria-label="TaxSwitch workspace" onClick={(event) => { event.preventDefault(); navigate("overview"); }}>
          <BriefcaseBusiness size={24} aria-hidden="true" />
          <span>
            <strong>TaxSwitch</strong>
            <small>Unified portfolio workspace</small>
          </span>
        </a>
        <nav className="nav-list">
          {routeGroups.map((group) => (
            <section className="nav-section" key={group} aria-label={group}>
              <p className="nav-group-title">{group}</p>
              {routes.filter((route) => route.group === group).map((route) => {
                const Icon = route.icon;
                const isActive = route.id === activeRoute;
                return (
                  <a
                    key={route.id}
                    href={route.path}
                    className={isActive ? "nav-item active" : "nav-item"}
                    onClick={(event) => {
                      event.preventDefault();
                      navigate(route.id);
                    }}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={`${route.label}: ${route.description}`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{route.label}</span>
                    <ChevronRight className="nav-chevron" size={15} aria-hidden="true" />
                  </a>
                );
              })}
            </section>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Germany-first portfolio architecture</p>
            <h1>{activeRouteMeta.label}</h1>
            <p className="topbar-subtitle">{activeRouteMeta.description}</p>
          </div>
          <div className="route-switcher">
            <CustomSelect
              label="Workspace"
              value={activeRoute}
              onChange={(value) => navigate(value as RouteId)}
              options={routes.map((route) => {
                const Icon = route.icon;
                return {
                  value: route.id,
                  label: route.label,
                  description: route.description,
                  icon: <Icon size={16} aria-hidden="true" />
                };
              })}
            />
          </div>
          <div className="status-strip" aria-label="Portfolio status">
            <span>{isLoadingWorkspace ? "Loading" : workspaceState.source}</span>
            <span>{snapshot.openIssueCount} issues</span>
            <span>{actionPlan.actions.length} ranked actions</span>
            <span>{new Date(snapshot.asOf).toLocaleString("de-DE")}</span>
          </div>
          <AuthControl auth={auth} onAuthUpdate={setAuth} />
        </header>
        <main>
          {workspaceState.warning ? <div className="notice-bar">{workspaceState.warning}</div> : null}
          <Suspense fallback={<div className="loading-panel">Loading portfolio workspace...</div>}>
            <Screen key={activeRoute} route={activeRoute} snapshot={snapshot} actionPlan={actionPlan} accessToken={accessToken} onWorkspaceRefresh={() => refreshWorkspace()} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
