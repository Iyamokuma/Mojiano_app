import { useAdminAuth } from "@/context/admin";
import { AdminShell } from "@/components/admin/shell";
import { AdminLoginPage } from "@/components/admin/login";

export function AdminGate() {
  const { staff, ready } = useAdminAuth();
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-sm text-white/60">Opening back office…</div>
    );
  }
  if (!staff) return <AdminLoginPage />;
  return <AdminShell />;
}
