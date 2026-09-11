import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function datasourceUrl() {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(raw);
    const serverless = Boolean(process.env.VERCEL);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", serverless ? "1" : "10");
    }
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: datasourceUrl() } },
  });

if (process.env.NODE_ENV !== "production" || process.env.VERCEL) globalForPrisma.prisma = prisma;
