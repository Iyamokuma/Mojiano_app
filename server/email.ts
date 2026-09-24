import type { Order, OrderItem } from "@prisma/client";
import { storeUrl } from "./site-url";

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function emailFrom() {
  return process.env.EMAIL_FROM?.trim() || "Mojiano <orders@mojiano.co.uk>";
}

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

async function sendEmail(input: { to: string | string[]; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  const to = Array.isArray(input.to) ? input.to : [input.to];
  if (!key) {
    console.log("[email:skipped]", input.subject, "→", to.join(", "));
    return { ok: false as const, skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom(),
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { message?: string; id?: string };
  if (!res.ok) {
    console.error("[email:error]", res.status, body.message ?? body);
    return { ok: false as const, error: body.message ?? `HTTP ${res.status}` };
  }
  return { ok: true as const, id: body.id };
}

function layout(title: string, inner: string) {
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#fff8f4;font-family:Segoe UI,system-ui,sans-serif;color:#1c1410;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f4;padding:32px 16px;"><tr><td align="center">
<table width="100%" style="max-width:520px;background:#fffcfa;border:1px solid #eadfd6;border-radius:16px;padding:28px 24px;">
<tr><td><p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#a8843d;">Mojiano</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600;">${title}</h1>
${inner}
<p style="margin:24px 0 0;font-size:12px;color:#7a6c64;line-height:1.5;">Mojiano Wholesale Clearance · London</p>
</td></tr></table></td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:0;"><a href="${href}" style="display:inline-block;background:#1c1410;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;">${label}</a></p>`;
}

export async function sendVerifyEmail(input: { name: string; email: string; link: string }) {
  const html = layout(
    "Welcome to Mojiano — confirm your email",
    `<p style="margin:0 0 12px;line-height:1.55;">Hi ${escapeHtml(input.name)},</p>
<p style="margin:0 0 16px;line-height:1.55;">Your account is ready. Please confirm this is your email address so we can send order updates safely. The link works for 3 days.</p>
${button(input.link, "Confirm my email")}
<p style="margin:16px 0 0;font-size:12px;color:#7a6c64;line-height:1.5;">If you didn't create a Mojiano account, you can ignore this email.</p>`,
  );
  const text = `Hi ${input.name},\n\nConfirm your Mojiano email address:\n${input.link}\n\nThe link works for 3 days.\n`;
  return sendEmail({ to: input.email, subject: "Confirm your Mojiano email", html, text });
}

export async function sendPasswordResetEmail(input: { name: string; email: string; link: string }) {
  const html = layout(
    "Reset your password",
    `<p style="margin:0 0 12px;line-height:1.55;">Hi ${escapeHtml(input.name)},</p>
<p style="margin:0 0 16px;line-height:1.55;">We received a request to reset your Mojiano password. The link works once and expires in 1 hour.</p>
${button(input.link, "Choose a new password")}
<p style="margin:16px 0 0;font-size:12px;color:#7a6c64;line-height:1.5;">If you didn't ask for this, you can ignore this email — your password won't change.</p>`,
  );
  const text = `Hi ${input.name},\n\nReset your Mojiano password (expires in 1 hour):\n${input.link}\n\nIf you didn't ask for this, ignore this email.\n`;
  return sendEmail({ to: input.email, subject: "Reset your Mojiano password", html, text });
}

type OrderWithItems = Order & { items: OrderItem[] };

export async function notifyOrderPaid(order: OrderWithItems) {
  const origin = storeUrl();
  const lines = order.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eadfd6;">${escapeHtml(item.name)} × ${item.quantity}</td>
<td style="padding:8px 0;border-bottom:1px solid #eadfd6;text-align:right;">${formatGBP(item.totalPrice)}</td></tr>`,
    )
    .join("");
  const html = layout(
    `Order ${escapeHtml(order.orderNumber)} confirmed`,
    `<p style="margin:0 0 12px;line-height:1.55;">Hi ${escapeHtml(order.fullName)},</p>
<p style="margin:0 0 16px;line-height:1.55;">Thanks — we've received your payment. Here's what you bought:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:16px;">${lines}</table>
<p style="margin:0 0 4px;font-size:14px;"><strong>Delivery:</strong> ${escapeHtml(order.deliveryMethod)}</p>
<p style="margin:0 0 16px;font-size:14px;"><strong>Total paid:</strong> ${formatGBP(order.total)}</p>
<p style="margin:0;"><a href="${origin}/account" style="color:#a8843d;">View your orders</a></p>`,
  );
  const text =
    `Order ${order.orderNumber} confirmed\n\n` +
    order.items.map((i) => `${i.name} × ${i.quantity} — ${formatGBP(i.totalPrice)}`).join("\n") +
    `\n\nTotal: ${formatGBP(order.total)}\nDelivery: ${order.deliveryMethod}\n`;

  await sendEmail({
    to: order.email,
    subject: `Mojiano order ${order.orderNumber} — payment received`,
    html,
    text,
  });

  const adminTo = process.env.ADMIN_EMAIL?.trim() || process.env.ORDER_ALERT_EMAIL?.trim();
  if (adminTo && adminTo.toLowerCase() !== order.email.toLowerCase()) {
    await sendEmail({
      to: adminTo,
      subject: `New paid order ${order.orderNumber} — ${formatGBP(order.total)}`,
      html: layout(
        "New paid order",
        `<p style="margin:0 0 12px;line-height:1.55;"><strong>${escapeHtml(order.fullName)}</strong> · ${escapeHtml(order.email)}</p>
<p style="margin:0 0 8px;">${escapeHtml(order.phone || "No phone")}</p>
<p style="margin:0 0 16px;font-size:14px;">Total ${formatGBP(order.total)} · ${escapeHtml(order.deliveryMethod)}</p>
<p style="margin:0;"><a href="${origin}/admin/orders">Open orders in admin</a></p>`,
      ),
      text: `New paid order ${order.orderNumber}\n${order.fullName} · ${order.email}\nTotal ${formatGBP(order.total)}`,
    });
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
