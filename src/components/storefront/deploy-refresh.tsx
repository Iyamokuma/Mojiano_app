import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function readBuildIdFromHtml(html: string): string | null {
  const match = html.match(/name="mojiano-build"\s+content="([^"]+)"/);
  return match?.[1] ?? null;
}

/** Prompts users on long-lived tabs when a newer production build is live. */
export function DeployRefreshBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const boot =
      typeof document !== "undefined"
        ? document.querySelector('meta[name="mojiano-build"]')?.getAttribute("content")
        : null;
    if (!boot) return;

    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`/?_=${Date.now()}`, { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) return;
        const html = await res.text();
        const live = readBuildIdFromHtml(html);
        if (!cancelled && live && live !== boot) setStale(true);
      } catch {
        /* offline */
      }
    }

    void check();
    const id = window.setInterval(check, 90_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!stale) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[100] border-t border-ink/10 bg-ink px-4 py-3 text-center text-sm text-white shadow-lg",
      )}
    >
      <span className="mr-3">A newer version of Mojiano is available.</span>
      <button type="button" className={buttonVariants({ variant: "peach", size: "sm" })} onClick={() => window.location.reload()}>
        Refresh
      </button>
    </div>
  );
}
