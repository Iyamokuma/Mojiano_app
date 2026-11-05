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

/** Homepage hero film seen through the five arches: boxed stock on a conveyor, a fulfilment centre, a container port at night. */
export const HERO_WAREHOUSE_VIDEO = "/videos/mojiano-hero.mp4";

export const HERO_WAREHOUSE_VIDEO_POSTER = "/videos/mojiano-hero-poster.jpg";

/** The shop's five departments, in the order the homepage shows them. */
export const HERO_FEATURED_CATEGORY_SLUGS = [
  "toys-nursery",
  "fashion-beauty",
  "christmas-halloween",
  "audio-tv",
  "mixed-households",
] as const;

const DEPARTMENT_IMAGES: Record<string, string> = {
  "toys-nursery": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1200&q=80",
  "fashion-beauty": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
  "christmas-halloween":
    "https://images.unsplash.com/photo-1606830733744-0ad778449672?auto=format&fit=crop&w=1200&q=80",
  "audio-tv": "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80",
  "mixed-households": "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80",
};

export function resolveImageUrl(url: string) {
  let next = url;
  for (const [from, to] of Object.entries(UNSPLASH_REPLACEMENTS)) {
    if (next.includes(from)) next = next.replaceAll(from, to);
  }
  return next;
}

export function compactImageUrl(url: string, width = 720) {
  const next = resolveProductImageUrl(url);
  if (!next.includes("images.unsplash.com")) return next;
  const sized = next.includes("w=") ? next.replace(/([?&])w=\d+/, `$1w=${width}`) : `${next}${next.includes("?") ? "&" : "?"}w=${width}`;
  return sized.includes("q=") ? sized.replace(/([?&])q=\d+/, "$1q=70") : `${sized}&q=70`;
}

export function resolveCategoryImage(slug: string, image: string | null | undefined) {
  if (DEPARTMENT_IMAGES[slug]) return DEPARTMENT_IMAGES[slug];
  if (!image) return image ?? null;
  return resolveImageUrl(image);
}

export function heroArchImage(slug: string, fallbackImage?: string | null) {
  const raw = resolveCategoryImage(slug, fallbackImage) || fallbackImage || "";
  return raw ? compactImageUrl(raw, 900) : "";
}

/** Product photos from admin upload (relative path or Supabase public URL). */
export function resolveProductImageUrl(url: string) {
  const next = resolveImageUrl(String(url ?? "").trim());
  if (!next || next.includes("/uploads/products/")) return "";
  if (/^https?:\/\//i.test(next)) return next;
  if (next.startsWith("/") && typeof window !== "undefined") {
    return `${window.location.origin}${next}`;
  }
  return next;
}

export function withFixedProductImages<T extends { images?: Array<{ url: string; alt?: string }> }>(product: T): T {
  if (!product.images?.length) return product;
  return {
    ...product,
    images: product.images.map((image) => ({
      ...image,
      url: resolveProductImageUrl(image.url),
    })),
  };
}
