import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle2, X } from "lucide-react";
import { rememberPage, takeFlash } from "@/lib/navigation-memory";

/** Remembers the last storefront page and shows one-off success messages after redirects. */
export function FlashBanner() {
  const location = useLocation();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    rememberPage(location.pathname + location.search);
    const next = takeFlash();
    if (next) setMessage(next);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 7000);
    return () => window.clearTimeout(id);
  }, [message]);

  if (!message) return null;

  return (
    <div role="status" className="border-b border-success/20 bg-success/10">
      <div className="container-page flex items-center gap-3 py-3 text-sm text-ink">
        <CheckCircle2 size={18} className="shrink-0 text-success" />
        <p className="flex-1">{message}</p>
        <button type="button" onClick={() => setMessage(null)} className="text-muted hover:text-ink" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
