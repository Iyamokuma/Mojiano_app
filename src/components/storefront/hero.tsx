import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useShop } from "@/context/shop";
import { HERO_FEATURED_CATEGORY_SLUGS, HERO_WAREHOUSE_VIDEO, HERO_WAREHOUSE_VIDEO_POSTER } from "@/lib/media";
import { HeroArchRow, type HeroArchCategory } from "@/components/storefront/hero-arch-row";

function pickHeroCategories(categories: HeroArchCategory[]) {
  const featured = HERO_FEATURED_CATEGORY_SLUGS.map((slug) =>
    categories.find((category) => category.slug === slug),
  ).filter((category): category is HeroArchCategory => Boolean(category));
  const extras = categories.filter((category) => !featured.some((item) => item.id === category.id));
  return [...featured, ...extras].slice(0, 5);
}

function waLink(phone: unknown, message: string) {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}

const PROMISES = [
  "Branded overstock & end-of-line lines",
  "Packed and dispatched from our London warehouse",
  "Trade, bulk and pallet orders welcome",
];

/** Full-bleed film of the business: stock on the shelves, an order packed, a parcel handed over. */
function HeroFilm() {
  const [motionOk, setMotionOk] = useState(true);
  const [videoOk, setVideoOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const media = "absolute inset-0 h-full w-full object-cover object-center";
  return motionOk && videoOk ? (
    <video
      className={media}
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
    />
  ) : (
    <img src={HERO_WAREHOUSE_VIDEO_POSTER} alt="" className={media} fetchPriority="high" />
  );
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
  const { settings, setSpotlightSlug } = useShop();
  const arches = pickHeroCategories(categories);
  const href = ctaHref?.startsWith("/") ? ctaHref : "/shop";
  const trade = waLink(settings.whatsappNumber, "Hello Mojiano, I'd like to ask about trade or bulk orders.");

  useEffect(() => () => setSpotlightSlug(null), [setSpotlightSlug]);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <HeroFilm />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/30 to-transparent" aria-hidden />

        <div className="container-page relative flex min-h-[min(86svh,54rem)] flex-col justify-end pb-10 pt-24 sm:pb-14 md:pb-16">
          <div className="max-w-3xl">
            <p className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.34em] text-gold sm:text-[11px]">
              <span className="h-px w-10 bg-gold/70" aria-hidden />
              Mojiano · Wholesale clearance
            </p>
            <h1 className="mt-5 text-balance font-serif text-[2.7rem] font-medium leading-[0.98] tracking-[-0.01em] text-white min-[400px]:text-5xl sm:text-6xl md:text-7xl lg:text-[5.75rem]">
              {title}
            </h1>
            {body ? (
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/80 sm:mt-6 sm:text-base">{body}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={href}
                className="group inline-flex h-12 items-center gap-3 rounded-full bg-white pl-6 pr-2 text-[15px] font-medium text-ink transition hover:bg-canvas"
              >
                {ctaLabel || "Shop the clearance"}
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white transition group-hover:translate-x-0.5">
                  <ArrowRight size={15} />
                </span>
              </Link>
              {trade ? (
                <a
                  href={trade}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center rounded-full border border-white/35 px-6 text-[15px] text-white backdrop-blur-sm transition hover:border-white/70 hover:bg-white/10"
                >
                  Trade & bulk enquiries
                </a>
              ) : null}
            </div>
          </div>

          <ul className="mt-12 grid gap-3 border-t border-white/15 pt-6 text-[13px] text-white/75 sm:mt-16 sm:grid-cols-3 sm:gap-6">
            {PROMISES.map((line) => (
              <li key={line} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HeroArchRow arches={arches} onSpotlight={setSpotlightSlug} />
    </>
  );
}
