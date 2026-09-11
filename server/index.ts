import "dotenv/config";
import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { readStaff, readUser, requireAdmin, requireUser, signUser, CUSTOMER_COOKIE, STAFF_COOKIE } from "./auth";
import { getCart, getOrCreateCart, loadCart, summariseCart } from "./cart";
import {
  getCategoryBySlug,
  getHomeCollections,
  getProductBySlug,
  getRelatedProducts,
  getVisibleCategories,
  queryProducts,
} from "./catalog";
import { checkoutSchema, loginSchema, registerSchema, productSchema } from "../src/lib/validations";
import { rateLimit } from "../src/lib/rate-limit";
import { slugify } from "../src/lib/utils";
import { productImageUpload, UPLOAD_DIR } from "./upload";
import { createStripeCheckoutSession, getStripe, markOrderPaidFromSession, stripeEnabled } from "./stripe";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const isProd = process.env.NODE_ENV === "production";
const orderCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const adminGetMemo = new Map<string, { at: number; body: unknown }>();
const ADMIN_GET_TTL = 12_000;

function readAdminMemo<T>(key: string): T | undefined {
  const hit = adminGetMemo.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > ADMIN_GET_TTL) {
    adminGetMemo.delete(key);
    return undefined;
  }
  return hit.body as T;
}

function writeAdminMemo<T>(key: string, body: T): T {
  adminGetMemo.set(key, { at: Date.now(), body });
  return body;
}

function jsonValue<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

async function sendCached<T>(res: express.Response, key: string, load: () => Promise<T>) {
  const cached = readAdminMemo<T>(key);
  if (cached !== undefined) {
    res.json(cached);
    return;
  }
  res.json(writeAdminMemo(key, await load()));
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function uniqueProductSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "product";
  let slug = root;
  let n = 2;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${root}-${n++}`;
  }
}

const productAdminInclude = {
  category: true,
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: true,
} satisfies Prisma.ProductInclude;

function isProductUploadUrl(url: string) {
  return /^\/uploads\/products\/[A-Za-z0-9._-]+$/.test(url);
}

function parseVariants(body: unknown, productSku: string) {
  const list = Array.isArray(body) ? body : [];
  return list
    .map((item, index) => {
      const row = item as { name?: string; sku?: string; stock?: number };
      const name = String(row.name ?? "").trim();
      if (!name) return null;
      const sku = String(row.sku ?? `${productSku}-${index + 1}`)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "-")
        .slice(0, 40);
      return { name: name.slice(0, 80), sku, stock: Math.max(0, Number(row.stock) || 0) };
    })
    .filter((row): row is { name: string; sku: string; stock: number } => Boolean(row));
}

app.use(cors({ origin: true, credentials: true }));
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    res.status(501).json({ error: "Stripe webhook is not configured." });
    return;
  }
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).json({ error: "Missing Stripe signature." });
    return;
  }
  try {
    const event = getStripe().webhooks.constructEvent(req.body, signature, secret);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await markOrderPaidFromSession(event.data.object);
    }
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid webhook." });
  }
});
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/uploads/products", express.static(UPLOAD_DIR));
app.use("/api/uploads/products", express.static(UPLOAD_DIR));
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));
app.use("/api/uploads", express.static(path.join(process.cwd(), "public", "uploads")));
app.use((req, res, next) => {
  if (req.method !== "GET" && req.path.startsWith("/api/admin") && !req.path.startsWith("/api/admin/auth")) {
    res.on("finish", () => {
      if (res.statusCode < 400) adminGetMemo.clear();
    });
  }
  next();
});

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    res.status(503).json({
      ok: false,
      database: "disconnected",
      error: error instanceof Error ? error.message : "Database unavailable",
    });
  }
});

async function settings() {
  return (
    (await prisma.siteSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.siteSettings.create({ data: { id: "default" } }))
  );
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 14,
  };
}

function publicCache(res: express.Response, seconds = 45) {
  res.set("Cache-Control", `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 6}`);
}

function setAuthCookie(res: express.Response, user: { id: string; email: string; name: string; role: "CUSTOMER" | "ADMIN" }) {
  res.cookie(CUSTOMER_COOKIE, signUser(user), cookieOptions());
}

function setStaffCookie(res: express.Response, user: { id: string; email: string; name: string; role: "CUSTOMER" | "ADMIN" }) {
  res.cookie(STAFF_COOKIE, signUser(user), cookieOptions());
}

app.get("/api/bootstrap", async (req, res) => {
  try {
    const [site, categories, cart] = await Promise.all([
      settings(),
      getVisibleCategories(),
      getCart(req),
    ]);
    const summary = summariseCart(cart);
    res.set("Cache-Control", "private, no-store");
    res.json({
      settings: site,
      categories,
      user: readUser(req),
      cart: { count: summary.count, subtotal: summary.subtotal },
    });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Shop unavailable." });
  }
});

app.get("/api/home", async (_req, res) => {
  try {
    const [site, categories, collections, content] = await Promise.all([
      settings(),
      getVisibleCategories(),
      getHomeCollections(),
      prisma.siteContent.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    ]);
    publicCache(res);
    res.json({ settings: site, categories, collections, content });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Catalogue unavailable." });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const q = String(req.query.q ?? "");
    const result = await queryProducts({
      q: q || undefined,
      categorySlug: String(req.query.category ?? "") || undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) * 100 : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) * 100 : undefined,
      inStock: String(req.query.availability ?? "").split(",").includes("in") || req.query.inStock === "1",
      outOfStock: String(req.query.availability ?? "").split(",").includes("out"),
      clearance: req.query.clearance === "1",
      sort: String(req.query.sort ?? "newest"),
      page: Number(req.query.page ?? 1),
    });
    publicCache(res, 30);
    res.json(result);
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Catalogue unavailable." });
  }
});

app.get("/api/categories/:slug", async (req, res) => {
  try {
    const category = await getCategoryBySlug(param(req.params.slug));
    if (!category) {
      res.status(404).json({ error: "Category not found." });
      return;
    }
    publicCache(res);
    res.json(category);
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Category unavailable." });
  }
});

app.get("/api/products/:slug", async (req, res) => {
  try {
    const product = await getProductBySlug(param(req.params.slug));
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    const related = await getRelatedProducts(product.id, product.categoryId);
    publicCache(res, 60);
    res.json({ product, related });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Product unavailable." });
  }
});

app.get("/api/cart", async (req, res) => {
  const cart = await getCart(req);
  res.json(summariseCart(cart));
});

app.post("/api/cart", async (req, res) => {
  const { productId, quantity = 1, variantId } = req.body as {
    productId: string;
    quantity?: number;
    variantId?: string;
  };
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true, deletedAt: null },
    include: { variants: true },
  });
  if (!product) {
    res.status(400).json({ error: "This product is no longer available." });
    return;
  }
  const variant = variantId ? product.variants.find((item) => item.id === variantId) : undefined;
  const available = variant ? variant.stock : product.stockQuantity;
  if (available < 1) {
    res.status(400).json({ error: "This item is currently out of stock." });
    return;
  }
  const cart = await getOrCreateCart(req, res);
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId ?? null },
  });
  const nextQty = Math.min(available, (existing?.quantity ?? 0) + Number(quantity));
  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId, quantity: Math.min(available, Number(quantity)) },
    });
  }
  res.json(summariseCart(await loadCart(cart.id)));
});

app.patch("/api/cart/:id", async (req, res) => {
  const cart = await getOrCreateCart(req, res);
  const quantity = Number(req.body.quantity);
  const item = await prisma.cartItem.findFirst({
    where: { id: param(req.params.id), cartId: cart.id },
    include: { product: true, variant: true },
  });
  if (!item) {
    res.status(404).json({ error: "Item not found." });
    return;
  }
  if (quantity < 1) await prisma.cartItem.delete({ where: { id: item.id } });
  else {
    const max = item.variant?.stock ?? item.product.stockQuantity;
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(quantity, max) } });
  }
  res.json(summariseCart(await loadCart(cart.id)));
});

app.delete("/api/cart/:id", async (req, res) => {
  const cart = await getOrCreateCart(req, res);
  await prisma.cartItem.deleteMany({ where: { id: param(req.params.id), cartId: cart.id } });
  res.json(summariseCart(await loadCart(cart.id)));
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid details." });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`register:${email}`, 5).ok) {
    res.status(429).json({ error: "Too many attempts. Please try again later." });
    return;
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    res.status(400).json({ error: "An account with this email already exists." });
    return;
  }
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: "CUSTOMER",
    },
  });
  setAuthCookie(res, { id: user.id, email: user.email, name: user.name, role: user.role });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Incorrect email or password." });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`login:${email}`).ok) {
    res.status(429).json({ error: "Too many attempts." });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "CUSTOMER" || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(400).json({ error: "Incorrect email or password." });
    return;
  }
  setAuthCookie(res, { id: user.id, email: user.email, name: user.name, role: user.role });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(CUSTOMER_COOKIE, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  res.json(readUser(req));
});

app.post("/api/admin/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Incorrect email or password." });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`staff-login:${email}`).ok) {
    res.status(429).json({ error: "Too many attempts." });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "ADMIN" || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(400).json({ error: "Incorrect email or password." });
    return;
  }
  setStaffCookie(res, { id: user.id, email: user.email, name: user.name, role: user.role });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

app.post("/api/admin/auth/logout", (_req, res) => {
  res.clearCookie(STAFF_COOKIE, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/admin/auth/me", (req, res) => {
  res.json(readStaff(req));
});

app.get("/api/payments/config", (_req, res) => {
  res.json({ card: stripeEnabled() });
});

app.get("/api/checkout/confirm", async (req, res) => {
  const sessionId = String(req.query.session_id ?? "");
  if (!sessionId.startsWith("cs_")) {
    res.status(400).json({ error: "Missing payment session." });
    return;
  }
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const paid = await markOrderPaidFromSession(session);
    const orderNumber = paid?.orderNumber || session.metadata?.orderNumber || session.client_reference_id;
    const existing = orderNumber ? await prisma.order.findUnique({ where: { orderNumber } }) : null;
    res.json({
      orderNumber: existing?.orderNumber ?? orderNumber,
      paymentStatus: existing?.paymentStatus ?? "PENDING",
      paymentMethod: existing?.paymentMethod ?? "CARD",
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not confirm payment." });
  }
});

app.post("/api/checkout", async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Please check your details." });
    return;
  }
  if (parsed.data.paymentMethod === "CARD" && !stripeEnabled()) {
    res.status(400).json({ error: "Card payments are not configured." });
    return;
  }
  const cart = await getCart(req);
  if (!cart || cart.items.length === 0) {
    res.status(400).json({ error: "Your basket is empty." });
    return;
  }
  const site = await settings();
  const summary = summariseCart(cart);
  let discount = 0;
  const code = parsed.data.promoCode?.trim().toUpperCase();
  if (code) {
    const promo = await prisma.promotion.findFirst({ where: { code, isActive: true } });
    const now = new Date();
    if (promo && summary.subtotal >= promo.minOrder && (!promo.startsAt || promo.startsAt <= now) && (!promo.endsAt || promo.endsAt >= now)) {
      discount = promo.type === "PERCENTAGE" ? Math.round(summary.subtotal * (promo.value / 100)) : promo.value;
    }
  }
  const deliveryFee =
    parsed.data.deliveryMethod === "Collection"
      ? 0
      : parsed.data.deliveryMethod === "Express"
        ? site.expressDeliveryFee
        : summary.subtotal >= site.freeDeliveryThreshold
          ? 0
          : site.standardDeliveryFee;
  const user = readUser(req);
  const payByCard = parsed.data.paymentMethod === "CARD";
  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber: `MJ-${orderCode()}`,
        userId: user?.id,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        fullName: parsed.data.fullName,
        paymentMethod: parsed.data.paymentMethod,
        paymentStatus: payByCard ? "PENDING" : "UNPAID",
        status: "PENDING",
        subtotal: summary.subtotal,
        discount,
        deliveryFee,
        total: Math.max(0, summary.subtotal + deliveryFee - discount),
        deliveryMethod: parsed.data.deliveryMethod,
        notes: parsed.data.notes ?? "",
        promoCode: code || null,
        shippingSnapshot: JSON.stringify(parsed.data),
        items: {
          create: summary.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.product.name,
            sku: item.variant?.sku ?? item.product.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.lineTotal,
            image: item.product.images[0]?.url,
          })),
        },
      },
    });
    for (const item of cart.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }
    if (!payByCard) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return order;
  });

  if (payByCard) {
    try {
      const session = await createStripeCheckoutSession({
        orderId: created.id,
        orderNumber: created.orderNumber,
        email: created.email,
        total: created.total,
        deliveryFee: created.deliveryFee,
        discount: created.discount,
        lines: summary.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unitAmount: item.unitPrice,
          image: item.product.images[0]?.url,
        })),
      });
      await prisma.order.update({
        where: { id: created.id },
        data: { stripePaymentId: session.id },
      });
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      res.clearCookie("mojiano_sid");
      res.json({ ok: true, orderNumber: created.orderNumber, total: created.total, checkoutUrl: session.url });
      return;
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: created.id }, include: { items: true } });
        if (!order) return;
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { increment: item.quantity } },
            });
          }
        }
        await tx.order.delete({ where: { id: created.id } });
      });
      res.status(500).json({ error: error instanceof Error ? error.message : "Could not start card payment." });
      return;
    }
  }

  res.clearCookie("mojiano_sid");
  res.json({ ok: true, orderNumber: created.orderNumber, total: created.total });
});

app.get("/api/account/orders", requireUser, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

app.get("/api/account/orders/:orderNumber", requireUser, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { orderNumber: param(req.params.orderNumber), userId: req.user!.id },
    include: { items: true },
  });
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json(order);
});

app.get("/api/account/wishlist", requireUser, async (req, res) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.user!.id },
    include: { product: { include: { category: true, images: { take: 2, orderBy: { sortOrder: "asc" } } } } },
  });
  res.json(items.map((item) => item.product));
});

app.post("/api/account/wishlist/:productId", requireUser, async (req, res) => {
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: req.user!.id, productId: param(req.params.productId) } },
  });
  if (existing) await prisma.wishlistItem.delete({ where: { id: existing.id } });
  else await prisma.wishlistItem.create({ data: { userId: req.user!.id, productId: param(req.params.productId) } });
  res.json({ saved: !existing });
});

app.get("/api/admin/overview", requireAdmin, async (_req, res) => {
  const cached = readAdminMemo("overview");
  if (cached !== undefined) {
    res.json(cached);
    return;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [orderRows, productRows, customerCount, recent, lowStock] = await Promise.all([
    prisma.$queryRaw<
      {
        orderCount: number;
        revenue: number;
        monthRevenue: number;
        awaitingPayment: number;
        awaitingCount: number;
        openOrders: number;
        pipeline: unknown;
        pulse: unknown;
      }[]
    >`
      SELECT
        COUNT(*)::int AS "orderCount",
        COALESCE(SUM(total) FILTER (WHERE status NOT IN ('CANCELLED', 'REFUNDED') AND "paymentStatus" <> 'FAILED'), 0)::int AS revenue,
        COALESCE(SUM(total) FILTER (WHERE status NOT IN ('CANCELLED', 'REFUNDED') AND "paymentStatus" <> 'FAILED' AND "createdAt" >= ${monthStart}), 0)::int AS "monthRevenue",
        COALESCE(SUM(total) FILTER (WHERE "paymentStatus" IN ('UNPAID', 'PENDING') AND status NOT IN ('CANCELLED', 'REFUNDED')), 0)::int AS "awaitingPayment",
        COUNT(*) FILTER (WHERE "paymentStatus" IN ('UNPAID', 'PENDING') AND status NOT IN ('CANCELLED', 'REFUNDED'))::int AS "awaitingCount",
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'CONFIRMED', 'PROCESSING'))::int AS "openOrders",
        (SELECT COALESCE(json_object_agg(status, cnt), '{}'::json) FROM (
          SELECT status::text AS status, COUNT(*)::int AS cnt FROM "Order" GROUP BY status
        ) grouped) AS pipeline,
        (SELECT COALESCE(json_agg(json_build_object('day', day, 'orders', orders, 'revenue', revenue)), '[]'::json) FROM (
          SELECT (("createdAt" AT TIME ZONE 'Europe/London')::date) AS day,
                 COUNT(*)::int AS orders,
                 COALESCE(SUM(total), 0)::int AS revenue
          FROM "Order"
          WHERE "createdAt" >= ${weekStart}
          GROUP BY 1
        ) days) AS pulse
      FROM "Order"
    `,
    prisma.$queryRaw<
      {
        productCount: number;
        activeProducts: number;
        lowStockCount: number;
        outOfStockCount: number;
        featured: number;
        clearance: number;
        newArrivals: number;
        bestSellers: number;
      }[]
    >`
      SELECT
        COUNT(*)::int AS "productCount",
        COUNT(*) FILTER (WHERE "isActive")::int AS "activeProducts",
        COUNT(*) FILTER (WHERE "isActive" AND "stockQuantity" > 0 AND "stockQuantity" <= 5)::int AS "lowStockCount",
        COUNT(*) FILTER (WHERE "isActive" AND "stockQuantity" <= 0)::int AS "outOfStockCount",
        COUNT(*) FILTER (WHERE "isActive" AND featured)::int AS featured,
        COUNT(*) FILTER (WHERE "isActive" AND clearance)::int AS clearance,
        COUNT(*) FILTER (WHERE "isActive" AND "newArrival")::int AS "newArrivals",
        COUNT(*) FILTER (WHERE "isActive" AND "bestSeller")::int AS "bestSellers"
      FROM "Product"
      WHERE "deletedAt" IS NULL
    `,
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        fullName: true,
        email: true,
        total: true,
        status: true,
        paymentStatus: true,
        deliveryMethod: true,
        createdAt: true,
        items: { select: { quantity: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null, stockQuantity: { lte: 5 } },
      orderBy: { stockQuantity: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        slug: true,
        category: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
  ]);

  const orderStats = orderRows[0] ?? {
    orderCount: 0,
    revenue: 0,
    monthRevenue: 0,
    awaitingPayment: 0,
    awaitingCount: 0,
    openOrders: 0,
    pipeline: {},
    pulse: [],
  };
  const productStats = productRows[0] ?? {
    productCount: 0,
    activeProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    featured: 0,
    clearance: 0,
    newArrivals: 0,
    bestSellers: 0,
  };
  const pulseRows = jsonValue<{ day: string; orders: number; revenue: number }[]>(orderStats.pulse, []);
  const pulseMap = new Map(
    pulseRows.map((row) => [String(row.day).slice(0, 10), { orders: Number(row.orders) || 0, revenue: Number(row.revenue) || 0 }]),
  );
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const bucket = pulseMap.get(key) ?? { orders: 0, revenue: 0 };
    return {
      label: day.toLocaleDateString("en-GB", { weekday: "short" }),
      orders: bucket.orders,
      revenue: bucket.revenue,
    };
  });

  const pipeline = jsonValue<Record<string, number>>(orderStats.pipeline, {});
  const liveTotal = Number(orderStats.revenue) || 0;
  const orderCount = Number(orderStats.orderCount) || 0;

  res.json(
    writeAdminMemo("overview", {
      kpis: {
        orderCount,
        revenue: liveTotal,
        monthRevenue: Number(orderStats.monthRevenue) || 0,
        averageOrder: orderCount ? Math.round(liveTotal / orderCount) : 0,
        awaitingPayment: Number(orderStats.awaitingPayment) || 0,
        awaitingCount: Number(orderStats.awaitingCount) || 0,
        openOrders: Number(orderStats.openOrders) || 0,
        productCount: Number(productStats.productCount) || 0,
        activeProducts: Number(productStats.activeProducts) || 0,
        lowStockCount: Number(productStats.lowStockCount) || 0,
        outOfStockCount: Number(productStats.outOfStockCount) || 0,
        customerCount,
      },
      merchandising: {
        featured: Number(productStats.featured) || 0,
        clearance: Number(productStats.clearance) || 0,
        newArrivals: Number(productStats.newArrivals) || 0,
        bestSellers: Number(productStats.bestSellers) || 0,
      },
      pipeline,
      payments: {},
      delivery: {},
      pulse: days,
      recent: recent.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        fullName: order.fullName,
        email: order.email,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryMethod: order.deliveryMethod,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.createdAt,
      })),
      lowStock,
      categories: [],
    }),
  );
});

app.get("/api/admin/products", requireAdmin, async (req, res) => {
  const q = String(req.query.q ?? "");
  await sendCached(res, `products:${q}`, () =>
    prisma.product.findMany({
      where: q
        ? { deletedAt: null, OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }
        : { deletedAt: null },
      include: {
        category: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 120,
    }),
  );
});

app.get("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: param(req.params.id), deletedAt: null },
    include: productAdminInclude,
  });
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json(product);
});

app.post("/api/admin/uploads", requireAdmin, (req, res, next) => {
  productImageUpload.single("file")(req, res, (error) => {
    if (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Could not upload that image." });
      return;
    }
    next();
  });
}, (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Choose an image to upload." });
    return;
  }
  res.json({ url: `/uploads/products/${file.filename}`, alt: file.originalname });
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Please check the product details." });
    return;
  }
  const data = parsed.data;
  const sku = data.sku.toUpperCase();
  if (await prisma.product.findUnique({ where: { sku } })) {
    res.status(400).json({ error: "That SKU is already in use." });
    return;
  }
  const category = await prisma.category.findFirst({ where: { id: data.categoryId, deletedAt: null } });
  if (!category) {
    res.status(400).json({ error: "Choose a category for this product." });
    return;
  }
  const images = Array.isArray(req.body.images) ? req.body.images as { url?: string; alt?: string }[] : [];
  const primaryIndex = Math.max(0, Number(req.body.primaryIndex ?? 0));
  const ordered = images
    .filter((image) => typeof image.url === "string" && isProductUploadUrl(image.url))
    .map((image) => ({ url: String(image.url), alt: String(image.alt ?? data.name) }));
  if (primaryIndex > 0 && primaryIndex < ordered.length) {
    const [main] = ordered.splice(primaryIndex, 1);
    ordered.unshift(main);
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug: await uniqueProductSlug(data.name),
      sku,
      description: data.description ?? "",
      shortDescription: data.shortDescription ?? "",
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      salePrice: data.salePrice ?? null,
      stockQuantity: data.stockQuantity,
      categoryId: data.categoryId,
      brand: data.brand || null,
      featured: Boolean(data.featured),
      clearance: Boolean(data.clearance),
      bestSeller: Boolean(data.bestSeller),
      newArrival: Boolean(data.newArrival),
      isActive: data.isActive !== false,
      weightGrams: data.weightGrams ?? null,
      images: {
        create: ordered.map((image, index) => ({
          url: image.url,
          alt: image.alt,
          sortOrder: index,
        })),
      },
      variants: {
        create: parseVariants(req.body.variants, sku),
      },
    },
    include: productAdminInclude,
  });
  res.json(product);
});

app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const existing = await prisma.product.findFirst({ where: { id: param(req.params.id), deletedAt: null } });
  if (!existing) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Please check the product details." });
    return;
  }
  const data = parsed.data;
  if (data.sku) {
    const sku = data.sku.toUpperCase();
    const clash = await prisma.product.findFirst({ where: { sku, id: { not: existing.id } } });
    if (clash) {
      res.status(400).json({ error: "That SKU is already in use." });
      return;
    }
    data.sku = sku;
  }
  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, deletedAt: null } });
    if (!category) {
      res.status(400).json({ error: "Choose a category for this product." });
      return;
    }
  }
  const skuForVariants = (data.sku ?? existing.sku).toUpperCase();
  if (Array.isArray(req.body.variants)) {
    const variants = parseVariants(req.body.variants, skuForVariants);
    await prisma.productVariant.deleteMany({ where: { productId: existing.id } });
    if (variants.length) {
      await prisma.productVariant.createMany({ data: variants.map((variant) => ({ ...variant, productId: existing.id })) });
    }
  }
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      slug: data.name ? await uniqueProductSlug(data.name, existing.id) : undefined,
      sku: data.sku,
      description: data.description,
      shortDescription: data.shortDescription,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      salePrice: data.salePrice,
      stockQuantity: data.stockQuantity,
      categoryId: data.categoryId,
      brand: data.brand,
      featured: data.featured,
      clearance: data.clearance,
      newArrival: data.newArrival,
      bestSeller: data.bestSeller,
      isActive: data.isActive,
      weightGrams: data.weightGrams,
    },
    include: productAdminInclude,
  });
  res.json(product);
});

app.post("/api/admin/products/:id/images", requireAdmin, async (req, res) => {
  const product = await prisma.product.findFirst({ where: { id: param(req.params.id), deletedAt: null } });
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  const url = String(req.body.url ?? "");
  if (!isProductUploadUrl(url)) {
    res.status(400).json({ error: "Upload an image first." });
    return;
  }
  const last = await prisma.productImage.aggregate({ where: { productId: product.id }, _max: { sortOrder: true } });
  const image = await prisma.productImage.create({
    data: {
      productId: product.id,
      url,
      alt: String(req.body.alt ?? product.name),
      sortOrder: (last._max.sortOrder ?? -1) + 1,
    },
  });
  res.json(image);
});

app.patch("/api/admin/products/:id/images/:imageId", requireAdmin, async (req, res) => {
  const image = await prisma.productImage.findFirst({
    where: { id: param(req.params.imageId), productId: param(req.params.id) },
  });
  if (!image) {
    res.status(404).json({ error: "Image not found." });
    return;
  }
  if (req.body.primary) {
    const siblings = await prisma.productImage.findMany({
      where: { productId: image.productId },
      orderBy: { sortOrder: "asc" },
    });
    const rest = siblings.filter((item) => item.id !== image.id);
    await prisma.$transaction([
      prisma.productImage.update({ where: { id: image.id }, data: { sortOrder: 0 } }),
      ...rest.map((item, index) =>
        prisma.productImage.update({ where: { id: item.id }, data: { sortOrder: index + 1 } }),
      ),
    ]);
  }
  const product = await prisma.product.findUnique({ where: { id: image.productId }, include: productAdminInclude });
  res.json(product);
});

app.delete("/api/admin/products/:id/images/:imageId", requireAdmin, async (req, res) => {
  const image = await prisma.productImage.findFirst({
    where: { id: param(req.params.imageId), productId: param(req.params.id) },
  });
  if (!image) {
    res.status(404).json({ error: "Image not found." });
    return;
  }
  await prisma.productImage.delete({ where: { id: image.id } });
  const remaining = await prisma.productImage.findMany({
    where: { productId: image.productId },
    orderBy: { sortOrder: "asc" },
  });
  await prisma.$transaction(
    remaining.map((item, index) => prisma.productImage.update({ where: { id: item.id }, data: { sortOrder: index } })),
  );
  const product = await prisma.product.findUnique({ where: { id: image.productId }, include: productAdminInclude });
  res.json(product);
});

app.get("/api/admin/categories", requireAdmin, async (_req, res) => {
  await sendCached(res, "categories", () =>
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        parent: true,
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    }),
  );
});

app.post("/api/admin/categories", requireAdmin, async (req, res) => {
  const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const category = await prisma.category.create({
    data: {
      name: req.body.name,
      slug: slugify(req.body.name),
      description: req.body.description ?? "",
      image: req.body.image || null,
      parentId: req.body.parentId || null,
      isVisible: req.body.isVisible !== false,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
    },
  });
  res.json(category);
});

app.patch("/api/admin/categories/:id", requireAdmin, async (req, res) => {
  const category = await prisma.category.update({
    where: { id: param(req.params.id) },
    data: {
      name: req.body.name,
      description: req.body.description,
      image: req.body.image,
      isVisible: req.body.isVisible,
    },
  });
  res.json(category);
});

app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
  await sendCached(res, "orders", () =>
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        items: { select: { id: true, name: true, sku: true, quantity: true, unitPrice: true, image: true } },
      },
    }),
  );
});

app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  const payments = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"];
  const fulfilment = ["UNFULFILLED", "PARTIAL", "FULFILLED"];
  const data: Prisma.OrderUpdateInput = {};
  if (req.body.status) {
    if (!statuses.includes(req.body.status)) {
      res.status(400).json({ error: "Invalid status." });
      return;
    }
    data.status = req.body.status;
  }
  if (req.body.paymentStatus) {
    if (!payments.includes(req.body.paymentStatus)) {
      res.status(400).json({ error: "Invalid payment status." });
      return;
    }
    data.paymentStatus = req.body.paymentStatus;
  }
  if (req.body.fulfilmentStatus) {
    if (!fulfilment.includes(req.body.fulfilmentStatus)) {
      res.status(400).json({ error: "Invalid fulfilment status." });
      return;
    }
    data.fulfilmentStatus = req.body.fulfilmentStatus;
  }
  res.json(await prisma.order.update({ where: { id: param(req.params.id) }, data }));
});

app.get("/api/admin/customers", requireAdmin, async (_req, res) => {
  await sendCached(res, "customers", () =>
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: { orderBy: { createdAt: "desc" }, take: 1, select: { total: true, createdAt: true } },
      },
    }),
  );
});

app.get("/api/admin/promotions", requireAdmin, async (_req, res) => {
  await sendCached(res, "promotions", () => prisma.promotion.findMany({ orderBy: { createdAt: "desc" }, take: 80 }));
});

app.get("/api/admin/reviews", requireAdmin, async (_req, res) => {
  await sendCached(res, "reviews", () =>
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
  );
});

app.patch("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
  res.json(
    await prisma.review.update({
      where: { id: param(req.params.id) },
      data: { approved: Boolean(req.body.approved) },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
  );
});

app.get("/api/admin/returns", requireAdmin, async (_req, res) => {
  await sendCached(res, "returns", () =>
    prisma.returnRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        order: { select: { orderNumber: true } },
        user: { select: { name: true } },
      },
    }),
  );
});

app.patch("/api/admin/returns/:id", requireAdmin, async (req, res) => {
  const allowed = ["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED"];
  if (!allowed.includes(String(req.body.status))) {
    res.status(400).json({ error: "Invalid return status." });
    return;
  }
  res.json(
    await prisma.returnRequest.update({
      where: { id: param(req.params.id) },
      data: { status: req.body.status },
      include: {
        order: { select: { orderNumber: true } },
        user: { select: { name: true } },
      },
    }),
  );
});

app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
  await sendCached(res, "settings", () => settings());
});

app.put("/api/admin/settings", requireAdmin, async (req, res) => {
  const site = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: req.body,
    create: { id: "default", ...req.body },
  });
  res.json(site);
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: err instanceof Error ? err.message : "Server error." });
});

if (isProd && !process.env.VERCEL) {
  const dist = path.join(process.cwd(), "dist");
  app.use(express.static(dist));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

export { app };

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Mojiano API on http://localhost:${PORT}`);
  });
}
