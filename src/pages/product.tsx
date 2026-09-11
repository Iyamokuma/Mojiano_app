import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AddToCartButton } from "@/components/storefront/add-to-cart";
import { ProductGrid, type ProductCardData } from "@/components/storefront/product-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { useShop } from "@/context/shop";
import { api } from "@/lib/api";
import { discountPercent, effectivePrice, formatGBP } from "@/lib/money";
import { cn } from "@/lib/utils";

type ProductImage = { id?: string; url: string; alt: string };
type ProductVariant = { id: string; name: string; sku: string; stock: number; price: number | null };

type ProductDetail = ProductCardData & {
  description: string;
  sku: string;
  brand: string | null;
  weightGrams: number | null;
  category: { name: string; slug: string };
  images: ProductImage[];
  variants: ProductVariant[];
};

function waLink(phone: unknown, message: string) {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function ProductPage() {
  const { slug } = useParams();
  const { settings } = useShop();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ product: ProductDetail; related: ProductCardData[] } | null>(null);

  useEffect(() => {
    if (!slug) return;
    setData(null);
    setError(null);
    setActiveImage(0);
    setQuantity(1);
    setVariantId(undefined);
    void api<{ product: ProductDetail; related: ProductCardData[] }>(`/api/products/${slug}`)
      .then((next) => {
        setData(next);
        const first = next.product.variants.find((variant) => variant.stock > 0) ?? next.product.variants[0];
        setVariantId(first?.id);
      })
      .catch((err: Error) => setError(err.message || "Product not found."));
  }, [slug]);

  const product = data?.product;
  const variant = product?.variants.find((item) => item.id === variantId);
  const stock = variant ? variant.stock : (product?.stockQuantity ?? 0);
  const price = product
    ? variant?.price && variant.price > 0
      ? variant.price
      : effectivePrice(product)
    : 0;
  const save = product ? discountPercent(price, product.compareAtPrice) : null;
  const images = product?.images ?? [];
  const main = images[activeImage] ?? images[0];
  const wa = product ? waLink(settings.whatsappNumber, `Hello Mojiano, I would like to ask about ${product.name}.`) : null;

  const maxQty = Math.max(1, stock);
  const qty = Math.min(quantity, maxQty);

  const thumbs = useMemo(() => images, [images]);

  useEffect(() => {
    if (images.length < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setActiveImage((index) => (index + 1) % images.length);
      if (event.key === "ArrowLeft") setActiveImage((index) => (index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  if (error) {
    return (
      <EmptyState
        title="Product not found"
        description="That piece is no longer on the floor, or the link is out of date."
        action={
          <Link to="/shop" className={buttonVariants()}>
            Browse the shop
          </Link>
        }
      />
    );
  }

  if (!product) return <div className="container-page py-24 text-muted">Loading…</div>;

  return (
    <div className="container-page py-10">
      <p className="text-sm text-muted">
        <Link to="/" className="hover:text-ink">
          Home
        </Link>
        {" / "}
        <Link to={`/category/${product.category.slug}`} className="hover:text-ink">
          {product.category.name}
        </Link>
        {" / "}
        <span className="text-ink">{product.name}</span>
      </p>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <div>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-canvas-warm">
            <div className="aspect-square">
              {main ? (
                <img src={main.url} alt={main.alt || product.name} className="h-full w-full object-contain p-4 sm:p-8" />
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted">No image yet</div>
              )}
            </div>
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-sm hover:bg-white"
                  onClick={() => setActiveImage((index) => (index - 1 + images.length) % images.length)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-sm hover:bg-white"
                  onClick={() => setActiveImage((index) => (index + 1) % images.length)}
                >
                  <ChevronRight size={18} />
                </button>
              </>
            ) : null}
          </div>

          {thumbs.length > 1 ? (
            <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
              {thumbs.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    "overflow-hidden rounded-2xl bg-canvas-warm ring-2 ring-offset-2",
                    index === activeImage ? "ring-gold" : "ring-transparent hover:ring-line",
                  )}
                >
                  <img src={image.url} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{product.category.name}</p>
          {product.brand ? <p className="mt-2 text-sm text-muted">{product.brand}</p> : null}
          <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">{product.name}</h1>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <p className="text-2xl font-semibold">{formatGBP(price)}</p>
            {product.compareAtPrice && product.compareAtPrice > price ? (
              <p className="text-muted line-through">{formatGBP(product.compareAtPrice)}</p>
            ) : null}
            {save ? <p className="text-sm text-pink-deep">Save {save}%</p> : null}
          </div>
          <p className="mt-3 text-sm text-muted">
            {stock > 0 ? `${stock} in stock` : "Out of stock"}
            {product.sku ? ` · SKU ${variant?.sku || product.sku}` : null}
          </p>
          {product.shortDescription ? (
            <p className="mt-5 text-[15px] leading-relaxed text-muted">{product.shortDescription}</p>
          ) : null}

          {product.variants.length ? (
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Option</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.variants.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setVariantId(item.id);
                      setQuantity(1);
                    }}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm",
                      item.id === variantId ? "bg-ink text-white" : "bg-white text-ink hover:bg-canvas-warm",
                      item.stock < 1 && "opacity-40",
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="inline-flex h-12 items-center rounded-full border border-ink/15 bg-white">
              <button
                type="button"
                className="h-12 w-11 text-lg"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <span className="min-w-[2rem] text-center text-sm">{qty}</span>
              <button
                type="button"
                className="h-12 w-11 text-lg"
                aria-label="Increase quantity"
                onClick={() => setQuantity((value) => Math.min(maxQty, value + 1))}
              >
                +
              </button>
            </div>
            <AddToCartButton
              productId={product.id}
              variantId={variantId}
              quantity={qty}
              disabled={stock < 1}
              className="flex-1"
            />
          </div>
          {wa ? (
            <a href={wa} className="mt-4 inline-block text-sm underline decoration-gold underline-offset-4" target="_blank" rel="noreferrer">
              Ask about this product on WhatsApp
            </a>
          ) : null}
          {product.weightGrams ? (
            <p className="mt-6 text-sm text-muted">Weight {product.weightGrams}g</p>
          ) : null}
        </div>
      </div>

      {product.description ? (
        <section className="mt-14 max-w-3xl">
          <h2 className="font-display text-3xl">Details</h2>
          <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted">{product.description}</p>
        </section>
      ) : null}

      {images.length > 1 ? (
        <section className="mt-14">
          <h2 className="font-display text-3xl">Gallery</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {images.map((image, index) => (
              <button
                key={`${image.url}-full-${index}`}
                type="button"
                onClick={() => {
                  setActiveImage(index);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="overflow-hidden rounded-[1.75rem] bg-canvas-warm"
              >
                <img src={image.url} alt={image.alt || `${product.name} ${index + 1}`} className="w-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      ) : images[0] ? (
        <section className="mt-14 overflow-hidden rounded-[1.75rem] bg-canvas-warm">
          <img src={images[0].url} alt={images[0].alt || product.name} className="w-full object-cover" />
        </section>
      ) : null}

      {data?.related.length ? (
        <section className="mt-16">
          <h2 className="mb-8 font-display text-3xl">Related</h2>
          <ProductGrid products={data.related} />
        </section>
      ) : null}
    </div>
  );
}
