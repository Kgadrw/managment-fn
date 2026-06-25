import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyHint?: string;
  className?: string;
  disabled?: boolean;
};

export function CreatableSelect({
  value,
  onChange,
  options,
  placeholder = "Select or type custom…",
  searchPlaceholder = "Search or type new…",
  emptyHint = "Type to add a custom value",
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allOptions = useMemo(() => {
    const set = new Set(options.map((o) => o.trim()).filter(Boolean));
    if (value.trim()) set.add(value.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((o) => o.toLowerCase().includes(q));
  }, [allOptions, query]);

  const queryTrim = query.trim();
  const canCreate =
    queryTrim.length > 0 && !allOptions.some((o) => o.toLowerCase() === queryTrim.toLowerCase());

  const pick = (next: string) => {
    onChange(next.trim());
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10 rounded-md",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !canCreate && (
              <CommandEmpty>{emptyHint}</CommandEmpty>
            )}
            {canCreate && (
              <CommandGroup heading="Custom">
                <CommandItem
                  value={`__create__${queryTrim}`}
                  onSelect={() => pick(queryTrim)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  Add &quot;{queryTrim}&quot;
                </CommandItem>
              </CommandGroup>
            )}
            {filtered.length > 0 && (
              <CommandGroup heading={canCreate ? "Existing" : undefined}>
                {filtered.map((opt) => (
                  <CommandItem key={opt} value={opt} onSelect={() => pick(opt)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
