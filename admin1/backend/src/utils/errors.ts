/**
 * Backend error types — typed + safe to surface to the UI.
 * ------------------------------------------------------------
 * Every service throws a `BackendError` so the global error handler
 * can map it to the correct HTTP status code + a user-friendly
 * message. The `detail` field is for logging only — never exposed
 * to the customer.
 */

export type BackendErrorKind =
  | "validation"
  | "auth"
  | "permission"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "payment"
  | "config"
  | "database"
  | "network"
  | "internal";

interface BackendErrorOptions {
  kind: BackendErrorKind;
  userMessage: string;
  detail?: unknown;
  httpStatus?: number;
}

export class BackendError extends Error {
  readonly kind: BackendErrorKind;
  readonly userMessage: string;
  readonly detail?: unknown;
  readonly httpStatus: number;

  constructor(opts: BackendErrorOptions) {
    super(opts.userMessage);
    this.name = "BackendError";
    this.kind = opts.kind;
    this.userMessage = opts.userMessage;
    this.detail = opts.detail;
    this.httpStatus = opts.httpStatus ?? defaultHttpStatus(opts.kind);
  }
}

function defaultHttpStatus(kind: BackendErrorKind): number {
  switch (kind) {
    case "validation":
      return 400;
    case "auth":
      return 401;
    case "permission":
      return 403;
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "rate_limit":
      return 429;
    case "payment":
      return 402;
    case "config":
    case "network":
      return 503;
    case "database":
    case "internal":
    default:
      return 500;
  }
}

// Convenience factories
export const Errors = {
  validation: (msg: string, detail?: unknown) => new BackendError({ kind: "validation", userMessage: msg, detail }),
  auth: (msg: string = "Please sign in to continue.", detail?: unknown) => new BackendError({ kind: "auth", userMessage: msg, detail }),
  permission: (msg: string = "You do not have permission to perform this action.", detail?: unknown) => new BackendError({ kind: "permission", userMessage: msg, detail }),
  notFound: (msg: string = "The requested record was not found.", detail?: unknown) => new BackendError({ kind: "not_found", userMessage: msg, detail }),
  conflict: (msg: string, detail?: unknown) => new BackendError({ kind: "conflict", userMessage: msg, detail }),
  rateLimit: (msg: string = "Too many requests. Please slow down.", detail?: unknown) => new BackendError({ kind: "rate_limit", userMessage: msg, detail }),
  payment: (msg: string = "Payment could not be processed.", detail?: unknown) => new BackendError({ kind: "payment", userMessage: msg, detail }),
  config: (msg: string = "Backend is not configured. Please try again later.", detail?: unknown) => new BackendError({ kind: "config", userMessage: msg, detail }),
  database: (msg: string = "Something went wrong on our end. Please try again.", detail?: unknown) => new BackendError({ kind: "database", userMessage: msg, detail }),
  internal: (msg: string = "An unexpected error occurred. Please try again.", detail?: unknown) => new BackendError({ kind: "internal", userMessage: msg, detail }),
};

/**
 * Wraps a thrown value into a BackendError. Used in catch blocks so
 * the caller always receives a typed error.
 */
export function toBackendError(err: unknown): BackendError {
  if (err instanceof BackendError) return err;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("jwt") || msg.includes("token") || msg.includes("unauthorized") || msg.includes("session")) {
      return Errors.auth("Your session has expired. Please sign in again.", err);
    }
    if (msg.includes("row level security") || msg.includes("rls")) {
      return Errors.permission(undefined, err);
    }
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("econnrefused")) {
      return Errors.database("Could not reach the database. Please try again.", err);
    }
    if (msg.includes("rate limit")) {
      return Errors.rateLimit(undefined, err);
    }
    return Errors.database(undefined, err);
  }
  return Errors.internal(undefined, err);
}
