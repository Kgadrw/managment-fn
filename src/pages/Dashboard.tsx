import { useStore } from "@/store/useStore";
import { isUpcoming, isOverdue, isExpiringSoon, formatDate, formatRelativeDate, daysUntil } from "@/utils/date";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CreditCard, Building2, Bell, TrendingUp, DollarSign, AlertTriangle, Clock } from "lucide-react";
import { formatMoney } from "@/utils/currency";
import { useCurrencyDisplay } from "@/hooks/useCurrencyDisplay";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = [
  "hsl(38, 92%, 50%)",
  "hsl(199, 89%, 48%)",
  "hsl(142, 71%, 45%)",
  "hsl(262, 83%, 58%)",
  "hsl(0, 84%, 60%)",
  "hsl(220, 9%, 46%)",
];

export default function Dashboard() {
  const { products, subscriptions, rentRecords, reminders, activityLog, isLoading, error } = useStore();

  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const expiringSubs = activeSubscriptions.filter((s) => isExpiringSoon(s.renewalDate, 30));
  const overdueRent = rentRecords.filter((r) => isOverdue(r.dueDate) && r.status !== "completed");
  const upcomingReminders = reminders.filter((r) => r.status === "pending" && isUpcoming(r.reminderDate, 7));
  const monthlyRecurring = activeSubscriptions.reduce((sum, s) => {
    if (s.billingCycle === "monthly") return sum + s.amount;
    if (s.billingCycle === "quarterly") return sum + s.amount / 3;
    if (s.billingCycle === "yearly") return sum + s.amount / 12;
    return sum;
  }, 0) + rentRecords.filter((r) => r.status === "active").reduce((sum, r) => sum + r.rentAmount, 0);

  const spendingData = [
    { name: "Subscriptions", value: activeSubscriptions.reduce((s, x) => s + x.amount, 0) },
    { name: "Rent", value: rentRecords.filter((r) => r.status === "active").reduce((s, x) => s + x.rentAmount, 0) },
    { name: "Inventories", value: products.reduce((s, x) => s + x.purchaseCost, 0) },
  ];

  const categoryData = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: "Active Subscriptions", value: activeSubscriptions.length, icon: CreditCard, accent: "text-success", bg: "bg-emerald-50" },
    { label: "Expiring (30d)", value: expiringSubs.length, icon: AlertTriangle, accent: expiringSubs.length > 0 ? "text-warning" : "text-muted-foreground", bg: "bg-amber-50" },
    { label: "Overdue Rent", value: overdueRent.length, icon: Building2, accent: overdueRent.length > 0 ? "text-destructive" : "text-muted-foreground", bg: "bg-rose-50" },
    { label: "Upcoming Tasks", value: upcomingReminders.length, icon: Bell, accent: upcomingReminders.length > 0 ? "text-primary" : "text-muted-foreground", bg: "bg-orange-50" },
    { label: "Total Inventories", value: products.length, icon: Package, accent: "text-info", bg: "bg-sky-50" },
    { label: "Monthly Recurring", value: formatMoney(monthlyRecurring), icon: DollarSign, accent: "text-primary", bg: "bg-violet-50" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="hidden md:block text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="hidden md:block text-sm text-muted-foreground">Overview of your business operations</p>
        {isLoading && (
          <p className="text-xs text-muted-foreground mt-1">Loading data from server…</p>
        )}
        {!isLoading && error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={`animate-fade-in rounded-3xl border-0 shadow-none ${stat.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-5 w-5 ${stat.accent}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-0 shadow-none bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Spending Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={spendingData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {spendingData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {spendingData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  {d.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 shadow-none bg-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inventories by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Expiring Subscriptions */}
        <Card className="rounded-3xl border-0 shadow-none bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-warning" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringSubs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No subscriptions expiring soon</p>
            ) : expiringSubs.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.amount}/mo</p>
                </div>
                <span className="text-xs text-warning font-medium">{formatRelativeDate(s.renewalDate)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="rounded-3xl border-0 shadow-none bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingReminders.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No upcoming tasks</p>
            ) : upcomingReminders.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={r.priority} />
                  <span className="font-medium text-foreground">{r.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatRelativeDate(r.reminderDate)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="rounded-3xl border-0 shadow-none bg-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityLog.slice(0, 6).map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-sm">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <div>
                  <p className="text-foreground">
                    <span className="capitalize">{log.action}</span>{" "}
                    <span className="font-medium">{log.recordName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{log.recordType} • {formatRelativeDate(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
