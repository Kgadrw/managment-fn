import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  amountInputLabel,
  amountInputValue,
  getCurrencyDisplayMode,
  parseAmountInput,
} from "@/utils/currency";
import { useCurrencyDisplay } from "@/hooks/useCurrencyDisplay";

type Props = {
  storedUsd: number;
  onChange: (storedUsd: number) => void;
  id?: string;
  className?: string;
};

/** Amount field: shows RWF by default, converts to stored USD for the API. */
export function AmountInput({ storedUsd, onChange, id, className }: Props) {
  useCurrencyDisplay();
  const label = amountInputLabel();

  return (
    <div className={className ?? "grid gap-2"}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        placeholder="0"
        value={amountInputValue(storedUsd)}
        onChange={(e) => {
          const raw = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(parseAmountInput(raw));
        }}
      />
      {getCurrencyDisplayMode() === "rwf" && (
        <p className="text-xs text-muted-foreground mt-1">Converted using your exchange rate in Settings.</p>
      )}
    </div>
  );
}
