import { resolveImageUrl } from "@/lib/media";
import { formatGBP } from "@/lib/money";

export type OrderDetail = {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  email: string;
  fullName: string;
  phone: string | null;
  deliveryMethod: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  promoCode: string | null;
  shippingSnapshot: string | null;
  items: { id: string; name: string; sku: string | null; quantity: number; unitPrice: number; totalPrice: number; image: string | null }[];
};

function shippingAddress(snapshot: string | null) {
  if (!snapshot) return [];
  try {
    const data = JSON.parse(snapshot) as Record<string, string | undefined>;
    return [data.line1, data.line2, data.city, data.county, data.postcode, data.country].filter(Boolean) as string[];
  } catch {
    return [];
  }
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function OrderSummary({ order }: { order: OrderDetail }) {
  const address = shippingAddress(order.shippingSnapshot);
  const placed = new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });

  return (
    <div className="rounded-3xl bg-white p-5 text-left sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Order</p>
          <p className="mt-1 font-display text-2xl">{order.orderNumber}</p>
          <p className="mt-1 text-sm text-muted">Placed {placed}</p>
        </div>
        <span className="rounded-full bg-canvas-warm px-3 py-1 text-xs font-medium">
          {order.paymentStatus === "PAID" ? "Paid" : "Payment pending"} · {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <ul className="divide-y divide-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            {item.image ? (
              <img src={resolveImageUrl(item.image)} alt="" className="h-16 w-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="h-16 w-14 shrink-0 rounded-xl bg-canvas-warm" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted">
                {item.quantity} × {formatGBP(item.unitPrice)}
                {item.sku ? ` · ${item.sku}` : ""}
              </p>
            </div>
            <p className="text-sm font-medium">{formatGBP(item.totalPrice)}</p>
          </li>
        ))}
      </ul>

      <dl className="space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatGBP(order.subtotal)}</dd></div>
        {order.discount > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted">Discount{order.promoCode ? ` (${order.promoCode})` : ""}</dt>
            <dd>−{formatGBP(order.discount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted">{order.deliveryMethod}</dt>
          <dd>{order.deliveryFee ? formatGBP(order.deliveryFee) : "Free"}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
          <dt>{order.paymentStatus === "PAID" ? "Total paid" : "Total"}</dt>
          <dd>{formatGBP(order.total)}</dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-5 border-t border-line pt-5 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            {order.deliveryMethod === "Collection" ? "Collection by" : "Delivering to"}
          </p>
          <p className="mt-2 font-medium">{order.fullName}</p>
          {order.deliveryMethod === "Collection" ? (
            <p className="text-muted">Collect from our London warehouse — see Contact for the address.</p>
          ) : (
            address.map((line) => <p key={line} className="text-muted">{line}</p>)
          )}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Contact</p>
          <p className="mt-2">{order.email}</p>
          {order.phone ? <p className="text-muted">{order.phone}</p> : null}
        </div>
      </div>
    </div>
  );
}
