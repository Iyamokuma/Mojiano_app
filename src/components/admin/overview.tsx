import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus } from "lucide-react";
import { api, peekApi } from "@/lib/api";
import { formatGBP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { StatusPill, statusTone } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type Overview = {
  kpis: {
    orderCount: number;
    revenue: number;
    monthRevenue: number;
    averageOrder: number;
    awaitingPayment: number;
    awaitingCount: number;
    openOrders: number;
    productCount: number;
    activeProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    customerCount: number;
  };
  merchandising: { featured: number; clearance: number; newArrivals: number; bestSellers: number };
  pipeline: Record<string, number>;
  pulse: { label: string; orders: number; revenue: number }[];
  recent: {
    id: string;
    orderNumber: string;
    fullName: string;
    total: number;
    status: string;
    paymentStatus: string;
    deliveryMethod: string;
    itemCount: number;
    createdAt: string;
  }[];
  lowStock: {
    id: string;
    name: string;
    sku: string;
    stockQuantity: number;
    slug: string;
    category: { name: string };
    images: { url: string }[];
  }[];
};

const DOTS = ["bg-ink", "bg-charcoal", "bg-peach-deep", "bg-pink-deep", "bg-success"];

export function AdminOverview() {
  const [data, setData] = useState<Overview | null>(() => peekApi<Overview>("/api/admin/overview") ?? null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void api<Overview>("/api/admin/overview")
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const delivered = data?.pipeline.DELIVERED ?? 0;
  const pending = data?.pipeline.PENDING ?? 0;
  const progress = data && data.kpis.orderCount ? Math.round((delivered / data.kpis.orderCount) * 100) : 0;
  const reminder = data?.recent.find((order) => order.paymentStatus === "UNPAID" || order.paymentStatus === "PENDING") ?? data?.recent[0];
  const peak = useMemo(() => Math.max(1, ...(data?.pulse.map((day) => day.orders) ?? [1])), [data]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading dashboard…</p>;

  const clock = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Watch the floor, move tickets, and keep stock honest.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/catalogue/new"
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-charcoal"
          >
            <Plus size={16} /> Add product
          </Link>
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-full border border-ink/15 bg-white px-5 text-sm font-medium text-ink hover:border-ink/40"
          >
            View shop
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          featured
          label="Total orders"
          value={String(data.kpis.orderCount)}
          note={`${formatGBP(data.kpis.monthRevenue)} this month`}
        />
        <Kpi label="Delivered" value={String(delivered)} note="Closed tickets" />
        <Kpi label="Open orders" value={String(data.kpis.openOrders)} note="On the floor now" />
        <Kpi label="Pending" value={String(pending)} note={data.kpis.awaitingCount ? `${data.kpis.awaitingCount} awaiting funds` : "Clear inbox"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr_0.9fr]">
        <Card title="Order analytics">
          <div className="mt-8 flex h-44 items-end gap-3">
            {data.pulse.map((day, index) => {
              const filled = day.orders > 0;
              const height = filled ? Math.max(28, (day.orders / peak) * 100) : 88;
              const hottest = day.orders === peak && day.orders > 0;
              return (
                <div key={`${day.label}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-36 w-full items-end justify-center">
                    {hottest ? (
                      <span className="absolute -top-1 rounded-full bg-ink px-2 py-0.5 text-[10px] text-white">
                        {day.orders}
                      </span>
                    ) : null}
                    <div
                      className={cn("w-[72%] max-w-[3rem] rounded-full", filled ? barFill(index) : "stripe-bar")}
                      style={{ height: `${height}%` }}
                      title={`${day.orders} orders · ${formatGBP(day.revenue)}`}
                    />
                  </div>
                  <span className="text-xs text-muted">{day.label.charAt(0)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Reminders">
          {reminder ? (
            <>
              <h3 className="mt-6 text-xl font-semibold leading-snug text-ink">{reminder.orderNumber}</h3>
              <p className="mt-2 text-sm text-muted">
                {reminder.fullName} · {formatGBP(reminder.total)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {formatDate(reminder.createdAt)} · {reminder.deliveryMethod}
              </p>
              <Link
                to="/admin/orders"
                className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink text-sm font-medium text-white hover:bg-charcoal"
              >
                Open tickets
              </Link>
            </>
          ) : (
            <p className="mt-8 text-sm text-muted">Nothing waiting. New checkouts will appear here.</p>
          )}
        </Card>

        <Card
          title="Stock"
          action={
            <Link to="/admin/catalogue/new" className="inline-flex h-8 items-center rounded-full bg-ink/10 px-3 text-xs font-medium text-ink hover:bg-ink/15">
              + New
            </Link>
          }
        >
          <ul className="mt-5 space-y-3">
            {data.lowStock.length === 0 ? (
              <li className="text-sm text-muted">Cover looks healthy.</li>
            ) : (
              data.lowStock.slice(0, 5).map((product, index) => (
                <li key={product.id} className="flex items-start gap-3">
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", DOTS[index % DOTS.length])} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/catalogue/${product.id}`} className="truncate text-sm font-medium hover:text-charcoal">
                      {product.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {product.stockQuantity <= 0 ? "Out of stock" : `${product.stockQuantity} left`} · {product.sku}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <Card
          title="Latest tickets"
          action={
            <Link to="/admin/orders" className="inline-flex h-8 items-center rounded-full bg-ink/10 px-3 text-xs font-medium text-ink hover:bg-ink/15">
              All orders
            </Link>
          }
        >
          <ul className="mt-5 space-y-4">
            {data.recent.slice(0, 4).length === 0 ? (
              <li className="text-sm text-muted">No orders yet.</li>
            ) : (
              data.recent.slice(0, 4).map((order) => (
                <li key={order.id} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas-warm text-xs font-semibold text-ink">
                    {initials(order.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{order.fullName}</p>
                    <p className="truncate text-xs text-muted">
                      {order.orderNumber} · {order.itemCount} pc
                    </p>
                  </div>
                  <StatusPill value={order.status} tone={statusTone(order.status)} />
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card title="Fulfilment">
          <div className="flex flex-1 flex-col items-center justify-center py-4">
            <Donut value={progress} />
            <p className="mt-3 text-sm text-muted">{delivered} of {data.kpis.orderCount} delivered</p>
          </div>
        </Card>

        <div className="relative overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-peach/20 blur-2xl" />
          <p className="relative text-sm text-white/70">On the floor</p>
          <p className="relative mt-8 font-display text-4xl tracking-tight sm:text-5xl">{clock}</p>
          <p className="relative mt-4 text-sm text-white/55">
            {data.kpis.openOrders} open · {formatGBP(data.kpis.awaitingPayment)} due
          </p>
          <div className="relative mt-8 flex gap-2">
            <Link to="/admin/orders" className="inline-flex h-10 items-center rounded-full bg-white/10 px-4 text-sm hover:bg-white/15">
              Orders
            </Link>
            <Link to="/admin/catalogue" className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm text-ink hover:bg-white/90">
              Stock
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  note,
  featured,
}: {
  label: string;
  value: string;
  note: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] p-5",
        featured ? "bg-ink text-white" : "bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm", featured ? "text-white/70" : "text-muted")}>{label}</p>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", featured ? "bg-white/15" : "border border-line")}>
          <ArrowUpRight size={14} />
        </span>
      </div>
      <p className="mt-6 text-4xl font-semibold tracking-tight">{value}</p>
      <p className={cn("mt-3 text-xs", featured ? "text-white/55" : "text-muted")}>{note}</p>
    </div>
  );
}

function Donut({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className="relative grid h-40 w-40 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#1c1410 0 ${clamped}%, #eadfd6 ${clamped}% 100%)`,
      }}
    >
      <div className="grid h-[6.5rem] w-[6.5rem] place-items-center rounded-full bg-white">
        <div className="text-center">
          <p className="text-3xl font-semibold text-ink">{clamped}%</p>
          <p className="text-[11px] text-muted">Delivered</p>
        </div>
      </div>
    </div>
  );
}

function barFill(index: number) {
  return ["bg-ink", "bg-charcoal", "bg-peach-deep", "bg-ink", "bg-pink-deep", "bg-charcoal", "bg-ink"][index % 7];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
