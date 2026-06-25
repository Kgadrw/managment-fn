import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { isUpcoming, isOverdue } from "@/utils/date";
import { useState } from "react";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { QuickAddModal } from "@/components/shared/QuickAddModal";

export function AppHeader() {
  const { reminders, subscriptions, rentRecords } = useStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const alertCount =
    reminders.filter((r) => r.status === "pending" && isUpcoming(r.reminderDate, 7)).length +
    subscriptions.filter((s) => s.status === "active" && isUpcoming(s.renewalDate, 30)).length +
    rentRecords.filter((r) => isOverdue(r.dueDate) && r.status !== "completed").length;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-card/80 backdrop-blur-sm px-6">
        <h2 className="text-lg font-semibold text-foreground">Operations Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setQuickAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Add</span>
          </Button>
          <Button variant="ghost" size="icon" className="relative" onClick={() => setNotifOpen(true)}>
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {alertCount}
              </span>
            )}
          </Button>
        </div>
      </header>
      <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} />
      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  );
}
