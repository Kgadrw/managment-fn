/** Local backend (run `npm run dev` in backend/) */
export const LOCAL_API_URL = "http://localhost:8080";

function isLocalApiUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url.trim());
}

/**
 * API base URL for fetch calls.
 * - Dev with no VITE_API_URL: empty string → Vite proxies /api to localhost:8080
 * - Otherwise: VITE_API_URL or http://localhost:8080
 */
export function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";

  if (trimmed) {
    const url = trimmed.replace(/\/$/, "");
    if (!isLocalApiUrl(url) && import.meta.env.DEV) {
      console.warn(
        `[api] VITE_API_URL is not localhost (${url}). Using local backend ${LOCAL_API_URL} instead.`,
      );
      return LOCAL_API_URL;
    }
    return url;
  }

  if (import.meta.env.DEV) {
    return "";
  }

  return LOCAL_API_URL;
}
