import path from "node:path";
import { customAlphabet } from "nanoid";
import { supabaseAdmin } from "./supabase";

const id = customAlphabet("abcdefghijkmnopqrstuvwxyz23456789", 10);
const BUCKET = process.env.SUPABASE_PRODUCT_BUCKET ?? "product-images";

let bucketReady: Promise<void> | null = null;

export function supabaseStorageReady() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function supabasePublicPrefix() {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}/storage/v1/object/public/${BUCKET}/` : "";
}

export function isProductImageUrl(url: string) {
  const value = String(url ?? "").trim();
  if (!value) return false;
  if (/^\/uploads\/products\/[A-Za-z0-9._-]+$/.test(value)) return true;
  const prefix = supabasePublicPrefix();
  if (prefix && value.startsWith(prefix)) return true;
  return false;
}

async function ensureBucket() {
  if (!supabaseStorageReady()) return;
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw listError;
  if (buckets?.some((bucket) => bucket.name === BUCKET)) return;
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 8 * 1024 * 1024,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

async function readyBucket() {
  if (!bucketReady) bucketReady = ensureBucket();
  await bucketReady;
}

export async function uploadProductImageBuffer(buffer: Buffer, originalName: string, mimeType: string) {
  if (!supabaseStorageReady()) {
    throw new Error("Image storage is not configured on the server.");
  }
  await readyBucket();
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
  const objectPath = `products/${Date.now()}-${id()}${safeExt}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: mimeType || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}
