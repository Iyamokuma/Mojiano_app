import Stripe from "stripe";
import { resolveImageUrl } from "../src/lib/media";
import { prisma } from "./db";
import { notifyOrderPaid } from "./email";
import { storeUrl } from "./site-url";

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Card payments are not configured.");
  return new Stripe(key);
}

export { storeUrl } from "./site-url";

type CheckoutLine = {
  name: string;
  quantity: number;
  unitAmount: number;
  image?: string | null;
};

export async function createStripeCheckoutSession(input: {
  orderId: string;
  orderNumber: string;
  email: string;
  total: number;
  lines: CheckoutLine[];
  deliveryFee: number;
  discount: number;
}) {
  const stripe = getStripe();
  const origin = storeUrl();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.lines
    .filter((line) => line.unitAmount > 0 && line.quantity > 0)
    .map((line) => {
      const rawImage = line.image ? resolveImageUrl(line.image) : undefined;
      const image = rawImage && rawImage.startsWith("http") ? rawImage : undefined;
      return {
        quantity: line.quantity,
        price_data: {
          currency: "gbp",
          unit_amount: line.unitAmount,
          product_data: {
            name: line.name.slice(0, 120),
            ...(image ? { images: [image] } : {}),
          },
        },
      };
    });

  if (input.deliveryFee > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: input.deliveryFee,
        product_data: { name: "Delivery" },
      },
    });
  }

  if (!lineItems.length) {
    throw new Error("This order has nothing to charge.");
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer_email: input.email,
    client_reference_id: input.orderNumber,
    success_url: `${origin}/checkout/confirmation/${encodeURIComponent(input.orderNumber)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=1`,
    metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
    payment_intent_data: {
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
    },
    line_items:
      input.discount > 0
        ? [
            {
              quantity: 1,
              price_data: {
                currency: "gbp",
                unit_amount: input.total,
                product_data: { name: `Mojiano order ${input.orderNumber}` },
              },
            },
          ]
        : lineItems,
  };

  return stripe.checkout.sessions.create(sessionParams);
}

export async function markOrderPaidFromSession(session: Stripe.Checkout.Session) {
  const orderNumber = session.metadata?.orderNumber || session.client_reference_id;
  if (!orderNumber) return null;
  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid) return null;

  const existing = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!existing) return null;
  if (existing.paymentStatus === "PAID") return existing;

  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const updated = await prisma.order.update({
    where: { orderNumber },
    data: {
      paymentStatus: "PAID",
      status: existing.status === "PENDING" ? "CONFIRMED" : existing.status,
      stripePaymentId: intent || session.id,
    },
    include: { items: true },
  });

  void notifyOrderPaid(updated).catch((error) => {
    console.error("[email:order]", error instanceof Error ? error.message : error);
  });

  return updated;
}
