import { useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  GripVertical,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { TasksCalendar, type CalendarView } from "@/components/tasks/TasksCalendar";
import { TaskDayMeter } from "@/components/tasks/TaskDayMeter";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { MobileFormSteps } from "@/components/shared/MobileFormSteps";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import type { RecordStatus, Reminder } from "@/types";
import { formatDate, formatRelativeDate } from "@/utils/date";
import {
  buildReminderDate,
  DAY_END_HOUR,
  DAY_START_HOUR,
  DEFAULT_END,
  DEFAULT_START,
  formatTaskTimeRange,
  minutesToTimeString,
  parseTaskSchedule,
  rescheduleReminderDate,
  scheduleForDay,
  TASK_DRAG_TYPE,
} from "@/utils/taskSchedule";

const defaultTask: Omit<Reminder, "id" | "createdAt"> = {
  title: "",
  relatedType: "general",
  relatedId: null,
  reminderDate: "",
  priority: "medium",
  status: "pending",
  message: "",
  pinned: false,
  sortOrder: 0,
};

const statusOpts = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

const priorityOpts = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function taskOnDate(task: Reminder, d: Date) {
  if (!task.reminderDate) return false;
  return task.reminderDate.slice(0, 10) === format(d, "yyyy-MM-dd");
}

function sortTasksForDay(tasks: Reminder[], dayKey: string) {
  const scheduled = scheduleForDay(tasks, dayKey);
  const pinnedFirst = scheduled.sort((a, b) => {
    if (a.task.pinned !== b.task.pinned) return a.task.pinned ? -1 : 1;
    if (a.task.sortOrder !== b.task.sortOrder) return a.task.sortOrder - b.task.sortOrder;
    return 0;
  });
  return pinnedFirst.map((x) => x.task);
}

export default function TasksPage() {
  const { reminders, addReminder, updateReminder, deleteReminder, reorderReminders, isLoading, error } =
    useStore();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const [view, setView] = useState<CalendarView>("month");
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "true");
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [formData, setFormData] = useState(defaultTask);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(DEFAULT_END);

  const selectedDayKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDayTasks = useMemo(
    () => sortTasksForDay(reminders, selectedDayKey),
    [reminders, selectedDayKey],
  );

  const applyScheduleToForm = (datePart: string, start: string, end: string) => {
    setScheduleDate(datePart);
    setStartTime(start);
    setEndTime(end);
    setFormData((prev) => ({
      ...prev,
      reminderDate: buildReminderDate(datePart, start, end),
    }));
  };

  const openCreate = (date?: Date, startMinutes?: number) => {
    const d = date ?? selectedDate;
    const datePart = format(d, "yyyy-MM-dd");
    let start = DEFAULT_START;
    let end = DEFAULT_END;
    if (startMinutes != null) {
      const snapped = Math.max(
        DAY_START_HOUR * 60,
        Math.min(DAY_END_HOUR * 60 - 60, Math.round(startMinutes / 30) * 30),
      );
      start = minutesToTimeString(snapped);
      end = minutesToTimeString(snapped + 60);
    }
    setEditing(null);
    setFormData({ ...defaultTask, reminderDate: buildReminderDate(datePart, start, end) });
    applyScheduleToForm(datePart, start, end);
    setSelectedDate(d);
    setFocusDate(d);
    setFormOpen(true);
  };

  const openEdit = (task: Reminder) => {
    const parsed = parseTaskSchedule(task.reminderDate);
    setEditing(task);
    setFormData({
      title: task.title,
      relatedType: task.relatedType,
      relatedId: task.relatedId,
      reminderDate: task.reminderDate,
      priority: task.priority,
      status: task.status,
      message: task.message,
      pinned: task.pinned,
      sortOrder: task.sortOrder,
    });
    applyScheduleToForm(
      parsed.datePart,
      minutesToTimeString(parsed.startMinutes),
      minutesToTimeString(parsed.endMinutes),
    );
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...formData,
      reminderDate: buildReminderDate(scheduleDate, startTime, endTime),
    };
    try {
      if (editing) await updateReminder(editing.id, payload);
      else await addReminder(payload);
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async (id: string) => {
    setCompletingId(id);
    try {
      await updateReminder(id, { status: "completed" });
    } finally {
      setCompletingId(null);
    }
  };

  const togglePin = async (task: Reminder) => {
    await updateReminder(task.id, { pinned: !task.pinned });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteReminder(deleteId);
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveTask = async (taskId: string, targetDate: Date, startMinutes?: number) => {
    const task = reminders.find((t) => t.id === taskId);
    if (!task?.reminderDate) return;

    const targetDayKey = format(targetDate, "yyyy-MM-dd");
    const currentDayKey = task.reminderDate.slice(0, 10);
    const parsed = parseTaskSchedule(task.reminderDate);
    if (currentDayKey === targetDayKey && (startMinutes == null || startMinutes === parsed.startMinutes)) {
      return;
    }

    const newReminderDate = rescheduleReminderDate(task.reminderDate, targetDayKey, startMinutes);
    await updateReminder(taskId, { reminderDate: newReminderDate });
    setSelectedDate(targetDate);
    setFocusDate(targetDate);
    toast.success(`Moved to ${format(targetDate, "MMM d")}`);
  };

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = selectedDayTasks.map((t) => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    setDragId(null);
    await reorderReminders(next);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setFocusDate(date);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">{reminders.length} total tasks</p>
          {isLoading && <p className="text-xs text-muted-foreground mt-1">Loading…</p>}
          {!isLoading && error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <Button onClick={() => openCreate()} className="gap-1.5 self-start">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <TasksCalendar
          tasks={reminders}
          view={view}
          focusDate={focusDate}
          selectedDate={selectedDate}
          onViewChange={setView}
          onFocusDateChange={setFocusDate}
          onSelectDate={handleSelectDate}
          onSelectTask={openEdit}
          onCreateOnDate={(date, startMinutes) => openCreate(date, startMinutes)}
          onMoveTask={(taskId, targetDate, startMinutes) => void handleMoveTask(taskId, targetDate, startMinutes)}
        />

        <aside className="rounded-3xl border bg-card shadow-sm overflow-hidden h-fit">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{format(selectedDate, "EEEE")}</p>
            <p className="text-lg font-bold">{format(selectedDate, "MMMM d, yyyy")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedDayTasks.length} task{selectedDayTasks.length === 1 ? "" : "s"}
              {isToday(selectedDate) && " · Today"}
            </p>
          </div>

          <TaskDayMeter tasks={reminders} day={selectedDate} className="px-4 pb-3 border-b" />

          {selectedDayTasks.length === 0 ? (
            <EmptyState
              title="No tasks this day"
              icon={<CalendarDays className="h-8 w-8 text-muted-foreground" />}
              action={
                <Button size="sm" variant="outline" onClick={() => openCreate()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add task
                </Button>
              }
            />
          ) : (
            <ul className="divide-y max-h-[420px] overflow-y-auto scrollbar-thin">
              {selectedDayTasks.map((task) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(task.id);
                    e.dataTransfer.setData(TASK_DRAG_TYPE, task.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void handleDrop(task.id)}
                  className={cn(
                    "group flex gap-2 p-3 hover:bg-muted/40 transition-colors",
                    dragId === task.id && "opacity-50",
                  )}
                >
                  <button
                    type="button"
                    className="mt-1 text-muted-foreground cursor-grab active:cursor-grabbing"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <button type="button" className="flex-1 min-w-0 text-left" onClick={() => openEdit(task)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                      <span
                        className={cn(
                          "font-medium text-sm truncate",
                          task.status === "completed" && "line-through text-muted-foreground",
                        )}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </div>
                    {task.message && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.message}</p>
                    )}
                    <p className="text-[10px] font-medium text-primary/80 mt-1">
                      {formatTaskTimeRange(task.reminderDate)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatRelativeDate(task.reminderDate.slice(0, 10))}
                    </p>
                  </button>
                  <div className="flex flex-col gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => void togglePin(task)}
                      title={task.pinned ? "Unpin" : "Pin"}
                    >
                      {task.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </Button>
                    {task.status !== "completed" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-success"
                        onClick={() => void markComplete(task.id)}
                        disabled={completingId === task.id}
                        title="Complete"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(task)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteId(task.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          {isMobile ? (
            <MobileFormSteps
              primaryLabel={editing ? "Save Changes" : "Add Task"}
              onPrimary={() => void handleSave()}
              primaryDisabled={saving}
              isLoading={saving}
              onClose={() => setFormOpen(false)}
              steps={[
                {
                  key: "basic",
                  title: "Basic",
                  canContinue: () => !!formData.title.trim(),
                  content: (
                    <>
                      <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Related Type</Label>
                        <Select
                          value={formData.relatedType}
                          onValueChange={(v) =>
                            setFormData({ ...formData, relatedType: v as Reminder["relatedType"] })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="product">Inventory</SelectItem>
                            <SelectItem value="subscription">Subscription</SelectItem>
                            <SelectItem value="rent">Rent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => applyScheduleToForm(e.target.value, startTime, endTime)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label>Start</Label>
                          <Input
                            type="time"
                            value={startTime}
                            onChange={(e) => applyScheduleToForm(scheduleDate, e.target.value, endTime)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>End</Label>
                          <Input
                            type="time"
                            value={endTime}
                            onChange={(e) => applyScheduleToForm(scheduleDate, startTime, e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  ),
                },
                {
                  key: "details",
                  title: "Details",
                  content: (
                    <>
                      <div className="grid gap-2">
                        <Label>Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(v) =>
                            setFormData({ ...formData, priority: v as Reminder["priority"] })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorityOpts.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(v) => setFormData({ ...formData, status: v as RecordStatus })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOpts.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          rows={4}
                        />
                      </div>
                    </>
                  ),
                },
              ]}
            />
          ) : null}

          <div className={cn("grid gap-3 mt-1", isMobile && "hidden")}>
            <div>
              <Label>Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Related Type</Label>
                <Select
                  value={formData.relatedType}
                  onValueChange={(v) => setFormData({ ...formData, relatedType: v as Reminder["relatedType"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="product">Inventory</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => applyScheduleToForm(e.target.value, startTime, endTime)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => applyScheduleToForm(scheduleDate, e.target.value, endTime)}
                />
              </div>
              <div>
                <Label>End time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => applyScheduleToForm(scheduleDate, startTime, e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as Reminder["priority"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOpts.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as RecordStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOpts.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
              />
            </div>
            <Button onClick={() => void handleSave()} className="w-full" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null);
        }}
        onConfirm={() => void confirmDelete()}
        isLoading={deleting}
        confirmLabel="Delete"
      />
    </div>
  );
}
