import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const PAYMENT_STATUSES = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"] as const;

export function prettyStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export function StatusPill({
  value,
  tone = "neutral",
}: {
  value: string;
  tone?: "neutral" | "gold" | "ok" | "warn" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
        tone === "gold" && "bg-ink/10 text-ink",
        tone === "ok" && "bg-success/10 text-success",
        tone === "warn" && "bg-peach/50 text-ink",
        tone === "danger" && "bg-danger/10 text-danger",
        tone === "neutral" && "bg-canvas-warm text-muted",
      )}
    >
      {prettyStatus(value)}
    </span>
  );
}

export function statusTone(status: string): "neutral" | "gold" | "ok" | "warn" | "danger" {
  if (status === "DELIVERED" || status === "PAID" || status === "FULFILLED") return "ok";
  if (status === "CANCELLED" || status === "FAILED" || status === "REFUNDED") return "danger";
  if (status === "SHIPPED" || status === "PROCESSING" || status === "CONFIRMED") return "gold";
  return "warn";
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("rounded-3xl bg-white p-5 shadow-[0_12px_40px_-28px_rgba(28,20,16,0.35)] sm:p-6", className)}>{children}</section>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold-deep">{children}</p>;
}
