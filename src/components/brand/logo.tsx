import { cn } from "@/lib/utils";

export function Logo({
  variant = "lockup",
  tone = "light",
  caption,
  className,
}: {
  variant?: "lockup" | "mark";
  tone?: "light" | "dark";
  caption?: string;
  className?: string;
}) {
  if (variant === "mark") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <img
          src="/brand/logo-monogram.png?v=6"
          alt=""
          className={cn("h-10 w-auto object-contain sm:h-11", tone === "dark" && "invert")}
        />
        <span className="sr-only">Mojiano</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-col items-start", className)}>
      <img
        src="/brand/logo-wordmark.png?v=6"
        alt="Mojiano"
        className={cn(
          "h-8 w-auto max-w-[min(100%,168px)] object-contain object-left sm:h-11 sm:max-w-[300px] md:h-[3.25rem] md:max-w-[380px]",
          tone === "dark" && "invert",
        )}
      />
      {caption ? (
        <span
          className={cn(
            "mt-1 text-[10px] uppercase tracking-[0.28em]",
            tone === "dark" ? "text-gold" : "text-gold-deep",
          )}
        >
          {caption}
        </span>
      ) : null}
    </span>
  );
}
