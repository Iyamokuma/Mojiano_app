import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, peekApi } from "@/lib/api";
import { formatGBP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Eyebrow, Panel, StatusPill, statusTone } from "@/components/admin/ui";

type Overview = {
  kpis: {
    orderCount: number;
    revenue: number;
    monthRevenue: number;
    averageOrder: number;
    awaitingPayment: number;
    openOrders: number;
  };
  merchandising: { featured: number; clearance: number; newArrivals: number; bestSellers: number };
  pulse: { label: string; orders: number; revenue: number }[];
};

function useOverview() {
  const [data, setData] = useState<Overview | null>(() => peekApi<Overview>("/api/admin/overview") ?? null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api<Overview>("/api/admin/overview")
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);
  return { data, error };
}

export function AdminEarnings() {
  const { data, error } = useOverview();
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading earnings…</p>;
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Ecommerce</Eyebrow>
        <h1 className="mt-2 font-display text-4xl">Earnings</h1>
        <p className="mt-2 text-sm text-muted">Paid tickets, this month, and what is still waiting.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <p className="text-sm text-muted">All time</p>
          <p className="mt-3 text-3xl font-semibold">{formatGBP(data.kpis.revenue)}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-muted">This month</p>
          <p className="mt-3 text-3xl font-semibold">{formatGBP(data.kpis.monthRevenue)}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-muted">Average order</p>
          <p className="mt-3 text-3xl font-semibold">{formatGBP(data.kpis.averageOrder)}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-muted">Awaiting funds</p>
          <p className="mt-3 text-3xl font-semibold">{formatGBP(data.kpis.awaitingPayment)}</p>
        </Panel>
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  const { data, error } = useOverview();
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading analytics…</p>;
  const peak = Math.max(1, ...data.pulse.map((day) => day.orders));
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Account</Eyebrow>
        <h1 className="mt-2 font-display text-4xl">Analytics</h1>
        <p className="mt-2 text-sm text-muted">{data.kpis.orderCount} orders · {data.kpis.openOrders} still open.</p>
      </div>
      <Panel>
        <h2 className="text-[15px] font-semibold">Orders this week</h2>
        <div className="mt-8 flex h-40 items-end gap-3">
          {data.pulse.map((day) => (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full max-w-[2.5rem] rounded-full bg-ink"
                style={{ height: `${Math.max(12, (day.orders / peak) * 100)}%` }}
                title={`${day.orders} · ${formatGBP(day.revenue)}`}
              />
              <span className="text-xs text-muted">{day.label.slice(0, 2)}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel><p className="text-sm text-muted">Featured</p><p className="mt-2 text-2xl font-semibold">{data.merchandising.featured}</p></Panel>
        <Panel><p className="text-sm text-muted">Clearance</p><p className="mt-2 text-2xl font-semibold">{data.merchandising.clearance}</p></Panel>
        <Panel><p className="text-sm text-muted">New arrivals</p><p className="mt-2 text-2xl font-semibold">{data.merchandising.newArrivals}</p></Panel>
        <Panel><p className="text-sm text-muted">Best sellers</p><p className="mt-2 text-2xl font-semibold">{data.merchandising.bestSellers}</p></Panel>
      </div>
    </div>
  );
}

export function AdminPromotions() {
  const [rows, setRows] = useState<{ id: string; name: string; code: string | null; type: string; value: number; isActive: boolean }[]>(
    () => peekApi("/api/admin/promotions") ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api<typeof rows>("/api/admin/promotions").then(setRows).catch((err: Error) => setError(err.message));
  }, []);
  return (
    <Page title="Promotions" intro="Codes and campaigns that come off the ticket at checkout." error={error}>
      {rows.length === 0 ? (
        <p className="p-8 text-sm text-muted">No promotions yet. Codes can be added in the database when you are ready.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-muted">{row.code || "No code"} · {row.type === "PERCENTAGE" ? `${row.value}%` : formatGBP(row.value)}</p>
              </div>
              <StatusPill value={row.isActive ? "Active" : "Off"} tone={row.isActive ? "ok" : "neutral"} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

export function AdminMessages() {
  const [settings, setSettings] = useState<{ email: string; whatsappNumber: string; phone: string } | null>(
    () => peekApi("/api/admin/settings") ?? null,
  );
  useEffect(() => {
    void api<NonNullable<typeof settings>>("/api/admin/settings").then(setSettings).catch(() => setSettings(null));
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Ecommerce</Eyebrow>
        <h1 className="mt-2 font-display text-4xl">Message centre</h1>
        <p className="mt-2 text-sm text-muted">Customer chat still runs on WhatsApp and email. Those details live in Settings.</p>
      </div>
      <Panel>
        <p className="text-sm">{settings?.email || "No email set"}</p>
        <p className="mt-2 text-sm text-muted">{settings?.phone || "No phone set"}</p>
        <p className="mt-2 text-sm text-muted">{settings?.whatsappNumber ? `WhatsApp ${settings.whatsappNumber}` : "No WhatsApp number set"}</p>
        <Link to="/admin/settings" className="mt-4 inline-flex text-sm font-medium text-ink underline">
          Edit in Settings
        </Link>
      </Panel>
    </div>
  );
}

export function AdminReturns() {
  const [rows, setRows] = useState<{ id: string; reason: string; status: string; createdAt: string; order: { orderNumber: string }; user: { name: string } }[]>(
    () => peekApi("/api/admin/returns") ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api<typeof rows>("/api/admin/returns").then(setRows).catch((err: Error) => setError(err.message));
  }, []);
  async function patch(id: string, status: string) {
    const updated = await api<(typeof rows)[number]>(`/api/admin/returns/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...updated } : row)));
  }
  return (
    <Page title="Return requests" intro="Tickets asking to send stock back." error={error}>
      {rows.length === 0 ? (
        <p className="p-8 text-sm text-muted">No return requests yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-medium">{row.order.orderNumber} · {row.user.name}</p>
                <p className="text-sm text-muted">{row.reason} · {formatDate(row.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill value={row.status} tone={statusTone(row.status)} />
                {row.status === "REQUESTED" ? (
                  <>
                    <button type="button" className="text-xs uppercase tracking-[0.14em]" onClick={() => void patch(row.id, "APPROVED")}>Approve</button>
                    <button type="button" className="text-xs uppercase tracking-[0.14em] text-muted" onClick={() => void patch(row.id, "REJECTED")}>Reject</button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

export function AdminCalendar() {
  const [orders, setOrders] = useState<{ id: string; orderNumber: string; fullName: string; total: number; status: string; createdAt: string }[]>(
    () => peekApi("/api/admin/orders") ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api<typeof orders>("/api/admin/orders").then(setOrders).catch((err: Error) => setError(err.message));
  }, []);
  const groups = useMemo(() => {
    const map = new Map<string, typeof orders>();
    for (const order of orders) {
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), order]);
    }
    return [...map.entries()];
  }, [orders]);
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Product & event</Eyebrow>
        <h1 className="mt-2 font-display text-4xl">Calendar</h1>
        <p className="mt-2 text-sm text-muted">Orders grouped by the day they arrived.</p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {groups.length === 0 ? <Panel><p className="text-sm text-muted">No orders to plot yet.</p></Panel> : null}
      {groups.map(([day, rows]) => (
        <Panel key={day}>
          <h2 className="text-[15px] font-semibold">{formatDate(day)}</h2>
          <ul className="mt-4 space-y-3">
            {rows.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{order.orderNumber} · {order.fullName}</span>
                <span className="text-muted">{formatGBP(order.total)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

export function AdminReviews() {
  const [rows, setRows] = useState<{ id: string; rating: number; title: string; body: string; approved: boolean; createdAt: string; user: { name: string }; product: { name: string } }[]>(
    () => peekApi("/api/admin/reviews") ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api<typeof rows>("/api/admin/reviews").then(setRows).catch((err: Error) => setError(err.message));
  }, []);
  async function patch(id: string, approved: boolean) {
    const updated = await api<(typeof rows)[number]>(`/api/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify({ approved }) });
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...updated } : row)));
  }
  return (
    <Page title="Product reviews" intro="What buyers have said about the floor." error={error}>
      {rows.length === 0 ? (
        <p className="p-8 text-sm text-muted">No reviews yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.product.name} · {row.rating}/5</p>
                  <p className="text-sm text-muted">{row.user.name} · {formatDate(row.createdAt)}</p>
                  {row.title ? <p className="mt-2 text-sm">{row.title}</p> : null}
                  {row.body ? <p className="mt-1 text-sm text-muted">{row.body}</p> : null}
                </div>
                <button type="button" className="text-xs uppercase tracking-[0.14em]" onClick={() => void patch(row.id, !row.approved)}>
                  {row.approved ? "Hide" : "Show"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

export function AdminBugs() {
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Product & event</Eyebrow>
        <h1 className="mt-2 font-display text-4xl">Bug report</h1>
        <p className="mt-2 text-sm text-muted">Send floor issues to the house email. There is no public bug inbox yet.</p>
      </div>
      <Panel>
        <p className="text-sm text-muted">Use Settings for the contact address, or message the team on WhatsApp from the shop.</p>
        <Link to="/admin/settings" className="mt-4 inline-flex text-sm font-medium underline">Open settings</Link>
      </Panel>
    </div>
  );
}

export function AdminSupport() {
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Account</Eyebrow>
        <h1 className="mt-2 font-display text-4xl">Help & support</h1>
        <p className="mt-2 text-sm text-muted">House copy, delivery notes and the public shop.</p>
      </div>
      <Panel className="space-y-3">
        <Link to="/admin/settings" className="block text-sm font-medium hover:text-ink">Settings and house copy</Link>
        <Link to="/" className="block text-sm font-medium hover:text-ink">Open the shop</Link>
        <Link to="/contact" className="block text-sm font-medium hover:text-ink">Public contact page</Link>
      </Panel>
    </div>
  );
}

function Page({
  title,
  intro,
  error,
  children,
}: {
  title: string;
  intro: string;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">{intro}</p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Panel className="overflow-hidden p-0 sm:p-0">{children}</Panel>
    </div>
  );
}
