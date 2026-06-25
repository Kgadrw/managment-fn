import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider, useStore } from "@/store/useStore";
import { BoardProvider } from "@/store/useBoardStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";
import Dashboard from "./pages/Dashboard";
import ProductsPage from "./pages/ProductsPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import RentPage from "./pages/RentPage";
import RemindersPage from "./pages/RemindersPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import BoardsPage from "./pages/BoardsPage";
import BoardDetailPage from "./pages/BoardDetailPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import AcceptBoardInvitePage from "./pages/AcceptBoardInvitePage";
import FinancePage from "./pages/FinancePage";

const queryClient = new QueryClient();

const GlobalLoadingOverlay = () => {
  const { isLoading } = useStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-foreground">Loading data...</span>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <StoreProvider>
        <BoardProvider>
          <GlobalLoadingOverlay />
          <BrowserRouter>
            <Routes>
              {/* Public routes (no sidebar/layout) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/invite/board/:token" element={<AcceptBoardInvitePage />} />
              <Route path="/invite/:token" element={<AcceptInvitePage />} />

              {/* App routes (with sidebar/layout) */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/inventories" element={<RequireAuth><ProductsPage /></RequireAuth>} />
                <Route path="/products" element={<Navigate to="/inventories" replace />} />
                <Route path="/subscriptions" element={<RequireAuth><SubscriptionsPage /></RequireAuth>} />
                <Route path="/rent" element={<RequireAuth><RentPage /></RequireAuth>} />
                <Route path="/tasks" element={<RequireAuth><RemindersPage /></RequireAuth>} />
                <Route path="/reminders" element={<Navigate to="/tasks" replace />} />
                <Route path="/finance" element={<RequireAuth><FinancePage /></RequireAuth>} />
                <Route path="/boards" element={<RequireAuth><BoardsPage /></RequireAuth>} />
                <Route path="/boards/:boardId" element={<RequireAuth><BoardDetailPage /></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </BoardProvider>
      </StoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
