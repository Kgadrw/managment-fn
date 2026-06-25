import { useEffect, useState } from "react";
import {
  getCurrencyDisplayMode,
  getUsdToFrwRate,
  subscribeCurrencyDisplay,
  type CurrencyDisplayMode,
} from "@/utils/currency";

/** Re-render when display currency or exchange rate changes. */
export function useCurrencyDisplay() {
  const [mode, setMode] = useState<CurrencyDisplayMode>(() => getCurrencyDisplayMode());
  const [rate, setRate] = useState(() => getUsdToFrwRate());

  useEffect(() => {
    return subscribeCurrencyDisplay(() => {
      setMode(getCurrencyDisplayMode());
      setRate(getUsdToFrwRate());
    });
  }, []);

  return { mode, rate };
}
