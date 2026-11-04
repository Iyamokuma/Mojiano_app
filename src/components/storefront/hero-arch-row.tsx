import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { heroArchImage } from "@/lib/media";

export type HeroArchCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

/** Width / height per arch from sm up, tallest in the middle, so the row reads as one shape. */
const ARCH_ASPECT = ["3 / 4", "3 / 4.5", "3 / 5", "3 / 4.5", "3 / 4"];

type HeroArchRowProps = {
  arches: HeroArchCategory[];
  onSpotlight: (slug: string | null) => void;
};

/** The shop's departments under the hero film, as arch windows (swipeable on phones). */
export function HeroArchRow({ arches, onSpotlight }: HeroArchRowProps) {
  if (!arches.length) return null;
  return (
    <section className="bg-canvas py-14 sm:py-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-gold-deep sm:text-[11px]">The departments</p>
            <h2 className="mt-3 font-serif text-4xl font-medium leading-none sm:text-5xl">Shop by department</h2>
          </div>
          <Link
            to="/shop"
            className="hidden shrink-0 text-sm text-ink underline decoration-gold underline-offset-[6px] hover:text-gold-deep sm:inline"
          >
            View everything
          </Link>
        </div>

        <div className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-10 sm:grid sm:grid-cols-5 sm:items-end sm:gap-4 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {arches.map((category, index) => {
            const image = heroArchImage(category.slug, category.image);
            return (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                onMouseEnter={() => onSpotlight(category.slug)}
                onFocus={() => onSpotlight(category.slug)}
                onMouseLeave={() => onSpotlight(null)}
                onBlur={() => onSpotlight(null)}
                className="group block w-[58vw] max-w-[15rem] shrink-0 snap-start sm:w-auto sm:max-w-none"
                aria-label={`Shop ${category.name}`}
              >
                <div
                  className="relative aspect-[3/4.2] overflow-hidden rounded-t-full bg-canvas-warm sm:aspect-(--arch)"
                  style={{ "--arch": ARCH_ASPECT[index] ?? ARCH_ASPECT[2] } as CSSProperties}
                >
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      loading={index < 3 ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  ) : null}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" aria-hidden />
                </div>
                {/* Two lines tall on every card, so the arch bottoms stay level when a name wraps. */}
                <div className="mt-4 flex min-h-[2.6em] items-start justify-between gap-2 font-serif text-xl leading-tight sm:text-[1.35rem] md:text-2xl">
                  <span className="font-medium text-ink">{category.name}</span>
                  <ArrowUpRight
                    size={18}
                    className="mt-1 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
