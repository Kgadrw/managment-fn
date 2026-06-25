import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";
import { Outlet } from "react-router-dom";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileTopBar } from "./MobileTopBar";

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const content = children ?? <Outlet />;

  return (
    <div className="min-h-screen bg-background">
      <div className="md:hidden">
        <MobileTopBar />
      </div>

      <div className="hidden md:block">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      <div className={cn("transition-all duration-300", "ml-0", collapsed ? "md:ml-24" : "md:ml-64")}>
        <main className="p-4 pt-20 pb-32 md:p-6 md:pb-6 md:pt-6">{content}</main>
      </div>

      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
