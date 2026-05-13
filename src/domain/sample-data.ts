import { money } from "./money";
import type { PortfolioInput } from "./types";

const now = new Date("2026-05-12T08:00:00.000Z").toISOString();

export const demoPortfolioInput: PortfolioInput = {
  userId: "demo-user",
  baseCurrency: "EUR",
  asOf: now,
  saverAllowanceRemaining: money("EUR", 621),
  assumptions: {
    capitalGainsTaxPct: 25,
    solidaritySurchargePct: 5.5,
    churchTaxPct: 0,
    concentrationLimitPct: 22,
    stalePriceHours: 36
  },
  brokerConnections: [
    {
      id: "conn-scalable",
      userId: "demo-user",
      provider: "snaptrade",
      institutionName: "Scalable Capital",
      status: "active",
      externalConnectionId: "snap-demo-1",
      consentGrantedAt: "2026-05-01T09:00:00.000Z",
      lastSyncedAt: "2026-05-12T06:10:00.000Z",
      scopes: ["accounts.read", "holdings.read", "transactions.read"]
    },
    {
      id: "conn-ing",
      userId: "demo-user",
      provider: "snaptrade",
      institutionName: "ING",
      status: "reconnect_required",
      externalConnectionId: "snap-demo-2",
      consentGrantedAt: "2026-02-18T09:00:00.000Z",
      reconnectRequiredAt: "2026-05-10T07:00:00.000Z",
      scopes: ["accounts.read", "holdings.read", "transactions.read"],
      message: "Consent token expired. Reconnect before relying on allocations."
    }
  ],
  accounts: [
    {
      id: "acct-taxable-1",
      userId: "demo-user",
      name: "Scalable Taxable",
      provider: "snaptrade",
      brokerConnectionId: "conn-scalable",
      externalAccountId: "acc-1001",
      currency: "EUR",
      taxTreatment: "taxable_de",
      status: "active",
      consentGrantedAt: "2026-05-01T09:00:00.000Z",
      lastSyncedAt: "2026-05-12T06:10:00.000Z",
      staleAfter: "2026-05-13T06:10:00.000Z"
    },
    {
      id: "acct-taxable-2",
      userId: "demo-user",
      name: "ING ETF Depot",
      provider: "snaptrade",
      brokerConnectionId: "conn-ing",
      externalAccountId: "acc-1002",
      currency: "EUR",
      taxTreatment: "taxable_de",
      status: "reconnect_required",
      consentGrantedAt: "2026-02-18T09:00:00.000Z",
      lastSyncedAt: "2026-05-09T05:00:00.000Z",
      staleAfter: "2026-05-10T05:00:00.000Z"
    },
    {
      id: "acct-manual",
      userId: "demo-user",
      name: "Manual Watchlist",
      provider: "manual",
      currency: "EUR",
      taxTreatment: "taxable_de",
      status: "active"
    }
  ],
  positions: [
    {
      id: "pos-sap",
      accountId: "acct-taxable-1",
      symbol: "SAP.DE",
      name: "SAP SE",
      isin: "DE0007164600",
      instrumentType: "stock",
      quantity: 90,
      price: money("EUR", 188.24),
      priceAsOf: "2026-05-12T06:05:00.000Z",
      costBasis: money("EUR", 11880),
      taxLots: [
        {
          id: "lot-sap-1",
          accountId: "acct-taxable-1",
          positionId: "pos-sap",
          acquiredAt: "2020-03-18",
          quantity: 55,
          unitCost: money("EUR", 112),
          costBasis: money("EUR", 6160),
          source: "broker",
          fifoRank: 1,
          germanTax: { lossPot: "equity" }
        },
        {
          id: "lot-sap-2",
          accountId: "acct-taxable-1",
          positionId: "pos-sap",
          acquiredAt: "2022-09-20",
          quantity: 35,
          unitCost: money("EUR", 163.43),
          costBasis: money("EUR", 5720),
          source: "broker",
          fifoRank: 2,
          germanTax: { lossPot: "equity" }
        }
      ],
      sector: "Software",
      country: "Germany",
      exposureTags: ["Germany", "Single stock", "EUR"],
      targetWeightPct: 14,
      source: "broker",
      confidence: 0.98
    },
    {
      id: "pos-aapl",
      accountId: "acct-taxable-1",
      symbol: "AAPL",
      name: "Apple Inc.",
      isin: "US0378331005",
      instrumentType: "stock",
      quantity: 80,
      price: money("EUR", 196.9),
      priceAsOf: "2026-05-12T06:05:00.000Z",
      costBasis: money("EUR", 6120),
      taxLots: [
        {
          id: "lot-aapl-1",
          accountId: "acct-taxable-1",
          positionId: "pos-aapl",
          acquiredAt: "2019-11-04",
          quantity: 80,
          unitCost: money("EUR", 76.5),
          costBasis: money("EUR", 6120),
          source: "import",
          fifoRank: 1,
          germanTax: { lossPot: "equity", withholdingTaxPaid: money("EUR", 84.2) }
        }
      ],
      sector: "Technology",
      country: "United States",
      exposureTags: ["United States", "Single stock", "USD"],
      targetWeightPct: 12,
      source: "broker",
      confidence: 0.95
    },
    {
      id: "pos-iwda",
      accountId: "acct-taxable-2",
      symbol: "IWDA",
      name: "iShares Core MSCI World UCITS ETF",
      isin: "IE00B4L5Y983",
      instrumentType: "etf",
      quantity: 225,
      price: money("EUR", 99.4),
      priceAsOf: "2026-05-09T04:50:00.000Z",
      costBasis: money("EUR", 21450),
      taxLots: [
        {
          id: "lot-iwda-1",
          accountId: "acct-taxable-2",
          positionId: "pos-iwda",
          acquiredAt: "2021-01-08",
          quantity: 225,
          unitCost: money("EUR", 95.33),
          costBasis: money("EUR", 21450),
          source: "broker",
          fifoRank: 1,
          germanTax: {
            partialExemptionPct: 30,
            lossPot: "other",
            vorabpauschaleBasis: money("EUR", 362.14)
          }
        }
      ],
      sector: "Global equity",
      country: "Global",
      exposureTags: ["Global equity", "ETF", "USD"],
      targetWeightPct: 42,
      source: "broker",
      confidence: 0.83
    },
    {
      id: "pos-emim",
      accountId: "acct-manual",
      symbol: "EMIM",
      name: "iShares Core MSCI Emerging Markets IMI UCITS ETF",
      isin: "IE00BKM4GZ66",
      instrumentType: "etf",
      quantity: 310,
      price: money("EUR", 31.2),
      priceAsOf: "2026-05-11T09:30:00.000Z",
      costBasis: money("EUR", 0),
      taxLots: [],
      sector: "Emerging markets",
      country: "Global",
      exposureTags: ["Emerging markets", "ETF", "USD"],
      targetWeightPct: 18,
      source: "manual",
      confidence: 0.61
    },
    {
      id: "pos-adidas",
      accountId: "acct-taxable-1",
      symbol: "ADS.DE",
      name: "adidas AG",
      isin: "DE000A1EWWW0",
      instrumentType: "stock",
      quantity: 42,
      price: money("EUR", 179.2),
      priceAsOf: "2026-05-12T06:05:00.000Z",
      costBasis: money("EUR", 8925),
      taxLots: [
        {
          id: "lot-adidas-1",
          accountId: "acct-taxable-1",
          positionId: "pos-adidas",
          acquiredAt: "2024-02-12",
          quantity: 42,
          unitCost: money("EUR", 212.5),
          costBasis: money("EUR", 8925),
          source: "broker",
          fifoRank: 1,
          germanTax: { lossPot: "equity" }
        }
      ],
      sector: "Consumer discretionary",
      country: "Germany",
      exposureTags: ["Germany", "Single stock", "EUR"],
      targetWeightPct: 4,
      source: "broker",
      confidence: 0.98
    }
  ],
  cashBalances: [
    {
      id: "cash-scalable",
      accountId: "acct-taxable-1",
      currency: "EUR",
      amount: money("EUR", 18420),
      asOf: "2026-05-12T06:10:00.000Z"
    },
    {
      id: "cash-ing",
      accountId: "acct-taxable-2",
      currency: "EUR",
      amount: money("EUR", 1360),
      asOf: "2026-05-09T05:00:00.000Z"
    }
  ],
  targets: [
    {
      id: "target-world",
      scope: "portfolio",
      label: "Developed markets ETF",
      exposureTag: "Global equity",
      targetWeightPct: 42,
      minWeightPct: 35,
      maxWeightPct: 48
    },
    {
      id: "target-em",
      scope: "portfolio",
      label: "Emerging markets ETF",
      exposureTag: "Emerging markets",
      targetWeightPct: 18,
      minWeightPct: 14,
      maxWeightPct: 22
    },
    {
      id: "target-sap",
      scope: "portfolio",
      label: "SAP",
      symbol: "SAP.DE",
      targetWeightPct: 14,
      maxWeightPct: 18
    },
    {
      id: "target-aapl",
      scope: "portfolio",
      label: "Apple",
      symbol: "AAPL",
      targetWeightPct: 12,
      maxWeightPct: 15
    },
    {
      id: "target-adidas",
      scope: "portfolio",
      label: "adidas",
      symbol: "ADS.DE",
      targetWeightPct: 4,
      maxWeightPct: 7
    },
    {
      id: "target-cash",
      scope: "portfolio",
      label: "Cash reserve",
      exposureTag: "Cash",
      targetWeightPct: 10,
      minWeightPct: 6,
      maxWeightPct: 14
    }
  ],
  syncRuns: [
    {
      id: "sync-001",
      provider: "snaptrade",
      connectionId: "conn-scalable",
      status: "succeeded",
      startedAt: "2026-05-12T06:00:00.000Z",
      finishedAt: "2026-05-12T06:10:00.000Z",
      accountsSeen: 1,
      holdingsSeen: 3,
      transactionsSeen: 18
    },
    {
      id: "sync-002",
      provider: "snaptrade",
      connectionId: "conn-ing",
      status: "failed",
      startedAt: "2026-05-12T06:00:00.000Z",
      finishedAt: "2026-05-12T06:01:00.000Z",
      accountsSeen: 0,
      holdingsSeen: 0,
      transactionsSeen: 0,
      errorCode: "reconnect_required",
      errorMessage: "Provider token expired"
    }
  ]
};
