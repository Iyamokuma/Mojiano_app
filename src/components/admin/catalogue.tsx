import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, peekApi } from "@/lib/api";
import { formatGBP } from "@/lib/money";
import { Eyebrow, Panel, StatusPill } from "@/components/admin/ui";
import { Input } from "@/components/ui/field";

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stockQuantity: number;
  featured: boolean;
  clearance: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  isActive: boolean;
  category: { name: string };
  images: { url: string }[];
};

type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  isVisible: boolean;
  _count: { products: number };
};

export function AdminCatalogue() {
  const [params] = useSearchParams();
  const tab = params.get("tab") === "rooms" ? "rooms" : "products";
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>(() => peekApi<Product[]>("/api/admin/products") ?? []);
  const [categories, setCategories] = useState<Category[]>(() => peekApi<Category[]>("/api/admin/categories") ?? []);
  const [ready, setReady] = useState(
    () => peekApi("/api/admin/products") !== undefined && peekApi("/api/admin/categories") !== undefined,
  );
  const [error, setError] = useState<string | null>(null);

  async function loadProducts(q = query) {
    const path = q ? `/api/admin/products?q=${encodeURIComponent(q)}` : "/api/admin/products";
    setProducts(await api<Product[]>(path));
  }

  async function load() {
    try {
      const [nextProducts, nextCategories] = await Promise.all([
        api<Product[]>("/api/admin/products"),
        api<Category[]>("/api/admin/categories"),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load catalogue.");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function patchProduct(id: string, body: Record<string, unknown>) {
    const updated = await api<Product>(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, ...updated } : product)));
  }

  async function patchCategory(id: string, body: Record<string, unknown>) {
    const updated = await api<Category>(`/api/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setCategories((current) => current.map((category) => (category.id === id ? { ...category, ...updated } : category)));
  }

  const filtered = useMemo(() => products, [products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Ecommerce</Eyebrow>
          <h1 className="mt-2 font-display text-4xl">{tab === "rooms" ? "Categories" : "All products"}</h1>
          <p className="mt-2 text-sm text-muted">
            {tab === "rooms"
              ? "These rooms power the homepage grids and shop filters."
              : "Flags here power New arrivals, Featured, clearance tickets and category rooms."}
          </p>
        </div>
        {tab === "products" ? (
          <Link
            to="/admin/catalogue/new"
            className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-charcoal"
          >
            Add product
          </Link>
        ) : null}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {tab === "products" ? (
        <>
          <form
            className="max-w-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void loadProducts();
            }}
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or SKU"
            />
          </form>
          <div className="grid gap-3">
            {filtered.length === 0 ? (
              <Panel className="p-8 text-center">
                <p className="text-sm text-muted">
                  {!ready ? "Loading products…" : query ? "No matching products." : "No products yet. Add one and pick the category it belongs to."}
                </p>
                {ready && !query ? (
                  <Link to="/admin/catalogue/new" className="mt-4 inline-flex text-sm font-medium text-gold-deep">
                    Add product
                  </Link>
                ) : null}
              </Panel>
            ) : null}
            {filtered.map((product) => (
              <Panel key={product.id} className="p-4 sm:p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link to={`/admin/catalogue/${product.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-canvas-warm">
                    {product.images[0] ? (
                      <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/catalogue/${product.id}`} className="font-medium hover:text-gold-deep">
                        {product.name}
                      </Link>
                      {!product.isActive ? <StatusPill value="Hidden" tone="neutral" /> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {product.sku} · {product.category.name} · {formatGBP(product.price)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Flag active={product.newArrival} label="New" onClick={() => void patchProduct(product.id, { newArrival: !product.newArrival })} />
                      <Flag active={product.featured} label="Featured" onClick={() => void patchProduct(product.id, { featured: !product.featured })} />
                      <Flag active={product.clearance} label="Clearance" onClick={() => void patchProduct(product.id, { clearance: !product.clearance })} />
                      <Flag active={product.bestSeller} label="Best" onClick={() => void patchProduct(product.id, { bestSeller: !product.bestSeller })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-muted">Stock</span>
                      <input
                        type="number"
                        defaultValue={product.stockQuantity}
                        className="h-10 w-20 rounded-xl border border-line bg-white px-2 text-sm"
                        onBlur={(event) => {
                          const value = Number(event.target.value);
                          if (value !== product.stockQuantity) void patchProduct(product.id, { stockQuantity: value });
                        }}
                      />
                    </label>
                    <Link
                      to={`/admin/catalogue/${product.id}`}
                      className="text-xs uppercase tracking-[0.14em] text-gold-deep hover:text-ink"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => void patchProduct(product.id, { isActive: !product.isActive })}
                      className="text-xs uppercase tracking-[0.14em] text-muted hover:text-ink"
                    >
                      {product.isActive ? "On floor" : "Bring back"}
                    </button>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <Panel key={category.id} className="overflow-hidden p-0 sm:p-0">
              <div className="aspect-[16/9] bg-canvas-warm">
                {category.image ? <img src={category.image} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs text-muted">{category._count.products} products</p>
                </div>
                <button
                  type="button"
                  onClick={() => void patchCategory(category.id, { isVisible: !category.isVisible })}
                  className="text-xs uppercase tracking-[0.14em] text-gold-deep"
                >
                  {category.isVisible ? "Visible" : "Hidden"}
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function Flag({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${
        active ? "bg-ink text-white" : "bg-canvas text-muted"
      }`}
    >
      {label}
    </button>
  );
}
