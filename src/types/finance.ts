export type FinanceSourceType = "subscription" | "rent" | "inventory" | "other";
export type FinanceTransactionKind = "income" | "expense";

export interface FinanceTransaction {
  id: string;
  userId: string;
  kind: FinanceTransactionKind;
  category: string;
  sourceType: FinanceSourceType;
  sourceId: string | null;
  description: string;
  amountUsd: number;
  paidAt: string;
  paymentMethod: string;
  reference: string;
  notes: string;
  createdAt: string;
}

/** @deprecated use FinanceTransaction */
export type FinancePayment = FinanceTransaction;

export type FinanceObligationType = "subscription" | "rent";

export interface FinanceObligation {
  id: string;
  type: FinanceObligationType;
  label: string;
  sublabel: string;
  dueDate: string;
  amountUsd: number;
  monthlyEquivalentUsd: number;
  status: "overdue" | "due_soon" | "upcoming";
  payerName?: string;
}

export interface FinanceBudget {
  month: string;
  amountUsd: number | null;
}

export interface FinanceBudgetOverview {
  month: string;
  amountUsd: number | null;
  teamExpenseUsd: number;
  teamIncomeUsd: number;
  remainingUsd: number | null;
  workspaceId: string;
  workspaceName: string;
  memberCount: number;
  scope: "team";
}

export type PayrollStatus = "paid" | "pending" | "scheduled";

export interface PayrollRecord {
  id: string;
  userId: string;
  employeeName: string;
  role: string;
  payPeriod: string;
  payDate: string;
  amountUsd: number;
  paymentMethod: string;
  reference: string;
  status: PayrollStatus;
  notes: string;
  createdAt: string;
}
