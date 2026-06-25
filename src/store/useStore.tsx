import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Product, Subscription, RentRecord, Reminder, ActivityLog } from "@/types";
import { api, ApiError } from "@/lib/api";
import { setUsdToFrwRate } from "@/utils/currency";
import { clearTokens } from "@/lib/auth";

interface StoreContextType {
  products: Product[];
  subscriptions: Subscription[];
  rentRecords: RentRecord[];
  reminders: Reminder[];
  activityLog: ActivityLog[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addProduct: (p: Omit<Product, "id" | "createdAt">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addSubscription: (s: Omit<Subscription, "id" | "createdAt">) => Promise<void>;
  updateSubscription: (id: string, s: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  addRentRecord: (r: Omit<RentRecord, "id" | "createdAt">) => Promise<void>;
  updateRentRecord: (id: string, r: Partial<RentRecord>) => Promise<void>;
  deleteRentRecord: (id: string) => Promise<void>;
  addReminder: (r: Omit<Reminder, "id" | "createdAt">) => Promise<void>;
  updateReminder: (id: string, r: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  reorderReminders: (ids: string[]) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [p, s, r, rm, a, cfg] = await Promise.all([
        api.get<Product[]>("/api/products"),
        api.get<Subscription[]>("/api/subscriptions"),
        api.get<RentRecord[]>("/api/rent-records"),
        api.get<Reminder[]>("/api/reminders"),
        api.get<ActivityLog[]>("/api/activity"),
        api.get<{ usdToFrwRate?: number }>("/api/config"),
        // Ask the API to send due reminder/payment emails (deployed backend also runs on a schedule).
        api.get("/api/notifications").catch(() => null),
      ]);
      setProducts(p);
      setSubscriptions(s);
      setRentRecords(r);
      setReminders(rm);
      setActivityLog(a);
      if (typeof cfg?.usdToFrwRate === "number" && Number.isFinite(cfg.usdToFrwRate) && cfg.usdToFrwRate > 0) {
        setUsdToFrwRate(cfg.usdToFrwRate);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearTokens();
        setError("Unauthorized. Please log in again.");
      } else {
        setError(e instanceof Error ? e.message : "Failed to load data from server");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // While the app is open, nudge the server to process due emails (production API; no local backend required).
  useEffect(() => {
    const intervalMs = 15 * 60_000;
    const id = window.setInterval(() => {
      api.get("/api/notifications").catch(() => null);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, []);

  const addProduct = useCallback(async (p: Omit<Product, "id" | "createdAt">) => {
    await api.post<Product>("/api/products", p);
    await refresh();
  }, [refresh]);

  const updateProduct = useCallback(async (id: string, p: Partial<Product>) => {
    await api.put<Product>(`/api/products/${id}`, p);
    await refresh();
  }, [refresh]);

  const deleteProduct = useCallback(async (id: string) => {
    await api.del(`/api/products/${id}`);
    await refresh();
  }, [refresh]);

  const addSubscription = useCallback(async (s: Omit<Subscription, "id" | "createdAt">) => {
    await api.post<Subscription>("/api/subscriptions", s);
    await refresh();
  }, [refresh]);

  const updateSubscription = useCallback(async (id: string, s: Partial<Subscription>) => {
    await api.put<Subscription>(`/api/subscriptions/${id}`, s);
    await refresh();
  }, [refresh]);

  const deleteSubscription = useCallback(async (id: string) => {
    await api.del(`/api/subscriptions/${id}`);
    await refresh();
  }, [refresh]);

  const addRentRecord = useCallback(async (rrec: Omit<RentRecord, "id" | "createdAt">) => {
    await api.post<RentRecord>("/api/rent-records", rrec);
    await refresh();
  }, [refresh]);

  const updateRentRecord = useCallback(async (id: string, rrec: Partial<RentRecord>) => {
    await api.put<RentRecord>(`/api/rent-records/${id}`, rrec);
    await refresh();
  }, [refresh]);

  const deleteRentRecord = useCallback(async (id: string) => {
    await api.del(`/api/rent-records/${id}`);
    await refresh();
  }, [refresh]);

  const addReminder = useCallback(async (rem: Omit<Reminder, "id" | "createdAt">) => {
    await api.post<Reminder>("/api/reminders", rem);
    await refresh();
  }, [refresh]);

  const updateReminder = useCallback(async (id: string, rem: Partial<Reminder>) => {
    await api.put<Reminder>(`/api/reminders/${id}`, rem);
    await refresh();
  }, [refresh]);

  const deleteReminder = useCallback(async (id: string) => {
    await api.del(`/api/reminders/${id}`);
    await refresh();
  }, [refresh]);

  const reorderReminders = useCallback(async (ids: string[]) => {
    await api.put("/api/reminders/reorder", { ids });
    await refresh();
  }, [refresh]);

  return (
    <StoreContext.Provider
      value={{
        products, subscriptions, rentRecords, reminders, activityLog,
        isLoading,
        error,
        refresh,
        addProduct, updateProduct, deleteProduct,
        addSubscription, updateSubscription, deleteSubscription,
        addRentRecord, updateRentRecord, deleteRentRecord,
        addReminder, updateReminder, deleteReminder, reorderReminders,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
