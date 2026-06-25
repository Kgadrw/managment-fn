import { statusConfig } from "@/utils/status";
import type { RecordStatus } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: RecordStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", config.bg, config.color, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "active" || status === "completed" ? "bg-success" : status === "overdue" || status === "expired" ? "bg-destructive" : status === "due_soon" || status === "due_today" || status === "pending" ? "bg-warning" : status === "upcoming" ? "bg-info" : "bg-muted-foreground")} />
      {config.label}
    </span>
  );
}
