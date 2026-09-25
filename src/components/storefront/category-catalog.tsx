import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { compactImageUrl, resolveCategoryImage } from "@/lib/media";
import { cn } from "@/lib/utils";

export type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

function CategoryPill({ category }: { category: CategoryCard }) {
  const image = category.image
    ? compactImageUrl(resolveCategoryImage(category.slug, category.image) || category.image, 480)
    : null;

  return (
    <Link
      to={`/category/${category.slug}`}
      className="group flex w-[5.5rem] shrink-0 flex-col items-center min-[400px]:w-[6.25rem] md:w-[6.75rem] lg:w-[7.25rem]"
    >
      <div
        className={cn(
          "relative aspect-[3/4] w-full overflow-hidden rounded-[1.75rem] bg-canvas-warm/80 md:rounded-[2rem]",
          "ring-1 ring-line/60 transition duration-300 group-hover:ring-gold/40 group-hover:shadow-md",
        )}
      >
        {image ? (
          <img
            src={image}
            loading="lazy"
            decoding="async"
            alt=""
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">{category.name}</div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 w-full text-center text-[11px] font-medium leading-snug text-ink min-[400px]:mt-3 min-[400px]:text-[13px] group-hover:text-gold-deep">
        {category.name}
      </p>
    </Link>
  );
}

function CategoryScrollStrip({ categories }: { categories: CategoryCard[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const syncScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth > 4;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setCanScrollNext(overflow && !atEnd);
  }, []);

  useEffect(() => {
    syncScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => syncScrollState());
    ro.observe(el);
    el.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
    };
  }, [categories, syncScrollState]);

  function scrollNext() {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85, behavior: "smooth" });
  }

  if (!categories.length) {
    return <p className="text-sm text-muted">No categories match your filters.</p>;
  }

  return (
    <div className="relative min-w-0">
      <div
        ref={scrollerRef}
        className={cn(
          "overflow-x-auto overscroll-x-contain pb-2",
          canScrollNext ? "pr-12 md:pr-14" : "pr-0",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "scroll-smooth snap-x snap-mandatory md:snap-none",
        )}
      >
        <div className="grid w-max grid-flow-col grid-rows-2 gap-x-4 gap-y-6 min-[400px]:gap-x-5 min-[400px]:gap-y-8 lg:gap-x-6">
          {categories.map((category) => (
            <div key={category.id} className="snap-start">
              <CategoryPill category={category} />
            </div>
          ))}
        </div>
      </div>

      {canScrollNext ? (
        <button
          type="button"
          onClick={scrollNext}
          className={cn(
            "absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full md:h-11 md:w-11",
            "border border-line bg-white text-ink shadow-sm transition hover:border-ink/30 hover:shadow-md",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
          )}
          aria-label="Scroll to more categories"
        >
          <ChevronRight size={20} strokeWidth={2} className="md:hidden" />
          <ChevronRight size={22} strokeWidth={2} className="hidden md:block" />
        </button>
      ) : null}
    </div>
  );
}

export function CategoryCatalog({ categories }: { categories: CategoryCard[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => {
    if (!selected.length) return categories;
    return categories.filter((category) => selected.includes(category.slug));
  }, [categories, selected]);

  function toggle(slug: string) {
    setSelected((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  if (!categories.length) return null;

  return (
    <section className="mt-8 bg-white md:mt-12">
      <div className="container-page pb-8 pt-2 md:pb-10 md:pt-4 lg:pb-12">
        <div className="grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-14">
          <aside className="hidden lg:block">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink">Categories</p>
            <div className="mt-4 max-h-[min(22rem,calc(100vh-12rem))] space-y-3 overflow-y-auto pr-2">
              {categories.map((category) => {
                const checked = selected.includes(category.slug);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggle(category.slug)}
                    className={cn(
                      "flex w-full items-center gap-2.5 text-left text-sm leading-snug transition",
                      checked ? "text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border",
                        checked ? "border-ink bg-ink" : "border-ink/30 bg-white",
                      )}
                    >
                      {checked ? (
                        <span className="-translate-y-[1px] block h-1.5 w-2 rotate-45 border-b border-r border-white" />
                      ) : null}
                    </span>
                    {category.name}
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0">
            <CategoryScrollStrip categories={visible} />
          </div>
        </div>
      </div>
    </section>
  );
}
