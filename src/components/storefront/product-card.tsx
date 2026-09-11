import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { formatGBP, discountPercent, effectivePrice } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "@/components/storefront/add-to-cart";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  salePrice: number | null;
  stockQuantity: number;
  clearance: boolean;
  newArrival?: boolean;
  shortDescription: string;
  ratingAvg: number;
  reviewCount: number;
  category: { name: string; slug: string };
  images: { url: string; alt: string }[];
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const [quickView, setQuickView] = useState(false);
  const price = effectivePrice(product);
  const save = discountPercent(price, product.compareAtPrice);
  const image = product.images[0];
  const isNew = Boolean(product.newArrival);

  return (
    <article className="group flex h-full flex-col items-center text-center">
      <Link to={`/product/${product.slug}`} className="relative block w-full overflow-hidden rounded-2xl bg-canvas-warm">
        <div className="relative aspect-square overflow-hidden rounded-2xl">
          {image ? (
            <img
              src={image.url}
              alt={image.alt || product.name}
              className="h-full w-full rounded-2xl object-cover object-center transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">No image</div>
          )}
          {isNew ? (
            <span className="absolute right-2 top-2 rounded-full bg-charcoal px-2.5 py-1 text-[10px] font-medium text-white">
              New
            </span>
          ) : null}
        </div>
      </Link>
      <h3 className="mt-5 max-w-[16rem] font-sans text-[15px] font-medium leading-snug text-ink">
        <Link to={`/product/${product.slug}`} className="hover:text-gold-deep">
          {product.name}
        </Link>
      </h3>
      <p className="mt-2 text-[15px] text-ink">{formatGBP(price)}</p>
      {product.compareAtPrice && product.compareAtPrice > price ? (
        <p className="text-sm text-muted line-through">{formatGBP(product.compareAtPrice)}</p>
      ) : null}
      <button
        type="button"
        onClick={() => setQuickView(true)}
        className="mt-4 inline-flex h-10 min-w-[8.5rem] items-center justify-center rounded-full border border-ink/20 bg-white px-5 text-sm text-ink transition hover:border-ink hover:bg-canvas"
      >
        Quick view
      </button>
      {quickView ? (
        <QuickView product={product} price={price} save={save} onClose={() => setQuickView(false)} />
      ) : null}
    </article>
  );
}

function QuickView({
  product,
  price,
  save,
  onClose,
}: {
  product: ProductCardData;
  price: number;
  save: number | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const image = product.images[0];

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-ink/40" aria-label="Close quick view" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative grid w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2"
      >
        <div className="aspect-square bg-canvas">
          {image ? <img src={image.url} alt="" className="h-full w-full object-contain p-6" /> : null}
        </div>
        <div className="flex flex-col p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{product.category.name}</p>
          <h2 id={titleId} className="mt-2 font-display text-3xl leading-tight">
            {product.name}
          </h2>
          <p className="mt-3 text-xl font-medium">{formatGBP(price)}</p>
          {save ? <p className="mt-1 text-sm text-pink-deep">Save {save}%</p> : null}
          <p className="mt-4 text-sm leading-relaxed text-muted">{product.shortDescription}</p>
          <p className="mt-3 text-xs text-muted">
            {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : "Out of stock"}
          </p>
          <div className={cn("mt-6", product.stockQuantity < 1 && "pointer-events-none opacity-50")}>
            <AddToCartButton productId={product.id} />
          </div>
          <Link to={`/product/${product.slug}`} className="mt-4 text-sm underline decoration-gold underline-offset-4" onClick={onClose}>
            View full details
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
