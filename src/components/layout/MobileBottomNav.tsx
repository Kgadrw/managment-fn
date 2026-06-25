import { Building2, CalendarDays, CreditCard, LayoutDashboard, LayoutGrid, Package, Settings, Wallet } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { isOverdue, isUpcoming } from "@/utils/date";

const items = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Stock", url: "/inventories", icon: Package },
  { title: "Subs", url: "/subscriptions", icon: CreditCard },
  { title: "Rent", url: "/rent", icon: Building2 },
  { title: "Finance", url: "/finance", icon: Wallet },
  { title: "Tasks", url: "/tasks", icon: CalendarDays, showBadge: true },
  { title: "Boards", url: "/boards", icon: LayoutGrid },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function MobileBottomNav() {
  const { reminders, subscriptions, rentRecords } = useStore();

  const alertCount =
    reminders.filter((r) => r.status === "pending" && isUpcoming(r.reminderDate, 7)).length +
    subscriptions.filter((s) => s.status === "active" && isUpcoming(s.renewalDate, 30)).length +
    rentRecords.filter((r) => isOverdue(r.dueDate) && r.status !== "completed").length;

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-6 z-40",
        "pb-[env(safe-area-inset-bottom)]",
      )}
      aria-label="Bottom navigation"
    >
      <div className="mx-auto max-w-md px-3">
        <div className="grid grid-cols-8 rounded-3xl border bg-background/90 px-0.5 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/70">
        {items.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="group relative flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors"
            activeClassName="text-primary bg-primary/5 active"
          >
            <span className="relative">
              <item.icon className="h-5 w-5 transition-transform group-active:scale-95" />
              {item.showBadge && alertCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {alertCount}
                </span>
              )}
            </span>
            <span className="leading-none">{item.title}</span>
          </NavLink>
        ))}
        </div>
      </div>
    </nav>
  );
}

