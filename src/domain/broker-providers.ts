import type {
  BrokerConnection,
  BrokerProviderId,
  PortfolioAccount,
  PortfolioPosition,
  SyncRun
} from "./types";

export interface StartConnectionResult {
  provider: BrokerProviderId;
  redirectUrl?: string;
  connectionId?: string;
  expiresAt?: string;
}

export interface BrokerProviderAdapter {
  readonly id: BrokerProviderId;
  readonly displayName: string;
  readonly supportsRefresh: boolean;
  readonly supportsConnectionPortal: boolean;
  startConnection(userId: string): Promise<StartConnectionResult>;
  listConnections(userId: string): Promise<BrokerConnection[]>;
  syncAccounts(connectionId: string): Promise<PortfolioAccount[]>;
  syncHoldings(accountId: string): Promise<PortfolioPosition[]>;
  syncTransactions(accountId: string): Promise<SyncRun>;
  refreshConnection(connectionId: string): Promise<SyncRun>;
  disconnect(connectionId: string): Promise<void>;
}

export class ManualImportProvider implements BrokerProviderAdapter {
  readonly id = "manual";
  readonly displayName = "Manual or CSV import";
  readonly supportsRefresh = false;
  readonly supportsConnectionPortal = false;

  async startConnection(userId: string): Promise<StartConnectionResult> {
    return {
      provider: this.id,
      connectionId: `manual-${userId}`,
      expiresAt: undefined
    };
  }

  async listConnections(_userId: string): Promise<BrokerConnection[]> {
    return [];
  }

  async syncAccounts(_connectionId: string): Promise<PortfolioAccount[]> {
    return [];
  }

  async syncHoldings(_accountId: string): Promise<PortfolioPosition[]> {
    return [];
  }

  async syncTransactions(_accountId: string): Promise<SyncRun> {
    return this.manualSyncRun("manual-import");
  }

  async refreshConnection(connectionId: string): Promise<SyncRun> {
    return this.manualSyncRun(connectionId);
  }

  async disconnect(_connectionId: string): Promise<void> {
    return undefined;
  }

  private manualSyncRun(connectionId: string): SyncRun {
    return {
      id: `sync-${connectionId}`,
      provider: this.id,
      connectionId,
      status: "succeeded",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      accountsSeen: 0,
      holdingsSeen: 0,
      transactionsSeen: 0
    };
  }
}

export class SnapTradeReadOnlyProvider implements BrokerProviderAdapter {
  readonly id = "snaptrade";
  readonly displayName = "SnapTrade";
  readonly supportsRefresh = true;
  readonly supportsConnectionPortal = true;

  constructor(private readonly connectionPortalBaseUrl?: string) {}

  async startConnection(userId: string): Promise<StartConnectionResult> {
    return {
      provider: this.id,
      redirectUrl: this.connectionPortalBaseUrl
        ? `${this.connectionPortalBaseUrl}?userId=${encodeURIComponent(userId)}&scope=read`
        : undefined,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString()
    };
  }

  async listConnections(_userId: string): Promise<BrokerConnection[]> {
    return [];
  }

  async syncAccounts(_connectionId: string): Promise<PortfolioAccount[]> {
    return [];
  }

  async syncHoldings(_accountId: string): Promise<PortfolioPosition[]> {
    return [];
  }

  async syncTransactions(accountId: string): Promise<SyncRun> {
    return this.syncRun(accountId, "succeeded");
  }

  async refreshConnection(connectionId: string): Promise<SyncRun> {
    return this.syncRun(connectionId, "queued");
  }

  async disconnect(_connectionId: string): Promise<void> {
    return undefined;
  }

  private syncRun(connectionId: string, status: SyncRun["status"]): SyncRun {
    return {
      id: `snaptrade-${connectionId}-${Date.now()}`,
      provider: this.id,
      connectionId,
      status,
      startedAt: new Date().toISOString(),
      accountsSeen: 0,
      holdingsSeen: 0,
      transactionsSeen: 0
    };
  }
}

export function createBrokerProvider(provider: BrokerProviderId): BrokerProviderAdapter {
  if (provider === "snaptrade") {
    return new SnapTradeReadOnlyProvider(import.meta.env.VITE_SNAPTRADE_PORTAL_BASE_URL);
  }
  return new ManualImportProvider();
}
