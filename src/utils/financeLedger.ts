import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import type { FinanceTransaction, FinanceTransactionKind } from "@/types/finance";

export function sumByKind(transactions: FinanceTransaction[], kind: FinanceTransactionKind) {
  return transactions
    .filter((t) => t.kind === kind)
    .reduce((s, t) => s + t.amountUsd, 0);
}

export function transactionsInMonth(transactions: FinanceTransaction[], monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = startOfMonth(new Date(y, m - 1, 1));
  const end = endOfMonth(start);
  return transactions.filter((t) => {
    const d = parseISO(t.paidAt);
    return isWithinInterval(d, { start, end });
  });
}

export function monthlySummaryTable(transactions: FinanceTransaction[], months = 6) {
  const rows: { month: string; monthKey: string; income: number; expense: number; net: number }[] = [];
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = format(d, "yyyy-MM");
    const inMonth = transactionsInMonth(transactions, monthKey);
    const income = sumByKind(inMonth, "income");
    const expense = sumByKind(inMonth, "expense");
    rows.push({
      month: format(d, "MMMM yyyy"),
      monthKey,
      income,
      expense,
      net: income - expense,
    });
  }
  return rows;
}

export function categoryBreakdown(
  transactions: FinanceTransaction[],
  kind: FinanceTransactionKind,
  monthKey?: string,
) {
  const list = monthKey ? transactionsInMonth(transactions, monthKey) : transactions;
  const map = new Map<string, number>();
  for (const t of list.filter((x) => x.kind === kind)) {
    const cat = t.category?.trim() || "General";
    map.set(cat, (map.get(cat) ?? 0) + t.amountUsd);
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function currentMonthKey() {
  return format(new Date(), "yyyy-MM");
}

export function dailyExpenseBreakdown(transactions: FinanceTransaction[], monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = endOfMonth(new Date(y, m - 1, 1)).getDate();
  const expenses = transactionsInMonth(transactions, monthKey).filter((t) => t.kind === "expense");
  const byDay = new Map<string, number>();

  for (const t of expenses) {
    const dayKey = format(parseISO(t.paidAt), "yyyy-MM-dd");
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + t.amountUsd);
  }

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayKey = `${monthKey}-${String(day).padStart(2, "0")}`;
    return {
      day: dayKey,
      label: String(day),
      amount: byDay.get(dayKey) ?? 0,
    };
  });
}
