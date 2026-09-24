import { Link, Navigate, Outlet, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { HeaderNav } from "@/components/storefront/header-nav";
import { Footer } from "@/components/storefront/footer";
import { WhatsAppButton } from "@/components/storefront/whatsapp-button";
import { ProductGrid, type ProductCardData } from "@/components/storefront/product-card";
import { CatalogLayout, type CatalogFacets } from "@/components/storefront/catalog-layout";
import { Logo } from "@/components/brand/logo";
import { DeployRefreshBanner } from "@/components/storefront/deploy-refresh";
import { HomeHero } from "@/components/storefront/hero";
import { CategoryCatalog } from "@/components/storefront/category-catalog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, PasswordInput, Select, Textarea, FieldError } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import { FlashBanner } from "@/components/storefront/flash-banner";
import { OrderSummary, type OrderDetail } from "@/components/storefront/order-summary";
import { useShop } from "@/context/shop";
import { api, peekApi } from "@/lib/api";
import { resolveImageUrl } from "@/lib/media";
import { formatGBP } from "@/lib/money";
import { lastPage, setFlash } from "@/lib/navigation-memory";
import { cn, safeNextPath } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from "@/pages/auth";
const AdminAuthLayout = lazy(() => import("@/context/admin").then((module) => ({ default: module.AdminAuthLayout })));
const AdminGate = lazy(() => import("@/pages/admin").then((module) => ({ default: module.AdminGate })));
const ProductPage = lazy(() => import("@/pages/product").then((module) => ({ default: module.ProductPage })));

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
      <FlashBanner />
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
        title={hero?.title ?? "Wholesale clearance from our warehouse."}
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
  const { setCartCount, user } = useShop();
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
              <img src={item.product.images[0]?.url ? resolveImageUrl(item.product.images[0].url) : undefined} alt="" className="h-24 w-20 rounded-xl object-cover" />
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
        <Link to={user ? "/checkout" : "/login?next=/checkout"} className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}>Checkout</Link>
      </aside>
    </div>
  );
}

function CheckoutPage() {
  const { user, ready, refresh, cardPayments } = useShop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("cancelled") ? "Payment was cancelled. Your basket is still here." : null);
  const [pending, setPending] = useState(false);

  if (!ready) return <div className="container-narrow py-12 text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login?next=/checkout" replace />;

  return (
    <div className="container-narrow py-12">
      <h1 className="font-display text-4xl">Checkout</h1>
      <p className="mt-3 text-sm text-muted">Signed in as {user.email}. Complete your details to pay.</p>
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
              body: JSON.stringify({ ...Object.fromEntries(form.entries()), email: user.email, paymentMethod: "CARD" }),
            });
            await refresh();
            if (!result.checkoutUrl) {
              throw new Error("Stripe checkout did not start. Please try again.");
            }
            window.location.assign(result.checkoutUrl);
            return;
          } catch (err) {
            const message = err instanceof Error ? err.message : "Could not place order.";
            if (message === "Please sign in.") {
              navigate("/login?next=/checkout");
              return;
            }
            setError(message);
          } finally {
            setPending(false);
          }
        }}
      >
        <div><Label>Email</Label><Input name="email" type="email" required defaultValue={user.email} readOnly className="bg-canvas-warm" /></div>
        <div><Label>Full name</Label><Input name="fullName" required defaultValue={user.name} /></div>
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
        <input type="hidden" name="paymentMethod" value="CARD" />
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-muted">
          {cardPayments
            ? "Place order opens Stripe so you can pay by card. The order only reaches the shop floor after payment is confirmed."
            : "Card payments are not available right now."}
        </p>
        <div><Label>Promo code</Label><Input name="promoCode" /></div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" size="lg" className="w-full" disabled={pending || !cardPayments}>
          {pending ? "Opening Stripe…" : "Place order"}
        </Button>
      </form>
    </div>
  );
}

const PAYMENT_CHECKS = 8;

function ConfirmationPage() {
  const { orderNumber } = useParams();
  const { user } = useShop();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<string | null>(sessionId ? null : "UNKNOWN");
  const [order, setOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: number | undefined;
    async function check(attempt: number) {
      try {
        const result = await api<{ paymentStatus: string }>("/api/pay-confirm?session_id=" + encodeURIComponent(sessionId!));
        if (cancelled) return;
        if (result.paymentStatus === "PAID" || attempt >= PAYMENT_CHECKS) {
          setStatus(result.paymentStatus);
          return;
        }
      } catch {
        if (cancelled) return;
        if (attempt >= PAYMENT_CHECKS) {
          setStatus("PENDING");
          return;
        }
      }
      timer = window.setTimeout(() => void check(attempt + 1), 2500);
    }
    void check(1);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!orderNumber || !user || !status) return;
    void api<OrderDetail>(`/api/account/orders/${encodeURIComponent(orderNumber)}`)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [orderNumber, user, status]);

  if (!status) {
    return (
      <div className="container-narrow py-24 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-line border-t-ink" />
        <h1 className="mt-6 font-display text-3xl">Confirming your payment…</h1>
        <p className="mt-3 text-sm text-muted">This only takes a moment. Please don't close this page.</p>
      </div>
    );
  }

  const paid = status === "PAID" || order?.paymentStatus === "PAID";

  return (
    <div className="container-narrow py-12 sm:py-16">
      <div className="text-center">
        {paid ? <CheckCircle2 size={56} className="mx-auto text-success" /> : null}
        <h1 className="mt-5 font-display text-4xl sm:text-5xl">{paid ? "Payment successful!" : "Order received"}</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          {paid
            ? `Thank you${order ? `, ${order.fullName.split(" ")[0]}` : ""}. Your order ${orderNumber} is paid and confirmed. We've emailed you a receipt.`
            : `Your order ${orderNumber} is recorded. Stripe is still confirming the card payment — we'll email you as soon as it's through.`}
        </p>
      </div>

      {order ? (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-2xl">Order summary</h2>
          <OrderSummary order={order} />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/shop" className={buttonVariants({ size: "lg" })}>Continue shopping</Link>
        {user ? <Link to="/account" className={buttonVariants({ variant: "outline", size: "lg" })}>View all orders</Link> : null}
      </div>
    </div>
  );
}

function AccountOrderPage() {
  const { orderNumber } = useParams();
  const { user, ready } = useShop();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!orderNumber || !user) return;
    void api<OrderDetail>(`/api/account/orders/${encodeURIComponent(orderNumber)}`)
      .then(setOrder)
      .catch(() => setFailed(true));
  }, [orderNumber, user]);

  if (!ready) return <div className="container-narrow py-16 text-muted">Loading…</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(`/account/orders/${orderNumber ?? ""}`)}`} replace />;
  if (failed) return <EmptyState title="Order not found" description="We couldn't find that order on your account." action={<Link to="/account" className={buttonVariants()}>Back to account</Link>} />;
  if (!order) return <div className="container-narrow py-16 text-muted">Loading…</div>;

  return (
    <div className="container-narrow py-12">
      <Link to="/account" className="text-sm text-muted hover:text-ink">← All orders</Link>
      <h1 className="mt-4 mb-6 font-display text-4xl">Order summary</h1>
      <OrderSummary order={order} />
    </div>
  );
}

function LoginPage() {
  const { refresh, user, ready } = useShop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next") ?? lastPage(), "/shop");
  const checkout = next.startsWith("/checkout");
  const [error, setError] = useState<string | null>(null);
  if (!ready) return <div className="container-narrow py-16 text-muted">Loading…</div>;
  if (user) return <Navigate to={next} replace />;

  return (
    <div className="container-narrow py-16">
      <h1 className="font-display text-4xl">Sign in</h1>
      {checkout ? (
        <p className="mt-3 text-sm text-muted">Sign in to continue to checkout and pay with Stripe.</p>
      ) : null}
      <form
        className="mt-8 space-y-4 rounded-3xl bg-white p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            await api("/api/login", {
              method: "POST",
              body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
            });
            await refresh();
            navigate(next);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not sign in.");
          }
        }}
      >
        <div><Label>Email</Label><Input name="email" type="email" autoComplete="email" required /></div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label>Password</Label>
            <Link to="/forgot-password" className="text-sm text-muted underline hover:text-ink">Forgot password?</Link>
          </div>
          <PasswordInput name="password" autoComplete="current-password" required />
        </div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" className="w-full" size="lg">Sign in</Button>
        <p className="text-center text-sm text-muted">
          New here?{" "}
          <Link to={`/register?next=${encodeURIComponent(next)}`} className="text-ink underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

function RegisterPage() {
  const { refresh, user, ready } = useShop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next") ?? lastPage(), "/shop");
  const checkout = next.startsWith("/checkout");
  const [error, setError] = useState<string | null>(null);
  if (!ready) return <div className="container-narrow py-16 text-muted">Loading…</div>;
  if (user) return <Navigate to={next} replace />;

  return (
    <div className="container-narrow py-16">
      <h1 className="font-display text-4xl">Create account</h1>
      {checkout ? (
        <p className="mt-3 text-sm text-muted">Create an account, then you can complete checkout and pay with Stripe.</p>
      ) : null}
      <form
        className="mt-8 space-y-4 rounded-3xl bg-white p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          if (form.get("password") !== form.get("confirmPassword")) {
            setError("The passwords don't match.");
            return;
          }
          setError(null);
          try {
            await api("/api/register", {
              method: "POST",
              body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), next }),
            });
            await refresh();
            setFlash(`Account created! We've sent a confirmation link to ${String(form.get("email"))} — open it to verify your email.`);
            navigate(next);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not register.");
          }
        }}
      >
        <div><Label>Name</Label><Input name="name" autoComplete="name" required /></div>
        <div><Label>Email</Label><Input name="email" type="email" autoComplete="email" required /></div>
        <div>
          <Label>Password</Label>
          <PasswordInput name="password" autoComplete="new-password" required minLength={8} />
          <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
        </div>
        <div><Label>Confirm password</Label><PasswordInput name="confirmPassword" autoComplete="new-password" required minLength={8} /></div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" className="w-full" size="lg">Create account</Button>
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-ink underline">
            Sign in
          </Link>
        </p>
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
    void api<typeof orders>("/api/my-orders").then(setOrders);
  }, [user]);
  if (!user) return <Navigate to="/login?next=/account" replace />;
  return (
    <div className="container-page py-12">
      <h1 className="font-display text-4xl">Account</h1>
      <p className="mt-2 text-muted">{user.name} · {user.email}</p>
      {user.verified === false ? <VerifyReminder /> : null}
      <Button className="mt-4" variant="outline" onClick={async () => { await api("/api/logout", { method: "POST" }); await refresh(); navigate("/"); }}>Sign out</Button>
      <h2 className="mt-10 font-display text-2xl">Orders</h2>
      {orders.length ? (
        <ul className="mt-4 divide-y divide-line rounded-3xl bg-white">
          {orders.map((order) => (
            <li key={order.orderNumber}>
              <Link to={`/account/orders/${order.orderNumber}`} className="flex justify-between px-5 py-4 text-sm hover:bg-canvas-warm/50">
                <span className="font-medium">{order.orderNumber}</span>
                <span>{order.status} · {formatGBP(order.total)} →</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">No orders yet.</p>
      )}
    </div>
  );
}

function VerifyReminder() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-peach/40 px-4 py-3 text-sm">
      <p className="flex-1">
        {state === "sent"
          ? "Sent! Check your inbox for the confirmation link."
          : error ?? "Please confirm your email address — check your inbox for our link."}
      </p>
      {state !== "sent" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={state === "sending"}
          onClick={async () => {
            setState("sending");
            setError(null);
            try {
              await api("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ next: "/shop" }) });
              setState("sent");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not send the email.");
              setState("idle");
            }
          }}
        >
          {state === "sending" ? "Sending…" : "Resend email"}
        </Button>
      ) : null}
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
        {settings.phone ? (
          <p>
            <a href={`tel:${String(settings.phone).replace(/[^\d+]/g, "")}`} className="hover:text-gold-deep">
              {String(settings.phone)}
            </a>
          </p>
        ) : null}
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
    <>
    <DeployRefreshBanner />
    <Suspense fallback={<div className="container-page py-24 text-muted">Loading…</div>}>
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
        <Route path="/account/orders/:orderNumber" element={<AccountOrderPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
    </>
  );
}
