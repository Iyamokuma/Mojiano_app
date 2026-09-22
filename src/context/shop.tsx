import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, prefetchApi } from "@/lib/api";

export type ShopUser = { id: string; email: string; name: string; role: "CUSTOMER" | "ADMIN" } | null;
export type ShopCategory = { id: string; name: string; slug: string; children: { name: string; slug: string }[] };

type ShopState = {
  user: ShopUser;
  ready: boolean;
  categories: ShopCategory[];
  cartCount: number;
  cardPayments: boolean;
  settings: Record<string, string | number | boolean | null>;
  spotlightSlug: string | null;
  setSpotlightSlug: (slug: string | null) => void;
  refresh: () => Promise<void>;
  setCartCount: (n: number) => void;
};

const ShopContext = createContext<ShopState | null>(null);

const CATS_KEY = "mj-categories";
const SETTINGS_KEY = "mj-settings";
const BUILD_KEY = "mj-build-id";

function sessionMatchesBuild(): boolean {
  try {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(BUILD_KEY) === __APP_BUILD_ID__;
  } catch {
    return false;
  }
}

function syncSessionBuildId() {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(BUILD_KEY) === __APP_BUILD_ID__) return;
    sessionStorage.removeItem(CATS_KEY);
    sessionStorage.removeItem(SETTINGS_KEY);
    sessionStorage.setItem(BUILD_KEY, __APP_BUILD_ID__);
  } catch {
    /* private mode */
  }
}

function readCachedCategories(): ShopCategory[] {
  if (!sessionMatchesBuild()) return [];
  try {
    if (typeof sessionStorage === "undefined") return [];
    const raw = sessionStorage.getItem(CATS_KEY);
    return raw ? (JSON.parse(raw) as ShopCategory[]) : [];
  } catch {
    return [];
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ShopUser>(null);
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<ShopCategory[]>(readCachedCategories);
  const [cartCount, setCartCount] = useState(0);
  const [cardPayments, setCardPayments] = useState(false);
  const [settings, setSettings] = useState<Record<string, string | number | boolean | null>>(() => {
    if (!sessionMatchesBuild()) return {};
    try {
      const raw = sessionStorage.getItem(SETTINGS_KEY);
      return raw ? (JSON.parse(raw) as Record<string, string | number | boolean | null>) : {};
    } catch {
      return {};
    }
  });
  const [spotlightSlug, setSpotlightSlug] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await api<{
        user: ShopUser;
        categories: ShopCategory[];
        cart: { count: number };
        card?: boolean;
        settings: Record<string, string | number | boolean | null>;
      }>("/api/bootstrap");
      setUser(data.user);
      setCategories(data.categories);
      setCartCount(data.cart.count);
      setCardPayments(Boolean(data.card));
      setSettings(data.settings);
      try {
        sessionStorage.setItem(CATS_KEY, JSON.stringify(data.categories));
        sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      } catch {
        /* private mode */
      }
    } catch {
      setSettings({});
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    syncSessionBuildId();
    prefetchApi("/api/home");
    if (window.location.pathname.startsWith("/admin")) {
      setReady(true);
      const later = window.setTimeout(() => void refresh(), 1200);
      return () => window.clearTimeout(later);
    }
    void refresh();
  }, []);

  const value = useMemo(
    () => ({ user, ready, categories, cartCount, cardPayments, settings, spotlightSlug, setSpotlightSlug, refresh, setCartCount }),
    [user, ready, categories, cartCount, cardPayments, settings, spotlightSlug],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}
