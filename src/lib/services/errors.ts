/**
 * StyleSync Customer App — Backend Error Handling
 * --------------------------------------------------------------------
 * Consistent error types returned by every data-access service. The
 * services never throw raw Error objects — they always throw one of
 * the typed errors below so the UI can render user-friendly messages
 * and the API routes can return appropriate HTTP status codes.
 *
 * The error's `userMessage` field is safe to display in the UI. The
 * `detail` field is for logging only — never expose it to the
 * customer (it may contain database internals).
 */

export type BackendErrorKind =
  | "network"
  | "auth"
  | "database"
  | "validation"
  | "not_found"
  | "permission"
  | "booking_conflict"
  | "payment"
  | "rate_limit"
  | "config"
  | "unknown";

export class BackendError extends Error {
  readonly kind: BackendErrorKind;
  readonly userMessage: string;
  readonly detail?: unknown;
  readonly httpStatus: number;

  constructor(opts: {
    kind: BackendErrorKind;
    userMessage: string;
    detail?: unknown;
    httpStatus?: number;
  }) {
    super(opts.userMessage);
    this.name = "BackendError";
    this.kind = opts.kind;
    this.userMessage = opts.userMessage;
    this.detail = opts.detail;
    this.httpStatus = opts.httpStatus ?? defaultHttpStatus(opts.kind);
  }

  toJSON() {
    return {
      kind: this.kind,
      message: this.userMessage,
      httpStatus: this.httpStatus,
    };
  }
}

function defaultHttpStatus(kind: BackendErrorKind): number {
  switch (kind) {
    case "auth":
    case "permission":
      return 401;
    case "not_found":
      return 404;
    case "validation":
      return 400;
    case "booking_conflict":
      return 409;
    case "rate_limit":
      return 429;
    case "config":
      return 503;
    case "network":
      return 503;
    case "payment":
      return 402;
    case "database":
    case "unknown":
    default:
      return 500;
  }
}

/* ── Convenience factory functions ──────────────────────────────── */

export function networkError(message: string, detail?: unknown): BackendError {
  return new BackendError({
    kind: "network",
    userMessage: message || "Network error. Please check your connection and try again.",
    detail,
    httpStatus: 503,
  });
}

export function authError(message: string, detail?: unknown): BackendError {
  return new BackendError({
    kind: "auth",
    userMessage: message || "Please sign in to continue.",
    detail,
    httpStatus: 401,
  });
}

export function databaseError(message: string, detail?: unknown): BackendError {
  return new BackendError({
    kind: "database",
    userMessage: message || "Something went wrong on our end. Please try again.",
    detail,
    httpStatus: 500,
  });
}

export function validationError(message: string, detail?: unknown): BackendError {
  return new BackendError({
    kind: "validation",
    userMessage: message || "Please check your input and try again.",
    detail,
    httpStatus: 400,
  });
}

export function notFoundError(message: string, detail?: unknown): BackendError {
  return new BackendError({
    kind: "not_found",
    userMessage: message || "The requested record was not found.",
    detail,
    httpStatus: 404,
  });
}

export function permissionError(message: string, detail?: unknown): BackendError {
  return new BackendError({
    kind: "permission",
    userMessage: message || "You do not have permission to perform this action.",
    detail,
    httpStatus: 403,
  });
}

export function bookingConflictError(message: string, detail?: unknown): BackendError {
  return new BackendError({
    kind: "booking_conflict",
    userMessage: message || "This time slot was just booked. Please pick another time.",
    detail,
    httpStatus: 409,
  });
}

export function paymentError(message: string, detail?: unknown): BackendError {
  return new BackendError({
    kind: "payment",
    userMessage: message || "Payment could not be processed. Please try a different method.",
    detail,
    httpStatus: 402,
  });
}

export function rateLimitError(message: string, detail?: unknown): BackendError {
  return new BackendError({
    kind: "rate_limit",
    userMessage: message || "Too many requests. Please wait a moment and try again.",
    detail,
    httpStatus: 429,
  });
}

export function configError(message: string, detail?: unknown): BackendError {
  return new BackendError({
    kind: "config",
    userMessage: message || "The service is not yet configured. Please try again later.",
    detail,
    httpStatus: 503,
  });
}

/**
 * Wraps a thrown value into a BackendError. Used in catch blocks so
 * the caller always receives a typed error.
 */
export function toBackendError(err: unknown): BackendError {
  if (err instanceof BackendError) return err;
  if (err instanceof Error) {
    // Common Supabase auth errors
    const msg = err.message.toLowerCase();
    if (msg.includes("jwt") || msg.includes("unauthorized") || msg.includes("session")) {
      return authError("Your session has expired. Please sign in again.", err);
    }
    if (msg.includes("row level security") || msg.includes("rls")) {
      return permissionError("You do not have permission to access this data.", err);
    }
    if (msg.includes("network") || msg.includes("fetch")) {
      return networkError("Network error. Please check your connection.", err);
    }
    if (msg.includes("rate limit")) {
      return rateLimitError("Too many requests. Please slow down.", err);
    }
    return databaseError("Something went wrong. Please try again.", err);
  }
  return new BackendError({
    kind: "unknown",
    userMessage: "An unexpected error occurred. Please try again.",
    detail: err,
    httpStatus: 500,
  });
}

/* ── Async result wrapper ────────────────────────────────────────── */
/**
 * Services return `Promise<Result<T>>` so callers can pattern-match
 * on success/error without try/catch. This makes loading + error
 * states easier to manage in React components.
 */
export type Result<T, E = BackendError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(error: BackendError): Result<T> {
  return { ok: false, error };
}

/**
 * Wraps an async service call so it returns a Result instead of
 * throwing. Cleaner than try/catch in every caller.
 *
 * Example:
 *   const result = await safeCall(() => getSalons());
 *   if (result.ok) { useResult(result.value) }
 *   else { showError(result.error.userMessage) }
 */
export async function safeCall<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (e) {
    return err(toBackendError(e));
  }
}
