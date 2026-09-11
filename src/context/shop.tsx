import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export type ShopUser = { id: string; email: string; name: string; role: "CUSTOMER" | "ADMIN" } | null;
export type ShopCategory = { id: string; name: string; slug: string; children: { name: string; slug: string }[] };

type ShopState = {
  user: ShopUser;
  ready: boolean;
  categories: ShopCategory[];
  cartCount: number;
  settings: Record<string, string | number | boolean | null>;
  spotlightSlug: string | null;
  setSpotlightSlug: (slug: string | null) => void;
  refresh: () => Promise<void>;
  setCartCount: (n: number) => void;
};

const ShopContext = createContext<ShopState | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ShopUser>(null);
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [settings, setSettings] = useState<Record<string, string | number | boolean | null>>({});
  const [spotlightSlug, setSpotlightSlug] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await api<{
        user: ShopUser;
        categories: ShopCategory[];
        cart: { count: number };
        settings: Record<string, string | number | boolean | null>;
      }>("/api/bootstrap");
      setUser(data.user);
      setCategories(data.categories);
      setCartCount(data.cart.count);
      setSettings(data.settings);
    } catch {
      setSettings({});
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) {
      setReady(true);
      const later = window.setTimeout(() => void refresh(), 1200);
      return () => window.clearTimeout(later);
    }
    void refresh();
  }, []);

  const value = useMemo(
    () => ({ user, ready, categories, cartCount, settings, spotlightSlug, setSpotlightSlug, refresh, setCartCount }),
    [user, ready, categories, cartCount, settings, spotlightSlug],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}
