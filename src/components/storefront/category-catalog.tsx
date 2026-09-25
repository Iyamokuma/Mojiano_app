import { useRef } from "react";
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
      className="group flex w-[6.75rem] shrink-0 flex-col items-center sm:w-[7.25rem]"
    >
      <div
        className={cn(
          "relative aspect-[3/4] w-full overflow-hidden rounded-[2rem] bg-canvas-warm/80",
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
      <p className="mt-3 line-clamp-2 w-full text-center text-[13px] font-medium leading-snug text-ink group-hover:text-gold-deep">
        {category.name}
      </p>
    </Link>
  );
}

/** Desktop-only category strip below the hero (mobile: hidden — use nav / shop instead). */
export function CategoryCatalog({ categories }: { categories: CategoryCard[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (!categories.length) return null;

  function scrollNext() {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <section className="hidden bg-white md:block">
      <div className="container-page relative py-8 lg:py-10">
        <div
          ref={scrollerRef}
          className={cn(
            "overflow-x-auto overscroll-x-contain pb-2 pr-14",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "scroll-smooth",
          )}
        >
          <div className="grid w-max grid-flow-col grid-rows-2 gap-x-5 gap-y-8 lg:gap-x-6">
            {categories.map((category) => (
              <CategoryPill key={category.id} category={category} />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={scrollNext}
          className={cn(
            "absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full",
            "border border-line bg-white text-ink shadow-sm transition hover:border-ink/30 hover:shadow-md",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
          )}
          aria-label="Scroll categories"
        >
          <ChevronRight size={22} strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}
