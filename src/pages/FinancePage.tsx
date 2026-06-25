import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  Download,
  Pencil,
  PiggyBank,
  Plus,
  Settings2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useBoardStore } from "@/store/useBoardStore";
import { useStore } from "@/store/useStore";
import { api } from "@/lib/api";
import {
  formatMoney,
  formatMoneySecondary,
  getUsdToFrwRate,
  setUsdToFrwRate,
  amountInputLabel,
  amountInputValue,
  parseAmountInput,
} from "@/utils/currency";
import { useCurrencyDisplay } from "@/hooks/useCurrencyDisplay";
import { CurrencyToggle } from "@/components/shared/CurrencyToggle";
import { CreatableSelect } from "@/components/shared/CreatableSelect";
import {
  EXPENSE_CATEGORY_PRESETS,
  INCOME_CATEGORY_PRESETS,
  PAYMENT_METHOD_PRESETS,
  PAYROLL_ROLE_PRESETS,
} from "@/constants/fieldPresets";
import { mergeOptions } from "@/utils/creatableOptions";
import {
  buildObligations,
  exportFinanceCsv,
  obligationsInDays,
} from "@/utils/finance";
import {
  categoryBreakdown,
  currentMonthKey,
  monthlySummaryTable,
  sumByKind,
  transactionsInMonth,
} from "@/utils/financeLedger";
import type {
  FinanceBudgetOverview,
  FinanceSourceType,
  FinanceTransaction,
  FinanceTransactionKind,
  PayrollRecord,
  PayrollStatus,
} from "@/types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatRelativeDate } from "@/utils/date";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const emptyForm = () => ({
  kind: "expense" as FinanceTransactionKind,
  category: "",
  sourceType: "other" as FinanceSourceType,
  sourceId: "",
  description: "",
  amountUsd: "",
  paidAt: new Date().toISOString().slice(0, 10),
  paymentMethod: "",
  reference: "",
  notes: "",
});

const emptyPayrollForm = (payPeriod: string) => ({
  employeeName: "",
  role: "",
  payPeriod,
  payDate: new Date().toISOString().slice(0, 10),
  amountUsd: "",
  paymentMethod: "",
  reference: "",
  status: "paid" as PayrollStatus,
  notes: "",
});

const BUDGET_PIE_COLORS = ["hsl(0, 72%, 55%)", "hsl(142, 55%, 45%)", "hsl(0, 84%, 38%)"];

const payrollStatusStyle: Record<PayrollStatus, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  scheduled: "bg-sky-100 text-sky-800",
};

function SummaryStat({
  label,
  value,
  hint,
  valueClassName,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
  icon: typeof Wallet;
}) {
  return (
    <Card className="rounded-2xl border-0 bg-muted/40">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-foreground mb-2">
          <Icon className="h-5 w-5" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className={cn("text-2xl font-bold tabular-nums", valueClassName ?? "text-foreground")}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

function MoneyAmount({
  amountUsd,
  kind,
  className,
}: {
  amountUsd: number;
  kind: FinanceTransactionKind;
  className?: string;
}) {
  const isIn = kind === "income";
  return (
    <div className={cn("flex items-center justify-end gap-1.5 font-semibold tabular-nums", className)}>
      {isIn ? (
        <ArrowUpCircle className="h-4 w-4 text-emerald-600 shrink-0" />
      ) : (
        <ArrowDownCircle className="h-4 w-4 text-red-600 shrink-0" />
      )}
      <span className={isIn ? "text-emerald-700" : "text-red-700"}>
        {isIn ? "+" : "−"}
        {formatMoney(amountUsd)}
      </span>
    </div>
  );
}

function TransactionTable({
  rows,
  loading,
  emptyMessage,
  onEdit,
  onDelete,
}: {
  rows: FinanceTransaction[];
  loading: boolean;
  emptyMessage: string;
  onEdit: (t: FinanceTransaction) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="w-[88px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.id}>
            <TableCell>
              <div>{formatDate(t.paidAt)}</div>
              <div className="text-xs text-muted-foreground">{formatRelativeDate(t.paidAt)}</div>
            </TableCell>
            <TableCell className="font-medium max-w-[200px]">{t.description}</TableCell>
            <TableCell>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  t.kind === "income" ? "bg-emerald-100 text-emerald-800" : "bg-red-50 text-red-800",
                )}
              >
                {t.category}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <MoneyAmount amountUsd={t.amountUsd} kind={t.kind} />
              <div className="text-xs text-muted-foreground font-normal">{formatMoneySecondary(t.amountUsd)}</div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {t.paymentMethod || "—"}
              {t.reference ? ` · ${t.reference}` : ""}
            </TableCell>
            <TableCell>
              <div className="flex gap-0.5">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onDelete(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function FinancePage() {
  useCurrencyDisplay();
  const { subscriptions, rentRecords } = useStore();
  const { workspace, refreshWorkspace } = useBoardStore();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthView, setMonthView] = useState(currentMonthKey());
  const [budgetOverview, setBudgetOverview] = useState<FinanceBudgetOverview | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [payrollDialogOpen, setPayrollDialogOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [payrollForm, setPayrollForm] = useState(emptyPayrollForm(currentMonthKey()));
  const [payrollSaving, setPayrollSaving] = useState(false);
  const [payrollFilterMonth, setPayrollFilterMonth] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, overview, payrollList] = await Promise.all([
        api.get<FinanceTransaction[]>("/api/finance/transactions"),
        api.get<FinanceBudgetOverview>(`/api/finance/budget/overview?month=${monthView}`),
        api.get<PayrollRecord[]>("/api/finance/payroll"),
      ]);
      setTransactions(list.map((t) => ({ ...t, kind: t.kind === "income" ? "income" : "expense", category: t.category || "General" })));
      setBudgetOverview(overview);
      setBudgetInput(overview.amountUsd != null ? String(amountInputValue(overview.amountUsd)) : "");
      setPayroll(payrollList);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load finances");
    } finally {
      setLoading(false);
    }
  }, [monthView]);

  useEffect(() => {
    void refreshWorkspace();
  }, [refreshWorkspace]);

  useEffect(() => {
    void load();
    void api
      .get<{ usdToFrwRate?: number }>("/api/config")
      .then((cfg) => {
        if (typeof cfg?.usdToFrwRate === "number" && cfg.usdToFrwRate > 0) setUsdToFrwRate(cfg.usdToFrwRate);
      })
      .catch(() => undefined);
  }, [load]);

  const obligations = useMemo(() => buildObligations(subscriptions, rentRecords), [subscriptions, rentRecords]);
  const upcoming = useMemo(() => obligationsInDays(obligations, horizon), [obligations, horizon]);
  const usdToFrw = getUsdToFrwRate();

  const monthTx = useMemo(() => transactionsInMonth(transactions, monthView), [transactions, monthView]);
  const monthIncome = sumByKind(monthTx, "income");
  const monthExpense = sumByKind(monthTx, "expense");
  const monthNet = monthIncome - monthExpense;
  const budgetUsd = budgetOverview?.amountUsd ?? null;
  const teamExpenseUsd = budgetOverview?.teamExpenseUsd ?? monthExpense;
  const budgetRemaining = budgetOverview?.remainingUsd ?? (budgetUsd != null ? budgetUsd - teamExpenseUsd : null);
  const budgetUsedPercent =
    budgetUsd && budgetUsd > 0 ? Math.min(100, Math.round((teamExpenseUsd / budgetUsd) * 100)) : 0;

  const monthlyRows = useMemo(() => monthlySummaryTable(transactions, 6), [transactions]);
  const incomeByCategory = useMemo(() => categoryBreakdown(transactions, "income", monthView), [transactions, monthView]);
  const expenseByCategory = useMemo(() => categoryBreakdown(transactions, "expense", monthView), [transactions, monthView]);

  const budgetPieData = useMemo(() => {
    if (!budgetUsd || budgetUsd <= 0) return [];
    const spent = teamExpenseUsd;
    const over = Math.max(0, spent - budgetUsd);
    if (over > 0) {
      return [
        { name: "Within budget", value: budgetUsd },
        { name: "Over budget", value: over },
      ];
    }
    const left = Math.max(0, budgetUsd - spent);
    const slices = [{ name: "Spent", value: spent }];
    if (left > 0) slices.push({ name: "Remaining", value: left });
    return slices;
  }, [budgetUsd, teamExpenseUsd]);

  const categoryOptions = useMemo(() => {
    const presets = form.kind === "income" ? INCOME_CATEGORY_PRESETS : EXPENSE_CATEGORY_PRESETS;
    return mergeOptions(
      presets,
      transactions.filter((t) => t.kind === form.kind).map((t) => t.category),
    );
  }, [form.kind, transactions]);

  const paymentMethodOptions = useMemo(
    () => mergeOptions(PAYMENT_METHOD_PRESETS, transactions.map((t) => t.paymentMethod)),
    [transactions],
  );

  const payrollRoleOptions = useMemo(
    () => mergeOptions(PAYROLL_ROLE_PRESETS, payroll.map((p) => p.role)),
    [payroll],
  );

  const filteredPayroll = useMemo(() => {
    const sorted = [...payroll].sort((a, b) => b.payDate.localeCompare(a.payDate));
    if (payrollFilterMonth === "all") return sorted;
    return sorted.filter((p) => p.payPeriod === payrollFilterMonth || p.payDate.startsWith(payrollFilterMonth));
  }, [payroll, payrollFilterMonth]);

  const payrollTotal = useMemo(
    () => filteredPayroll.reduce((s, p) => s + p.amountUsd, 0),
    [filteredPayroll],
  );

  const payrollMonthOptions = useMemo(() => {
    const keys = new Set(payroll.map((p) => p.payPeriod));
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [payroll]);

  const openAdd = (kind: FinanceTransactionKind) => {
    setEditing(null);
    setForm({ ...emptyForm(), kind, category: kind === "income" ? "Sales" : "General" });
    setDialogOpen(true);
  };

  const openEdit = (t: FinanceTransaction) => {
    setEditing(t);
    setForm({
      kind: t.kind,
      category: t.category,
      sourceType: t.sourceType,
      sourceId: t.sourceId ?? "",
      description: t.description,
      amountUsd: String(t.amountUsd),
      paidAt: t.paidAt.slice(0, 10),
      paymentMethod: t.paymentMethod,
      reference: t.reference,
      notes: t.notes,
    });
    setDialogOpen(true);
  };

  const saveTransaction = async () => {
    if (!form.description.trim() || !form.amountUsd || !form.category.trim()) {
      toast.error("Description, category, and amount are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind: form.kind,
        category: form.category.trim(),
        sourceType: form.sourceType,
        sourceId: form.sourceId || null,
        description: form.description.trim(),
        amountUsd: Number(form.amountUsd),
        paidAt: form.paidAt,
        paymentMethod: form.paymentMethod,
        reference: form.reference,
        notes: form.notes,
      };
      if (editing) {
        await api.put(`/api/finance/transactions/${editing.id}`, payload);
        toast.success(form.kind === "income" ? "Income updated" : "Expense updated");
      } else {
        await api.post("/api/finance/transactions", payload);
        toast.success(form.kind === "income" ? "Income recorded" : "Expense recorded");
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await api.del(`/api/finance/transactions/${id}`);
      toast.success("Removed");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const saveBudget = async () => {
    const raw = budgetInput === "" ? 0 : Number(budgetInput);
    const amountUsd = parseAmountInput(raw);
    setBudgetSaving(true);
    try {
      await api.put("/api/finance/budget", { month: monthView, amountUsd });
      toast.success("Team budget saved — visible to all workspace members");
      setBudgetDialogOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save budget");
    } finally {
      setBudgetSaving(false);
    }
  };

  const openBudgetDialog = () => {
    setBudgetInput(budgetUsd != null ? String(amountInputValue(budgetUsd)) : "");
    setBudgetDialogOpen(true);
  };

  const recordBillPaid = (id: string, type: FinanceSourceType) => {
    const o = obligations.find((x) => x.id === id);
    if (!o) return;
    setEditing(null);
    setForm({
      ...emptyForm(),
      kind: "expense",
      category: type === "subscription" ? "Subscriptions" : "Rent",
      sourceType: type,
      sourceId: id,
      description: o.label,
      amountUsd: String(o.amountUsd),
    });
    setDialogOpen(true);
  };

  const openAddPayroll = () => {
    setEditingPayroll(null);
    setPayrollForm(emptyPayrollForm(monthView));
    setPayrollDialogOpen(true);
  };

  const openEditPayroll = (row: PayrollRecord) => {
    setEditingPayroll(row);
    setPayrollForm({
      employeeName: row.employeeName,
      role: row.role,
      payPeriod: row.payPeriod,
      payDate: row.payDate.slice(0, 10),
      amountUsd: String(row.amountUsd),
      paymentMethod: row.paymentMethod,
      reference: row.reference,
      status: row.status,
      notes: row.notes,
    });
    setPayrollDialogOpen(true);
  };

  const savePayroll = async () => {
    if (!payrollForm.employeeName.trim() || !payrollForm.amountUsd) {
      toast.error("Employee name and amount are required");
      return;
    }
    setPayrollSaving(true);
    try {
      const payload = {
        employeeName: payrollForm.employeeName.trim(),
        role: payrollForm.role.trim(),
        payPeriod: payrollForm.payPeriod,
        payDate: payrollForm.payDate,
        amountUsd: Number(payrollForm.amountUsd),
        paymentMethod: payrollForm.paymentMethod,
        reference: payrollForm.reference,
        status: payrollForm.status,
        notes: payrollForm.notes,
      };
      if (editingPayroll) {
        await api.put(`/api/finance/payroll/${editingPayroll.id}`, payload);
        toast.success("Payroll updated");
      } else {
        await api.post("/api/finance/payroll", payload);
        toast.success("Payroll recorded");
      }
      setPayrollDialogOpen(false);
      setEditingPayroll(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save payroll");
    } finally {
      setPayrollSaving(false);
    }
  };

  const deletePayroll = async (id: string) => {
    if (!confirm("Delete this payroll entry?")) return;
    try {
      await api.del(`/api/finance/payroll/${id}`);
      toast.success("Removed");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const monthOptions = monthlyRows.map((r) => r.monthKey);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track money in and out, set a budget, and see where it goes · 1 USD = {usdToFrw.toLocaleString()} RWF
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <CurrencyToggle />
          <Select value={monthView} onValueChange={setMonthView}>
            <SelectTrigger className="w-[160px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthlyRows.find((r) => r.monthKey === m)?.month ?? m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => exportFinanceCsv({ obligations, payments: transactions, usdToFrw })}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openAdd("income")}>
            <ArrowUpCircle className="h-4 w-4" />
            Add income
          </Button>
          <Button className="gap-1.5 bg-red-600 hover:bg-red-700" onClick={() => openAdd("expense")}>
            <ArrowDownCircle className="h-4 w-4" />
            Add expense
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <SummaryStat
          label="Money in"
          value={formatMoney(monthIncome)}
          hint="Income this month"
          valueClassName="text-emerald-800"
          icon={TrendingUp}
        />
        <SummaryStat
          label="Money out"
          value={formatMoney(monthExpense)}
          hint="Expenses this month"
          valueClassName="text-red-800"
          icon={TrendingDown}
        />
        <SummaryStat
          label="Net this month"
          value={`${monthNet >= 0 ? "+" : "−"}${formatMoney(Math.abs(monthNet))}`}
          hint="Income minus expenses"
          valueClassName={monthNet >= 0 ? "text-emerald-800" : "text-red-800"}
          icon={Wallet}
        />
      </div>

      <Card className="rounded-2xl border-dashed">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {budgetUsd != null && budgetUsd > 0 && budgetPieData.length > 0 ? (
              <>
                <div className="relative h-[140px] w-[140px] shrink-0 mx-auto sm:mx-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={budgetPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={62}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {budgetPieData.map((_, i) => (
                          <Cell key={i} fill={BUDGET_PIE_COLORS[i % BUDGET_PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatMoney(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold tabular-nums">{budgetUsedPercent}%</span>
                    <span className="text-[10px] text-muted-foreground">used</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Team budget
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {budgetOverview?.workspaceName ?? workspace?.name ?? "Workspace"} ·{" "}
                        {budgetOverview?.memberCount ?? 1} teammate{(budgetOverview?.memberCount ?? 1) === 1 ? "" : "s"} · shared
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={openBudgetDialog} title="Adjust budget">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {budgetPieData.map((d, i) => (
                      <span key={d.name} className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ background: BUDGET_PIE_COLORS[i] }} />
                        {d.name} {formatMoney(d.value)}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Team spent {formatMoney(teamExpenseUsd)} of {formatMoney(budgetUsd)}
                    {budgetRemaining != null && budgetRemaining < 0 && (
                      <span className="text-red-600 font-medium"> · over by {formatMoney(Math.abs(budgetRemaining))}</span>
                    )}
                    {budgetRemaining != null && budgetRemaining >= 0 && (
                      <span className="text-emerald-700"> · {formatMoney(budgetRemaining)} left</span>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <PiggyBank className="h-4 w-4 text-muted-foreground" />
                    Team budget
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Set a shared spending limit for {budgetOverview?.workspaceName ?? workspace?.name ?? "your team"}.
                    Everyone in the workspace sees the same budget and team spending.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={openBudgetDialog}>
                  <Settings2 className="h-4 w-4" />
                  Set team budget
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="flow" className="space-y-4">
        <TabsList className="rounded-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="flow" className="rounded-full">How it went</TabsTrigger>
          <TabsTrigger value="all" className="rounded-full">All money</TabsTrigger>
          <TabsTrigger value="income" className="rounded-full">Income</TabsTrigger>
          <TabsTrigger value="expense" className="rounded-full">Expenses</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-full">Payroll</TabsTrigger>
          <TabsTrigger value="bills" className="rounded-full">Bills due</TabsTrigger>
        </TabsList>

        <TabsContent value="flow" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Month by month</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right text-emerald-700">Money in</TableHead>
                    <TableHead className="text-right text-red-700">Money out</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRows.map((row) => (
                    <TableRow
                      key={row.monthKey}
                      className={cn(row.monthKey === monthView && "bg-muted/50")}
                    >
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          {formatMoney(row.income)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                          {formatMoney(row.expense)}
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-right font-semibold", row.net >= 0 ? "text-emerald-800" : "text-red-800")}>
                        {row.net >= 0 ? "+" : "−"}
                        {formatMoney(Math.abs(row.net))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base text-emerald-800">Income by category</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeByCategory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                          No income recorded this month
                        </TableCell>
                      </TableRow>
                    ) : (
                      incomeByCategory.map((r) => (
                        <TableRow key={r.category}>
                          <TableCell>{r.category}</TableCell>
                          <TableCell className="text-right text-emerald-700 font-medium">
                            <ArrowUpCircle className="h-3.5 w-3.5 inline mr-1" />
                            {formatMoney(r.total)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base text-red-800">Expenses by category</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseByCategory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                          No expenses recorded this month
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenseByCategory.map((r) => (
                        <TableRow key={r.category}>
                          <TableCell>{r.category}</TableCell>
                          <TableCell className="text-right text-red-700 font-medium">
                            <ArrowDownCircle className="h-3.5 w-3.5 inline mr-1" />
                            {formatMoney(r.total)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">All transactions</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <TransactionTable
                rows={monthTx}
                loading={loading}
                emptyMessage="No transactions this month. Add income or an expense to get started."
                onEdit={openEdit}
                onDelete={(id) => void deleteTransaction(id)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base text-emerald-800">Income</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <TransactionTable
                rows={monthTx.filter((t) => t.kind === "income")}
                loading={loading}
                emptyMessage="No income yet. Tap Add income above."
                onEdit={openEdit}
                onDelete={(id) => void deleteTransaction(id)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base text-red-800">Expenses</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <TransactionTable
                rows={monthTx.filter((t) => t.kind === "expense")}
                loading={loading}
                emptyMessage="No expenses yet. Tap Add expense above."
                onEdit={openEdit}
                onDelete={(id) => void deleteTransaction(id)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Payroll
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredPayroll.length} row{filteredPayroll.length === 1 ? "" : "s"}
                  {filteredPayroll.length > 0 && ` · Total ${formatMoney(payrollTotal)}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={payrollFilterMonth} onValueChange={setPayrollFilterMonth}>
                  <SelectTrigger className="w-[140px] h-9 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All periods</SelectItem>
                    {payrollMonthOptions.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="gap-1.5" onClick={openAddPayroll}>
                  <Plus className="h-4 w-4" />
                  Add payroll
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 sm:p-0">
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
              ) : filteredPayroll.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center px-4">
                  No payroll records yet. Add employee payments with date, amount, and period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="whitespace-nowrap">Pay date</TableHead>
                      <TableHead className="whitespace-nowrap">Period</TableHead>
                      <TableHead className="whitespace-nowrap">Employee</TableHead>
                      <TableHead className="whitespace-nowrap">Role</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Method</TableHead>
                      <TableHead className="whitespace-nowrap">Reference</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[120px]">Notes</TableHead>
                      <TableHead className="w-[72px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayroll.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap text-sm">{formatDate(p.payDate)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-mono text-muted-foreground">{p.payPeriod}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium">{p.employeeName}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{p.role || "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap text-sm font-semibold text-red-700 tabular-nums">
                          {formatMoney(p.amountUsd)}
                          <div className="text-[10px] font-normal text-muted-foreground">{formatMoneySecondary(p.amountUsd)}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{p.paymentMethod || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-mono">{p.reference || "—"}</TableCell>
                        <TableCell>
                          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded capitalize", payrollStatusStyle[p.status])}>
                            {p.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={p.notes}>
                          {p.notes || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditPayroll(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => void deletePayroll(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Upcoming bills
              </CardTitle>
              <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v) as 30 | 60 | 90)}>
                <SelectTrigger className="w-[140px] rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="60">Next 60 days</SelectItem>
                  <SelectItem value="90">Next 90 days</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Due</TableHead>
                    <TableHead>Bill</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No bills in this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    upcoming.map((o) => (
                      <TableRow key={`${o.type}-${o.id}`}>
                        <TableCell>{formatDate(o.dueDate)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{o.label}</div>
                          <div className="text-xs text-muted-foreground">{o.sublabel}</div>
                        </TableCell>
                        <TableCell className="text-right text-red-700 font-medium">
                          <ArrowDownCircle className="h-3.5 w-3.5 inline mr-1" />
                          {formatMoney(o.amountUsd)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                              o.status === "overdue" && "bg-destructive/10 text-destructive",
                              o.status === "due_soon" && "bg-amber-100 text-amber-800",
                              o.status === "upcoming" && "bg-muted text-muted-foreground",
                            )}
                          >
                            {o.status.replace("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => recordBillPaid(o.id, o.type)}>
                            Record paid
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? editing.kind === "income"
                  ? "Edit income"
                  : "Edit expense"
                : form.kind === "income"
                  ? "Add income"
                  : "Add expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {!editing && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.kind === "income" ? "default" : "outline"}
                  className={form.kind === "income" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  onClick={() => setForm({ ...form, kind: "income", category: "Sales" })}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  Income
                </Button>
                <Button
                  type="button"
                  variant={form.kind === "expense" ? "default" : "outline"}
                  className={form.kind === "expense" ? "bg-red-600 hover:bg-red-700" : ""}
                  onClick={() => setForm({ ...form, kind: "expense", category: "General" })}
                >
                  <ArrowDownCircle className="h-4 w-4 mr-1" />
                  Expense
                </Button>
              </div>
            )}
            <div>
              <Label>Category</Label>
              <CreatableSelect
                value={form.category}
                onChange={(category) => setForm({ ...form, category })}
                options={categoryOptions}
                placeholder="Select or add category…"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={form.kind === "income" ? "e.g. Client invoice #12" : "e.g. Office rent March"}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{amountInputLabel()}</Label>
                <Input
                  type="number"
                  value={form.amountUsd === "" ? "" : amountInputValue(Number(form.amountUsd) || 0)}
                  onChange={(e) => {
                    const raw = e.target.value === "" ? "" : String(parseAmountInput(Number(e.target.value)));
                    setForm({ ...form, amountUsd: raw });
                  }}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Method (optional)</Label>
                <CreatableSelect
                  value={form.paymentMethod}
                  onChange={(paymentMethod) => setForm({ ...form, paymentMethod })}
                  options={paymentMethodOptions}
                  placeholder="Bank, MoMo…"
                />
              </div>
              <div>
                <Label>Reference (optional)</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button
              disabled={saving}
              className={form.kind === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
              onClick={() => void saveTransaction()}
            >
              {saving ? "Saving…" : editing ? "Save changes" : form.kind === "income" ? "Save income" : "Save expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Team budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Shared with everyone in {budgetOverview?.workspaceName ?? workspace?.name ?? "your workspace"}.
              Spending is calculated from all teammates&apos; expenses this month.
            </p>
            <div>
              <Label>{amountInputLabel()} — limit for {monthView}</Label>
              <Input
                type="number"
                placeholder="e.g. 500000"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
              />
            </div>
            <Button className="w-full" disabled={budgetSaving} onClick={() => void saveBudget()}>
              {budgetSaving ? "Saving…" : "Save team budget"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payrollDialogOpen} onOpenChange={setPayrollDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayroll ? "Edit payroll" : "Add payroll"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Employee name</Label>
              <Input
                value={payrollForm.employeeName}
                onChange={(e) => setPayrollForm({ ...payrollForm, employeeName: e.target.value })}
                placeholder="e.g. Jean Uwimana"
              />
            </div>
            <div>
              <Label>Role / department</Label>
              <CreatableSelect
                value={payrollForm.role}
                onChange={(role) => setPayrollForm({ ...payrollForm, role })}
                options={payrollRoleOptions}
                placeholder="Select or add role…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pay period (YYYY-MM)</Label>
                <Input
                  value={payrollForm.payPeriod}
                  onChange={(e) => setPayrollForm({ ...payrollForm, payPeriod: e.target.value })}
                  placeholder="2026-05"
                />
              </div>
              <div>
                <Label>Pay date</Label>
                <Input
                  type="date"
                  value={payrollForm.payDate}
                  onChange={(e) => setPayrollForm({ ...payrollForm, payDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{amountInputLabel()}</Label>
              <Input
                type="number"
                value={payrollForm.amountUsd === "" ? "" : amountInputValue(Number(payrollForm.amountUsd) || 0)}
                onChange={(e) => {
                  const raw = e.target.value === "" ? "" : String(parseAmountInput(Number(e.target.value)));
                  setPayrollForm({ ...payrollForm, amountUsd: raw });
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment method</Label>
                <CreatableSelect
                  value={payrollForm.paymentMethod}
                  onChange={(paymentMethod) => setPayrollForm({ ...payrollForm, paymentMethod })}
                  options={paymentMethodOptions}
                  placeholder="Bank, MoMo…"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={payrollForm.status}
                  onValueChange={(v) => setPayrollForm({ ...payrollForm, status: v as PayrollStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input
                value={payrollForm.reference}
                onChange={(e) => setPayrollForm({ ...payrollForm, reference: e.target.value })}
                placeholder="Transaction ID"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                rows={2}
                value={payrollForm.notes}
                onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })}
              />
            </div>
            <Button disabled={payrollSaving} onClick={() => void savePayroll()}>
              {payrollSaving ? "Saving…" : editingPayroll ? "Save changes" : "Save payroll"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
