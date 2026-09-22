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

const optionalPence = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.number().int().min(0).nullable().optional(),
);

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().min(2).max(40),
  description: z.string().trim().max(8000).optional(),
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
  weightGrams: optionalPence,
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(600).optional(),
  parentId: z.string().optional().nullable(),
  isVisible: z.coerce.boolean().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(160).optional(),
});
