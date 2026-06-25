import { format, isToday } from "date-fns";
import { useEffect, useMemo, useRef, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/types";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  formatTaskTimeRange,
  minutesFromGridClick,
  minutesToDayPercent,
  readTaskDragId,
  scheduleForDay,
  segmentHeightPercent,
  TASK_DRAG_TYPE,
} from "@/utils/taskSchedule";
import { TaskDayMeter } from "./TaskDayMeter";

const HOUR_SLOT_PX = 56;

const priorityStyles: Record<Reminder["priority"], string> = {
  low: "bg-sky-500/90 border-sky-600/30 text-white",
  medium: "bg-emerald-500/90 border-emerald-600/30 text-white",
  high: "bg-amber-500/90 border-amber-600/30 text-white",
  urgent: "bg-rose-500/90 border-rose-600/30 text-white",
};

const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

function hourLabel(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

type Props = {
  tasks: Reminder[];
  day: Date;
  onSelectTask: (task: Reminder) => void;
  onCreateOnDate: (date: Date, startMinutes?: number) => void;
  onMoveTask?: (taskId: string, targetDate: Date, startMinutes?: number) => void;
  draggingTaskId?: string | null;
  onTaskDragStart?: (e: DragEvent, taskId: string) => void;
  onTaskDragEnd?: () => void;
  showMeter?: boolean;
};

export function DayScheduleView({
  tasks,
  day,
  onSelectTask,
  onCreateOnDate,
  onMoveTask,
  draggingTaskId,
  onTaskDragStart,
  onTaskDragEnd,
  showMeter = true,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayKey = format(day, "yyyy-MM-dd");
  const items = useMemo(() => scheduleForDay(tasks, dayKey), [tasks, dayKey]);
  const today = isToday(day);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowInRange = nowMinutes >= DAY_START_HOUR * 60 && nowMinutes <= DAY_END_HOUR * 60;
  const nowTopPct = today && nowInRange ? minutesToDayPercent(nowMinutes) : null;

  const gridHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_SLOT_PX;

  useEffect(() => {
    if (!scrollRef.current || !today || !nowInRange) return;
    const el = scrollRef.current;
    const target = (nowTopPct! / 100) * gridHeight - el.clientHeight / 3;
    el.scrollTop = Math.max(0, target);
  }, [dayKey, today, nowInRange, nowTopPct, gridHeight]);

  return (
    <div className="flex gap-3">
      {showMeter && (
        <div className="hidden sm:flex flex-col items-center pt-8 pb-2 w-10 shrink-0">
          <TaskDayMeter tasks={tasks} day={day} compact />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="sm:hidden">
          <TaskDayMeter tasks={tasks} day={day} />
        </div>

        <div
          ref={scrollRef}
          className="relative max-h-[min(520px,65vh)] overflow-y-auto rounded-2xl border bg-background scrollbar-thin"
        >
          <div className="flex" style={{ minHeight: gridHeight }}>
            <div className="w-14 shrink-0 border-r bg-muted/20">
              {hours.map((h) => (
                <div
                  key={h}
                  className="pr-2 text-right text-[10px] sm:text-xs text-muted-foreground border-b border-border/50"
                  style={{ height: h === DAY_END_HOUR ? 0 : HOUR_SLOT_PX }}
                >
                  {h < DAY_END_HOUR && (
                    <span className="relative -top-2.5 block">{hourLabel(h)}</span>
                  )}
                </div>
              ))}
            </div>

            <div
              className="relative flex-1 cursor-pointer"
              style={{ height: gridHeight }}
              role="presentation"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[data-task-block]")) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const minutes = minutesFromGridClick(e.clientY - rect.top, rect.height);
                onCreateOnDate(day, minutes);
              }}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                const taskId = readTaskDragId(e.dataTransfer);
                if (!taskId || !onMoveTask) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const minutes = minutesFromGridClick(e.clientY - rect.top, rect.height);
                onMoveTask(taskId, day, minutes);
              }}
            >
              {hours.map((h) =>
                h < DAY_END_HOUR ? (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-b border-border/40 pointer-events-none"
                    style={{ top: (h - DAY_START_HOUR) * HOUR_SLOT_PX, height: HOUR_SLOT_PX }}
                  />
                ) : null,
              )}

              {today && nowTopPct != null && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                  style={{ top: `${nowTopPct}%` }}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive -ml-1 shrink-0" />
                  <span className="h-0.5 flex-1 bg-destructive" />
                </div>
              )}

              {items.length === 0 && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center pointer-events-none">
                  Click a time slot to add a task
                </p>
              )}

              {items.map(({ task, startMinutes, endMinutes }) => {
                const top = minutesToDayPercent(startMinutes);
                const height = segmentHeightPercent(startMinutes, endMinutes);
                return (
                  <button
                    key={task.id}
                    type="button"
                    data-task-block
                    draggable={Boolean(onTaskDragStart)}
                    onDragStart={(e) => onTaskDragStart?.(e, task.id)}
                    onDragEnd={() => onTaskDragEnd?.()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(task);
                    }}
                    className={cn(
                      "absolute left-1 right-2 z-10 overflow-hidden rounded-md border px-2 py-1 text-left shadow-sm transition-opacity hover:opacity-95",
                      onTaskDragStart && "cursor-grab active:cursor-grabbing",
                      priorityStyles[task.priority],
                      task.status === "completed" && "opacity-50 line-through",
                      draggingTaskId === task.id && "opacity-40",
                    )}
                    style={{ top: `${top}%`, height: `${height}%`, minHeight: 28 }}
                  >
                    <p className="text-xs font-semibold truncate leading-tight">{task.title}</p>
                    <p className="text-[10px] opacity-90 truncate">{formatTaskTimeRange(task.reminderDate)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
