import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Every route change starts at the top unless the URL includes a hash anchor. */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search, hash]);

  return null;
}
