import type { CurrencyCode, MoneyAmount } from "./types";

export const DEFAULT_SCALE = 2;

function pow10(scale: number): bigint {
  return BigInt(10 ** scale);
}

function assertSameCurrency(left: MoneyAmount, right: MoneyAmount) {
  if (left.currency !== right.currency) {
    throw new Error(`Currency mismatch: ${left.currency} vs ${right.currency}`);
  }
}

function alignMinor(amount: MoneyAmount, scale: number): bigint {
  const minor = BigInt(amount.minor);
  if (amount.scale === scale) return minor;
  if (amount.scale < scale) return minor * pow10(scale - amount.scale);
  return minor / pow10(amount.scale - scale);
}

export function money(currency: CurrencyCode, amount: number, scale = DEFAULT_SCALE): MoneyAmount {
  const multiplier = 10 ** scale;
  return {
    currency,
    minor: String(Math.round(amount * multiplier)),
    scale
  };
}

export function zeroMoney(currency: CurrencyCode): MoneyAmount {
  return { currency, minor: "0", scale: DEFAULT_SCALE };
}

export function minorToNumber(amount: MoneyAmount): number {
  return Number(BigInt(amount.minor)) / 10 ** amount.scale;
}

export function addMoney(left: MoneyAmount, right: MoneyAmount): MoneyAmount {
  assertSameCurrency(left, right);
  const scale = Math.max(left.scale, right.scale);
  return {
    currency: left.currency,
    minor: String(alignMinor(left, scale) + alignMinor(right, scale)),
    scale
  };
}

export function subtractMoney(left: MoneyAmount, right: MoneyAmount): MoneyAmount {
  assertSameCurrency(left, right);
  const scale = Math.max(left.scale, right.scale);
  return {
    currency: left.currency,
    minor: String(alignMinor(left, scale) - alignMinor(right, scale)),
    scale
  };
}

export function multiplyMoney(amount: MoneyAmount, factor: number): MoneyAmount {
  return money(amount.currency, minorToNumber(amount) * factor, amount.scale);
}

export function maxMoney(left: MoneyAmount, right: MoneyAmount): MoneyAmount {
  assertSameCurrency(left, right);
  return minorToNumber(left) >= minorToNumber(right) ? left : right;
}

export function minMoney(left: MoneyAmount, right: MoneyAmount): MoneyAmount {
  assertSameCurrency(left, right);
  return minorToNumber(left) <= minorToNumber(right) ? left : right;
}

export function sumMoney(currency: CurrencyCode, amounts: MoneyAmount[]): MoneyAmount {
  return amounts.reduce((total, amount) => addMoney(total, amount), zeroMoney(currency));
}

export function ratio(part: MoneyAmount, whole: MoneyAmount): number {
  assertSameCurrency(part, whole);
  const denominator = minorToNumber(whole);
  if (!denominator) return 0;
  return minorToNumber(part) / denominator;
}

export function formatMoney(amount: MoneyAmount): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: amount.currency,
    maximumFractionDigits: amount.scale
  }).format(minorToNumber(amount));
}

export function formatPct(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "percent",
    maximumFractionDigits: 1,
    minimumFractionDigits: 1
  }).format(value / 100);
}
