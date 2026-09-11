import { build } from "esbuild";

await build({
  entryPoints: ["server/express-fn.ts"],
  outfile: "api/_app.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  logLevel: "info",
});

await build({
  entryPoints: ["server/vercel.ts"],
  outfile: "api/[[...path]].js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  external: ["./_app.js"],
  logLevel: "info",
});
