import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const appBuildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.GITHUB_SHA?.slice(0, 12) ||
  `dev-${Date.now()}`;

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(appBuildId),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "inject-mojiano-build-id",
      transformIndexHtml(html) {
        return html.replace(
          "</head>",
          `    <meta name="mojiano-build" content="${appBuildId}" />\n  </head>`,
        );
      },
    },
  ],
  resolve: {
    alias: { "@": path.resolve(rootDir, "src") },
  },
  build: {
    target: "es2022",
    cssMinify: true,
    modulePreload: { polyfill: false },
    minify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-router") || id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "react";
          }
          if (id.includes("node_modules/lucide-react")) return "icons";
        },
      },
    },
  },
  server: {
    port: 3002,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/uploads": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
