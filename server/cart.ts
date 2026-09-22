import type { Request, Response } from "express";
import { prisma } from "./db";
import { readUser } from "./auth";
import { withFixedProductImages } from "../src/lib/media";
import { effectivePrice } from "../src/lib/money";

const CART_COOKIE = "mojiano_sid";

const cartInclude = {
  items: {
    include: {
      product: { include: { images: { orderBy: { sortOrder: "asc" as const }, take: 1 } } },
      variant: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export function ensureCartCookie(req: Request, res: Response) {
  let sessionId = req.cookies?.[CART_COOKIE] as string | undefined;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    res.cookie(CART_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    req.cookies = { ...(req.cookies ?? {}), [CART_COOKIE]: sessionId };
  }
  return sessionId;
}

export async function loadCart(id: string) {
  return prisma.cart.findUnique({ where: { id }, include: cartInclude });
}

export async function getCart(req: Request) {
  const user = readUser(req);
  const sessionId = req.cookies?.[CART_COOKIE] as string | undefined;
  if (user) {
    const userCart = await prisma.cart.findFirst({ where: { userId: user.id }, include: cartInclude });
    if (userCart) return userCart;
    if (sessionId) {
      return prisma.cart.findFirst({ where: { sessionId }, include: cartInclude });
    }
    return null;
  }
  if (!sessionId) return null;
  return prisma.cart.findFirst({
    where: { sessionId },
    include: cartInclude,
  });
}

export async function claimGuestCart(req: Request) {
  const user = readUser(req);
  const sessionId = req.cookies?.[CART_COOKIE] as string | undefined;
  if (!user || !sessionId) return;

  const [userCart, guestCart] = await Promise.all([
    prisma.cart.findFirst({ where: { userId: user.id }, include: { items: true } }),
    prisma.cart.findFirst({ where: { sessionId }, include: { items: true } }),
  ]);

  if (!guestCart || guestCart.id === userCart?.id) return;

  if (!userCart) {
    await prisma.cart.update({
      where: { id: guestCart.id },
      data: { userId: user.id, sessionId: null },
    });
    return;
  }

  for (const item of guestCart.items) {
    const existing = userCart.items.find(
      (row) => row.productId === item.productId && row.variantId === item.variantId,
    );
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { cartId: userCart.id },
      });
    }
  }
  await prisma.cart.delete({ where: { id: guestCart.id } });
}

export async function getOrCreateCart(req: Request, res: Response) {
  const user = readUser(req);
  const existing = await getCart(req);
  if (existing) {
    if (user && !existing.userId) {
      return prisma.cart.update({
        where: { id: existing.id },
        data: { userId: user.id },
        include: cartInclude,
      });
    }
    return existing;
  }
  const sessionId = user ? null : ensureCartCookie(req, res);
  return prisma.cart.create({
    data: { userId: user?.id, sessionId },
    include: cartInclude,
  });
}

export function summariseCart(cart: Awaited<ReturnType<typeof getCart>>) {
  const items =
    cart?.items.map((item) => {
      const unit = item.variant?.price ?? effectivePrice(item.product);
      return {
        ...item,
        product: withFixedProductImages(item.product),
        unitPrice: unit,
        lineTotal: unit * item.quantity,
      };
    }) ?? [];
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, subtotal, count, total: subtotal };
}
