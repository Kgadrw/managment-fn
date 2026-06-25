import { addDays, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { useMemo, type DragEvent, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/types";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  formatTaskTimeRange,
  minutesFromGridClick,
  minutesToDayPercent,
  scheduleForDay,
  segmentHeightPercent,
} from "@/utils/taskSchedule";

const HOUR_SLOT_PX = 48;
const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

function hourLabel(h: number) {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

const priorityStyles: Record<Reminder["priority"], string> = {
  low: "bg-sky-500/90 border-sky-600/30 text-white",
  medium: "bg-emerald-500/90 border-emerald-600/30 text-white",
  high: "bg-amber-500/90 border-amber-600/30 text-white",
  urgent: "bg-rose-500/90 border-rose-600/30 text-white",
};

type Props = {
  tasks: Reminder[];
  weekAnchor: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectTask: (task: Reminder) => void;
  onCreateOnDate: (date: Date, startMinutes?: number) => void;
  onMoveTask: (taskId: string, targetDate: Date, startMinutes?: number) => void;
  draggingTaskId?: string | null;
  onTaskDragStart: (e: DragEvent, taskId: string) => void;
  onTaskDragEnd: () => void;
  dragOverDayKey?: string | null;
  onDayDragOver: (e: DragEvent, dayKey: string) => void;
  onDayDragLeave: (dayKey: string) => void;
  onDayDrop: (e: DragEvent, day: Date, startMinutes?: number) => void;
};

export function WeekScheduleView({
  tasks,
  weekAnchor,
  selectedDate,
  onSelectDate,
  onSelectTask,
  onCreateOnDate,
  draggingTaskId,
  onTaskDragStart,
  onTaskDragEnd,
  dragOverDayKey,
  onDayDragOver,
  onDayDragLeave,
  onDayDrop,
}: Props) {
  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 0 });
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const gridHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_SLOT_PX;

  const handleColumnClick = (day: Date, e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-task-block]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = minutesFromGridClick(e.clientY - rect.top, rect.height);
    onSelectDate(day);
    onCreateOnDate(day, minutes);
  };

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[44px_repeat(7,1fr)] border-b">
          <div />
          {weekDays.map((day) => {
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDate(day)}
                className={cn(
                  "py-2 text-center border-l transition-colors",
                  selected && "bg-primary/10",
                  today && !selected && "bg-blue-50/80",
                )}
              >
                <p className="text-[10px] uppercase text-muted-foreground">{format(day, "EEE")}</p>
                <p
                  className={cn(
                    "text-sm font-semibold inline-flex h-7 w-7 items-center justify-center rounded-full mx-auto",
                    today && "bg-primary text-primary-foreground",
                    selected && !today && "bg-primary/20",
                  )}
                >
                  {format(day, "d")}
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-[44px_repeat(7,1fr)]">
          <div className="border-r bg-muted/20">
            {hours.map((h) => (
              <div
                key={h}
                className="pr-1 text-right text-[9px] text-muted-foreground border-b border-border/40"
                style={{ height: h === DAY_END_HOUR ? 0 : HOUR_SLOT_PX }}
              >
                {h < DAY_END_HOUR && <span className="relative -top-2 block">{hourLabel(h)}</span>}
              </div>
            ))}
          </div>

          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const items = scheduleForDay(tasks, dayKey);
            const today = isToday(day);
            const selected = isSameDay(day, selectedDate);

            return (
              <div
                key={dayKey}
                role="presentation"
                onClick={(e) => handleColumnClick(day, e)}
                onDragOver={(e) => onDayDragOver(e, dayKey)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) onDayDragLeave(dayKey);
                }}
                onDrop={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minutes = minutesFromGridClick(e.clientY - rect.top, rect.height);
                  onDayDrop(e, day, minutes);
                }}
                className={cn(
                  "relative border-l cursor-pointer hover:bg-muted/20 transition-colors",
                  selected && "bg-primary/5",
                  today && "bg-blue-50/30",
                  dragOverDayKey === dayKey && "ring-2 ring-inset ring-primary bg-primary/10",
                )}
                style={{ height: gridHeight }}
              >
                {hours.map((h) =>
                  h < DAY_END_HOUR ? (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-b border-border/30 pointer-events-none"
                      style={{ top: (h - DAY_START_HOUR) * HOUR_SLOT_PX, height: HOUR_SLOT_PX }}
                    />
                  ) : null,
                )}

                {items.map(({ task, startMinutes, endMinutes }) => (
                  <button
                    key={task.id}
                    type="button"
                    data-task-block
                    draggable
                    onDragStart={(e) => onTaskDragStart(e, task.id)}
                    onDragEnd={onTaskDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(task);
                    }}
                    className={cn(
                      "absolute left-0.5 right-0.5 z-10 overflow-hidden rounded px-1 py-0.5 text-left text-[9px] shadow-sm border cursor-grab active:cursor-grabbing",
                      priorityStyles[task.priority],
                      task.status === "completed" && "opacity-50 line-through",
                      draggingTaskId === task.id && "opacity-40",
                    )}
                    style={{
                      top: `${minutesToDayPercent(startMinutes)}%`,
                      height: `${segmentHeightPercent(startMinutes, endMinutes)}%`,
                      minHeight: 18,
                    }}
                  >
                    <span className="font-semibold truncate block">{task.title}</span>
                    <span className="opacity-90 truncate block">{formatTaskTimeRange(task.reminderDate)}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
