import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { customAlphabet } from "nanoid";

const id = customAlphabet("abcdefghijkmnopqrstuvwxyz23456789", 10);
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");

const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${id()}${ALLOWED.has(ext) ? ext : ".jpg"}`);
  },
});

export const productImageUpload = multer({
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
  },
});
