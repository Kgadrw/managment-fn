const DEFAULT_USD_TO_FRW_RATE = 1300;
const USD_TO_FRW_RATE_STORAGE_KEY = "usd_to_frw_rate";
const CURRENCY_DISPLAY_KEY = "currency_display_mode";

export type CurrencyDisplayMode = "rwf" | "usd" | "both";

let cachedRate: number | null = null;
const displayListeners = new Set<() => void>();

export function getUsdToFrwRate() {
  if (typeof window === "undefined") return DEFAULT_USD_TO_FRW_RATE;
  if (cachedRate != null) return cachedRate;
  const raw = window.localStorage.getItem(USD_TO_FRW_RATE_STORAGE_KEY);
  if (!raw) return DEFAULT_USD_TO_FRW_RATE;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_USD_TO_FRW_RATE;
}

export function setUsdToFrwRate(rate: number) {
  if (typeof window === "undefined") return;
  cachedRate = rate;
  window.localStorage.setItem(USD_TO_FRW_RATE_STORAGE_KEY, String(rate));
}

export function getCurrencyDisplayMode(): CurrencyDisplayMode {
  if (typeof window === "undefined") return "rwf";
  const raw = window.localStorage.getItem(CURRENCY_DISPLAY_KEY);
  if (raw === "usd" || raw === "both" || raw === "rwf") return raw;
  return "rwf";
}

export function setCurrencyDisplayMode(mode: CurrencyDisplayMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENCY_DISPLAY_KEY, mode);
  displayListeners.forEach((fn) => fn());
}

export function subscribeCurrencyDisplay(listener: () => void) {
  displayListeners.add(listener);
  return () => displayListeners.delete(listener);
}

/** Amounts in the database are stored in USD; convert to RWF for display/input. */
export function toDisplayRwf(amountStoredUsd: number) {
  return Math.round(Number(amountStoredUsd || 0) * getUsdToFrwRate());
}

export function fromDisplayRwf(rwf: number) {
  const rate = getUsdToFrwRate();
  return rate > 0 ? Number(rwf || 0) / rate : 0;
}

export function formatUSD(amountStoredUsd: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountStoredUsd);
}

export function formatFRW(amountStoredUsd: number) {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(toDisplayRwf(amountStoredUsd));
}

/** Primary formatter — respects user preference (default RWF). */
export function formatMoney(amountStoredUsd: number) {
  const mode = getCurrencyDisplayMode();
  if (mode === "usd") return formatUSD(amountStoredUsd);
  if (mode === "both") return `${formatFRW(amountStoredUsd)} (${formatUSD(amountStoredUsd)})`;
  return formatFRW(amountStoredUsd);
}

/** @deprecated Use formatMoney */
export function formatDualCurrency(amountStoredUsd: number) {
  return formatMoney(amountStoredUsd);
}

export function formatMoneySecondary(amountStoredUsd: number) {
  const mode = getCurrencyDisplayMode();
  if (mode === "both") return formatUSD(amountStoredUsd);
  if (mode === "usd") return formatFRW(amountStoredUsd);
  return null;
}

export function amountInputLabel() {
  return getCurrencyDisplayMode() === "usd" ? "Amount (USD)" : "Amount (RWF)";
}

export function parseAmountInput(value: number) {
  return getCurrencyDisplayMode() === "usd" ? value : fromDisplayRwf(value);
}

export function amountInputValue(storedUsd: number) {
  if (storedUsd === 0) return "";
  return getCurrencyDisplayMode() === "usd" ? storedUsd : toDisplayRwf(storedUsd);
}
