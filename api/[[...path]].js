// server/vercel.ts
var config = {
  maxDuration: 30,
  regions: ["lhr1"],
  api: { bodyParser: false }
};
async function handler(req, res) {
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
