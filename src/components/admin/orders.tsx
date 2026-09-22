import { useEffect, useMemo, useState } from "react";
import { api, peekApi } from "@/lib/api";
import { formatGBP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Eyebrow, ORDER_STATUSES, PAYMENT_STATUSES, Panel, StatusPill, statusTone } from "@/components/admin/ui";

type OrderItem = { id: string; name: string; sku: string; quantity: number; unitPrice: number; totalPrice?: number; image: string | null };
type Order = {
  id: string;
  orderNumber: string;
  fullName: string;
  email: string;
  phone: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryMethod: string;
  createdAt: string;
  notes: string;
  shippingSnapshot?: string;
  stripePaymentId?: string | null;
  items: OrderItem[];
};

function readAddress(snapshot?: string) {
  try {
    const data = JSON.parse(snapshot || "{}") as {
      line1?: string;
      line2?: string;
      city?: string;
      county?: string;
      postcode?: string;
      country?: string;
    };
    return [data.line1, data.line2, data.city, data.county, data.postcode, data.country].filter(Boolean).join(", ");
  } catch {
    return "";
  }
}

export function AdminOrders() {
  const cached = peekApi<Order[]>("/api/admin/orders");
  const [orders, setOrders] = useState<Order[]>(() => cached ?? []);
  const [ready, setReady] = useState(() => cached !== undefined);
  const [filter, setFilter] = useState("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setOrders(await api<Order[]>("/api/admin/orders"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function patch(id: string, body: Record<string, string>) {
    const updated = await api<Order>(`/api/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, ...updated } : order)));
  }

  const visible = useMemo(
    () => (filter === "ALL" ? orders : orders.filter((order) => order.status === filter)),
    [orders, filter],
  );

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Tickets</Eyebrow>
        <h1 className="mt-2 font-display text-4xl">All orders</h1>
        <p className="mt-2 text-sm text-muted">Paid orders only. Unpaid Stripe attempts stay off this list.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["ALL", ...ORDER_STATUSES].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.14em] ${
              filter === status ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"
            }`}
          >
            {status === "ALL" ? "All" : status.toLowerCase()}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Panel className="overflow-hidden p-0 sm:p-0">
        {visible.length === 0 ? (
          <p className="p-8 text-sm text-muted">{ready ? "Nothing in this column yet." : "Loading orders…"}</p>
        ) : (
          <ul>
            {visible.map((order) => {
              const open = openId === order.id;
              return (
                <li key={order.id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-canvas/60"
                    onClick={() => setOpenId(open ? null : order.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="truncate text-sm text-muted">
                        {order.fullName} · {order.email} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <StatusPill value={order.paymentStatus} tone={statusTone(order.paymentStatus)} />
                    <span className="hidden text-sm sm:inline">{order.deliveryMethod}</span>
                    <span className="text-sm font-medium">{formatGBP(order.total)}</span>
                  </button>
                  {open ? (
                    <div className="grid gap-6 border-t border-line bg-canvas/50 px-5 py-5 md:grid-cols-[1.2fr_0.8fr]">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Paid for</p>
                        <ul className="mt-3 space-y-3">
                          {order.items.map((item) => (
                            <li key={item.id} className="flex gap-3">
                              <div className="h-14 w-14 overflow-hidden rounded-xl bg-white">
                                {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm">{item.name}</p>
                                <p className="text-xs text-muted">
                                  {item.sku} · {formatGBP(item.unitPrice)} × {item.quantity}
                                </p>
                              </div>
                              <p className="text-sm">{formatGBP(item.totalPrice ?? item.unitPrice * item.quantity)}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Customer</p>
                          <p className="mt-1 font-medium">{order.fullName}</p>
                          <p>{order.email}</p>
                          {order.phone ? <p>{order.phone}</p> : null}
                          {readAddress(order.shippingSnapshot) ? (
                            <p className="mt-2 text-muted">{readAddress(order.shippingSnapshot)}</p>
                          ) : null}
                          {order.notes ? <p className="mt-2">{order.notes}</p> : null}
                        </div>
                        <p className="text-muted">
                          Subtotal {formatGBP(order.subtotal)}
                          {order.discount ? ` · discount ${formatGBP(order.discount)}` : ""}
                          {order.deliveryFee ? ` · delivery ${formatGBP(order.deliveryFee)}` : " · free / collection"}
                          {` · paid ${formatGBP(order.total)}`}
                        </p>
                        <label className="block">
                          <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-muted">Status</span>
                          <select
                            value={order.status}
                            onChange={(event) => void patch(order.id, { status: event.target.value })}
                            className="h-10 w-full rounded-xl border border-line bg-white px-3"
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status.toLowerCase()}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-muted">Payment</span>
                          <select
                            value={order.paymentStatus}
                            onChange={(event) => void patch(order.id, { paymentStatus: event.target.value })}
                            className="h-10 w-full rounded-xl border border-line bg-white px-3"
                          >
                            {PAYMENT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status.toLowerCase()}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">
                          {order.paymentMethod.replaceAll("_", " ")}
                          {order.deliveryMethod ? ` · ${order.deliveryMethod}` : ""}
                        </p>
                        {order.stripePaymentId ? (
                          <p className="break-all text-xs text-muted">Stripe {order.stripePaymentId}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
