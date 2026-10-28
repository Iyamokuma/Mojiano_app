import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password is too long."),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(2, "Enter the recipient name."),
  line1: z.string().trim().min(3, "Enter address line 1."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter a town or city."),
  county: z.string().trim().optional(),
  postcode: z.string().trim().min(5, "Enter a valid postcode.").max(12),
  country: z.string().trim().min(2).default("United Kingdom"),
  phone: z.string().trim().optional(),
});

export const checkoutSchema = z.object({
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
  paymentMethod: z.enum(["CARD", "BANK_TRANSFER", "CASH_ON_DELIVERY"]).default("CARD"),
  notes: z.string().trim().max(500).optional(),
  promoCode: z.string().trim().optional(),
});

const GRAMS_PER_UNIT: Record<string, number> = {
  "": 1,
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kgs: 1000,
  kilo: 1000,
  kilos: 1000,
  kilogram: 1000,
  kilograms: 1000,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
};

/** "1.5kg", "500 g", "2 lbs", "750" → grams. Empty → null; anything unreadable is passed back for zod to reject. */
export function parseWeightGrams(input: string): number | null | string {
  const raw = input.trim().toLowerCase().replace(",", ".");
  if (!raw) return null;
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*([a-z]*)\.?$/);
  const factor = match ? GRAMS_PER_UNIT[match[2]] : undefined;
  if (!match || factor === undefined) return input;
  return Math.round(Number(match[1]) * factor);
}

const optionalPence = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.number().int().min(0).nullable().optional(),
);

export const productSchema = z.object({
  name: z.string().trim().min(2).max(500),
  sku: z.string().trim().min(2).max(40),
  description: z.string().trim().max(50000).optional(),
  shortDescription: z.string().trim().max(5000).optional(),
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
  weightGrams: z.preprocess(
    (value) =>
      typeof value === "string" ? parseWeightGrams(value) : typeof value === "number" ? Math.round(value) : value,
    z.number({ message: "Use a weight like 500g, 1.5kg or 2lb." }).int().min(0).nullable().optional(),
  ),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(600).optional(),
  parentId: z.string().optional().nullable(),
  isVisible: z.coerce.boolean().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(160).optional(),
});
