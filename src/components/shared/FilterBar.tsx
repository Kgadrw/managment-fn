import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  onStatusFilterChange?: (v: string) => void;
  statusOptions?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export function FilterBar({
  searchValue, onSearchChange, searchPlaceholder = "Search...",
  statusFilter, onStatusFilterChange, statusOptions,
  children,
}: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] max-w-sm flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 rounded-full"
        />
      </div>
      {(statusOptions && onStatusFilterChange) || children ? (
        <div className="ml-auto flex items-center gap-3">
          {statusOptions && onStatusFilterChange && (
            <Select value={statusFilter || "all"} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-[160px] rounded-full">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {children}
        </div>
      ) : null}
    </div>
  );
}
