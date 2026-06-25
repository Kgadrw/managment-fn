import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/types";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  DAY_TOTAL_MINUTES,
  minutesToDayPercent,
  scheduleForDay,
} from "@/utils/taskSchedule";

const priorityFill: Record<Reminder["priority"], string> = {
  low: "bg-sky-500",
  medium: "bg-emerald-500",
  high: "bg-amber-500",
  urgent: "bg-rose-500",
};

type Props = {
  tasks: Reminder[];
  day: Date;
  className?: string;
  compact?: boolean;
};

export function TaskDayMeter({ tasks, day, className, compact }: Props) {
  const dayKey = format(day, "yyyy-MM-dd");
  const items = scheduleForDay(tasks, dayKey);
  const now = new Date();
  const showNow = isToday(day);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowPct =
    nowMinutes >= DAY_START_HOUR * 60 && nowMinutes <= DAY_END_HOUR * 60
      ? minutesToDayPercent(nowMinutes)
      : null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {!compact && (
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Day overview</p>
      )}
      <div
        className={cn(
          "relative rounded-full bg-muted/60 overflow-hidden border",
          compact ? "w-3 min-h-[120px] mx-auto" : "w-full h-3 sm:h-4",
        )}
        role="img"
        aria-label="Task schedule meter for the day"
      >
        {!compact ? (
          <>
            {items.map(({ task, startMinutes, endMinutes }) => (
              <span
                key={task.id}
                className={cn(
                  "absolute top-0 bottom-0 rounded-sm opacity-90",
                  priorityFill[task.priority],
                  task.status === "completed" && "opacity-40",
                )}
                style={{
                  left: `${minutesToDayPercent(startMinutes)}%`,
                  width: `${Math.max(3, ((Math.min(endMinutes, DAY_END_HOUR * 60) - Math.max(startMinutes, DAY_START_HOUR * 60)) / DAY_TOTAL_MINUTES) * 100)}%`,
                }}
              />
            ))}
            {showNow && nowPct != null && (
              <span
                className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
                style={{ left: `${nowPct}%` }}
                title="Now"
              />
            )}
          </>
        ) : (
          <>
            {items.map(({ task, startMinutes, endMinutes }) => (
              <span
                key={task.id}
                className={cn(
                  "absolute left-0 right-0 rounded-sm opacity-90",
                  priorityFill[task.priority],
                  task.status === "completed" && "opacity-40",
                )}
                style={{
                  top: `${minutesToDayPercent(startMinutes)}%`,
                  height: `${Math.max(4, ((Math.min(endMinutes, DAY_END_HOUR * 60) - Math.max(startMinutes, DAY_START_HOUR * 60)) / DAY_TOTAL_MINUTES) * 100)}%`,
                }}
              />
            ))}
            {showNow && nowPct != null && (
              <span
                className="absolute left-0 right-0 h-0.5 bg-destructive z-10"
                style={{ top: `${nowPct}%` }}
              />
            )}
          </>
        )}
      </div>
      {!compact && (
        <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
          <span>{DAY_START_HOUR}am</span>
          <span>{DAY_END_HOUR > 12 ? DAY_END_HOUR - 12 : DAY_END_HOUR}pm</span>
        </div>
      )}
    </div>
  );
}
