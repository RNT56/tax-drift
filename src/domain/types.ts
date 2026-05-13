export type CurrencyCode = "EUR" | "USD" | "GBP" | string;

export interface MoneyAmount {
  currency: CurrencyCode;
  minor: string;
  scale: number;
}

export type BrokerProviderId = "manual" | "import" | "snaptrade";

export type ConnectionStatus =
  | "active"
  | "pending"
  | "stale"
  | "reconnect_required"
  | "disabled";

export type AccountTaxTreatment = "taxable_de" | "tax_deferred" | "tax_exempt" | "unknown";

export interface PortfolioAccount {
  id: string;
  userId: string;
  name: string;
  provider: BrokerProviderId;
  brokerConnectionId?: string;
  externalAccountId?: string;
  currency: CurrencyCode;
  taxTreatment: AccountTaxTreatment;
  status: ConnectionStatus;
  consentGrantedAt?: string;
  lastSyncedAt?: string;
  staleAfter?: string;
}

export interface BrokerConnection {
  id: string;
  userId: string;
  provider: BrokerProviderId;
  institutionName: string;
  status: ConnectionStatus;
  externalConnectionId?: string;
  consentGrantedAt?: string;
  lastSyncedAt?: string;
  reconnectRequiredAt?: string;
  scopes: string[];
  message?: string;
}

export interface TaxLot {
  id: string;
  accountId: string;
  positionId: string;
  acquiredAt: string;
  quantity: number;
  unitCost: MoneyAmount;
  costBasis: MoneyAmount;
  source: "broker" | "import" | "manual" | "estimated";
  fifoRank: number;
  germanTax: {
    partialExemptionPct?: number;
    lossPot?: "equity" | "other" | "none";
    withholdingTaxPaid?: MoneyAmount;
    vorabpauschaleBasis?: MoneyAmount;
  };
}

export interface DataQualityIssue {
  id: string;
  severity: "info" | "warning" | "critical";
  code:
    | "missing_basis"
    | "stale_price"
    | "stale_fx"
    | "sync_failed"
    | "duplicate_import"
    | "target_missing"
    | "reconnect_required"
    | "low_confidence";
  title: string;
  detail: string;
  entityType: "portfolio" | "account" | "position" | "lot" | "transaction" | "price";
  entityId?: string;
  detectedAt: string;
}

export interface PortfolioPosition {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  isin?: string;
  instrumentType: "stock" | "etf" | "fund" | "bond" | "crypto" | "cash_like";
  quantity: number;
  price: MoneyAmount;
  priceAsOf: string;
  fxRateToBase?: number;
  costBasis: MoneyAmount;
  taxLots: TaxLot[];
  sector?: string;
  country?: string;
  exposureTags: string[];
  targetWeightPct?: number;
  source: "broker" | "import" | "manual";
  confidence: number;
}

export interface CashBalance {
  id: string;
  accountId: string;
  currency: CurrencyCode;
  amount: MoneyAmount;
  asOf: string;
}

export interface TargetAllocation {
  id: string;
  scope: "portfolio" | "account";
  scopeId?: string;
  label: string;
  symbol?: string;
  exposureTag?: string;
  targetWeightPct: number;
  minWeightPct?: number;
  maxWeightPct?: number;
}

export interface SyncRun {
  id: string;
  provider: BrokerProviderId;
  connectionId?: string;
  status: "queued" | "running" | "succeeded" | "failed" | "partial";
  startedAt: string;
  finishedAt?: string;
  accountsSeen: number;
  holdingsSeen: number;
  transactionsSeen: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface PortfolioInput {
  userId: string;
  baseCurrency: CurrencyCode;
  accounts: PortfolioAccount[];
  brokerConnections: BrokerConnection[];
  positions: PortfolioPosition[];
  cashBalances: CashBalance[];
  targets: TargetAllocation[];
  syncRuns: SyncRun[];
  asOf: string;
  saverAllowanceRemaining: MoneyAmount;
  assumptions: {
    capitalGainsTaxPct: number;
    solidaritySurchargePct: number;
    churchTaxPct: number;
    concentrationLimitPct: number;
    stalePriceHours: number;
  };
}

export interface PositionAnalytics {
  position: PortfolioPosition;
  marketValue: MoneyAmount;
  unrealizedGain: MoneyAmount;
  unrealizedGainPct: number;
  estimatedSaleTax: MoneyAmount;
  currentWeightPct: number;
  driftPct: number;
  dataQualityIssues: DataQualityIssue[];
}

export interface DriftItem {
  id: string;
  label: string;
  currentWeightPct: number;
  targetWeightPct: number;
  driftPct: number;
  marketValue: MoneyAmount;
}

export interface PortfolioSnapshot {
  userId: string;
  baseCurrency: CurrencyCode;
  asOf: string;
  totalValue: MoneyAmount;
  investedValue: MoneyAmount;
  cashValue: MoneyAmount;
  unrealizedGain: MoneyAmount;
  unrealizedGainPct: number;
  estimatedLiquidationTax: MoneyAmount;
  allocationDriftScore: number;
  concentrationScore: number;
  staleDataCount: number;
  openIssueCount: number;
  accounts: PortfolioAccount[];
  brokerConnections: BrokerConnection[];
  positions: PositionAnalytics[];
  cashBalances: CashBalance[];
  targets: TargetAllocation[];
  drift: DriftItem[];
  dataQualityIssues: DataQualityIssue[];
  syncRuns: SyncRun[];
}

export type ActionKind =
  | "do_nothing"
  | "refresh_reconnect"
  | "set_missing_basis"
  | "rebalance"
  | "trim_concentration"
  | "harvest_loss"
  | "deploy_cash"
  | "review_tax_drag";

export interface ActionImpact {
  portfolioValueChange: MoneyAmount;
  estimatedTaxCost: MoneyAmount;
  turnover: MoneyAmount;
  driftReductionPct: number;
  concentrationReductionPct: number;
  cashChange: MoneyAmount;
}

export interface ActionItem {
  id: string;
  kind: ActionKind;
  rank: number;
  title: string;
  reason: string;
  confidence: number;
  impact: ActionImpact;
  requiredInputs: string[];
  relatedEntityIds: string[];
  userDecision: "review" | "ready" | "blocked";
}

export interface ActionPlanConstraints {
  maxTaxCost: MoneyAmount;
  maxTurnoverPct: number;
  minTradeValue: MoneyAmount;
  cashReserve: MoneyAmount;
  taxableAccountsOnly: boolean;
}

export interface ActionPlan {
  id: string;
  userId: string;
  generatedAt: string;
  constraints: ActionPlanConstraints;
  summary: {
    beforeDriftScore: number;
    afterDriftScore: number;
    beforeEstimatedTax: MoneyAmount;
    afterEstimatedTax: MoneyAmount;
    expectedTurnover: MoneyAmount;
    blockedActionCount: number;
  };
  actions: ActionItem[];
}

export type ResearchConfidence = "low" | "medium" | "high";
export type ResearchRunStatus =
  | "fallback"
  | "partial"
  | "complete"
  | "partial+ai"
  | "complete+ai";

export interface ResearchSubject {
  id?: string;
  userId?: string;
  symbol: string;
  name: string;
  isin?: string;
  exchange?: string;
  currency?: CurrencyCode;
  instrumentType: "stock" | "etf" | "fund" | string;
  providerSymbols?: Record<string, string>;
  issuerUrls?: Array<{ url: string; name?: string }>;
  metadata?: Record<string, unknown>;
}

export interface ResearchSourceStatus {
  sourceType: string;
  sourceName: string;
  status: "available" | "partial" | "not-found" | "not-configured" | "premium-key-missing" | "provider-unavailable" | "source-error" | string;
  configured: boolean;
  freshness: string;
  premium: boolean;
  message?: string;
  checkedAt?: string;
}

export interface ResearchSourceSnapshot {
  id: string;
  runId?: string;
  sourceType: string;
  sourceName: string;
  status: string;
  url?: string;
  fetchedAt?: string;
  sourceDate?: string;
  freshness?: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export interface ResearchEvidence {
  id: string;
  runId?: string;
  sourceSnapshotId?: string;
  category: string;
  claim: string;
  evidence: string;
  sourceUrl?: string;
  sourceName: string;
  sourceDate?: string;
  confidence: ResearchConfidence;
  thesisImpact: string;
  sourceEvidenceIds: string[];
  metadata?: Record<string, unknown>;
}

export interface ResearchMetric {
  id?: string;
  runId?: string;
  category: string;
  label: string;
  value: number | null;
  textValue?: string;
  unit?: string;
  period?: string;
  sourceEvidenceIds: string[];
  metadata?: Record<string, unknown>;
}

export interface ResearchEvent {
  id: string;
  runId?: string;
  type: string;
  title: string;
  summary?: string;
  occurredAt?: string;
  sourceName: string;
  sourceUrl?: string;
  severity: "low" | "medium" | "high" | string;
  directness: number;
  riskScore: number;
  affectedCountries: string[];
  affectedSectors: string[];
  sourceEvidenceIds: string[];
  metadata?: Record<string, unknown>;
}

export interface ResearchAiPayload {
  provider?: string;
  model?: string;
  summary?: string;
  sections?: Record<string, { title: string; bullets: string[] }>;
  contradictionCheck?: {
    summary?: string;
    invalidatingEvidence?: string[];
    keyQuestions?: string[];
    sourceEvidenceIds?: string[];
  };
  scenarioGenerator?: {
    summary?: string;
    cases?: Array<Record<string, unknown>>;
  };
  assumptionCritic?: {
    summary?: string;
    drivers?: Array<Record<string, unknown>>;
  };
  reportNarrative?: {
    title?: string;
    memo?: string;
  };
  watchRuleGenerator?: {
    summary?: string;
    suggestions?: Array<Record<string, unknown>>;
  };
  errors?: string[];
}

export interface ResearchCopilotThread {
  id: string;
  userId?: string;
  runId?: string;
  subjectId?: string;
  title: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResearchCopilotMessage {
  id: string;
  userId?: string;
  threadId: string;
  runId?: string;
  role: "user" | "assistant";
  content: string;
  sourceEvidenceIds: string[];
  sourceRequests: Array<{ type: string; reason: string }>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface ResearchRun {
  id: string;
  userId?: string;
  subjectId: string;
  targetSubjectId?: string;
  subject: ResearchSubject;
  targetSubject?: ResearchSubject | null;
  thesis?: string;
  status: ResearchRunStatus | string;
  generatedAt: string;
  completedAt?: string;
  horizon?: string;
  sourcePolicy?: Record<string, unknown>;
  coverage: ResearchSourceStatus[];
  summary: {
    title?: string;
    nonAdvisory?: boolean;
    sections?: Record<string, { title: string; bullets: string[] }>;
    topRisks?: ResearchEvent[];
    sourceCounts?: Record<string, number>;
    aiSummary?: string;
  };
  aiPayload?: ResearchAiPayload;
  sourceErrors: string[];
  sourceSnapshots?: ResearchSourceSnapshot[];
  evidence?: ResearchEvidence[];
  metrics?: ResearchMetric[];
  events?: ResearchEvent[];
  copilotThreads?: ResearchCopilotThread[];
}

export interface ResearchStatus {
  scope: string[];
  advisoryMode: "non-advisory" | string;
  configured: Record<string, unknown>;
  capabilities: Record<string, string>;
}
