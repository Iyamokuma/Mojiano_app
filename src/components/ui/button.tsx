import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium tracking-wide transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-white hover:bg-charcoal shadow-[0_10px_24px_-16px_rgba(28,20,16,0.7)]",
        gold: "bg-gold text-ink hover:bg-gold-deep",
        peach: "bg-peach text-ink hover:bg-peach-deep",
        outline: "border border-ink/15 bg-white/70 text-ink hover:border-ink/40 hover:bg-white",
        ghost: "text-ink hover:bg-canvas-warm",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-5",
        lg: "h-12 px-7 text-[15px]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };
