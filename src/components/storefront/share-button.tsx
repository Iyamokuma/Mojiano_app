import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShareButton({ title, text, className }: { title: string; text?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function onClick() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // The user closed the share sheet; nothing to do.
        if ((err as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      aria-label={copied ? "Link copied" : "Share this product"}
      title={copied ? "Link copied" : "Share"}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full text-muted transition hover:text-ink",
        className,
      )}
    >
      {copied ? <Check size={20} className="text-ink" /> : <Share2 size={20} />}
      {copied ? (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs text-white">
          Link copied
        </span>
      ) : null}
    </button>
  );
}
