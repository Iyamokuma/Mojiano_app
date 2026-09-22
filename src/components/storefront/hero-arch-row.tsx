import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  HERO_WAREHOUSE_VIDEO,
  HERO_WAREHOUSE_VIDEO_POSTER,
  heroArchImage,
} from "@/lib/media";
import { cn } from "@/lib/utils";

export type HeroArchCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

/** Width / height per arch, so the row scales proportionally on every screen size. */
const ARCH_ASPECT = ["16 / 21.5", "16 / 26", "16 / 31", "16 / 26", "16 / 21.5"];

/** Path for a `rounded-t-full` arch window. */
function archPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(w / 2, h);
  return `M ${x} ${y + h} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} L ${x + w} ${y + h} Z`;
}

type HeroArchRowProps = {
  arches: HeroArchCategory[];
  onSpotlight: (slug: string | null) => void;
};

export function HeroArchRow({ arches, onSpotlight }: HeroArchRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const archRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [videoOk, setVideoOk] = useState(true);
  const [motionOk, setMotionOk] = useState(true);
  const [clip, setClip] = useState<{ width: number; height: number; path: string } | null>(null);

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const rowRect = row.getBoundingClientRect();
    if (rowRect.width < 1 || rowRect.height < 1) return;

    const paths: string[] = [];
    for (const el of archRefs.current.slice(0, arches.length)) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      paths.push(archPath(r.left - rowRect.left, r.top - rowRect.top, r.width, r.height));
    }
    setClip({ width: rowRect.width, height: rowRect.height, path: paths.join(" ") });
  }, [arches.length]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    measure();
    const row = rowRef.current;
    if (!row) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(row);
    for (const el of archRefs.current) {
      if (el) ro.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, arches]);

  const showVideo = videoOk && motionOk && clip !== null;

  return (
    <div className="mt-6 w-full sm:mt-8 md:mt-10">
      <div className="mx-auto w-full max-w-[76rem] px-2 min-[400px]:px-3 sm:px-6 md:px-8">
        <div
          ref={rowRef}
          className="relative flex w-full items-end justify-center gap-1 min-[400px]:gap-1.5 sm:gap-3 md:gap-4"
        >
          {showVideo ? (
            <video
              className="pointer-events-none absolute left-0 top-0 z-0 object-cover object-center"
              style={{
                width: clip.width,
                height: clip.height,
                clipPath: `path('${clip.path}')`,
                WebkitClipPath: `path('${clip.path}')`,
              }}
              src={HERO_WAREHOUSE_VIDEO}
              poster={HERO_WAREHOUSE_VIDEO_POSTER}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden
              tabIndex={-1}
              onError={() => setVideoOk(false)}
              onLoadedData={measure}
            />
          ) : null}

          {arches.map((category, index) => {
            const poster = heroArchImage(category.slug, category.image);
            return (
              <div
                key={category.id}
                ref={(el) => {
                  archRefs.current[index] = el;
                }}
                className="relative min-w-0 max-w-[16rem] flex-1"
                style={{ aspectRatio: ARCH_ASPECT[index] ?? ARCH_ASPECT[2] }}
              >
                <Link
                  data-slug={category.slug}
                  to={`/category/${category.slug}`}
                  onMouseEnter={() => onSpotlight(category.slug)}
                  onFocus={() => onSpotlight(category.slug)}
                  onMouseLeave={() => onSpotlight(null)}
                  onBlur={() => onSpotlight(null)}
                  className={cn(
                    "group relative z-[1] block h-full w-full overflow-hidden rounded-t-full",
                    showVideo ? "bg-transparent" : "bg-canvas-warm/40",
                    "transition duration-500 ease-out",
                    "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(28,20,16,0.55)]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                  )}
                  aria-label={`Shop ${category.name}`}
                >
                  {!showVideo && poster ? (
                    <img
                      src={poster}
                      alt=""
                      loading={index === Math.floor(arches.length / 2) ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  ) : null}

                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-transparent"
                    aria-hidden
                  />
                  <span className="pointer-events-none absolute inset-x-0.5 bottom-1.5 z-[2] text-center font-display text-[7px] leading-tight text-white drop-shadow-sm min-[400px]:text-[8px] sm:inset-x-2 sm:bottom-4 sm:text-sm md:text-lg">
                    {category.name}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
