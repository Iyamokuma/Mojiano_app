import type { Request, Response } from "express";
import { prisma } from "./db";
import { readUser } from "./auth";
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
  return prisma.cart.findFirst({
    where: user
      ? { OR: [{ userId: user.id }, { sessionId: sessionId ?? "" }] }
      : { sessionId: sessionId ?? "" },
    include: cartInclude,
  });
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
      return { ...item, unitPrice: unit, lineTotal: unit * item.quantity };
    }) ?? [];
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, subtotal, count, total: subtotal };
}
