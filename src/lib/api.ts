// In dev, Vite proxies `/api` + `/health` to the backend (see `vite.config.ts`).
// API base URL: localhost only (see `apiUrl.ts`).
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth";
import { LOCAL_API_URL, resolveApiUrl } from "@/lib/apiUrl";

export { resolveApiUrl, LOCAL_API_URL };
export const API_URL = resolveApiUrl();

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function errorMessageFromBody(body: unknown) {
  if (body && typeof body === "object" && "error" in body && typeof (body as any).error === "string") {
    return (body as any).error as string;
  }
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = async (withRefreshedToken: boolean) => {
    const token = getAccessToken();
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });
  };

  let res = await doFetch(false);

  const text = await res.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (typeof body === "string" && body.trimStart().startsWith("<!")) {
    throw new ApiError(
      `API returned HTML instead of JSON. Start the backend at ${LOCAL_API_URL} and use the Vite dev server (npm run dev).`,
      res.status,
      body,
    );
  }

  // Auto-refresh once on 401 (except for auth endpoints).
  if (!res.ok && res.status === 401 && !path.startsWith("/api/auth/")) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const refreshText = await refreshRes.text();
        const refreshBody = refreshText ? (() => { try { return JSON.parse(refreshText); } catch { return refreshText; } })() : null;
        if (refreshRes.ok && refreshBody && typeof refreshBody === "object" && "accessToken" in refreshBody) {
          setTokens({ accessToken: (refreshBody as any).accessToken, refreshToken });
          res = await doFetch(true);
          const text2 = await res.text();
          const body2 = text2 ? (() => { try { return JSON.parse(text2); } catch { return text2; } })() : null;
          if (!res.ok) {
            const hint = errorMessageFromBody(body2);
            throw new ApiError(hint ? `${hint} (${res.status})` : `Request failed: ${res.status}`, res.status, body2);
          }
          return body2 as T;
        }
      } catch {
        // fall through to original 401
      }
    }
    clearTokens();
  }

  if (!res.ok) {
    const hint = errorMessageFromBody(body);
    throw new ApiError(hint ? `${hint} (${res.status})` : `Request failed: ${res.status}`, res.status, body);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

