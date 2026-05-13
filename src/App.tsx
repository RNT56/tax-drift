import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Cable,
  FileText,
  FlaskConical,
  Import,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  Mail,
  Settings,
  TableProperties
} from "lucide-react";
import { generateActionPlan } from "./domain/action-planner";
import { emptyPortfolioInput, loadPortfolioWorkspace, type PortfolioWorkspace } from "./domain/api";
import { getAuthState, onAuthChange, signIn, signOut, signUp, type AuthState } from "./domain/auth";
import { derivePortfolioSnapshot } from "./domain/portfolio";
import type { ActionPlan, PortfolioSnapshot } from "./domain/types";

const PortfolioCommandCenter = lazy(() => import("./routes/PortfolioCommandCenter"));
const PositionsRoute = lazy(() => import("./routes/PositionsRoute"));
const ActionPlannerRoute = lazy(() => import("./routes/ActionPlannerRoute"));
const TaxLabRoute = lazy(() => import("./routes/TaxLabRoute"));
const ImportsRoute = lazy(() => import("./routes/ImportsRoute"));
const BrokerConnectionsRoute = lazy(() => import("./routes/BrokerConnectionsRoute"));
const AlertsRoute = lazy(() => import("./routes/AlertsRoute"));
const ReportsRoute = lazy(() => import("./routes/ReportsRoute"));
const SettingsRoute = lazy(() => import("./routes/SettingsRoute"));

export type RouteId =
  | "portfolio"
  | "positions"
  | "planner"
  | "tax"
  | "imports"
  | "brokers"
  | "alerts"
  | "reports"
  | "settings";

export interface RouteProps {
  snapshot: PortfolioSnapshot;
  actionPlan: ActionPlan;
}

const routes = [
  { id: "portfolio", label: "Portfolio", icon: LayoutDashboard },
  { id: "positions", label: "Positions", icon: TableProperties },
  { id: "planner", label: "Planner", icon: ListChecks },
  { id: "tax", label: "Tax Lab", icon: FlaskConical },
  { id: "imports", label: "Imports", icon: Import },
  { id: "brokers", label: "Brokers", icon: Cable },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings }
] as const satisfies ReadonlyArray<{ id: RouteId; label: string; icon: typeof LayoutDashboard }>;

function Screen({ route, snapshot, actionPlan }: RouteProps & { route: RouteId }) {
  const props = { snapshot, actionPlan };
  if (route === "positions") return <PositionsRoute {...props} />;
  if (route === "planner") return <ActionPlannerRoute {...props} />;
  if (route === "tax") return <TaxLabRoute {...props} />;
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
  const [activeRoute, setActiveRoute] = useState<RouteId>("portfolio");
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
  const activeLabel = routes.find((route) => route.id === activeRoute)?.label ?? "Portfolio";

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
    setIsLoadingWorkspace(true);
    loadPortfolioWorkspace(nextAuth.session?.access_token)
      .then(setWorkspaceState)
      .finally(() => setIsLoadingWorkspace(false));
  }), []);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="TaxSwitch navigation">
        <a className="brand" href="/portfolio.html" aria-label="TaxSwitch Portfolio Command Center">
          <BriefcaseBusiness size={24} aria-hidden="true" />
          <span>
            <strong>TaxSwitch</strong>
            <small>Portfolio</small>
          </span>
        </a>
        <nav className="nav-list">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = route.id === activeRoute;
            return (
              <button
                key={route.id}
                type="button"
                className={isActive ? "nav-item active" : "nav-item"}
                onClick={() => setActiveRoute(route.id)}
                aria-current={isActive ? "page" : undefined}
                aria-label={route.label}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{route.label}</span>
              </button>
            );
          })}
        </nav>
        <a className="legacy-link" href="/" title="Open the legacy calculator">
          Legacy calculator
        </a>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Germany-first command center</p>
            <h1>{activeLabel}</h1>
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
            <Screen route={activeRoute} snapshot={snapshot} actionPlan={actionPlan} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
