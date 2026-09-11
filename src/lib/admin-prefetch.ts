import { api, prefetchApi } from "@/lib/api";

const WARM = [
  "/api/admin/orders",
  "/api/admin/products",
  "/api/admin/categories",
  "/api/admin/customers",
  "/api/admin/settings",
  "/api/admin/promotions",
  "/api/admin/reviews",
  "/api/admin/returns",
];

export function warmupAdmin() {
  void api("/api/admin/overview")
    .catch(() => undefined)
    .finally(async () => {
      for (let i = 0; i < WARM.length; i += 2) {
        await Promise.all(WARM.slice(i, i + 2).map((path) => api(path).catch(() => undefined)));
      }
    });
}

export function prefetchAdminRoute(href: string) {
  const url = new URL(href, window.location.origin);
  const path = url.pathname;
  if (path === "/admin") prefetchApi("/api/admin/overview");
  else if (path === "/admin/orders" || path === "/admin/calendar") prefetchApi("/api/admin/orders");
  else if (path.startsWith("/admin/catalogue")) {
    prefetchApi("/api/admin/products");
    prefetchApi("/api/admin/categories");
  } else if (path === "/admin/customers") prefetchApi("/api/admin/customers");
  else if (path === "/admin/earnings" || path === "/admin/analytics") prefetchApi("/api/admin/overview");
  else if (path === "/admin/promotions") prefetchApi("/api/admin/promotions");
  else if (path === "/admin/messages" || path === "/admin/settings" || path === "/admin/support" || path === "/admin/bugs") {
    prefetchApi("/api/admin/settings");
  } else if (path === "/admin/returns") prefetchApi("/api/admin/returns");
  else if (path === "/admin/reviews") prefetchApi("/api/admin/reviews");
}
