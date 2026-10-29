/** Looks up an amazon.co.uk product by ASIN through Rainforest API so an admin can start a listing from it. */

import { parseWeightGrams } from "../src/lib/validations";

export type AmazonProduct = {
  asin: string;
  name: string;
  brand: string | null;
  description: string;
  images: string[];
  /** Amazon's price in pence, or null when no new offer is listed. */
  price: number | null;
  weightGrams: number | null;
  /** Amazon's breadcrumb, e.g. "Toys & Games > Dress Up & Pretend Play". */
  amazonCategory: string;
  /** Best matching shop category slug. */
  categorySlug: string;
  sourceUrl: string;
};

export class AmazonImportError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type RainforestPrice = { value?: number; currency?: string };

type RainforestProduct = {
  asin?: string;
  title?: string;
  brand?: string;
  link?: string;
  description?: string;
  feature_bullets?: string[];
  main_image?: { link?: string };
  images?: { link?: string }[];
  categories?: { name?: string }[];
  weight?: string;
  shipping_weight?: string;
  specifications?: { name?: string; value?: string }[];
  buybox_winner?: { price?: RainforestPrice; condition?: { is_new?: boolean } };
};

type RainforestResponse = {
  request_info?: { success?: boolean; message?: string };
  product?: RainforestProduct;
  offers?: { price?: RainforestPrice; condition?: { is_new?: boolean } }[];
};

/**
 * Amazon UK breadcrumb → shop category slug. Checked in order against the whole
 * breadcrumb, so the more specific rules come first.
 */
const CATEGORY_RULES: [RegExp, string][] = [
  [/christmas|halloween|easter|seasonal|party supplies|festive/i, "christmas-halloween"],
  [/jewellery|jewelry|watches/i, "jewellery-watches"],
  [/furniture|sofa|mattress/i, "furniture-sofas"],
  [/large appliances|washing machine|dishwasher|fridge|freezer|tumble dryer|cooker/i, "white-goods"],
  [/television|home cinema|\btv\b|audio|headphones|speakers|hi-fi|radio/i, "audio-tv"],
  [/toys|games|baby|nursery/i, "toys-nursery"],
  [/bedding|bed linen|towels|curtains|cushions|blankets|rugs|textiles/i, "household-textiles"],
  [/kitchen|cookware|bakeware|tableware|dining/i, "kitchenware"],
  [/garden|outdoor living|barbecue|bbq|pool/i, "summer-stock"],
  [/sports|fitness|camping|cycling|outdoors/i, "sports-leisure"],
  [/diy|tools|automotive|car |motorbike|hardware/i, "diy-auto"],
  [/fashion|clothing|shoes|handbags|luggage|beauty|cosmetics|fragrance|personal care|hair/i, "fashion-beauty"],
  [/electronics|computers|phones|small appliances|lighting|camera|electrical/i, "electrical"],
  [/home|household|cleaning|pet supplies|storage|bathroom|grocery|health/i, "mixed-households"],
];

export function matchCategory(breadcrumb: string, title: string) {
  for (const [pattern, slug] of CATEGORY_RULES) if (pattern.test(breadcrumb)) return slug;
  for (const [pattern, slug] of CATEGORY_RULES) if (pattern.test(title)) return slug;
  return "miscellaneous";
}

function toPence(price: RainforestPrice | undefined) {
  if (!price || typeof price.value !== "number" || price.value <= 0) return null;
  if (price.currency && price.currency !== "GBP") return null;
  return Math.round(price.value * 100);
}

function findWeight(product: RainforestProduct) {
  const specs = product.specifications ?? [];
  const candidates = [
    product.weight,
    ...specs.filter((spec) => /^(item|product) weight$/i.test(spec.name ?? "")).map((spec) => spec.value),
    ...specs.filter((spec) => /weight/i.test(spec.name ?? "")).map((spec) => spec.value),
    product.shipping_weight,
  ];
  for (const value of candidates) {
    if (!value) continue;
    // Amazon writes "450 g", "1.05 Kilograms" or "450 g; 10 x 5 x 3 cm".
    const grams = parseWeightGrams(value.split(/[;,]/)[0]);
    if (typeof grams === "number" && grams > 0) return grams;
  }
  return null;
}

const ASIN = /^[A-Z0-9]{10}$/;

export function amazonImportReady() {
  return Boolean(process.env.RAINFOREST_API_KEY);
}

export function normaliseAsin(input: string) {
  const raw = String(input ?? "").trim().toUpperCase();
  // Accept a pasted product link as well as the bare code.
  const fromUrl = raw.match(/\/(?:DP|GP\/PRODUCT|PRODUCT)\/([A-Z0-9]{10})/);
  const asin = fromUrl?.[1] ?? raw;
  return ASIN.test(asin) ? asin : null;
}

/** Amazon serves one photo at several sizes (…/I/81J17hYmCgL.jpg and …/I/81J17hYmCgL._AC_SL1500_.jpg). */
function uniqueImages(urls: string[]) {
  const seen = new Set<string>();
  return urls.filter((url) => {
    const id = url.match(/\/images\/I\/([^._/]+)/)?.[1] ?? url;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function toAmazonProduct(asin: string, product: RainforestProduct): AmazonProduct {
  const name = product.title?.trim() ?? "";
  if (!name) throw new AmazonImportError("No Amazon UK product has that code.", 404);
  const images = [product.main_image?.link, ...(product.images ?? []).map((image) => image.link)].filter(
    (url): url is string => Boolean(url && /^https?:\/\//.test(url)),
  );
  const bullets = (product.feature_bullets ?? []).map((line) => line.trim()).filter(Boolean);
  const amazonCategory = (product.categories ?? [])
    .map((category) => category.name?.trim())
    .filter(Boolean)
    .join(" > ");
  const buybox = product.buybox_winner;
  return {
    asin: product.asin ?? asin,
    name,
    brand: product.brand?.trim() || null,
    description: bullets.length ? bullets.join("\n\n") : (product.description?.trim() ?? ""),
    images: uniqueImages(images).slice(0, 12),
    price: buybox?.condition?.is_new === false ? null : toPence(buybox?.price),
    weightGrams: findWeight(product),
    amazonCategory,
    categorySlug: matchCategory(amazonCategory, name),
    sourceUrl: product.link ?? `https://www.amazon.co.uk/dp/${asin}`,
  };
}

async function rainforest(type: "product" | "offers", asin: string, key: string) {
  const url = new URL("https://api.rainforestapi.com/request");
  url.searchParams.set("api_key", key);
  url.searchParams.set("type", type);
  url.searchParams.set("amazon_domain", "amazon.co.uk");
  url.searchParams.set("asin", asin);
  if (type === "offers") url.searchParams.set("offers_condition_new", "true");

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(type === "product" ? 18_000 : 10_000) });
  } catch {
    throw new AmazonImportError("The Amazon lookup timed out. Try again in a moment.", 504);
  }
  const data = (await res.json().catch(() => ({}))) as RainforestResponse;
  const reason = data.request_info?.message;
  if (res.status === 401) throw new AmazonImportError("The Rainforest API key was rejected. Check RAINFOREST_API_KEY.", 502);
  if (res.status === 402) throw new AmazonImportError("The Rainforest account is out of lookup credits.", 502);
  if (!res.ok || data.request_info?.success === false) {
    throw new AmazonImportError(reason ? `Amazon lookup failed: ${reason}` : `Amazon lookup failed (${res.status}).`, 502);
  }
  return data;
}

/** Cheapest new offer, used when the listing has no buy box price. Costs one more lookup credit. */
async function lowestNewOffer(asin: string, key: string) {
  try {
    const data = await rainforest("offers", asin, key);
    const prices = (data.offers ?? [])
      .filter((offer) => offer.condition?.is_new !== false)
      .map((offer) => toPence(offer.price))
      .filter((price): price is number => price !== null);
    return prices.length ? Math.min(...prices) : null;
  } catch {
    return null;
  }
}

export async function fetchAmazonProduct(asin: string): Promise<AmazonProduct> {
  const key = process.env.RAINFOREST_API_KEY;
  if (!key) {
    throw new AmazonImportError("Amazon import isn't set up yet. Add RAINFOREST_API_KEY in Vercel settings.", 503);
  }
  const data = await rainforest("product", asin, key);
  if (!data.product) throw new AmazonImportError("No Amazon UK product has that code.", 404);
  const product = toAmazonProduct(asin, data.product);
  if (product.price === null) product.price = await lowestNewOffer(asin, key);
  return product;
}
