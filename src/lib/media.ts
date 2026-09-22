const UNSPLASH_REPLACEMENTS: Record<string, string> = {
  "photo-1512389142860-9c449e58a934": "photo-1470337458703-46ad1756a187",
  "photo-1504148458000-0471d1165b6d": "photo-1530124566582-a618bc2615dc",
  "photo-1509557965875-b88c97052fa0": "photo-1572981779307-38b8cabb2407",
  "photo-1574997149283-02432692c642": "photo-1556909114-f6e7ad7d3136",
  "photo-1520903920243-00d482a2dc5b": "photo-1434389677669-e08b4cac3105",
  "photo-1616628188541-925660ab1447": "photo-1493663284031-b7e3aefcae8e",
  "photo-1507473883500-2dd6282412c8": "photo-1543198126-a8ad8e47fb22",
  "photo-1469796466631-9d8171f56c36": "photo-1416879595882-3373a0480b5b",
  "photo-1603190287605-4f70b88c1c6f": "photo-1414235077428-338989a2e8c0",
  "photo-1515562149607-ee1c82c05e69": "photo-1617038260897-41a1f14a8ca0",
  "photo-1483985988355-763728e1935b": "photo-1489987707025-afc232f7aed0",
  "photo-1555041469-a586c61ea9bc": "photo-1586023492125-27b2c045efd7",
};

/** Single continuous hero video — one file, five arch windows in `HomeHero`. */
export const HERO_WAREHOUSE_VIDEO = "/videos/warehouse-hero.mp4";

export const HERO_WAREHOUSE_VIDEO_POSTER =
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1920&q=80";

/** Hero arches: warehouse, pallets, and packed stock — not lifestyle shoots. */
export const HERO_FEATURED_CATEGORY_SLUGS = [
  "white-goods",
  "household-textiles",
  "electrical",
  "kitchenware",
  "mixed-households",
] as const;

const HERO_ARCH_IMAGES: Record<string, string> = {
  "white-goods":
    "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80",
  "household-textiles":
    "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=80",
  electrical:
    "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=900&q=80",
  kitchenware:
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80",
  "mixed-households":
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
  "audio-tv":
    "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80",
  miscellaneous:
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=80",
  "diy-auto":
    "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=80",
  "sports-leisure":
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  "christmas-halloween":
    "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80",
  "fashion-beauty":
    "https://images.unsplash.com/photo-1489987707025-afc232f7aed0?auto=format&fit=crop&w=900&q=80",
  "furniture-sofas":
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
  "jewellery-watches":
    "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=900&q=80",
  "summer-stock":
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=80",
  "toys-nursery":
    "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80",
};

const CATEGORY_IMAGE_OVERRIDES: Record<string, string> = {
  "christmas-halloween":
    "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80",
  "diy-auto": "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=80",
  "mixed-households":
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80",
  miscellaneous:
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
  "fashion-beauty":
    "https://images.unsplash.com/photo-1489987707025-afc232f7aed0?auto=format&fit=crop&w=1200&q=80",
  "furniture-sofas":
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
};

export function resolveImageUrl(url: string) {
  let next = url;
  for (const [from, to] of Object.entries(UNSPLASH_REPLACEMENTS)) {
    if (next.includes(from)) next = next.replaceAll(from, to);
  }
  return next;
}

export function compactImageUrl(url: string, width = 720) {
  const next = resolveImageUrl(url);
  if (!next.includes("images.unsplash.com")) return next;
  const sized = next.includes("w=") ? next.replace(/([?&])w=\d+/, `$1w=${width}`) : `${next}${next.includes("?") ? "&" : "?"}w=${width}`;
  return sized.includes("q=") ? sized.replace(/([?&])q=\d+/, "$1q=70") : `${sized}&q=70`;
}

export function resolveCategoryImage(slug: string, image: string | null | undefined) {
  if (CATEGORY_IMAGE_OVERRIDES[slug]) return CATEGORY_IMAGE_OVERRIDES[slug];
  if (!image) return image ?? null;
  return resolveImageUrl(image);
}

export function heroArchImage(slug: string, fallbackImage?: string | null) {
  const raw = HERO_ARCH_IMAGES[slug] || resolveCategoryImage(slug, fallbackImage) || fallbackImage || "";
  return raw ? compactImageUrl(raw, 900) : "";
}

export function withFixedProductImages<T extends { images?: Array<{ url: string }> }>(product: T): T {
  if (!product.images?.length) return product;
  return {
    ...product,
    images: product.images.map((image) => ({ ...image, url: resolveImageUrl(image.url) })),
  };
}
