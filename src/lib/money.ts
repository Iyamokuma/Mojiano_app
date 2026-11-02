export const ZERO_DECIMAL = 0;

export function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

export function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/**
 * The price to show struck through: the compare-at price, or the regular price
 * while a sale price is active — whichever is higher, and only if above what the customer pays.
 */
export function wasPrice(product: { price: number; compareAtPrice?: number | null }, current: number) {
  const was = Math.max(product.compareAtPrice ?? 0, product.price);
  return was > current ? was : null;
}

export function effectivePrice(product: {
  price: number;
  salePrice?: number | null;
}) {
  if (product.salePrice && product.salePrice > 0 && product.salePrice < product.price) {
    return product.salePrice;
  }
  return product.price;
}
