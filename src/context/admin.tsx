import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { api } from "@/lib/api";
import { warmupAdmin } from "@/lib/admin-prefetch";

export type StaffUser = { id: string; email: string; name: string; role: "ADMIN" };

type AdminAuthState = {
  staff: StaffUser | null;
  ready: boolean;
  refresh: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [ready, setReady] = useState(false);

  async function refresh() {
    try {
      const user = await api<StaffUser | null>("/api/admin/auth/me");
      const next = user?.role === "ADMIN" ? user : null;
      if (next) warmupAdmin();
      setStaff(next);
    } catch {
      setStaff(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo(() => ({ staff, ready, refresh }), [staff, ready]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function AdminAuthLayout() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
