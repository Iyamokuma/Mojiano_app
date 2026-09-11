import { Link, Navigate, Outlet, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { HeaderNav } from "@/components/storefront/header-nav";
import { Footer } from "@/components/storefront/footer";
import { WhatsAppButton } from "@/components/storefront/whatsapp-button";
import { ProductGrid, type ProductCardData } from "@/components/storefront/product-card";
import { CatalogLayout, type CatalogFacets } from "@/components/storefront/catalog-layout";
import { Logo } from "@/components/brand/logo";
import { HomeHero } from "@/components/storefront/hero";
import { CategoryCatalog } from "@/components/storefront/category-catalog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import { useShop } from "@/context/shop";
import { api, peekApi } from "@/lib/api";
import { formatGBP } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AdminAuthLayout } from "@/context/admin";
import { AdminGate } from "@/pages/admin";
import { ProductPage } from "@/pages/product";

function waLink(phone: unknown, message: string) {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function StoreLayout() {
  const { user, categories, cartCount, settings } = useShop();
  const wa = waLink(settings.whatsappNumber, "Hello Mojiano, I need some help.");
  return (
    <div className="flex min-h-screen flex-col">
      {settings.announcementActive && settings.announcement ? (
        <div className="bg-ink text-center text-[12px] tracking-wide text-white">
          <p className="container-page py-2.5">{String(settings.announcement)}</p>
        </div>
      ) : null}
      <HeaderNav categories={categories} cartCount={cartCount} signedIn={Boolean(user)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {wa ? <WhatsAppButton href={wa} /> : null}
    </div>
  );
}

function HomePage() {
  const [data, setData] = useState<{
    content: { id: string; key: string; title: string; body: string; image: string | null; ctaLabel: string; ctaHref: string }[];
    categories: { id: string; name: string; slug: string; image: string | null }[];
    collections: { featured: ProductCardData[]; newArrivals: ProductCardData[]; bestSellers: ProductCardData[] };
  } | null>(() => peekApi("/api/home") ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void api<NonNullable<typeof data>>("/api/home")
      .then((next) => {
        setFailed(false);
        setData(next);
      })
      .catch(() => setFailed(true));
  }, []);

  if (failed && !data) {
    return (
      <EmptyState
        title="The shop is waking up"
        description="The catalogue could not load. Refresh in a moment."
        action={<button type="button" className={buttonVariants()} onClick={() => window.location.reload()}>Refresh</button>}
      />
    );
  }
  if (!data) return <div className="container-page py-24 text-muted">Loading…</div>;
  const hero = data.content.find((block) => block.key === "hero");

  return (
    <div>
      <HomeHero
        title={hero?.title ?? "Quality, at the right price."}
        body={hero?.body}
        ctaLabel={hero?.ctaLabel}
        ctaHref={hero?.ctaHref}
        categories={data.categories}
      />
      <CategoryCatalog categories={data.categories} />
      {data.collections.newArrivals.length ? (
        <section className="container-page pb-16">
          <h2 className="mb-8 font-display text-4xl">New arrivals</h2>
          <ProductGrid products={data.collections.newArrivals} />
        </section>
      ) : null}
      {data.collections.featured.length ? (
        <section className="container-page pb-16">
          <h2 className="mb-8 font-display text-4xl">Featured</h2>
          <ProductGrid products={data.collections.featured} />
        </section>
      ) : null}
    </div>
  );
}

function CatalogPage({ title, categorySlug }: { title?: string; categorySlug?: string }) {
  const [params] = useSearchParams();
  const query = new URLSearchParams(params);
  if (categorySlug) query.set("category", categorySlug);
  const path = `/api/products?${query.toString()}`;
  const [result, setResult] = useState<{
    products: ProductCardData[];
    total: number;
    facets: CatalogFacets;
  } | null>(() => peekApi(path) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const nextQuery = new URLSearchParams(params);
    if (categorySlug) nextQuery.set("category", categorySlug);
    const nextPath = `/api/products?${nextQuery.toString()}`;
    const cached = peekApi<NonNullable<typeof result>>(nextPath);
    if (cached) {
      setResult(cached);
      setFailed(false);
    } else {
      setResult(null);
    }
    void api<NonNullable<typeof result>>(nextPath)
      .then((data) => {
        setFailed(false);
        setResult(data);
      })
      .catch(() => setFailed(true));
  }, [params, categorySlug]);

  const heading = title ?? (params.get("q") ? `Results for “${params.get("q")}”` : "All products");

  if (failed && !result) {
    return (
      <EmptyState
        title="The shop is waking up"
        description="The catalogue could not load. Refresh in a moment."
        action={<button type="button" className={buttonVariants()} onClick={() => window.location.reload()}>Refresh</button>}
      />
    );
  }

  if (!result) return <div className="container-page py-24 text-muted">Loading…</div>;

  return (
    <CatalogLayout
      title={heading}
      categorySlug={categorySlug}
      products={result.products}
      total={result.total}
      facets={result.facets}
    />
  );
}

function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState<{ name: string; description: string } | null>(null);
  useEffect(() => {
    if (!slug) return;
    void api<{ name: string; description: string }>(`/api/categories/${slug}`).then(setCategory).catch(() => setCategory(null));
  }, [slug]);
  return <CatalogPage title={category?.name} categorySlug={slug} />;
}

function BasketPage() {
  const { setCartCount } = useShop();
  const [cart, setCart] = useState<{ items: { id: string; quantity: number; unitPrice: number; lineTotal: number; product: ProductCardData }[]; subtotal: number } | null>(null);

  async function load() {
    const data = await api<NonNullable<typeof cart>>("/api/cart");
    setCart(data);
    setCartCount(data.items.reduce((sum, item) => sum + item.quantity, 0));
  }

  useEffect(() => {
    void load();
  }, []);

  if (!cart) return <div className="container-page py-24 text-muted">Loading…</div>;
  if (!cart.items.length) {
    return <EmptyState title="Your basket is empty" description="Browse the shop to add pieces." action={<Link to="/shop" className={buttonVariants()}>Continue shopping</Link>} />;
  }

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <h1 className="font-display text-4xl">Basket</h1>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-5">
              <img src={item.product.images[0]?.url} alt="" className="h-24 w-20 rounded-xl object-cover" />
              <div className="flex-1">
                <Link to={`/product/${item.product.slug}`} className="font-medium">{item.product.name}</Link>
                <p className="text-sm">{formatGBP(item.unitPrice)}</p>
                <div className="mt-2 flex gap-3 text-sm">
                  <button onClick={() => api(`/api/cart/${item.id}`, { method: "PATCH", body: JSON.stringify({ quantity: item.quantity - 1 }) }).then(load)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => api(`/api/cart/${item.id}`, { method: "PATCH", body: JSON.stringify({ quantity: item.quantity + 1 }) }).then(load)}>+</button>
                  <button className="text-muted" onClick={() => api(`/api/cart/${item.id}`, { method: "DELETE" }).then(load)}>Remove</button>
                </div>
              </div>
              <p>{formatGBP(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit rounded-3xl bg-white p-6">
        <h2 className="font-display text-2xl">Summary</h2>
        <p className="mt-4 flex justify-between"><span>Subtotal</span><span>{formatGBP(cart.subtotal)}</span></p>
        <Link to="/checkout" className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}>Checkout</Link>
      </aside>
    </div>
  );
}

function CheckoutPage() {
  const { user, refresh } = useShop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("cancelled") ? "Payment was cancelled. Your basket is still here." : null);
  const [pending, setPending] = useState(false);
  const [card, setCard] = useState(false);

  useEffect(() => {
    void api<{ card: boolean }>("/api/payments/config")
      .then((config) => setCard(config.card))
      .catch(() => setCard(false));
  }, []);

  return (
    <div className="container-narrow py-12">
      <h1 className="font-display text-4xl">Checkout</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending(true);
          setError(null);
          try {
            const result = await api<{ orderNumber: string; checkoutUrl?: string | null }>("/api/checkout", {
              method: "POST",
              body: JSON.stringify(Object.fromEntries(form.entries())),
            });
            await refresh();
            if (result.checkoutUrl) {
              window.location.assign(result.checkoutUrl);
              return;
            }
            navigate(`/checkout/confirmation/${result.orderNumber}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not place order.");
          } finally {
            setPending(false);
          }
        }}
      >
        <div><Label>Email</Label><Input name="email" type="email" required defaultValue={user?.email ?? ""} /></div>
        <div><Label>Full name</Label><Input name="fullName" required defaultValue={user?.name ?? ""} /></div>
        <div><Label>Phone</Label><Input name="phone" required /></div>
        <div><Label>Address</Label><Input name="line1" required /></div>
        <div><Label>City</Label><Input name="city" required /></div>
        <div><Label>Postcode</Label><Input name="postcode" required /></div>
        <input type="hidden" name="country" value="United Kingdom" />
        <div>
          <Label>Delivery</Label>
          <Select name="deliveryMethod" defaultValue="Standard">
            <option>Standard</option>
            <option>Express</option>
            <option>Collection</option>
          </Select>
        </div>
        <div>
          <Label>Payment</Label>
          <Select name="paymentMethod" key={card ? "card" : "transfer"} defaultValue={card ? "CARD" : "BANK_TRANSFER"}>
            {card ? <option value="CARD">Card (Stripe)</option> : null}
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CASH_ON_DELIVERY">Cash on delivery</option>
          </Select>
        </div>
        <div><Label>Promo code</Label><Input name="promoCode" /></div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Placing order…" : "Place order"}
        </Button>
      </form>
    </div>
  );
}

function ConfirmationPage() {
  const { orderNumber } = useParams();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    void api<{ paymentStatus: string }>("/api/checkout/confirm?session_id=" + encodeURIComponent(sessionId))
      .then((result) => setStatus(result.paymentStatus))
      .catch(() => setStatus("PENDING"));
  }, [sessionId]);

  const paid = status === "PAID";
  const waiting = Boolean(sessionId) && !status;

  return (
    <div className="container-narrow py-16 text-center">
      <h1 className="font-display text-5xl">{paid || !sessionId ? "Order confirmed" : waiting ? "Checking payment…" : "Payment pending"}</h1>
      <p className="mt-4 text-muted">
        Your order <span className="text-ink">{orderNumber}</span>
        {paid ? " is paid and received." : sessionId ? " is recorded. Stripe is confirming the card payment." : " has been received."}
      </p>
      <Link to="/shop" className={cn(buttonVariants(), "mt-8 inline-flex")}>Continue shopping</Link>
    </div>
  );
}

function LoginPage() {
  const { refresh, user } = useShop();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  if (user) return <Navigate to="/account" replace />;

  return (
    <div className="container-narrow py-16">
      <h1 className="font-display text-4xl">Sign in</h1>
      <form
        className="mt-8 space-y-4 rounded-3xl bg-white p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            await api("/api/auth/login", {
              method: "POST",
              body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
            });
            await refresh();
            navigate("/account");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not sign in.");
          }
        }}
      >
        <div><Label>Email</Label><Input name="email" type="email" required /></div>
        <div><Label>Password</Label><Input name="password" type="password" required /></div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" className="w-full" size="lg">Sign in</Button>
        <p className="text-center text-sm text-muted">New here? <Link to="/register" className="text-ink underline">Create an account</Link></p>
      </form>
    </div>
  );
}

function RegisterPage() {
  const { refresh } = useShop();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="container-narrow py-16">
      <h1 className="font-display text-4xl">Create account</h1>
      <form
        className="mt-8 space-y-4 rounded-3xl bg-white p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            await api("/api/auth/register", {
              method: "POST",
              body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }),
            });
            await refresh();
            navigate("/account");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not register.");
          }
        }}
      >
        <div><Label>Name</Label><Input name="name" required /></div>
        <div><Label>Email</Label><Input name="email" type="email" required /></div>
        <div><Label>Password</Label><Input name="password" type="password" required minLength={8} /></div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" className="w-full" size="lg">Create account</Button>
      </form>
    </div>
  );
}

function AccountPage() {
  const { user, refresh } = useShop();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<{ orderNumber: string; total: number; status: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    void api<typeof orders>("/api/account/orders").then(setOrders);
  }, [user]);
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="container-page py-12">
      <h1 className="font-display text-4xl">Account</h1>
      <p className="mt-2 text-muted">{user.name} · {user.email}</p>
      <Button className="mt-4" variant="outline" onClick={async () => { await api("/api/auth/logout", { method: "POST" }); await refresh(); navigate("/"); }}>Sign out</Button>
      <h2 className="mt-10 font-display text-2xl">Orders</h2>
      <ul className="mt-4 divide-y divide-line rounded-3xl bg-white">
        {orders.map((order) => (
          <li key={order.orderNumber} className="flex justify-between px-5 py-4 text-sm">
            <span>{order.orderNumber}</span>
            <span>{order.status} · {formatGBP(order.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AboutPage() {
  const { settings } = useShop();
  return (
    <div className="container-narrow py-16">
      <Logo className="mx-auto items-center [&_img]:h-16 [&_img]:max-w-full sm:[&_img]:h-20" />
      <p className="mt-10 whitespace-pre-line text-lg leading-relaxed text-muted">{String(settings.aboutText ?? "")}</p>
    </div>
  );
}

function ContactPage() {
  const { settings } = useShop();
  const wa = waLink(settings.whatsappNumber, "Hello Mojiano, I would like some help.");
  return (
    <div className="container-narrow py-16">
      <h1 className="font-display text-5xl">Contact</h1>
      <div className="mt-8 space-y-3 rounded-3xl bg-white p-6 text-sm">
        <p>{String(settings.email ?? "")}</p>
        <p>{String(settings.phone ?? "")}</p>
        <p className="whitespace-pre-line">{String(settings.address ?? "")}</p>
      </div>
      {wa ? <a href={wa} className={cn(buttonVariants({ size: "lg" }), "mt-6 inline-flex")} target="_blank" rel="noreferrer">Message on WhatsApp</a> : null}
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="container-narrow py-24 text-center">
      <h1 className="font-display text-5xl">Page not found</h1>
      <Link to="/" className={cn(buttonVariants(), "mt-8 inline-flex")}>Back home</Link>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<AdminAuthLayout />}>
        <Route path="/admin/*" element={<AdminGate />} />
      </Route>
      <Route element={<StoreLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<CatalogPage />} />
        <Route path="/search" element={<CatalogPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/basket" element={<BasketPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/confirmation/:orderNumber" element={<ConfirmationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
