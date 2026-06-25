import type { Reminder } from "@/types";

/** Day view runs from 6:00 to 22:00 */
export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 22;
export const DAY_TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
export const DEFAULT_START = "09:00";
export const DEFAULT_END = "10:00";

export type ParsedSchedule = {
  datePart: string;
  startMinutes: number;
  endMinutes: number;
};

function timeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToLabel(total: number) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function parseTaskSchedule(reminderDate: string): ParsedSchedule {
  const raw = (reminderDate || "").trim();
  const datePart = raw.slice(0, 10);

  if (!raw) {
    return {
      datePart,
      startMinutes: timeToMinutes(DEFAULT_START),
      endMinutes: timeToMinutes(DEFAULT_END),
    };
  }

  if (raw.includes("|")) {
    const [startIso, endIso] = raw.split("|");
    const startTime = startIso.includes("T") ? startIso.split("T")[1]?.slice(0, 5) : DEFAULT_START;
    const endTime = endIso.includes("T") ? endIso.split("T")[1]?.slice(0, 5) : DEFAULT_END;
    const startMinutes = timeToMinutes(startTime || DEFAULT_START);
    let endMinutes = timeToMinutes(endTime || DEFAULT_END);
    if (endMinutes <= startMinutes) endMinutes = startMinutes + 60;
    return { datePart: startIso.slice(0, 10) || datePart, startMinutes, endMinutes };
  }

  if (raw.includes("T")) {
    const time = raw.split("T")[1]?.slice(0, 5) || DEFAULT_START;
    const startMinutes = timeToMinutes(time);
    return { datePart, startMinutes, endMinutes: startMinutes + 60 };
  }

  return {
    datePart,
    startMinutes: timeToMinutes(DEFAULT_START),
    endMinutes: timeToMinutes(DEFAULT_END),
  };
}

export const TASK_DRAG_TYPE = "application/x-wegomanage-task";

export function readTaskDragId(dataTransfer: DataTransfer): string | null {
  return dataTransfer.getData(TASK_DRAG_TYPE) || null;
}

export function rescheduleReminderDate(
  reminderDate: string,
  targetDayKey: string,
  startMinutes?: number,
): string {
  const parsed = parseTaskSchedule(reminderDate);
  const start = startMinutes ?? parsed.startMinutes;
  const duration = Math.max(30, parsed.endMinutes - parsed.startMinutes);
  const end = Math.min(DAY_END_HOUR * 60, start + duration);
  return buildReminderDate(
    targetDayKey,
    minutesToTimeString(start),
    minutesToTimeString(Math.max(start + 30, end)),
  );
}

export function buildReminderDate(datePart: string, startTime: string, endTime: string) {
  const start = startTime || DEFAULT_START;
  const end = endTime || DEFAULT_END;
  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);
  if (endM <= startM) {
    return `${datePart}T${start}`;
  }
  return `${datePart}T${start}|${datePart}T${end}`;
}

export function formatTaskTimeRange(reminderDate: string) {
  const { startMinutes, endMinutes } = parseTaskSchedule(reminderDate);
  return `${minutesToLabel(startMinutes)} – ${minutesToLabel(endMinutes)}`;
}

export function scheduleForDay(tasks: Reminder[], dayKey: string) {
  return tasks
    .filter((t) => t.reminderDate && t.reminderDate.slice(0, 10) === dayKey)
    .map((t) => ({ task: t, ...parseTaskSchedule(t.reminderDate) }))
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

/** Position as % within 6am–10pm window */
export function minutesToDayPercent(minutes: number) {
  const start = DAY_START_HOUR * 60;
  const clamped = Math.max(start, Math.min(DAY_END_HOUR * 60, minutes));
  return ((clamped - start) / DAY_TOTAL_MINUTES) * 100;
}

export function minutesToTimeString(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function segmentHeightPercent(startMinutes: number, endMinutes: number) {
  const start = DAY_START_HOUR * 60;
  const end = DAY_END_HOUR * 60;
  const top = Math.max(start, startMinutes);
  const bottom = Math.min(end, endMinutes);
  return Math.max(2, ((bottom - top) / DAY_TOTAL_MINUTES) * 100);
}

/** Snap click position on day grid to 30-minute increments (6am–10pm). */
export function minutesFromGridClick(offsetY: number, gridHeightPx: number) {
  const pct = Math.max(0, Math.min(1, offsetY / gridHeightPx));
  const raw = DAY_START_HOUR * 60 + pct * DAY_TOTAL_MINUTES;
  const snapped = Math.round(raw / 30) * 30;
  const maxStart = DAY_END_HOUR * 60 - 30;
  return Math.max(DAY_START_HOUR * 60, Math.min(maxStart, snapped));
}
