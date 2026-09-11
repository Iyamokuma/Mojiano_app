import { cn } from "@/lib/utils";

export function Alert({
  title,
  children,
  tone = "neutral",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "neutral" | "success" | "danger";
}) {
  const tones = {
    neutral: "border-line bg-white",
    success: "border-success/20 bg-success/5 text-success",
    danger: "border-danger/20 bg-danger/5 text-danger",
  };

  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm", tones[tone])} role="status">
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? "mt-1 text-muted" : ""}>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-5 h-px w-16 bg-gold" />
      <h2 className="font-display text-3xl text-ink">{title}</h2>
      <p className="mt-3 text-muted">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-canvas-warm", className)} />;
}
