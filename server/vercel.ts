export const config = {
  maxDuration: 30,
  regions: ["lhr1"],
  api: { bodyParser: false },
};

export default async function handler(req: { url?: string }, res: unknown) {
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
