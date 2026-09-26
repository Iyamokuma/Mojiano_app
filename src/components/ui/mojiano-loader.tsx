import { cn } from "@/lib/utils";

type MojianoLoaderProps = {
  className?: string;
  compact?: boolean;
  hint?: string;
};

/** Branded loading state — no generic “Loading…” copy. */
export function MojianoLoader({ className, compact, hint }: MojianoLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-12" : "min-h-[42vh] py-24",
        className,
      )}
    >
      <p className="mojiano-loader-word font-display text-[2rem] tracking-[-0.04em] text-ink sm:text-[2.35rem]">
        Mojiano
      </p>
      <div className="mt-5 flex items-center gap-2" aria-hidden>
        <span className="mojiano-loader-dot h-2 w-2 rounded-full bg-gold-deep" />
        <span className="mojiano-loader-dot mojiano-loader-dot-delay h-2 w-2 rounded-full bg-peach-deep" />
        <span className="mojiano-loader-dot mojiano-loader-dot-delay-2 h-2 w-2 rounded-full bg-gold" />
      </div>
      {hint ? <p className="mt-4 max-w-xs text-sm text-muted">{hint}</p> : null}
      <span className="sr-only">Mojiano is loading</span>
    </div>
  );
}
