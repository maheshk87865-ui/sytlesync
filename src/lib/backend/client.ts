/**
 * StyleSync Customer App — Backend REST API Client
 * --------------------------------------------------------------------
 * Singleton fetch wrapper that talks to the StyleSync Express backend
 * at http://localhost:4000/api/v1 (configurable via NEXT_PUBLIC_BACKEND_URL).
 *
 * Responsibilities:
 *   - Attaches the customer's JWT bearer token to every authenticated call
 *   - Attaches the refresh token on /auth/refresh rotation
 *   - Maps the backend's { success, data, message } / { success, error }
 *     envelope into typed values or thrown BackendError
 *   - Handles network errors, timeouts, and rate-limit responses
 *
 * The token store is a tiny module-level mutable object. The auth-store
 * sets the token on sign-in; this client reads it on every request.
 */

import {
  BackendError,
  authError,
  configError,
  databaseError,
  networkError,
  notFoundError,
  paymentError,
  permissionError,
  rateLimitError,
  validationError,
  bookingConflictError,
} from "@/lib/services/errors";

// ─── Backend URL ────────────────────────────────────────────────
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

const API_BASE = `${BACKEND_URL}/api/v1`;

// ─── Token store (set by auth-store on sign-in) ────────────────
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export function setBackendTokens(access: string | null, refresh: string | null): void {
  _accessToken = access;
  _refreshToken = refresh;
  if (typeof window !== "undefined") {
    if (access) localStorage.setItem("ss_access_token", access);
    else localStorage.removeItem("ss_access_token");
    if (refresh) localStorage.setItem("ss_refresh_token", refresh);
    else localStorage.removeItem("ss_refresh_token");
  }
}

export function getAccessToken(): string | null {
  if (_accessToken) return _accessToken;
  if (typeof window !== "undefined") {
    _accessToken = localStorage.getItem("ss_access_token");
  }
  return _accessToken;
}

export function getRefreshToken(): string | null {
  if (_refreshToken) return _refreshToken;
  if (typeof window !== "undefined") {
    _refreshToken = localStorage.getItem("ss_refresh_token");
  }
  return _refreshToken;
}

// ─── Backend envelope ───────────────────────────────────────────
interface BackendEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string; details?: unknown };
}

// ─── Error mapping ──────────────────────────────────────────────
function mapBackendError(code: string, message: string, httpStatus: number): BackendError {
  switch (code) {
    case "auth":
      return authError(message || "Please sign in to continue.");
    case "permission":
    case "forbidden":
      return permissionError(message || "You do not have permission.");
    case "not_found":
      return notFoundError(message || "Not found.");
    case "validation":
      return validationError(message || "Please check your input.");
    case "config":
      return configError(message || "Service not configured.");
    case "rate_limit":
      return rateLimitError(message || "Too many requests. Please slow down.");
    case "booking_conflict":
    case "slot_unavailable":
    case "slot_held":
    case "slot_booked":
      return bookingConflictError(message || "This slot was just taken. Please pick another time.");
    case "payment":
      return paymentError(message || "Payment could not be processed.");
    case "database":
    case "internal":
    default:
      if (httpStatus === 401) return authError(message || "Please sign in to continue.");
      if (httpStatus === 403) return permissionError(message || "Not allowed.");
      if (httpStatus === 404) return notFoundError(message || "Not found.");
      if (httpStatus === 409) return bookingConflictError(message || "Conflict.");
      if (httpStatus === 429) return rateLimitError(message || "Too many requests.");
      return databaseError(message || "Something went wrong on our end.");
  }
}

// ─── Core request function ──────────────────────────────────────
async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  opts: {
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined | null>;
    auth?: boolean; // if true, require an access token; if false, public route
    raw?: boolean; // if true, return Response object instead of parsed body
  } = {}
): Promise<T> {
  const { body, query, auth = true, raw = false } = opts;

  // Build URL with query params
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getAccessToken();
    if (!token) {
      throw authError("Please sign in to continue.");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  let resp: Response;
  try {
    resp = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  } catch (e: any) {
    if (e?.name === "AbortError") throw networkError("Request timed out. Please try again.");
    throw networkError("Could not reach the StyleSync server. Please check your connection.", e);
  }

  if (raw) return resp as unknown as T;

  // Parse JSON envelope
  let payload: BackendEnvelope<T> | null = null;
  const text = await resp.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // non-JSON response
      if (!resp.ok) {
        throw databaseError(`Server returned ${resp.status}. Please try again.`);
      }
      return text as unknown as T;
    }
  }

  if (!payload) {
    if (!resp.ok) {
      throw databaseError(`Server returned ${resp.status}. Please try again.`);
    }
    return undefined as unknown as T;
  }

  if (!payload.success) {
    const code = payload.error?.code || "internal";
    const message = payload.error?.message || "Something went wrong.";
    throw mapBackendError(code, message, resp.status);
  }

  return payload.data as T;
}

// ─── Public API ─────────────────────────────────────────────────
export const api = {
  get: <T>(path: string, opts?: { query?: Record<string, any>; auth?: boolean; raw?: boolean }) =>
    request<T>("GET", path, opts || {}),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean; raw?: boolean }) =>
    request<T>("POST", path, { body, ...(opts || {}) }),
  patch: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>("PATCH", path, { body, ...(opts || {}) }),
  put: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>("PUT", path, { body, ...(opts || {}) }),
  del: <T>(path: string, opts?: { auth?: boolean }) =>
    request<T>("DELETE", path, opts || {}),
};

// ─── Backend reachability probe ─────────────────────────────────
export async function isBackendReachable(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/health`, { method: "GET" });
    return r.ok;
  } catch {
    return false;
  }
}

export function backendUrl(): string {
  return BACKEND_URL;
}
