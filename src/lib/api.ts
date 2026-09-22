const cache = new Map<string, { at: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
/** Admin list views only — storefront always hits the network for fresh catalogue data. */
const ADMIN_FRESH_MS = 20_000;

function methodOf(init?: RequestInit) {
  return (init?.method ?? "GET").toUpperCase();
}

function shouldCacheAdmin(path: string, init?: RequestInit) {
  if (methodOf(init) !== "GET") return false;
  if (path.startsWith("/api/admin/auth")) return false;
  return path.startsWith("/api/admin");
}

export function peekApi<T>(path: string): T | undefined {
  return cache.get(path)?.data as T | undefined;
}

export function prefetchApi(path: string) {
  void api(path);
}

export function invalidateApiCache() {
  for (const [path, entry] of cache) {
    cache.set(path, { at: 0, data: entry.data });
  }
}

export function clearApiCache() {
  cache.clear();
  inflight.clear();
}

async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers, ...rest } = init ?? {};
  const res = await fetch(path, {
    credentials: "include",
    cache: path.startsWith("/api/") && !path.startsWith("/api/admin") ? "no-store" : undefined,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    ...rest,
  });
  const data = (await res.json().catch(() => ({}))) as (T & { error?: string }) | null;
  if (!res.ok) {
    throw new Error(
      (data && typeof data === "object" && "error" in data && data.error) ||
        (res.status === 404 ? "That service is unavailable. Please try again." : "Request failed"),
    );
  }
  return data as T;
}

function refresh<T>(path: string, init?: RequestInit): Promise<T> {
  const pending = inflight.get(path);
  if (pending) return pending as Promise<T>;
  const request = send<T>(path, init)
    .then((data) => {
      cache.set(path, { at: Date.now(), data });
      return data;
    })
    .finally(() => inflight.delete(path));
  inflight.set(path, request);
  return request;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (shouldCacheAdmin(path, init)) {
    const cached = cache.get(path);
    const fresh = cached && Date.now() - cached.at < ADMIN_FRESH_MS;
    if (cached && fresh) return cached.data as T;
    if (cached) {
      void refresh<T>(path, init);
      return cached.data as T;
    }
    return refresh<T>(path, init);
  }

  const data = await send<T>(path, init);
  if (methodOf(init) === "GET" && path.startsWith("/api/") && !path.startsWith("/api/admin")) {
    cache.set(path, { at: Date.now(), data });
  }
  if (methodOf(init) !== "GET" && path.startsWith("/api/admin")) {
    if (path.startsWith("/api/admin/auth/")) clearApiCache();
    else invalidateApiCache();
  }
  return data;
}

export async function uploadImage(file: File): Promise<{ url: string; alt: string }> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/uploads", {
    method: "POST",
    credentials: "include",
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; alt?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Could not upload that image.");
  }
  invalidateApiCache();
  return { url: data.url, alt: data.alt || file.name };
}
