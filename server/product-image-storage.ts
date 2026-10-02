import path from "node:path";
import { customAlphabet } from "nanoid";
import { supabaseAdmin } from "./supabase";

const id = customAlphabet("abcdefghijkmnopqrstuvwxyz23456789", 10);
const BUCKET = process.env.SUPABASE_PRODUCT_BUCKET ?? "product-images";
export const MAX_PRODUCT_IMAGE_BYTES = 20 * 1024 * 1024;

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
  if (/^\/api\/media\/[A-Za-z0-9_-]+$/.test(value)) return true;
  if (/^\/uploads\/products\/[A-Za-z0-9._-]+$/.test(value)) return true;
  try {
    const parsed = new URL(value);
    if (/^\/api\/media\/[A-Za-z0-9_-]+$/.test(parsed.pathname)) return true;
  } catch {
    /* not an absolute URL */
  }
  const prefix = supabasePublicPrefix();
  if (prefix && value.startsWith(prefix)) return true;
  return false;
}

export function mediaPath(id: string) {
  return `/api/media/${id}`;
}

async function ensureBucket() {
  if (!supabaseStorageReady()) return;
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw listError;
  if (buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error } = await supabaseAdmin.storage.updateBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_PRODUCT_IMAGE_BYTES,
    });
    if (error) throw error;
    return;
  }
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_PRODUCT_IMAGE_BYTES,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

async function readyBucket() {
  if (!bucketReady) bucketReady = ensureBucket();
  await bucketReady;
}

export async function createProductUploadTarget(originalName: string, contentType: string) {
  if (!supabaseStorageReady()) {
    throw new Error("Image storage is not configured on the server.");
  }
  await readyBucket();
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
  const objectPath = `products/${Date.now()}-${id()}${safeExt}`;
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(objectPath);
  if (error || !data) throw error ?? new Error("Could not start the upload.");
  const { data: published } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path || objectPath);
  return {
    signedUrl: data.signedUrl,
    token: data.token,
    publicUrl: published.publicUrl,
    contentType: contentType || "image/jpeg",
  };
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
