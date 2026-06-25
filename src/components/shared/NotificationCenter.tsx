import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/store/useStore";
import { isUpcoming, isOverdue, formatRelativeDate } from "@/utils/date";
import { formatMoney } from "@/utils/currency";
import { useCurrencyDisplay } from "@/hooks/useCurrencyDisplay";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { Bell, CreditCard, Building2 } from "lucide-react";

export function NotificationCenter({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  useCurrencyDisplay();
  const { reminders, subscriptions, rentRecords } = useStore();

  const upcomingReminders = reminders.filter((r) => r.status === "pending" && isUpcoming(r.reminderDate, 7));
  const overdueReminders = reminders.filter((r) => r.status === "overdue" || (r.status === "pending" && isOverdue(r.reminderDate)));
  const expiringSubs = subscriptions.filter((s) => s.status === "active" && isUpcoming(s.renewalDate, 30));
  const overdueRent = rentRecords.filter((r) => isOverdue(r.dueDate) && r.status !== "completed");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto scrollbar-thin">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6">
          {overdueReminders.length > 0 && (
            <Section title="Overdue" icon={<Bell className="h-4 w-4 text-destructive" />}>
              {overdueReminders.map((r) => (
                <NotifItem key={r.id} title={r.title} subtitle={r.message} date={formatRelativeDate(r.reminderDate)} badge={<PriorityBadge priority={r.priority} />} />
              ))}
            </Section>
          )}
          {overdueRent.length > 0 && (
            <Section title="Overdue Rent" icon={<Building2 className="h-4 w-4 text-destructive" />}>
              {overdueRent.map((r) => (
                <NotifItem key={r.id} title={r.title} subtitle={`${formatMoney(r.rentAmount)} due`} date={formatRelativeDate(r.dueDate)} badge={<StatusBadge status="overdue" />} />
              ))}
            </Section>
          )}
          {expiringSubs.length > 0 && (
            <Section title="Expiring Subscriptions" icon={<CreditCard className="h-4 w-4 text-warning" />}>
              {expiringSubs.map((s) => (
                <NotifItem key={s.id} title={s.name} subtitle={`${formatMoney(s.amount)}/mo • ${s.provider}`} date={formatRelativeDate(s.renewalDate)} badge={<StatusBadge status="due_soon" />} />
              ))}
            </Section>
          )}
          {upcomingReminders.length > 0 && (
            <Section title="Upcoming Tasks" icon={<Bell className="h-4 w-4 text-info" />}>
              {upcomingReminders.map((r) => (
                <NotifItem key={r.id} title={r.title} subtitle={r.message} date={formatRelativeDate(r.reminderDate)} badge={<PriorityBadge priority={r.priority} />} />
              ))}
            </Section>
          )}
          {overdueReminders.length === 0 && overdueRent.length === 0 && expiringSubs.length === 0 && upcomingReminders.length === 0 && (
            <p className="text-center text-muted-foreground py-8">All clear — no notifications right now.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NotifItem({ title, subtitle, date, badge }: { title: string; subtitle: string; date: string; badge: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3 animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        </div>
        {badge}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">{date}</p>
    </div>
  );
}
