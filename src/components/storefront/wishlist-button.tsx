import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useShop } from "@/context/shop";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  className,
  size = "md",
}: {
  productId: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { user, wishlistIds, toggleWishlist } = useShop();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const saved = wishlistIds.includes(productId);

  async function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setPending(true);
    try {
      await toggleWishlist(productId);
    } finally {
      setPending(false);
    }
  }

  const dim = size === "sm" ? 18 : 22;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(event) => void onClick(event)}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={saved}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition",
        saved ? "text-pink-deep hover:text-pink" : "text-muted hover:text-ink",
        className,
      )}
    >
      <Heart size={dim} className={cn(saved && "fill-current")} />
    </button>
  );
}

export function WishlistNavLink({ count }: { count: number }) {
  return (
    <Link
      to="/wishlist"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-canvas-warm"
      aria-label={`Wishlist, ${count} items`}
    >
      <Heart size={18} />
      {count > 0 ? (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-deep px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
