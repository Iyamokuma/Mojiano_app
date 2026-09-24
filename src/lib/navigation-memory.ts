const LAST_PAGE_KEY = "mj-last-page";
const FLASH_KEY = "mj-flash";

const NOT_RESUMABLE = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/checkout/confirmation"];

export function rememberPage(path: string) {
  if (NOT_RESUMABLE.some((prefix) => path.startsWith(prefix))) return;
  try {
    localStorage.setItem(LAST_PAGE_KEY, path);
  } catch {
    /* private mode */
  }
}

export function lastPage(): string | null {
  try {
    return localStorage.getItem(LAST_PAGE_KEY);
  } catch {
    return null;
  }
}

export function setFlash(message: string) {
  try {
    sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    /* private mode */
  }
}

export function takeFlash(): string | null {
  try {
    const message = sessionStorage.getItem(FLASH_KEY);
    if (message) sessionStorage.removeItem(FLASH_KEY);
    return message;
  } catch {
    return null;
  }
}
