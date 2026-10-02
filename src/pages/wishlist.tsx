import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ProductGrid, type ProductCardData } from "@/components/storefront/product-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { MojianoLoader } from "@/components/ui/mojiano-loader";
import { useShop } from "@/context/shop";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function WishlistPage() {
  const { user, ready, wishlistIds } = useShop();
  const [products, setProducts] = useState<ProductCardData[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void api<ProductCardData[]>("/api/account/wishlist")
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [user]);

  const visible = products?.filter((p) => wishlistIds.includes(p.id)) ?? null;

  if (!ready) return <MojianoLoader className="container-page" hint="Opening your wishlist…" />;
  if (!user) return <Navigate to="/login?next=/wishlist" replace />;
  if (visible === null) return <MojianoLoader className="container-page" compact />;

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="font-display text-3xl sm:text-4xl">Wishlist</h1>
      <p className="mt-2 text-sm text-muted">Items you saved for later — tap the heart on any product to add or remove.</p>
      {visible.length ? (
        <div className="mt-10">
          <ProductGrid products={visible} />
        </div>
      ) : (
        <EmptyState
          className="mt-10"
          title="Your wishlist is empty"
          description="Browse the shop and tap the heart on anything you like."
          action={
            <Link to="/shop" className={cn(buttonVariants(), "inline-flex")}>
              Browse the shop
            </Link>
          }
        />
      )}
    </div>
  );
}
