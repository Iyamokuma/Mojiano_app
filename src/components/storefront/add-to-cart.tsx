import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useShop } from "@/context/shop";

export function AddToCartButton({
  productId,
  variantId,
  compact,
  quantity = 1,
  disabled,
  className,
}: {
  productId: string;
  variantId?: string;
  compact?: boolean;
  quantity?: number;
  disabled?: boolean;
  className?: string;
}) {
  const { setCartCount } = useShop();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={className}>
      <Button
        className={cn((compact || className) && "w-full")}
        size={compact ? "sm" : "lg"}
        disabled={pending || disabled}
        onClick={async () => {
          setError(null);
          setPending(true);
          try {
            const cart = await api<{ count: number }>("/api/cart", {
              method: "POST",
              body: JSON.stringify({ productId, quantity, variantId }),
            });
            setCartCount(cart.count);
            setMessage("Added to basket");
            setTimeout(() => setMessage(null), 2200);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add to basket.");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Adding…" : compact ? "Add" : "Add to basket"}
      </Button>
      {message ? (
        <p className="mt-2 text-sm text-success">
          Added to basket.{" "}
          <Link to="/basket" className="underline decoration-gold underline-offset-4">
            View basket
          </Link>
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
