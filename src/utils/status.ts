import type { RecordStatus } from "@/types";

export const statusConfig: Record<RecordStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-success", bg: "bg-success/10" },
  inactive: { label: "Inactive", color: "text-muted-foreground", bg: "bg-muted" },
  upcoming: { label: "Upcoming", color: "text-info", bg: "bg-info/10" },
  due_soon: { label: "Due Soon", color: "text-warning", bg: "bg-warning/10" },
  due_today: { label: "Due Today", color: "text-primary", bg: "bg-primary/10" },
  overdue: { label: "Overdue", color: "text-destructive", bg: "bg-destructive/10" },
  expired: { label: "Expired", color: "text-destructive", bg: "bg-destructive/10" },
  completed: { label: "Completed", color: "text-success", bg: "bg-success/10" },
  pending: { label: "Pending", color: "text-warning", bg: "bg-warning/10" },
};

export const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-muted-foreground", bg: "bg-muted" },
  medium: { label: "Medium", color: "text-info", bg: "bg-info/10" },
  high: { label: "High", color: "text-warning", bg: "bg-warning/10" },
  urgent: { label: "Urgent", color: "text-destructive", bg: "bg-destructive/10" },
};
