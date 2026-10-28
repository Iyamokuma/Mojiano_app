import { PrismaClient } from "@prisma/client";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function datasourceUrl() {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(raw);
    const serverless = Boolean(process.env.VERCEL);
    // Supabase session mode (5432) caps the whole project at 15 clients, so busy moments
    // on Vercel failed with EMAXCONNSESSION. Transaction mode (6543) is built for serverless.
    if (serverless && url.hostname.endsWith("pooler.supabase.com")) {
      url.port = "6543";
      url.searchParams.set("pgbouncer", "true");
    }
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", serverless ? "5" : "10");
    }
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "8");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
    if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
    return url.toString();
  } catch {
    return raw;
  }
}

/** Connection hiccups (pool full, cold socket) that are worth one more try. */
function isTransient(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code && ["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code)) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /EMAXCONN|max clients reached|Can't reach database|Timed out fetching a new connection|Connection (terminated|reset|closed)|ECONNRESET|server has closed the connection/i.test(
    message,
  );
}

function createClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: datasourceUrl() } },
  });
  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            if (attempt >= 2 || !isTransient(error)) throw error;
            await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
          }
        }
      },
    },
  }) as unknown as PrismaClient;
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
