import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, MailCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError, Input, Label, PasswordInput } from "@/components/ui/field";
import { useShop } from "@/context/shop";
import { api } from "@/lib/api";
import { lastPage, setFlash } from "@/lib/navigation-memory";
import { cn, safeNextPath } from "@/lib/utils";

const REDIRECT_SECONDS = 3;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (sent) {
    return (
      <div className="container-narrow py-16 text-center">
        <MailCheck size={44} className="mx-auto text-gold-deep" />
        <h1 className="mt-5 font-display text-4xl">Check your email</h1>
        <p className="mt-4 text-muted">{sent}</p>
        <p className="mt-2 text-sm text-muted">The link expires in 1 hour. Check your spam folder if it doesn't arrive.</p>
        <Link to="/login" className={cn(buttonVariants({ variant: "outline" }), "mt-8 inline-flex")}>Back to sign in</Link>
      </div>
    );
  }

  return (
    <div className="container-narrow py-16">
      <h1 className="font-display text-4xl">Forgot password</h1>
      <p className="mt-3 text-sm text-muted">Enter the email you signed up with and we'll send you a link to choose a new password.</p>
      <form
        className="mt-8 space-y-4 rounded-3xl bg-white p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending(true);
          setError(null);
          try {
            const result = await api<{ message: string }>("/api/auth/forgot-password", {
              method: "POST",
              body: JSON.stringify({ email: form.get("email") }),
            });
            setSent(result.message);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not send the reset link.");
          } finally {
            setPending(false);
          }
        }}
      >
        <div><Label>Email</Label><Input name="email" type="email" autoComplete="email" required /></div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
        <p className="text-center text-sm text-muted">
          Remembered it? <Link to="/login" className="text-ink underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

export function ResetPasswordPage() {
  const { refresh } = useShop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [staffDone, setStaffDone] = useState(false);

  if (!token) {
    return (
      <div className="container-narrow py-16 text-center">
        <h1 className="font-display text-4xl">Reset link missing</h1>
        <p className="mt-4 text-muted">Open the link from your email again, or request a new one.</p>
        <Link to="/forgot-password" className={cn(buttonVariants(), "mt-8 inline-flex")}>Request a new link</Link>
      </div>
    );
  }

  if (staffDone) {
    return (
      <div className="container-narrow py-16 text-center">
        <CheckCircle2 size={44} className="mx-auto text-success" />
        <h1 className="mt-5 font-display text-4xl">Password updated</h1>
        <p className="mt-4 text-muted">Sign in to the back office with your new password.</p>
        <a href="/admin" className={cn(buttonVariants(), "mt-8 inline-flex")}>Go to back office</a>
      </div>
    );
  }

  return (
    <div className="container-narrow py-16">
      <h1 className="font-display text-4xl">Choose a new password</h1>
      <form
        className="mt-8 space-y-4 rounded-3xl bg-white p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const password = String(form.get("password") ?? "");
          if (password !== form.get("confirmPassword")) {
            setError("The passwords don't match.");
            return;
          }
          setPending(true);
          setError(null);
          try {
            const result = await api<{ role: "CUSTOMER" | "ADMIN" }>("/api/auth/reset-password", {
              method: "POST",
              body: JSON.stringify({ token, password }),
            });
            if (result.role === "ADMIN") {
              setStaffDone(true);
              return;
            }
            await refresh();
            setFlash("Password updated — you're signed in.");
            navigate(safeNextPath(lastPage(), "/shop"), { replace: true });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not reset your password.");
          } finally {
            setPending(false);
          }
        }}
      >
        <div><Label>New password</Label><PasswordInput name="password" autoComplete="new-password" required minLength={8} /></div>
        <div><Label>Confirm new password</Label><PasswordInput name="confirmPassword" autoComplete="new-password" required minLength={8} /></div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "Saving…" : "Update password"}</Button>
        {error?.includes("expired") ? (
          <p className="text-center text-sm"><Link to="/forgot-password" className="text-ink underline">Request a new link</Link></p>
        ) : null}
      </form>
    </div>
  );
}

export function VerifyEmailPage() {
  const { refresh } = useShop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const started = useRef(false);
  const [state, setState] = useState<{ status: "checking" } | { status: "done"; name: string; next: string } | { status: "failed"; message: string }>(
    token ? { status: "checking" } : { status: "failed", message: "This verification link is incomplete." },
  );
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void api<{ name: string; next: string }>("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(async (result) => {
        await refresh();
        setState({ status: "done", name: result.name, next: result.next });
      })
      .catch((err) => setState({ status: "failed", message: err instanceof Error ? err.message : "Could not verify your email." }));
  }, [token, refresh]);

  useEffect(() => {
    if (state.status !== "done") return;
    if (seconds <= 0) {
      navigate(state.next, { replace: true });
      return;
    }
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [state, seconds, navigate]);

  if (state.status === "checking") {
    return <div className="container-narrow py-24 text-center text-muted">Confirming your email…</div>;
  }

  if (state.status === "failed") {
    return (
      <div className="container-narrow py-16 text-center">
        <h1 className="font-display text-4xl">Link not valid</h1>
        <p className="mt-4 text-muted">{state.message} Sign in and use “Resend email” on your account page to get a new link.</p>
        <Link to="/account" className={cn(buttonVariants(), "mt-8 inline-flex")}>Go to my account</Link>
      </div>
    );
  }

  const resuming = state.next !== "/shop";
  return (
    <div className="container-narrow py-16 text-center">
      <CheckCircle2 size={52} className="mx-auto text-success" />
      <h1 className="mt-5 font-display text-4xl sm:text-5xl">You're verified, {state.name.split(" ")[0]}!</h1>
      <p className="mt-4 text-muted">
        Your email is confirmed and you're signed in. {resuming ? "Taking you back to where you left off" : "Taking you to the shop"} in {seconds}s…
      </p>
      <Link to={state.next} replace className={cn(buttonVariants({ size: "lg" }), "mt-8 inline-flex")}>
        {resuming ? "Continue where I left off" : "Continue shopping"}
      </Link>
    </div>
  );
}
