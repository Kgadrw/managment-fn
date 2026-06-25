import { addDays, format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import type { Product, RentRecord, Subscription } from "@/types";
import type { FinanceObligation, FinancePayment } from "@/types/finance";
import { daysUntil, isOverdue } from "@/utils/date";

export function monthlyEquivalentUsd(amount: number, cycle: "monthly" | "quarterly" | "yearly") {
  if (cycle === "monthly") return amount;
  if (cycle === "quarterly") return amount / 3;
  return amount / 12;
}

export function buildObligations(subscriptions: Subscription[], rentRecords: RentRecord[]): FinanceObligation[] {
  const items: FinanceObligation[] = [];

  for (const s of subscriptions) {
    if (s.status !== "active") continue;
    const days = daysUntil(s.renewalDate);
    items.push({
      id: s.id,
      type: "subscription",
      label: s.name,
      sublabel: s.provider,
      dueDate: s.renewalDate,
      amountUsd: s.amount,
      monthlyEquivalentUsd: monthlyEquivalentUsd(s.amount, s.billingCycle),
      status: isOverdue(s.renewalDate) ? "overdue" : days <= 14 ? "due_soon" : "upcoming",
      payerName: s.payerName || undefined,
    });
  }

  for (const r of rentRecords) {
    if (r.status === "completed" || r.status === "inactive") continue;
    const days = daysUntil(r.dueDate);
    items.push({
      id: r.id,
      type: "rent",
      label: r.title,
      sublabel: r.propertyType,
      dueDate: r.dueDate,
      amountUsd: r.rentAmount,
      monthlyEquivalentUsd: monthlyEquivalentUsd(r.rentAmount, r.paymentFrequency),
      status: isOverdue(r.dueDate) ? "overdue" : days <= 14 ? "due_soon" : "upcoming",
      payerName: r.payerName || undefined,
    });
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function obligationsInDays(obligations: FinanceObligation[], maxDays: number) {
  return obligations.filter((o) => {
    const d = daysUntil(o.dueDate);
    return d <= maxDays;
  });
}

export function sumUsd(items: { amountUsd: number }[]) {
  return items.reduce((s, x) => s + x.amountUsd, 0);
}

export function sumMonthlyRecurring(subscriptions: Subscription[], rentRecords: RentRecord[]) {
  let total = 0;
  for (const s of subscriptions) {
    if (s.status === "active") total += monthlyEquivalentUsd(s.amount, s.billingCycle);
  }
  for (const r of rentRecords) {
    if (r.status === "active") total += monthlyEquivalentUsd(r.rentAmount, r.paymentFrequency);
  }
  return total;
}

export function inventoryCapex(products: Product[], year?: number) {
  const y = year ?? new Date().getFullYear();
  return products
    .filter((p) => parseISO(p.purchaseDate).getFullYear() === y)
    .reduce((s, p) => s + p.purchaseCost, 0);
}

export function totalAssetValue(products: Product[]) {
  return products.reduce((s, p) => s + p.purchaseCost, 0);
}

export function paymentsThisMonth(payments: FinancePayment[]) {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return payments.filter((p) => {
    const d = parseISO(p.paidAt);
    return isWithinInterval(d, { start, end });
  });
}

export function forecastByMonth(obligations: FinanceObligation[], months = 6) {
  const buckets: { month: string; subscription: number; rent: number; total: number }[] = [];
  const today = new Date();
  for (let i = 0; i < months; i++) {
    const start = startOfMonth(addDays(today, i * 28));
    const end = endOfMonth(start);
    const key = format(start, "MMM yyyy");
    let subscription = 0;
    let rent = 0;
    for (const o of obligations) {
      const d = parseISO(o.dueDate);
      if (!isWithinInterval(d, { start, end })) continue;
      if (o.type === "subscription") subscription += o.amountUsd;
      else rent += o.amountUsd;
    }
    buckets.push({ month: key, subscription, rent, total: subscription + rent });
  }
  return buckets;
}

export function exportFinanceCsv(opts: {
  obligations: FinanceObligation[];
  payments: FinancePayment[];
  usdToFrw: number;
  companyName?: string;
}) {
  const lines: string[] = [];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rwf = (usd: number) => Math.round(usd * opts.usdToFrw);

  lines.push("WegoConnect Finance Export");
  if (opts.companyName) lines.push(`Company,${esc(opts.companyName)}`);
  lines.push(`Generated,${esc(format(new Date(), "yyyy-MM-dd HH:mm"))}`);
  lines.push(`USD to RWF rate,${opts.usdToFrw}`);
  lines.push("");

  lines.push("UPCOMING OBLIGATIONS");
  lines.push("Type,Name,Due Date,Amount RWF,Amount USD,Status,Payer");
  for (const o of opts.obligations) {
    lines.push(
      [
        o.type,
        o.label,
        o.dueDate,
        rwf(o.amountUsd),
        o.amountUsd.toFixed(2),
        o.status,
        o.payerName ?? "",
      ].map(esc).join(","),
    );
  }
  lines.push("");

  lines.push("TRANSACTIONS");
  lines.push("Date,In/Out,Category,Description,Amount RWF,Amount USD,Method,Reference,Notes");
  for (const p of opts.payments) {
    const kind = p.kind === "income" ? "in" : "out";
    lines.push(
      [
        p.paidAt.slice(0, 10),
        kind,
        p.category ?? "",
        p.description,
        rwf(p.amountUsd),
        p.amountUsd.toFixed(2),
        p.paymentMethod,
        p.reference,
        p.notes,
      ].map(esc).join(","),
    );
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finance-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
