/**
 * Database guard middleware.
 * ------------------------------------------------------------
 * Checks if the database is reachable before allowing the request
 * to proceed to the handler. If the DB is unreachable, returns
 * 503 immediately — preventing Prisma from crashing the process
 * when it tries to connect to a non-existent database server.
 *
 * Uses a cached TCP check (10s cache) to avoid adding latency
 * to every request.
 */

import type { Request, Response, NextFunction } from "express";
import { isDbReachable } from "../database";
import { config } from "../config";
import { Errors } from "../utils/errors";
import { sendError } from "../utils/response";

/**
 * Express middleware — returns 503 if the database isn't reachable.
 * Use on any route that queries the database:
 *   router.get("/", guardDatabase, list);
 */
export async function guardDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!config.isDatabaseConfigured) {
    sendError(res, Errors.config("Database is not configured. Set DATABASE_URL in .env"));
    return;
  }
  const reachable = await isDbReachable();
  if (!reachable) {
    sendError(res, Errors.config("Database is not reachable. Please ensure PostgreSQL is running and try again."));
    return;
  }
  next();
}
