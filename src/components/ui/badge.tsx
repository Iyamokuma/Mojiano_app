import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "sale" | "gold" | "success" | "pink";
  className?: string;
}) {
  const tones = {
    neutral: "bg-canvas-warm text-charcoal",
    sale: "bg-pink-deep text-white",
    gold: "bg-gold/20 text-gold-deep",
    success: "bg-success/10 text-success",
    pink: "bg-pink/40 text-charcoal",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
