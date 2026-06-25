import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DragEvent, MouseEvent } from "react";
import { useState } from "react";
import { readTaskDragId, TASK_DRAG_TYPE } from "@/utils/taskSchedule";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/types";
import { DayScheduleView } from "./DayScheduleView";
import { WeekScheduleView } from "./WeekScheduleView";

export type CalendarView = "day" | "week" | "month" | "year";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const priorityStyles: Record<Reminder["priority"], string> = {
  low: "bg-sky-500/90 text-white",
  medium: "bg-emerald-500/90 text-white",
  high: "bg-amber-500/90 text-white",
  urgent: "bg-rose-500/90 text-white",
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function taskOnDate(task: Reminder, d: Date) {
  if (!task.reminderDate) return false;
  return task.reminderDate.slice(0, 10) === dateKey(d);
}

type Props = {
  tasks: Reminder[];
  view: CalendarView;
  focusDate: Date;
  selectedDate: Date;
  onViewChange: (view: CalendarView) => void;
  onFocusDateChange: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  onSelectTask: (task: Reminder) => void;
  onCreateOnDate: (date: Date, startMinutes?: number) => void;
  onMoveTask: (taskId: string, targetDate: Date, startMinutes?: number) => void;
};

export function TasksCalendar({
  tasks,
  view,
  focusDate,
  selectedDate,
  onViewChange,
  onFocusDateChange,
  onSelectDate,
  onSelectTask,
  onCreateOnDate,
  onMoveTask,
}: Props) {
  const [dragOverDayKey, setDragOverDayKey] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const handleTaskDragStart = (e: DragEvent, taskId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData(TASK_DRAG_TYPE, taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(taskId);
  };

  const handleTaskDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverDayKey(null);
  };

  const handleDayDragOver = (e: DragEvent, dayKey: string) => {
    if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDayKey(dayKey);
  };

  const handleDayDrop = (e: DragEvent, day: Date, startMinutes?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDayKey(null);
    const taskId = readTaskDragId(e.dataTransfer);
    if (taskId) onMoveTask(taskId, day, startMinutes);
  };
  const weekStart = startOfWeek(focusDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);

  const goPrev = () => {
    if (view === "day") onFocusDateChange(addDays(focusDate, -1));
    else if (view === "week") onFocusDateChange(addWeeks(focusDate, -1));
    else if (view === "month") onFocusDateChange(addMonths(focusDate, -1));
    else onFocusDateChange(addYears(focusDate, -1));
  };

  const goNext = () => {
    if (view === "day") onFocusDateChange(addDays(focusDate, 1));
    else if (view === "week") onFocusDateChange(addWeeks(focusDate, 1));
    else if (view === "month") onFocusDateChange(addMonths(focusDate, 1));
    else onFocusDateChange(addYears(focusDate, 1));
  };

  const goToday = () => {
    const today = new Date();
    onFocusDateChange(today);
    onSelectDate(today);
  };

  const headerLabel =
    view === "day"
      ? format(focusDate, "EEEE, MMMM d, yyyy")
      : view === "week"
        ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
        : view === "month"
          ? format(focusDate, "MMMM yyyy")
          : format(focusDate, "yyyy");

  const monthStart = startOfMonth(focusDate);
  const monthEnd = endOfMonth(focusDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const year = focusDate.getFullYear();

  const handleMonthDayClick = (day: Date, e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-task-chip]")) return;
    onSelectDate(day);
    onCreateOnDate(day);
  };

  return (
    <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-base sm:text-lg font-semibold text-foreground ml-1 truncate">{headerLabel}</h2>
        </div>

        <div className="flex rounded-full border bg-muted/40 p-0.5 self-start sm:self-auto overflow-x-auto max-w-full">
          {VIEW_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onViewChange(value)}
              className={cn(
                "rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors",
                view === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <div className="p-2 sm:p-4">
          <div className="grid grid-cols-7 border-b">
            {weekdayLabels.map((w) => (
              <div key={w} className="py-2 text-center text-xs font-medium text-muted-foreground">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const inMonth = isSameMonth(day, focusDate);
              const selected = isSameDay(day, selectedDate);
              const today = isToday(day);
              const dayKey = dateKey(day);
              const dayItems = tasks.filter((t) => taskOnDate(t, day)).slice(0, 3);
              const more = tasks.filter((t) => taskOnDate(t, day)).length - dayItems.length;
              const isDragOver = dragOverDayKey === dayKey;

              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleMonthDayClick(day, e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleMonthDayClick(day, e as unknown as MouseEvent);
                  }}
                  onDragOver={(e) => handleDayDragOver(e, dayKey)}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverDayKey((prev) => (prev === dayKey ? null : prev));
                    }
                  }}
                  onDrop={(e) => handleDayDrop(e, day)}
                  className={cn(
                    "min-h-[72px] sm:min-h-[100px] border-b border-r p-1 text-left transition-colors hover:bg-muted/40 cursor-pointer",
                    !inMonth && "bg-muted/20 text-muted-foreground",
                    selected && "bg-primary/5 ring-1 ring-inset ring-primary/30",
                    today && "bg-blue-50/80",
                    isDragOver && "ring-2 ring-inset ring-primary bg-primary/10",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm",
                      today && "bg-primary text-primary-foreground font-semibold",
                      selected && !today && "bg-primary/15 font-semibold",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayItems.map((t) => (
                      <span
                        key={t.id}
                        data-task-chip
                        draggable
                        onDragStart={(e) => handleTaskDragStart(e, t.id)}
                        onDragEnd={handleTaskDragEnd}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTask(t);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            onSelectTask(t);
                          }
                        }}
                        className={cn(
                          "block w-full truncate rounded px-1.5 py-0.5 text-[10px] sm:text-xs font-medium cursor-grab active:cursor-grabbing",
                          priorityStyles[t.priority],
                          t.status === "completed" && "opacity-50 line-through",
                          draggingTaskId === t.id && "opacity-40",
                        )}
                      >
                        {t.title}
                      </span>
                    ))}
                    {more > 0 && (
                      <span className="block px-1 text-[10px] text-muted-foreground">+{more} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "day" && (
        <div className="p-3 sm:p-4">
          <DayScheduleView
            tasks={tasks}
            day={focusDate}
            onSelectTask={onSelectTask}
            onCreateOnDate={onCreateOnDate}
            onMoveTask={onMoveTask}
            draggingTaskId={draggingTaskId}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
          />
        </div>
      )}

      {view === "week" && (
        <div className="p-2 sm:p-4">
          <WeekScheduleView
            tasks={tasks}
            weekAnchor={focusDate}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            onSelectTask={onSelectTask}
            onCreateOnDate={onCreateOnDate}
            onMoveTask={onMoveTask}
            draggingTaskId={draggingTaskId}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            dragOverDayKey={dragOverDayKey}
            onDayDragOver={handleDayDragOver}
            onDayDragLeave={(dayKey) => setDragOverDayKey((prev) => (prev === dayKey ? null : prev))}
            onDayDrop={handleDayDrop}
          />
        </div>
      )}

      {view === "year" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
          {Array.from({ length: 12 }, (_, m) => {
            const monthDate = new Date(year, m, 1);
            const count = tasks.filter((t) => {
              if (!t.reminderDate) return false;
              const d = new Date(t.reminderDate.slice(0, 10) + "T12:00:00");
              return d.getFullYear() === year && d.getMonth() === m;
            }).length;

            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onFocusDateChange(monthDate);
                  onViewChange("month");
                }}
                className="rounded-2xl border p-3 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors"
              >
                <p className="font-semibold text-sm">{format(monthDate, "MMMM")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {count === 0 ? "No tasks" : `${count} task${count === 1 ? "" : "s"}`}
                </p>
                {count > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
