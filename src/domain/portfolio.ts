import {
  addMoney,
  minorToNumber,
  money,
  multiplyMoney,
  ratio,
  subtractMoney,
  sumMoney,
  zeroMoney
} from "./money";
import type {
  DataQualityIssue,
  DriftItem,
  MoneyAmount,
  PortfolioInput,
  PortfolioPosition,
  PortfolioSnapshot,
  PositionAnalytics,
  TargetAllocation
} from "./types";

function positionMarketValue(position: PortfolioPosition): MoneyAmount {
  return multiplyMoney(position.price, position.quantity);
}

function estimatedGermanSaleTax(
  gain: MoneyAmount,
  input: PortfolioInput,
  position: PortfolioPosition
): MoneyAmount {
  const taxableGain = Math.max(0, minorToNumber(gain) - minorToNumber(input.saverAllowanceRemaining));
  const partialExemption = position.instrumentType === "etf" ? 0.7 : 1;
  const baseTax = taxableGain * partialExemption * (input.assumptions.capitalGainsTaxPct / 100);
  const solidarity = baseTax * (input.assumptions.solidaritySurchargePct / 100);
  const churchTax = baseTax * (input.assumptions.churchTaxPct / 100);
  return money(input.baseCurrency, baseTax + solidarity + churchTax);
}

function hoursBetween(left: string, right: string): number {
  return Math.abs(new Date(right).getTime() - new Date(left).getTime()) / 3_600_000;
}

function targetForPosition(position: PortfolioPosition, targets: TargetAllocation[]): TargetAllocation | undefined {
  return targets.find((target) => target.symbol === position.symbol)
    ?? targets.find((target) => target.exposureTag && position.exposureTags.includes(target.exposureTag));
}

function issue(
  code: DataQualityIssue["code"],
  severity: DataQualityIssue["severity"],
  title: string,
  detail: string,
  entityType: DataQualityIssue["entityType"],
  entityId: string | undefined,
  detectedAt: string
): DataQualityIssue {
  return {
    id: `${code}-${entityId ?? "portfolio"}`,
    code,
    severity,
    title,
    detail,
    entityType,
    entityId,
    detectedAt
  };
}

function accountIssues(input: PortfolioInput): DataQualityIssue[] {
  return input.accounts.flatMap((account) => {
    const issues: DataQualityIssue[] = [];
    if (account.status === "reconnect_required" || account.status === "disabled") {
      issues.push(
        issue(
          "reconnect_required",
          "critical",
          "Reconnect broker account",
          `${account.name} cannot refresh until the broker consent is repaired.`,
          "account",
          account.id,
          input.asOf
        )
      );
    }
    if (account.staleAfter && new Date(account.staleAfter).getTime() < new Date(input.asOf).getTime()) {
      issues.push(
        issue(
          "sync_failed",
          "warning",
          "Account data is stale",
          `${account.name} is past its expected sync freshness window.`,
          "account",
          account.id,
          input.asOf
        )
      );
    }
    return issues;
  });
}

function positionIssues(
  input: PortfolioInput,
  position: PortfolioPosition,
  target: TargetAllocation | undefined
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  if (minorToNumber(position.costBasis) <= 0 || position.taxLots.length === 0) {
    issues.push(
      issue(
        "missing_basis",
        "critical",
        "Missing tax basis",
        `${position.symbol} cannot produce reliable German FIFO tax output until basis and lots are set.`,
        "position",
        position.id,
        input.asOf
      )
    );
  }
  if (hoursBetween(position.priceAsOf, input.asOf) > input.assumptions.stalePriceHours) {
    issues.push(
      issue(
        "stale_price",
        "warning",
        "Price is stale",
        `${position.symbol} price is older than ${input.assumptions.stalePriceHours} hours.`,
        "price",
        position.id,
        input.asOf
      )
    );
  }
  if (!target) {
    issues.push(
      issue(
        "target_missing",
        "info",
        "No target allocation",
        `${position.symbol} is excluded from drift scoring until a target exists.`,
        "position",
        position.id,
        input.asOf
      )
    );
  }
  if (position.confidence < 0.7) {
    issues.push(
      issue(
        "low_confidence",
        "warning",
        "Low data confidence",
        `${position.symbol} is based on manual or incomplete data.`,
        "position",
        position.id,
        input.asOf
      )
    );
  }
  return issues;
}

export function derivePortfolioSnapshot(input: PortfolioInput): PortfolioSnapshot {
  const positionValues = input.positions.map(positionMarketValue);
  const investedValue = sumMoney(input.baseCurrency, positionValues);
  const cashValue = sumMoney(input.baseCurrency, input.cashBalances.map((cash) => cash.amount));
  const totalValue = addMoney(investedValue, cashValue);
  const totalCostBasis = sumMoney(input.baseCurrency, input.positions.map((position) => position.costBasis));
  const unrealizedGain = subtractMoney(investedValue, totalCostBasis);
  const connectionIssues = accountIssues(input);

  const positions: PositionAnalytics[] = input.positions.map((position) => {
    const marketValue = positionMarketValue(position);
    const gain = subtractMoney(marketValue, position.costBasis);
    const target = targetForPosition(position, input.targets);
    const currentWeightPct = ratio(marketValue, totalValue) * 100;
    const targetWeightPct = target?.targetWeightPct ?? position.targetWeightPct ?? 0;
    return {
      position,
      marketValue,
      unrealizedGain: gain,
      unrealizedGainPct: ratio(gain, position.costBasis) * 100,
      estimatedSaleTax: estimatedGermanSaleTax(gain, input, position),
      currentWeightPct,
      driftPct: currentWeightPct - targetWeightPct,
      dataQualityIssues: positionIssues(input, position, target)
    };
  });

  const drift: DriftItem[] = positions
    .filter((item) => targetForPosition(item.position, input.targets))
    .map((item) => {
      const target = targetForPosition(item.position, input.targets);
      return {
        id: item.position.id,
        label: item.position.symbol,
        currentWeightPct: item.currentWeightPct,
        targetWeightPct: target?.targetWeightPct ?? 0,
        driftPct: item.driftPct,
        marketValue: item.marketValue
      };
    });

  const cashTarget = input.targets.find((target) => target.exposureTag === "Cash");
  if (cashTarget) {
    drift.push({
      id: "cash",
      label: "Cash",
      currentWeightPct: ratio(cashValue, totalValue) * 100,
      targetWeightPct: cashTarget.targetWeightPct,
      driftPct: ratio(cashValue, totalValue) * 100 - cashTarget.targetWeightPct,
      marketValue: cashValue
    });
  }

  const dataQualityIssues = [
    ...connectionIssues,
    ...positions.flatMap((item) => item.dataQualityIssues)
  ];

  const estimatedLiquidationTax = sumMoney(
    input.baseCurrency,
    positions.map((item) => item.estimatedSaleTax)
  );

  const allocationDriftScore = drift.reduce((sum, item) => sum + Math.abs(item.driftPct), 0);
  const concentrationScore = Math.max(
    0,
    ...positions.map((item) => item.currentWeightPct - input.assumptions.concentrationLimitPct)
  );

  return {
    userId: input.userId,
    baseCurrency: input.baseCurrency,
    asOf: input.asOf,
    totalValue,
    investedValue,
    cashValue,
    unrealizedGain,
    unrealizedGainPct: ratio(unrealizedGain, totalCostBasis) * 100,
    estimatedLiquidationTax,
    allocationDriftScore,
    concentrationScore,
    staleDataCount: dataQualityIssues.filter((item) => item.code === "stale_price" || item.code === "stale_fx").length,
    openIssueCount: dataQualityIssues.length,
    accounts: input.accounts,
    brokerConnections: input.brokerConnections,
    positions,
    cashBalances: input.cashBalances,
    targets: input.targets,
    drift,
    dataQualityIssues,
    syncRuns: input.syncRuns
  };
}

export function emptyImpact(currency: string) {
  const zero = zeroMoney(currency);
  return {
    portfolioValueChange: zero,
    estimatedTaxCost: zero,
    turnover: zero,
    driftReductionPct: 0,
    concentrationReductionPct: 0,
    cashChange: zero
  };
}
