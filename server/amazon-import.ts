/** Looks up an amazon.co.uk product by ASIN through Rainforest API so an admin can start a listing from it. */

export type AmazonProduct = {
  asin: string;
  name: string;
  brand: string | null;
  description: string;
  images: string[];
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

type RainforestProduct = {
  asin?: string;
  title?: string;
  brand?: string;
  link?: string;
  description?: string;
  feature_bullets?: string[];
  main_image?: { link?: string };
  images?: { link?: string }[];
};

type RainforestResponse = {
  request_info?: { success?: boolean; message?: string };
  product?: RainforestProduct;
};

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
  return {
    asin: product.asin ?? asin,
    name,
    brand: product.brand?.trim() || null,
    description: bullets.length ? bullets.join("\n\n") : (product.description?.trim() ?? ""),
    images: uniqueImages(images).slice(0, 12),
    sourceUrl: product.link ?? `https://www.amazon.co.uk/dp/${asin}`,
  };
}

export async function fetchAmazonProduct(asin: string): Promise<AmazonProduct> {
  const key = process.env.RAINFOREST_API_KEY;
  if (!key) {
    throw new AmazonImportError("Amazon import isn't set up yet. Add RAINFOREST_API_KEY in Vercel settings.", 503);
  }
  const url = new URL("https://api.rainforestapi.com/request");
  url.searchParams.set("api_key", key);
  url.searchParams.set("type", "product");
  url.searchParams.set("amazon_domain", "amazon.co.uk");
  url.searchParams.set("asin", asin);

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
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
  if (!data.product) throw new AmazonImportError("No Amazon UK product has that code.", 404);
  return toAmazonProduct(asin, data.product);
}
