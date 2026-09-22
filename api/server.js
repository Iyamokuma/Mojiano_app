// server/vercel.ts
var config = {
  maxDuration: 30,
  regions: ["lhr1"],
  api: { bodyParser: false }
};
function header(req, name) {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}
function restoreApiUrl(req) {
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
  }
}
async function handler(req, res) {
  restoreApiUrl(req);
  const path = String(req.url ?? "").split("?")[0];
  if (path === "/api/ready") {
    const body = JSON.stringify({ ok: true, ready: true });
    const response = res;
    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.end(body);
    return;
  }
  const mod = await import("./_app.js");
  return mod.default(req, res);
}
export {
  config,
  handler as default
};
