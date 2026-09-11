import { useEffect, useState } from "react";
import { api, peekApi } from "@/lib/api";
import { formatGBP } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Eyebrow, Panel } from "@/components/admin/ui";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: { orders: number };
  orders: { total: number; createdAt: string }[];
};

export function AdminCustomers() {
  const cached = peekApi<Customer[]>("/api/admin/customers");
  const [customers, setCustomers] = useState<Customer[]>(() => cached ?? []);
  const [ready, setReady] = useState(() => cached !== undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<Customer[]>("/api/admin/customers")
      .then((next) => {
        setCustomers(next);
        setReady(true);
      })
      .catch((err: Error) => {
        setError(err.message);
        setReady(true);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Accounts</Eyebrow>
        <h1 className="mt-2 font-display text-4xl">Customers</h1>
        <p className="mt-2 text-sm text-muted">People who can sign in, save a basket, and place a wholesale ticket.</p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Panel className="p-0 sm:p-0">
        {customers.length === 0 ? (
          <p className="p-8 text-sm text-muted">{ready ? "No customer accounts yet." : "Loading customers…"}</p>
        ) : (
          <ul className="divide-y divide-line">
            {customers.map((customer) => (
              <li key={customer.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{customer.name}</p>
                  <p className="truncate text-sm text-muted">
                    {customer.email}
                    {customer.phone ? ` · ${customer.phone}` : ""}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>
                    {customer._count.orders} order{customer._count.orders === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted">
                    {customer.orders[0]
                      ? `${formatGBP(customer.orders[0].total)} · ${formatDate(customer.orders[0].createdAt)}`
                      : `Joined ${formatDate(customer.createdAt)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
