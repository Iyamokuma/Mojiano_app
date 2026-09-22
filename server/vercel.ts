export const config = {
  maxDuration: 30,
  regions: ["lhr1"],
  api: { bodyParser: false },
};

function header(req: { headers?: Record<string, string | string[] | undefined> }, name: string) {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function restoreApiUrl(req: { url?: string; headers?: Record<string, string | string[] | undefined> }) {
  const forwarded = header(req, "x-forwarded-uri");
  if (forwarded?.startsWith("/api/")) {
    req.url = forwarded;
    return;
  }
  try {
    const parsed = new URL(String(req.url ?? "/"), "http://localhost");
    const injected = parsed.searchParams.get("__path");
    if (injected?.startsWith("/api/")) {
      parsed.searchParams.delete("__path");
      const query = parsed.searchParams.toString();
      req.url = query ? `${injected}?${query}` : injected;
    }
  } catch {
    /* keep the incoming url */
  }
}

export default async function handler(
  req: { url?: string; headers?: Record<string, string | string[] | undefined> },
  res: unknown,
) {
  restoreApiUrl(req);
  const path = String(req.url ?? "").split("?")[0];
  if (path === "/api/ready") {
    const body = JSON.stringify({ ok: true, ready: true });
    const response = res as { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void };
    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.end(body);
    return;
  }
  const mod = await import("./_app.js");
  return mod.default(req, res);
}
