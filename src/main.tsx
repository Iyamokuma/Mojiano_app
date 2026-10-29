import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { AppErrorBoundary, reloadForNewBuild } from "@/components/app-error-boundary";
import { ScrollToTop } from "@/components/storefront/scroll-to-top";
import { ShopProvider } from "@/context/shop";
import "@/index.css";

// Vite reports a missing preload (old build files after a deploy) here before the import fails.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewBuild()) event.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <ShopProvider>
          <App />
        </ShopProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
);
