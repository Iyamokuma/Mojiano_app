import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { ProductGrid, type ProductCardData } from "@/components/storefront/product-card";
import { EmptyState } from "@/components/ui/feedback";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CatalogFacets = {
  inStock: number;
  outOfStock: number;
  categories: { name: string; slug: string; count: number }[];
};

const SORTS = [
  { value: "newest", label: "Date, new to old" },
  { value: "oldest", label: "Date, old to new" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
];

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function CatalogLayout({
  title,
  categorySlug,
  products,
  total,
  facets,
}: {
  title: string;
  categorySlug?: string;
  products: ProductCardData[];
  total: number;
  facets: CatalogFacets;
}) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openAvailability, setOpenAvailability] = useState(true);
  const [openCategories, setOpenCategories] = useState(true);

  const availability = useMemo(
    () => (params.get("availability") ?? "").split(",").filter(Boolean),
    [params],
  );
  const sort = params.get("sort") ?? "newest";
  const q = params.get("q") ?? "";

  function setParam(next: URLSearchParams) {
    const search = next.toString();
    navigate({ pathname: categorySlug ? `/category/${categorySlug}` : "/shop", search: search ? `?${search}` : "" });
  }

  function updateAvailability(value: "in" | "out") {
    const next = new URLSearchParams(params);
    const updated = toggleValue(availability, value);
    if (updated.length) next.set("availability", updated.join(","));
    else next.delete("availability");
    setParam(next);
  }

  function updateSort(value: string) {
    const next = new URLSearchParams(params);
    if (value === "newest") next.delete("sort");
    else next.set("sort", value);
    setParam(next);
  }

  const filters = (
    <div className="space-y-8">
      <FilterGroup
        title="Availability"
        open={openAvailability}
        onToggle={() => setOpenAvailability((value) => !value)}
      >
        <FilterCheck
          label="In stock"
          count={facets.inStock}
          checked={availability.includes("in")}
          onChange={() => updateAvailability("in")}
        />
        <FilterCheck
          label="Out of stock"
          count={facets.outOfStock}
          checked={availability.includes("out")}
          onChange={() => updateAvailability("out")}
        />
      </FilterGroup>

      <FilterGroup
        title="Categories"
        open={openCategories}
        onToggle={() => setOpenCategories((value) => !value)}
      >
        {facets.categories.map((category) => (
          <FilterCheck
            key={category.slug}
            label={category.name}
            count={category.count}
            checked={categorySlug === category.slug}
            to={
              categorySlug === category.slug
                ? `/shop${params.toString() ? `?${params}` : ""}`
                : `/category/${category.slug}${params.toString() ? `?${params}` : ""}`
            }
          />
        ))}
      </FilterGroup>
    </div>
  );

  return (
    <div className="bg-white">
      <div className="container-page py-8 md:py-12">
        <p className="text-sm text-muted">
          <Link to="/" className="hover:text-ink">Home</Link>
          <span className="px-1.5">/</span>
          <span>{title}</span>
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">{title}</h1>
        {q ? <p className="mt-2 text-sm text-muted">Showing results for “{q}”</p> : null}

        <div className="mt-8 lg:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
          {filtersOpen ? <div className="mt-5 rounded-2xl border border-line p-5">{filters}</div> : null}
        </div>

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
          <aside className="hidden lg:block">{filters}</aside>
          <div>
            <div className="mb-8 flex items-center justify-between gap-4 text-sm text-muted">
              <p>{total} product{total === 1 ? "" : "s"}</p>
              <label className="inline-flex items-center gap-2">
                <span className="sr-only">Sort</span>
                <select
                  value={sort}
                  onChange={(event) => updateSort(event.target.value)}
                  className="h-10 rounded-full border border-line bg-white px-3 text-sm text-ink outline-none focus:border-gold"
                >
                  {SORTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {products.length === 0 ? (
              <EmptyState
                title="No products found"
                description="Try another filter or browse all categories."
                action={
                  <Link to="/shop" className={buttonVariants({ variant: "outline" })}>
                    View all
                  </Link>
                }
              />
            ) : (
              <ProductGrid products={products} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-ink"
      >
        {title}
        <ChevronDown size={16} className={cn("text-muted transition", open && "rotate-180")} />
      </button>
      {open ? <div className="mt-4 space-y-3">{children}</div> : null}
    </div>
  );
}

function FilterCheck({
  label,
  count,
  checked,
  onChange,
  to,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange?: () => void;
  to?: string;
}) {
  const box = (
    <span className="flex items-center gap-2.5 text-sm text-ink">
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-[3px] border",
          checked ? "border-ink bg-ink" : "border-ink/30 bg-white",
        )}
      >
        {checked ? <span className="block h-1.5 w-2 border-b border-r border-white rotate-45 -translate-y-[1px]" /> : null}
      </span>
      <span>
        {label} <span className="text-muted">({count})</span>
      </span>
    </span>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {box}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onChange} className="block text-left">
      {box}
    </button>
  );
}
