import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useShop } from "@/context/shop";
import { cn } from "@/lib/utils";

type HeroCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

const FEATURED_SLUGS = [
  "jewellery-watches",
  "household-textiles",
  "fashion-beauty",
  "furniture-sofas",
  "sports-leisure",
];

const HERO_MEDIA: Record<string, { video?: string; image: string }> = {
  "jewellery-watches": {
    video: "/hero/jewellery.mp4",
    image: "https://images.unsplash.com/photo-1515562149607-ee1c82c05e69?auto=format&fit=crop&w=900&q=80",
  },
  "household-textiles": {
    image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=80",
  },
  "fashion-beauty": {
    video: "/hero/fashion.mp4",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
  },
  "furniture-sofas": {
    video: "/hero/furniture.mp4",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",
  },
  "sports-leisure": {
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  },
};

const ARCH_TONES = ["bg-peach", "bg-white", "bg-canvas-warm", "bg-pink", "bg-peach-deep"];
const ARCH_HEIGHT = [
  "h-[8rem] min-[400px]:h-[9.5rem] sm:h-[18rem] lg:h-[21.5rem]",
  "h-[9.25rem] min-[400px]:h-[11rem] sm:h-[22rem] lg:h-[26rem]",
  "h-[11rem] min-[400px]:h-[13rem] sm:h-[26rem] lg:h-[31rem]",
  "h-[9.25rem] min-[400px]:h-[11rem] sm:h-[22rem] lg:h-[26rem]",
  "h-[8rem] min-[400px]:h-[9.5rem] sm:h-[18rem] lg:h-[21.5rem]",
];

function pickHeroCategories(categories: HeroCategory[]) {
  const featured = FEATURED_SLUGS.map((slug) => categories.find((category) => category.slug === slug)).filter(
    (category): category is HeroCategory => Boolean(category),
  );
  const extras = categories.filter((category) => !featured.some((item) => item.id === category.id));
  return [...featured, ...extras].slice(0, 5);
}

function ArchMedia({
  slug,
  fallbackImage,
  name,
}: {
  slug: string;
  fallbackImage: string | null;
  name: string;
}) {
  const media = HERO_MEDIA[slug];
  const poster = media?.image || fallbackImage || "";
  const video = media?.video;

  if (video) {
    return (
      <video
        className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.04]"
        src={video}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      />
    );
  }

  return (
    <img
      src={poster}
      alt={name}
      className="absolute inset-0 h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.06]"
    />
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
  categories: HeroCategory[];
}) {
  const { setSpotlightSlug } = useShop();
  const arches = pickHeroCategories(categories);
  const href = ctaHref || "/shop";

  useEffect(() => {
    const center = arches[Math.floor(arches.length / 2)] ?? arches[0];
    setSpotlightSlug(center?.slug ?? null);
    return () => setSpotlightSlug(null);
  }, [arches, setSpotlightSlug]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-peach/45 via-canvas to-canvas">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col items-center px-3 pt-10 text-center sm:px-6 sm:pt-14 md:pt-16">
        <p className="text-[9px] uppercase tracking-[0.28em] text-gold-deep sm:text-[11px]">The collection</p>
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
          {ctaLabel || "Shop now"}
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white sm:h-7 sm:w-7">
            <ArrowRight size={14} />
          </span>
        </Link>
      </div>

      <div className="mt-6 flex w-full items-end justify-center gap-1 px-2 sm:mt-10 sm:gap-3 sm:px-6 md:gap-4 lg:px-8">
        {arches.map((category, index) => (
          <Link
            key={category.id}
            data-slug={category.slug}
            to={`/category/${category.slug}`}
            className={cn(
              "group relative min-w-0 flex-1 overflow-hidden rounded-t-full transition duration-500",
              ARCH_TONES[index % ARCH_TONES.length],
              ARCH_HEIGHT[index] ?? ARCH_HEIGHT[2],
              "max-w-[4.6rem] min-[400px]:max-w-[5.4rem] sm:max-w-[13.5rem] lg:max-w-[16rem]",
            )}
            aria-label={`Shop ${category.name}`}
          >
            <ArchMedia slug={category.slug} fallbackImage={category.image} name={category.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent opacity-80" />
            <span className="absolute inset-x-0.5 bottom-1.5 text-center font-display text-[8px] leading-tight text-white min-[400px]:text-[9px] sm:inset-x-2 sm:bottom-4 sm:text-sm md:text-lg">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
