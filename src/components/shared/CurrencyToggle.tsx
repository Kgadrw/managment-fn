import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setCurrencyDisplayMode, type CurrencyDisplayMode } from "@/utils/currency";
import { useCurrencyDisplay } from "@/hooks/useCurrencyDisplay";

export function CurrencyToggle({ className }: { className?: string }) {
  const { mode } = useCurrencyDisplay();

  return (
    <Select
      value={mode}
      onValueChange={(v) => setCurrencyDisplayMode(v as CurrencyDisplayMode)}
    >
      <SelectTrigger className={className ?? "w-[130px] h-9 rounded-full text-xs"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="rwf">RWF</SelectItem>
        <SelectItem value="usd">USD</SelectItem>
        <SelectItem value="both">RWF + USD</SelectItem>
      </SelectContent>
    </Select>
  );
}
