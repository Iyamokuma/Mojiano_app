import { useCallback, useEffect, useId, useRef, useState } from "react";
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

/** Desktop/tablet (md+): five arches with one continuous masked video. */
const ARCH_HEIGHT = [
  "h-[18rem] lg:h-[21.5rem]",
  "h-[22rem] lg:h-[26rem]",
  "h-[26rem] lg:h-[31rem]",
  "h-[22rem] lg:h-[26rem]",
  "h-[18rem] lg:h-[21.5rem]",
];

const ARCH_WIDTH = "min-w-0 max-w-[13.5rem] lg:max-w-[16rem]";

/** SVG mask path matching Tailwind `rounded-t-full` arch windows. */
function archMaskPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(w / 2, h);
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ");
}

type HeroArchRowProps = {
  arches: HeroArchCategory[];
  onSpotlight: (slug: string | null) => void;
};

export function HeroArchRow({ arches, onSpotlight }: HeroArchRowProps) {
  const maskId = useId().replace(/:/g, "");
  const rowRef = useRef<HTMLDivElement>(null);
  const archRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [videoOk, setVideoOk] = useState(true);
  const [motionOk, setMotionOk] = useState(true);
  const [mask, setMask] = useState<{ width: number; height: number; paths: string[] } | null>(null);

  const measureMask = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const rowRect = row.getBoundingClientRect();
    if (rowRect.width < 1 || rowRect.height < 1) return;

    const paths = archRefs.current
      .map((el) => {
        if (!el) return "";
        const r = el.getBoundingClientRect();
        const x = r.left - rowRect.left;
        const y = r.top - rowRect.top;
        return archMaskPath(x, y, r.width, r.height);
      })
      .filter(Boolean);

    if (paths.length === arches.length) {
      setMask({ width: rowRect.width, height: rowRect.height, paths });
    }
  }, [arches.length]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    measureMask();
    const row = rowRef.current;
    if (!row) return;

    const ro = new ResizeObserver(() => measureMask());
    ro.observe(row);
    for (const el of archRefs.current) {
      if (el) ro.observe(el);
    }

    window.addEventListener("resize", measureMask);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureMask);
    };
  }, [measureMask, arches]);

  const showVideo = videoOk && motionOk;
  const videoMasked = showVideo && mask !== null;

  return (
    <div className="mt-8 w-full md:mt-10">
      <div className="mx-auto w-full max-w-[76rem] px-6 md:px-8">
        <div
          ref={rowRef}
          className="relative flex w-full items-end justify-center gap-3 md:gap-4"
        >
          {videoMasked ? (
            <>
              <svg
                className="pointer-events-none absolute h-0 w-0 overflow-hidden"
                aria-hidden
                focusable="false"
              >
                <defs>
                  <mask
                    id={maskId}
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width={mask.width}
                    height={mask.height}
                  >
                    <rect width={mask.width} height={mask.height} fill="black" />
                    {mask.paths.map((d, i) => (
                      <path key={i} d={d} fill="white" />
                    ))}
                  </mask>
                </defs>
              </svg>
              <video
                className="pointer-events-none absolute left-0 top-0 z-0 object-cover object-center"
                style={{
                  width: mask.width,
                  height: mask.height,
                  WebkitMaskImage: `url(#${maskId})`,
                  maskImage: `url(#${maskId})`,
                  WebkitMaskSize: `${mask.width}px ${mask.height}px`,
                  maskSize: `${mask.width}px ${mask.height}px`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                }}
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
                onLoadedData={measureMask}
              />
            </>
          ) : null}

          {arches.map((category, index) => {
            const poster = heroArchImage(category.slug, category.image);
            return (
              <div
                key={category.id}
                ref={(el) => {
                  archRefs.current[index] = el;
                }}
                className={cn(
                  "relative min-w-0 flex-1",
                  ARCH_HEIGHT[index] ?? ARCH_HEIGHT[2],
                  ARCH_WIDTH,
                )}
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
                    "bg-canvas-warm/40 transition duration-500 ease-out",
                    "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(28,20,16,0.55)]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                  )}
                  aria-label={`Shop ${category.name}`}
                >
                  {!videoMasked && poster ? (
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
                  <span className="pointer-events-none absolute inset-x-2 bottom-4 z-[2] text-center font-display text-sm text-white drop-shadow-sm md:text-lg">
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
