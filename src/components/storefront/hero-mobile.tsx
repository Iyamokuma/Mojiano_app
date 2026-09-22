import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  HERO_WAREHOUSE_VIDEO,
  HERO_WAREHOUSE_VIDEO_POSTER,
  heroArchImage,
} from "@/lib/media";
import { cn } from "@/lib/utils";
import type { HeroArchCategory } from "@/components/storefront/hero-arch-row";

type HeroMobileProps = {
  arches: HeroArchCategory[];
  onSpotlight: (slug: string | null) => void;
  centerSlug: string | null;
};

/** Small screens: one featured video arch + swipeable category strip (no shared SVG mask). */
export function HeroMobile({ arches, onSpotlight, centerSlug }: HeroMobileProps) {
  const [videoOk, setVideoOk] = useState(true);
  const [motionOk, setMotionOk] = useState(true);
  const featuredIndex = Math.max(
    0,
    arches.findIndex((c) => c.slug === centerSlug),
  );
  const featured = arches[featuredIndex] ?? arches[0];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const showVideo = videoOk && motionOk;

  return (
    <div className="mt-6 w-full px-3 md:hidden">
      {featured ? (
        <Link
          to={`/category/${featured.slug}`}
          onFocus={() => onSpotlight(featured.slug)}
          onBlur={() => onSpotlight(null)}
          className={cn(
            "relative mx-auto block h-[15.5rem] w-full max-w-[22rem] overflow-hidden rounded-t-[3.5rem] sm:h-[17rem] sm:max-w-[26rem]",
            "bg-canvas-warm/40 shadow-[0_20px_50px_-28px_rgba(28,20,16,0.45)]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
          )}
          aria-label={`Shop ${featured.name}`}
        >
          {showVideo ? (
            <video
              className="absolute inset-0 h-full w-full object-cover object-center"
              src={HERO_WAREHOUSE_VIDEO}
              poster={HERO_WAREHOUSE_VIDEO_POSTER}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
              tabIndex={-1}
              onError={() => setVideoOk(false)}
            />
          ) : (
            <img
              src={heroArchImage(featured.slug, featured.image)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" aria-hidden />
          <span className="pointer-events-none absolute inset-x-4 bottom-4 text-center font-display text-xl leading-tight text-white drop-shadow-md">
            {featured.name}
          </span>
        </Link>
      ) : null}

      {arches.length > 1 ? (
        <div
          className={cn(
            "mx-auto mt-4 flex max-w-[26rem] gap-2 overflow-x-auto overscroll-x-contain pb-1",
            "snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {arches.map((category) => {
            const poster = heroArchImage(category.slug, category.image);
            const active = category.slug === (centerSlug ?? featured?.slug);
            return (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                onMouseEnter={() => onSpotlight(category.slug)}
                onFocus={() => onSpotlight(category.slug)}
                onMouseLeave={() => onSpotlight(null)}
                onBlur={() => onSpotlight(null)}
                className={cn(
                  "relative h-[5.5rem] w-[4.75rem] shrink-0 snap-center overflow-hidden rounded-t-full sm:h-[6rem] sm:w-[5.25rem]",
                  "border-2 transition duration-300",
                  active ? "border-gold shadow-md" : "border-transparent opacity-90 hover:opacity-100",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                )}
                aria-label={`Shop ${category.name}`}
              >
                {poster ? (
                  <img src={poster} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                ) : null}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" aria-hidden />
                <span className="pointer-events-none absolute inset-x-0.5 bottom-1 line-clamp-2 text-center text-[7px] font-medium leading-tight text-white sm:bottom-1.5 sm:text-[8px]">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
