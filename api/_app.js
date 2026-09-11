// server/index.ts
import "dotenv/config";
import path2 from "path";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import bcrypt from "bcryptjs";
import { customAlphabet as customAlphabet2 } from "nanoid";

// server/db.ts
import { PrismaClient } from "@prisma/client";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
var globalForPrisma = globalThis;
function datasourceUrl() {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(raw);
    const serverless = Boolean(process.env.VERCEL);
    if (serverless && url.port === "6543") {
      url.port = "5432";
      url.searchParams.delete("pgbouncer");
    }
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", serverless ? "1" : "10");
    }
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "8");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "8");
    if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
    return url.toString();
  } catch {
    return raw;
  }
}
function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: datasourceUrl() } }
  });
}
var prisma = globalForPrisma.prisma ?? new Proxy({}, {
  get(_target, prop, receiver) {
    if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
    const value = Reflect.get(globalForPrisma.prisma, prop, receiver);
    return typeof value === "function" ? value.bind(globalForPrisma.prisma) : value;
  }
});

// server/auth.ts
import jwt from "jsonwebtoken";
var SECRET = process.env.AUTH_SECRET ?? "dev-only-change-me";
var CUSTOMER_COOKIE = "mojiano_token";
var STAFF_COOKIE = "mojiano_staff";
function signUser(user) {
  return jwt.sign(user, SECRET, { expiresIn: "14d" });
}
function readCookie(req, name) {
  const token = req.cookies?.[name];
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
function readUser(req) {
  const user = readCookie(req, CUSTOMER_COOKIE);
  if (!user || user.role !== "CUSTOMER") return null;
  return user;
}
function readStaff(req) {
  const user = readCookie(req, STAFF_COOKIE);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
function requireUser(req, res, next) {
  const user = readUser(req);
  if (!user) {
    res.status(401).json({ error: "Please sign in." });
    return;
  }
  req.user = user;
  next();
}
function requireAdmin(req, res, next) {
  const staff = readStaff(req);
  if (!staff) {
    res.status(401).json({ error: "Staff sign-in required." });
    return;
  }
  req.user = staff;
  next();
}

// src/lib/money.ts
function effectivePrice(product) {
  if (product.salePrice && product.salePrice > 0 && product.salePrice < product.price) {
    return product.salePrice;
  }
  return product.price;
}

// server/cart.ts
var CART_COOKIE = "mojiano_sid";
var cartInclude = {
  items: {
    include: {
      product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
      variant: true
    },
    orderBy: { createdAt: "asc" }
  }
};
function ensureCartCookie(req, res) {
  let sessionId = req.cookies?.[CART_COOKIE];
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    res.cookie(CART_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 1e3 * 60 * 60 * 24 * 30
    });
    req.cookies = { ...req.cookies ?? {}, [CART_COOKIE]: sessionId };
  }
  return sessionId;
}
async function loadCart(id2) {
  return prisma.cart.findUnique({ where: { id: id2 }, include: cartInclude });
}
async function getCart(req) {
  const user = readUser(req);
  const sessionId = req.cookies?.[CART_COOKIE];
  return prisma.cart.findFirst({
    where: user ? { OR: [{ userId: user.id }, { sessionId: sessionId ?? "" }] } : { sessionId: sessionId ?? "" },
    include: cartInclude
  });
}
async function getOrCreateCart(req, res) {
  const user = readUser(req);
  const existing = await getCart(req);
  if (existing) {
    if (user && !existing.userId) {
      return prisma.cart.update({
        where: { id: existing.id },
        data: { userId: user.id },
        include: cartInclude
      });
    }
    return existing;
  }
  const sessionId = user ? null : ensureCartCookie(req, res);
  return prisma.cart.create({
    data: { userId: user?.id, sessionId },
    include: cartInclude
  });
}
function summariseCart(cart) {
  const items = cart?.items.map((item) => {
    const unit = item.variant?.price ?? effectivePrice(item.product);
    return { ...item, unitPrice: unit, lineTotal: unit * item.quantity };
  }) ?? [];
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, subtotal, count, total: subtotal };
}

// server/catalog.ts
function contains(q) {
  return { contains: q, mode: "insensitive" };
}
var productCardSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  price: true,
  compareAtPrice: true,
  salePrice: true,
  stockQuantity: true,
  featured: true,
  clearance: true,
  newArrival: true,
  brand: true,
  shortDescription: true,
  ratingAvg: true,
  reviewCount: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, alt: true } }
};
async function getVisibleCategories() {
  return prisma.category.findMany({
    where: { isVisible: true, deletedAt: null, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      children: {
        where: { isVisible: true, deletedAt: null },
        orderBy: { sortOrder: "asc" }
      }
    }
  });
}
async function getCategoryBySlug(slug) {
  return prisma.category.findFirst({
    where: { slug, deletedAt: null, isVisible: true },
    include: {
      children: { where: { isVisible: true, deletedAt: null }, orderBy: { sortOrder: "asc" } },
      parent: true
    }
  });
}
async function queryProducts(input) {
  const {
    q,
    categorySlug,
    minPrice,
    maxPrice,
    inStock,
    outOfStock,
    clearance,
    sort = "newest",
    page = 1,
    pageSize = 24
  } = input;
  const category = categorySlug ? await prisma.category.findFirst({
    where: { slug: categorySlug, deletedAt: null },
    include: { children: { select: { id: true } } }
  }) : null;
  const categoryIds = category ? [category.id, ...category.children.map((child) => child.id)] : void 0;
  const where = {
    isActive: true,
    deletedAt: null,
    ...categoryIds ? { categoryId: { in: categoryIds } } : {},
    ...inStock && !outOfStock ? { stockQuantity: { gt: 0 } } : {},
    ...outOfStock && !inStock ? { stockQuantity: { lte: 0 } } : {},
    ...clearance ? { clearance: true } : {},
    ...minPrice || maxPrice ? { price: { gte: minPrice || void 0, lte: maxPrice || void 0 } } : {},
    ...q ? {
      OR: [
        { name: contains(q) },
        { sku: contains(q) },
        { brand: contains(q) },
        { shortDescription: contains(q) },
        { description: contains(q) }
      ]
    } : {}
  };
  const orderBy = sort === "price-asc" ? { price: "asc" } : sort === "price-desc" ? { price: "desc" } : sort === "oldest" ? { createdAt: "asc" } : sort === "name" ? { name: "asc" } : sort === "rating" ? { ratingAvg: "desc" } : { createdAt: "desc" };
  const facetBase = {
    isActive: true,
    deletedAt: null,
    ...q ? {
      OR: [
        { name: contains(q) },
        { sku: contains(q) },
        { brand: contains(q) }
      ]
    } : {}
  };
  const [products, total, inStockCount, outOfStockCount, categoryRows] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: productCardSelect
    }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { ...facetBase, stockQuantity: { gt: 0 } } }),
    prisma.product.count({ where: { ...facetBase, stockQuantity: { lte: 0 } } }),
    prisma.category.findMany({
      where: { isVisible: true, deletedAt: null, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: {
        name: true,
        slug: true,
        _count: { select: { products: { where: { isActive: true, deletedAt: null } } } }
      }
    })
  ]);
  return {
    products,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    facets: {
      inStock: inStockCount,
      outOfStock: outOfStockCount,
      categories: categoryRows.map((row) => ({
        name: row.name,
        slug: row.slug,
        count: row._count.products
      }))
    }
  };
}
async function getProductBySlug(slug) {
  return prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true } },
      reviews: {
        where: { approved: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 8
      }
    }
  });
}
async function getRelatedProducts(productId, categoryId) {
  return prisma.product.findMany({
    where: { id: { not: productId }, categoryId, isActive: true, deletedAt: null },
    take: 4,
    select: productCardSelect
  });
}
async function getHomeCollections() {
  const select = productCardSelect;
  const [featured, clearance, newArrivals, bestSellers] = await Promise.all([
    prisma.product.findMany({ where: { featured: true, isActive: true, deletedAt: null }, take: 8, select }),
    prisma.product.findMany({ where: { clearance: true, isActive: true, deletedAt: null }, take: 8, select }),
    prisma.product.findMany({
      where: { newArrival: true, isActive: true, deletedAt: null },
      take: 8,
      orderBy: { createdAt: "desc" },
      select
    }),
    prisma.product.findMany({ where: { bestSeller: true, isActive: true, deletedAt: null }, take: 8, select })
  ]);
  return { featured, clearance, newArrivals, bestSellers };
}

// src/lib/validations.ts
import { z } from "zod";
var registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72, "Password is too long.")
});
var loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.")
});
var addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(2, "Enter the recipient name."),
  line1: z.string().trim().min(3, "Enter address line 1."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter a town or city."),
  county: z.string().trim().optional(),
  postcode: z.string().trim().min(5, "Enter a valid postcode.").max(12),
  country: z.string().trim().min(2).default("United Kingdom"),
  phone: z.string().trim().optional()
});
var checkoutSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  fullName: z.string().trim().min(2, "Enter your name."),
  phone: z.string().trim().min(8, "Enter a contact number."),
  line1: z.string().trim().min(3, "Enter address line 1."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter a town or city."),
  county: z.string().trim().optional(),
  postcode: z.string().trim().min(5, "Enter a valid postcode."),
  country: z.string().trim().default("United Kingdom"),
  deliveryMethod: z.enum(["Standard", "Express", "Collection"]),
  paymentMethod: z.enum(["CARD", "BANK_TRANSFER", "CASH_ON_DELIVERY"]),
  notes: z.string().trim().max(500).optional(),
  promoCode: z.string().trim().optional()
});
var optionalPence = z.preprocess(
  (value) => value === "" || value === void 0 ? void 0 : value,
  z.number().int().min(0).nullable().optional()
);
var productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().min(2).max(40),
  description: z.string().trim().max(8e3).optional(),
  shortDescription: z.string().trim().max(280).optional(),
  price: z.coerce.number().int().min(0),
  compareAtPrice: optionalPence,
  salePrice: optionalPence,
  stockQuantity: z.coerce.number().int().min(0),
  categoryId: z.string().min(1),
  brand: z.string().trim().max(80).optional().nullable(),
  featured: z.boolean().optional(),
  clearance: z.boolean().optional(),
  bestSeller: z.boolean().optional(),
  newArrival: z.boolean().optional(),
  isActive: z.boolean().optional(),
  weightGrams: optionalPence
});
var categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(600).optional(),
  parentId: z.string().optional().nullable(),
  isVisible: z.coerce.boolean().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(160).optional()
});

// src/lib/rate-limit.ts
var WINDOW_MS = 15 * 60 * 1e3;
var MAX_ATTEMPTS = 8;
var attempts = /* @__PURE__ */ new Map();
function rateLimit(key, max = MAX_ATTEMPTS, windowMs = WINDOW_MS) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= max) {
    return { ok: false, remaining: 0 };
  }
  recent.push(now);
  attempts.set(key, recent);
  return { ok: true, remaining: max - recent.length };
}

// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function slugify(value) {
  return value.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

// server/upload.ts
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { customAlphabet } from "nanoid";
var id = customAlphabet("abcdefghijkmnopqrstuvwxyz23456789", 10);
var UPLOAD_DIR = process.env.VERCEL ? path.join("/tmp", "uploads", "products") : path.join(process.cwd(), "public", "uploads", "products");
var ALLOWED = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
}
var storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${id()}${ALLOWED.has(ext) ? ext : ".jpg"}`);
  }
});
var productImageUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = ALLOWED.has(ext) && file.mimetype.startsWith("image/");
    if (!ok) {
      cb(new Error("Please upload a JPG, PNG, WEBP or GIF."));
      return;
    }
    cb(null, true);
  }
});

// server/stripe.ts
import Stripe from "stripe";
function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Card payments are not configured.");
  return new Stripe(key);
}
function storeUrl() {
  const fromEnv = process.env.SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_ENV === "production") return "https://mojiano.co.uk";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3002";
}
async function createStripeCheckoutSession(input) {
  const stripe = getStripe();
  const origin = storeUrl();
  const lineItems = input.lines.filter((line) => line.unitAmount > 0 && line.quantity > 0).map((line) => {
    const image = line.image && line.image.startsWith("http") ? line.image : void 0;
    return {
      quantity: line.quantity,
      price_data: {
        currency: "gbp",
        unit_amount: line.unitAmount,
        product_data: {
          name: line.name.slice(0, 120),
          ...image ? { images: [image] } : {}
        }
      }
    };
  });
  if (input.deliveryFee > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: input.deliveryFee,
        product_data: { name: "Delivery" }
      }
    });
  }
  if (!lineItems.length) {
    throw new Error("This order has nothing to charge.");
  }
  const sessionParams = {
    mode: "payment",
    customer_email: input.email,
    client_reference_id: input.orderNumber,
    success_url: `${origin}/checkout/confirmation/${encodeURIComponent(input.orderNumber)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=1`,
    metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
    payment_intent_data: {
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber }
    },
    line_items: input.discount > 0 ? [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: input.total,
          product_data: { name: `Mojiano order ${input.orderNumber}` }
        }
      }
    ] : lineItems
  };
  return stripe.checkout.sessions.create(sessionParams);
}
async function markOrderPaidFromSession(session) {
  const orderNumber = session.metadata?.orderNumber || session.client_reference_id;
  if (!orderNumber) return null;
  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid) return null;
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  return prisma.order.update({
    where: { orderNumber },
    data: {
      paymentStatus: "PAID",
      stripePaymentId: intent || session.id
    }
  });
}

// server/index.ts
var app = express();
app.get("/api/ready", (_req, res) => {
  res.json({ ok: true, ready: true });
});
var PORT = Number(process.env.PORT ?? 4e3);
var isProd = process.env.NODE_ENV === "production";
var orderCode = customAlphabet2("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
var adminGetMemo = /* @__PURE__ */ new Map();
var ADMIN_GET_TTL = 12e3;
function readAdminMemo(key) {
  const hit = adminGetMemo.get(key);
  if (!hit) return void 0;
  if (Date.now() - hit.at > ADMIN_GET_TTL) {
    adminGetMemo.delete(key);
    return void 0;
  }
  return hit.body;
}
function writeAdminMemo(key, body) {
  adminGetMemo.set(key, { at: Date.now(), body });
  return body;
}
function jsonValue(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}
async function sendCached(res, key, load) {
  const cached = readAdminMemo(key);
  if (cached !== void 0) {
    res.json(cached);
    return;
  }
  res.json(writeAdminMemo(key, await load()));
}
function param(value) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
async function uniqueProductSlug(base, excludeId) {
  const root = slugify(base) || "product";
  let slug = root;
  let n = 2;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${root}-${n++}`;
  }
}
var productAdminInclude = {
  category: true,
  images: { orderBy: { sortOrder: "asc" } },
  variants: true
};
function isProductUploadUrl(url) {
  return /^\/uploads\/products\/[A-Za-z0-9._-]+$/.test(url);
}
function parseVariants(body, productSku) {
  const list = Array.isArray(body) ? body : [];
  return list.map((item, index) => {
    const row = item;
    const name = String(row.name ?? "").trim();
    if (!name) return null;
    const sku = String(row.sku ?? `${productSku}-${index + 1}`).trim().toUpperCase().replace(/\s+/g, "-").slice(0, 40);
    return { name: name.slice(0, 80), sku, stock: Math.max(0, Number(row.stock) || 0) };
  }).filter((row) => Boolean(row));
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
app.use("/uploads", express.static(path2.join(process.cwd(), "public", "uploads")));
app.use("/api/uploads", express.static(path2.join(process.cwd(), "public", "uploads")));
app.use((req, res, next) => {
  if (req.method !== "GET" && req.path.startsWith("/api/admin") && !req.path.startsWith("/api/admin/auth")) {
    res.on("finish", () => {
      if (res.statusCode < 400) adminGetMemo.clear();
    });
  }
  next();
});
app.get("/api/health", async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ ok: false, database: "missing-url" });
    return;
  }
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Database timed out.")), 8e3);
      })
    ]);
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    res.status(503).json({
      ok: false,
      database: "disconnected",
      error: error instanceof Error ? error.message : "Database unavailable"
    });
  }
});
async function settings() {
  return await prisma.siteSettings.findUnique({ where: { id: "default" } }) ?? await prisma.siteSettings.create({ data: { id: "default" } });
}
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 1e3 * 60 * 60 * 24 * 14
  };
}
function publicCache(res, seconds = 45) {
  res.set("Cache-Control", `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 6}`);
}
function setAuthCookie(res, user) {
  res.cookie(CUSTOMER_COOKIE, signUser(user), cookieOptions());
}
function setStaffCookie(res, user) {
  res.cookie(STAFF_COOKIE, signUser(user), cookieOptions());
}
app.get("/api/bootstrap", async (req, res) => {
  try {
    const [site, categories, cart] = await Promise.all([
      settings(),
      getVisibleCategories(),
      getCart(req)
    ]);
    const summary = summariseCart(cart);
    res.set("Cache-Control", "private, no-store");
    res.json({
      settings: site,
      categories,
      user: readUser(req),
      cart: { count: summary.count, subtotal: summary.subtotal }
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
      prisma.siteContent.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
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
      q: q || void 0,
      categorySlug: String(req.query.category ?? "") || void 0,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) * 100 : void 0,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) * 100 : void 0,
      inStock: String(req.query.availability ?? "").split(",").includes("in") || req.query.inStock === "1",
      outOfStock: String(req.query.availability ?? "").split(",").includes("out"),
      clearance: req.query.clearance === "1",
      sort: String(req.query.sort ?? "newest"),
      page: Number(req.query.page ?? 1)
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
  const { productId, quantity = 1, variantId } = req.body;
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true, deletedAt: null },
    include: { variants: true }
  });
  if (!product) {
    res.status(400).json({ error: "This product is no longer available." });
    return;
  }
  const variant = variantId ? product.variants.find((item) => item.id === variantId) : void 0;
  const available = variant ? variant.stock : product.stockQuantity;
  if (available < 1) {
    res.status(400).json({ error: "This item is currently out of stock." });
    return;
  }
  const cart = await getOrCreateCart(req, res);
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId ?? null }
  });
  const nextQty = Math.min(available, (existing?.quantity ?? 0) + Number(quantity));
  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId, quantity: Math.min(available, Number(quantity)) }
    });
  }
  res.json(summariseCart(await loadCart(cart.id)));
});
app.patch("/api/cart/:id", async (req, res) => {
  const cart = await getOrCreateCart(req, res);
  const quantity = Number(req.body.quantity);
  const item = await prisma.cartItem.findFirst({
    where: { id: param(req.params.id), cartId: cart.id },
    include: { product: true, variant: true }
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
      role: "CUSTOMER"
    }
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
  if (!user || user.role !== "CUSTOMER" || !await bcrypt.compare(parsed.data.password, user.passwordHash)) {
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
  if (!user || user.role !== "ADMIN" || !await bcrypt.compare(parsed.data.password, user.passwordHash)) {
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
      paymentMethod: existing?.paymentMethod ?? "CARD"
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
    const now = /* @__PURE__ */ new Date();
    if (promo && summary.subtotal >= promo.minOrder && (!promo.startsAt || promo.startsAt <= now) && (!promo.endsAt || promo.endsAt >= now)) {
      discount = promo.type === "PERCENTAGE" ? Math.round(summary.subtotal * (promo.value / 100)) : promo.value;
    }
  }
  const deliveryFee = parsed.data.deliveryMethod === "Collection" ? 0 : parsed.data.deliveryMethod === "Express" ? site.expressDeliveryFee : summary.subtotal >= site.freeDeliveryThreshold ? 0 : site.standardDeliveryFee;
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
            image: item.product.images[0]?.url
          }))
        }
      }
    });
    for (const item of cart.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } }
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } }
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
          image: item.product.images[0]?.url
        }))
      });
      await prisma.order.update({
        where: { id: created.id },
        data: { stripePaymentId: session.id }
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
              data: { stock: { increment: item.quantity } }
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { increment: item.quantity } }
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
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" }
  });
  res.json(orders);
});
app.get("/api/account/orders/:orderNumber", requireUser, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { orderNumber: param(req.params.orderNumber), userId: req.user.id },
    include: { items: true }
  });
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json(order);
});
app.get("/api/account/wishlist", requireUser, async (req, res) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.user.id },
    include: { product: { include: { category: true, images: { take: 2, orderBy: { sortOrder: "asc" } } } } }
  });
  res.json(items.map((item) => item.product));
});
app.post("/api/account/wishlist/:productId", requireUser, async (req, res) => {
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: req.user.id, productId: param(req.params.productId) } }
  });
  if (existing) await prisma.wishlistItem.delete({ where: { id: existing.id } });
  else await prisma.wishlistItem.create({ data: { userId: req.user.id, productId: param(req.params.productId) } });
  res.json({ saved: !existing });
});
app.get("/api/admin/overview", requireAdmin, async (_req, res) => {
  const cached = readAdminMemo("overview");
  if (cached !== void 0) {
    res.json(cached);
    return;
  }
  const now = /* @__PURE__ */ new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
  const [orderRows, productRows, customerCount, recent, lowStock] = await Promise.all([
    prisma.$queryRaw`
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
    prisma.$queryRaw`
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
        items: { select: { quantity: true } }
      }
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
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } }
      }
    })
  ]);
  const orderStats = orderRows[0] ?? {
    orderCount: 0,
    revenue: 0,
    monthRevenue: 0,
    awaitingPayment: 0,
    awaitingCount: 0,
    openOrders: 0,
    pipeline: {},
    pulse: []
  };
  const productStats = productRows[0] ?? {
    productCount: 0,
    activeProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    featured: 0,
    clearance: 0,
    newArrivals: 0,
    bestSellers: 0
  };
  const pulseRows = jsonValue(orderStats.pulse, []);
  const pulseMap = new Map(
    pulseRows.map((row) => [String(row.day).slice(0, 10), { orders: Number(row.orders) || 0, revenue: Number(row.revenue) || 0 }])
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
      revenue: bucket.revenue
    };
  });
  const pipeline = jsonValue(orderStats.pipeline, {});
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
        customerCount
      },
      merchandising: {
        featured: Number(productStats.featured) || 0,
        clearance: Number(productStats.clearance) || 0,
        newArrivals: Number(productStats.newArrivals) || 0,
        bestSellers: Number(productStats.bestSellers) || 0
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
        createdAt: order.createdAt
      })),
      lowStock,
      categories: []
    })
  );
});
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  const q = String(req.query.q ?? "");
  await sendCached(
    res,
    `products:${q}`,
    () => prisma.product.findMany({
      where: q ? { deletedAt: null, OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : { deletedAt: null },
      include: {
        category: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 120
    })
  );
});
app.get("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: param(req.params.id), deletedAt: null },
    include: productAdminInclude
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
  const images = Array.isArray(req.body.images) ? req.body.images : [];
  const primaryIndex = Math.max(0, Number(req.body.primaryIndex ?? 0));
  const ordered = images.filter((image) => typeof image.url === "string" && isProductUploadUrl(image.url)).map((image) => ({ url: String(image.url), alt: String(image.alt ?? data.name) }));
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
          sortOrder: index
        }))
      },
      variants: {
        create: parseVariants(req.body.variants, sku)
      }
    },
    include: productAdminInclude
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
      slug: data.name ? await uniqueProductSlug(data.name, existing.id) : void 0,
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
      weightGrams: data.weightGrams
    },
    include: productAdminInclude
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
      sortOrder: (last._max.sortOrder ?? -1) + 1
    }
  });
  res.json(image);
});
app.patch("/api/admin/products/:id/images/:imageId", requireAdmin, async (req, res) => {
  const image = await prisma.productImage.findFirst({
    where: { id: param(req.params.imageId), productId: param(req.params.id) }
  });
  if (!image) {
    res.status(404).json({ error: "Image not found." });
    return;
  }
  if (req.body.primary) {
    const siblings = await prisma.productImage.findMany({
      where: { productId: image.productId },
      orderBy: { sortOrder: "asc" }
    });
    const rest = siblings.filter((item) => item.id !== image.id);
    await prisma.$transaction([
      prisma.productImage.update({ where: { id: image.id }, data: { sortOrder: 0 } }),
      ...rest.map(
        (item, index) => prisma.productImage.update({ where: { id: item.id }, data: { sortOrder: index + 1 } })
      )
    ]);
  }
  const product = await prisma.product.findUnique({ where: { id: image.productId }, include: productAdminInclude });
  res.json(product);
});
app.delete("/api/admin/products/:id/images/:imageId", requireAdmin, async (req, res) => {
  const image = await prisma.productImage.findFirst({
    where: { id: param(req.params.imageId), productId: param(req.params.id) }
  });
  if (!image) {
    res.status(404).json({ error: "Image not found." });
    return;
  }
  await prisma.productImage.delete({ where: { id: image.id } });
  const remaining = await prisma.productImage.findMany({
    where: { productId: image.productId },
    orderBy: { sortOrder: "asc" }
  });
  await prisma.$transaction(
    remaining.map((item, index) => prisma.productImage.update({ where: { id: item.id }, data: { sortOrder: index } }))
  );
  const product = await prisma.product.findUnique({ where: { id: image.productId }, include: productAdminInclude });
  res.json(product);
});
app.get("/api/admin/categories", requireAdmin, async (_req, res) => {
  await sendCached(
    res,
    "categories",
    () => prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        parent: true,
        _count: { select: { products: { where: { deletedAt: null } } } }
      }
    })
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
      sortOrder: (last._max.sortOrder ?? 0) + 1
    }
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
      isVisible: req.body.isVisible
    }
  });
  res.json(category);
});
app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
  await sendCached(
    res,
    "orders",
    () => prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        items: { select: { id: true, name: true, sku: true, quantity: true, unitPrice: true, image: true } }
      }
    })
  );
});
app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  const payments = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"];
  const fulfilment = ["UNFULFILLED", "PARTIAL", "FULFILLED"];
  const data = {};
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
  await sendCached(
    res,
    "customers",
    () => prisma.user.findMany({
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
        orders: { orderBy: { createdAt: "desc" }, take: 1, select: { total: true, createdAt: true } }
      }
    })
  );
});
app.get("/api/admin/promotions", requireAdmin, async (_req, res) => {
  await sendCached(res, "promotions", () => prisma.promotion.findMany({ orderBy: { createdAt: "desc" }, take: 80 }));
});
app.get("/api/admin/reviews", requireAdmin, async (_req, res) => {
  await sendCached(
    res,
    "reviews",
    () => prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } }
      }
    })
  );
});
app.patch("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
  res.json(
    await prisma.review.update({
      where: { id: param(req.params.id) },
      data: { approved: Boolean(req.body.approved) },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } }
      }
    })
  );
});
app.get("/api/admin/returns", requireAdmin, async (_req, res) => {
  await sendCached(
    res,
    "returns",
    () => prisma.returnRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        order: { select: { orderNumber: true } },
        user: { select: { name: true } }
      }
    })
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
        user: { select: { name: true } }
      }
    })
  );
});
app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
  await sendCached(res, "settings", () => settings());
});
app.put("/api/admin/settings", requireAdmin, async (req, res) => {
  const site = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: req.body,
    create: { id: "default", ...req.body }
  });
  res.json(site);
});
app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: err instanceof Error ? err.message : "Server error." });
});
if (isProd && !process.env.VERCEL) {
  const dist = path2.join(process.cwd(), "dist");
  app.use(express.static(dist));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path2.join(dist, "index.html"));
  });
}
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Mojiano API on http://localhost:${PORT}`);
  });
}

// server/express-fn.ts
var express_fn_default = app;
export {
  express_fn_default as default
};
