import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useShop } from "@/context/shop";
import { HERO_FEATURED_CATEGORY_SLUGS } from "@/lib/media";
import { cn } from "@/lib/utils";
import { HeroArchRow, type HeroArchCategory } from "@/components/storefront/hero-arch-row";
import { HeroMobile } from "@/components/storefront/hero-mobile";

function pickHeroCategories(categories: HeroArchCategory[]) {
  const featured = HERO_FEATURED_CATEGORY_SLUGS.map((slug) =>
    categories.find((category) => category.slug === slug),
  ).filter((category): category is HeroArchCategory => Boolean(category));
  const extras = categories.filter((category) => !featured.some((item) => item.id === category.id));
  return [...featured, ...extras].slice(0, 5);
}

export function HomeHero({
  title,
  body,
  ctaLabel,
  ctaHref,
  categories,
}: {
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  categories: HeroArchCategory[];
}) {
  const { setSpotlightSlug } = useShop();
  const arches = pickHeroCategories(categories);
  const href = ctaHref || "/shop";
  const centerSlug = arches[Math.floor(arches.length / 2)]?.slug ?? arches[0]?.slug ?? null;
  const [spotlight, setSpotlight] = useState<string | null>(centerSlug);

  useEffect(() => {
    setSpotlightSlug(spotlight ?? centerSlug);
    return () => setSpotlightSlug(null);
  }, [spotlight, centerSlug, setSpotlightSlug]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-peach/45 via-canvas to-canvas">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col items-center px-3 pt-10 text-center sm:px-6 sm:pt-14 md:pt-16">
        <p className="text-[9px] uppercase tracking-[0.28em] text-gold-deep sm:text-[11px]">From our warehouse</p>
        <h1 className="mt-3 max-w-4xl font-display text-[1.85rem] leading-[1.05] text-ink min-[400px]:text-[2.15rem] sm:mt-4 sm:text-6xl md:text-7xl">
          {title}
        </h1>
        {body ? (
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted sm:mt-5 sm:text-sm md:text-base">
            {body}
          </p>
        ) : null}
        <Link
          to={href.startsWith("/") ? href : "/shop"}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "mt-5 h-10 px-4 text-[13px] sm:mt-8 sm:h-12 sm:px-6 sm:text-[15px] border-white/80 bg-white shadow-sm",
          )}
        >
          {ctaLabel || "Browse clearance"}
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white sm:h-7 sm:w-7">
            <ArrowRight size={14} />
          </span>
        </Link>
      </div>

      <HeroMobile
        arches={arches}
        centerSlug={centerSlug}
        onSpotlight={(slug) => setSpotlight(slug === null ? centerSlug : slug)}
      />
      <div className="hidden md:block">
        <HeroArchRow
          arches={arches}
          onSpotlight={(slug) => setSpotlight(slug === null ? centerSlug : slug)}
        />
      </div>
    </section>
  );
}
