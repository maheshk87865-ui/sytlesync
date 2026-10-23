/**
 * BackendError class + typed factories + Result helpers.
 *
 * Every error the service layer throws is a BackendError with a typed
 * `kind`. The error-handler middleware maps kinds to HTTP status codes.
 */

export type BackendErrorKind =
  | "auth"
  | "permission"
  | "validation"
  | "not_found"
  | "booking_conflict"
  | "config"
  | "rate_limit"
  | "database"
  | "unknown";

export class BackendError extends Error {
  readonly kind: BackendErrorKind;
  readonly detail?: unknown;
  readonly httpStatus: number;

  constructor(opts: { kind: BackendErrorKind; message: string; detail?: unknown; httpStatus?: number }) {
    super(opts.message);
    this.name = "BackendError";
    this.kind = opts.kind;
    this.detail = opts.detail;
    this.httpStatus = opts.httpStatus ?? defaultHttpStatus(opts.kind);
  }
}

function defaultHttpStatus(kind: BackendErrorKind): number {
  switch (kind) {
    case "auth": return 401;
    case "permission": return 403;
    case "validation": return 400;
    case "not_found": return 404;
    case "booking_conflict": return 409;
    case "rate_limit": return 429;
    case "config": return 503;
    case "database":
    case "unknown":
    default: return 500;
  }
}

export const Errors = {
  auth: (message = "Please sign in.", detail?: unknown) =>
    new BackendError({ kind: "auth", message, detail }),
  permission: (message = "Not allowed.", detail?: unknown) =>
    new BackendError({ kind: "permission", message, detail }),
  validation: (message = "Please check your input.", detail?: unknown) =>
    new BackendError({ kind: "validation", message, detail }),
  notFound: (message = "Not found.", detail?: unknown) =>
    new BackendError({ kind: "not_found", message, detail }),
  bookingConflict: (message = "This slot conflicts with an existing booking.", detail?: unknown) =>
    new BackendError({ kind: "booking_conflict", message, detail }),
  config: (message = "Service not configured.", detail?: unknown) =>
    new BackendError({ kind: "config", message, detail }),
  rateLimit: (message = "Too many requests.", detail?: unknown) =>
    new BackendError({ kind: "rate_limit", message, detail }),
  database: (message = "Something went wrong on our end.", detail?: unknown) =>
    new BackendError({ kind: "database", message, detail }),
};

export function toBackendError(err: any): BackendError {
  if (err instanceof BackendError) return err;
  // Prisma unique constraint violation
  if (err?.code === "P2002") {
    return Errors.bookingConflict("This slot was just taken. Please pick another time.", err);
  }
  if (err?.code === "P2025") {
    return Errors.notFound("The referenced record was not found.", err);
  }
  if (err instanceof Error) {
    return Errors.database(err.message || "Database error.", err);
  }
  return new BackendError({
    kind: "unknown",
    message: "An unexpected error occurred.",
    detail: err,
  });
}
