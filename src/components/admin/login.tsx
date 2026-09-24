import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, PasswordInput } from "@/components/ui/field";
import { api } from "@/lib/api";
import { warmupAdmin } from "@/lib/admin-prefetch";
import { useAdminAuth } from "@/context/admin";

export function AdminLoginPage() {
  const { refresh } = useAdminAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-gold/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-[-4rem] h-72 w-72 rounded-full bg-pink/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 hidden h-40 w-40 -translate-x-1/2 rounded-full bg-peach/15 blur-3xl lg:block" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-between px-6 pb-4 pt-10 sm:px-10 lg:px-14 lg:py-12">
          <Logo
            tone="dark"
            className="relative z-10 [&_img]:h-12 [&_img]:max-w-[240px] sm:[&_img]:h-14 sm:[&_img]:max-w-[300px] lg:[&_img]:h-16 lg:[&_img]:max-w-[340px]"
          />
          <div className="relative mt-16 max-w-md lg:mt-0">
            <h1 className="font-display text-[2.35rem] leading-[1.05] text-white sm:text-5xl">
              The floor behind the shop.
            </h1>
            <div className="mt-8 flex gap-2 lg:mt-10">
              <span className="h-px w-10 self-center bg-gold/70" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">Private entrance</span>
            </div>
          </div>
          <p className="relative mt-12 hidden text-xs text-white/35 lg:block">Mojiano wholesale</p>
        </div>

        <div className="flex items-end px-5 pb-8 sm:px-10 lg:items-center lg:pb-0">
          <div className="w-full rounded-[1.75rem] border border-white/10 bg-canvas p-6 shadow-[0_30px_80px_-32px_rgba(0,0,0,0.65)] sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gold-deep">Back office</p>
            <h2 className="mt-3 font-display text-3xl text-ink">Login</h2>
            <form
              className="mt-8 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setPending(true);
                setError(null);
                try {
                  await api("/api/staff-login", {
                    method: "POST",
                    body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
                  });
                  warmupAdmin();
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not sign in.");
                } finally {
                  setPending(false);
                }
              }}
            >
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" autoComplete="username" required />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <Label>Password</Label>
                  <a href="/forgot-password" className="text-sm text-muted underline hover:text-ink">Forgot password?</a>
                </div>
                <PasswordInput name="password" autoComplete="current-password" required />
              </div>
              <FieldError message={error ?? undefined} />
              <Button type="submit" variant="gold" className="w-full" size="lg" disabled={pending}>
                {pending ? "Checking…" : "Login"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
