import { PrismaClient } from "@prisma/client";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function datasourceUrl() {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(raw);
    const serverless = Boolean(process.env.VERCEL);
    if (serverless && url.port === "6543") {
      url.port = "5432";
      url.searchParams.delete("pgbouncer");
    }
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", serverless ? "1" : "10");
    }
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "8");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "8");
    if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
    return url.toString();
  } catch {
    return raw;
  }
}

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: datasourceUrl() } },
  });
}

export const prisma =
  globalForPrisma.prisma ??
  new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
      const value = Reflect.get(globalForPrisma.prisma, prop, receiver);
      return typeof value === "function" ? value.bind(globalForPrisma.prisma) : value;
    },
  });
