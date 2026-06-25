import { differenceInDays, isPast, isToday, isFuture, addDays, format, parseISO } from "date-fns";
import type { RecordStatus } from "@/types";

export function getDateStatus(dateStr: string): RecordStatus {
  const date = parseISO(dateStr);
  const daysUntil = differenceInDays(date, new Date());

  if (isToday(date)) return "due_today";
  if (isPast(date)) return "overdue";
  if (daysUntil <= 7) return "due_soon";
  if (daysUntil <= 30) return "upcoming";
  return "active";
}

export function isExpiringSoon(dateStr: string, days = 30): boolean {
  const date = parseISO(dateStr);
  const daysUntil = differenceInDays(date, new Date());
  return daysUntil >= 0 && daysUntil <= days;
}

export function isOverdue(dateStr: string): boolean {
  return isPast(parseISO(dateStr)) && !isToday(parseISO(dateStr));
}

export function isUpcoming(dateStr: string, days = 7): boolean {
  const date = parseISO(dateStr);
  const daysUntil = differenceInDays(date, new Date());
  return daysUntil >= 0 && daysUntil <= days;
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date());
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "MMM dd, yyyy");
}

export function formatRelativeDate(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

export function futureDate(days: number): string {
  return format(addDays(new Date(), days), "yyyy-MM-dd");
}

export function pastDate(days: number): string {
  return format(addDays(new Date(), -days), "yyyy-MM-dd");
}
