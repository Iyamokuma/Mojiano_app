import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AdminOverview } from "@/components/admin/overview";
import { AdminOrders } from "@/components/admin/orders";
import { AdminCatalogue } from "@/components/admin/catalogue";
import { AdminProductForm } from "@/components/admin/product-form";
import { AdminCustomers } from "@/components/admin/customers";
import { AdminSettings } from "@/components/admin/settings";
import {
  AdminAnalytics,
  AdminBugs,
  AdminCalendar,
  AdminEarnings,
  AdminMessages,
  AdminPromotions,
  AdminReturns,
  AdminReviews,
  AdminSupport,
} from "@/components/admin/extras";

function Keep({ when, children }: { when: boolean; children: ReactNode }) {
  const [seen, setSeen] = useState(when);
  if (when && !seen) setSeen(true);
  if (!seen) return null;
  return (
    <div className={when ? undefined : "hidden"} hidden={!when} aria-hidden={!when}>
      {children}
    </div>
  );
}

export function AdminKeepAlive() {
  const { pathname } = useLocation();
  const form = /^\/admin\/catalogue\/[^/]+$/.test(pathname);

  return (
    <>
      {form ? <AdminProductForm key={pathname} /> : null}
      <Keep when={pathname === "/admin"}>
        <AdminOverview />
      </Keep>
      <Keep when={pathname === "/admin/orders"}>
        <AdminOrders />
      </Keep>
      <Keep when={pathname === "/admin/catalogue"}>
        <AdminCatalogue />
      </Keep>
      <Keep when={pathname === "/admin/customers"}>
        <AdminCustomers />
      </Keep>
      <Keep when={pathname === "/admin/earnings"}>
        <AdminEarnings />
      </Keep>
      <Keep when={pathname === "/admin/promotions"}>
        <AdminPromotions />
      </Keep>
      <Keep when={pathname === "/admin/messages"}>
        <AdminMessages />
      </Keep>
      <Keep when={pathname === "/admin/returns"}>
        <AdminReturns />
      </Keep>
      <Keep when={pathname === "/admin/calendar"}>
        <AdminCalendar />
      </Keep>
      <Keep when={pathname === "/admin/reviews"}>
        <AdminReviews />
      </Keep>
      <Keep when={pathname === "/admin/bugs"}>
        <AdminBugs />
      </Keep>
      <Keep when={pathname === "/admin/support"}>
        <AdminSupport />
      </Keep>
      <Keep when={pathname === "/admin/analytics"}>
        <AdminAnalytics />
      </Keep>
      <Keep when={pathname === "/admin/settings"}>
        <AdminSettings />
      </Keep>
    </>
  );
}
