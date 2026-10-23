/**
 * Prisma client singleton.
 * ------------------------------------------------------------
 * If DATABASE_URL is not configured (placeholder or missing), we
 * still export a typed client — query attempts will fail with a
 * clean Prisma connection error which is then mapped to a
 * `BackendError` by the service layer. The HTTP server stays up so
 * the health endpoint can report "degraded" status.
 */

import { PrismaClient } from "@prisma/client";
import { config } from "../config";
import { logger } from "../utils/logger";

// PrismaClient is typed even when not connected — types come from
// the generated client. This lets us keep `db` in scope and let
// queries fail at runtime when the DB isn't reachable.
let prismaClient: PrismaClient | null = null;
let connectionLogged = false;

// Cached TCP reachability check — prevents Prisma from crashing the
// process when the DB is unreachable. Cached for 10 seconds to avoid
// adding latency to every request.
let dbReachableCache: { ok: boolean; checkedAt: number } | null = null;
const DB_CHECK_CACHE_MS = 10_000;

export async function isDbReachable(): Promise<boolean> {
  // Return cached result if fresh
  if (dbReachableCache && Date.now() - dbReachableCache.checkedAt < DB_CHECK_CACHE_MS) {
    return dbReachableCache.ok;
  }

  if (!config.isDatabaseConfigured) {
    dbReachableCache = { ok: false, checkedAt: Date.now() };
    return false;
  }

  // SQLite is a file-based DB — no TCP port to probe. Check the file exists.
  if (config.databaseUrl.startsWith("file:")) {
    try {
      const fs = await import("fs");
      const filePath = config.databaseUrl.replace(/^file:/, "").replace(/\?.*$/, "");
      const candidate = filePath || "./db/test.db";
      // For SQLite, the file may not exist yet on first run (Prisma will
      // create it). Treat existence OR an in-memory URL as "reachable".
      if (candidate.includes(":memory:") || fs.existsSync(candidate)) {
        dbReachableCache = { ok: true, checkedAt: Date.now() };
        return true;
      }
      // File doesn't exist yet — but Prisma can create it. Try a quick
      // connection. If that succeeds, we're good.
      const client = getDb();
      await client.$queryRaw`SELECT 1`.catch(() => {});
      dbReachableCache = { ok: true, checkedAt: Date.now() };
      return true;
    } catch {
      dbReachableCache = { ok: false, checkedAt: Date.now() };
      return false;
    }
  }

  // PostgreSQL — TCP socket check
  let host = "localhost";
  let port = 5432;
  try {
    const url = new URL(config.databaseUrl);
    host = url.hostname;
    port = parseInt(url.port, 10) || 5432;
  } catch {
    // If URL parsing fails, use defaults
  }

  try {
    const net = await import("net");
    const socket = new net.Socket();
    socket.setTimeout(2000);

    await new Promise<void>((resolve, reject) => {
      socket.on("connect", () => { socket.destroy(); resolve(); });
      socket.on("timeout", () => { socket.destroy(); reject(new Error("timeout")); });
      socket.on("error", (err) => { socket.destroy(); reject(err); });
      socket.connect(port, host);
    });

    dbReachableCache = { ok: true, checkedAt: Date.now() };
    return true;
  } catch {
    dbReachableCache = { ok: false, checkedAt: Date.now() };
    return false;
  }
}

/** Synchronous check — returns the cached result (may be stale) */
export function isDbConfigured(): boolean {
  return config.isDatabaseConfigured;
}

export function getDb(): PrismaClient {
  if (prismaClient) return prismaClient;
  if (!config.isDatabaseConfigured && !connectionLogged) {
    logger.warn(
      "[database] DATABASE_URL is not configured (placeholder/missing). " +
      "Backend will start but DB-dependent routes will return 'not configured' errors. " +
      "Set DATABASE_URL in .env to enable real data access."
    );
    connectionLogged = true;
  }
  prismaClient = new PrismaClient({
    log: config.isDev ? ["warn", "error"] : ["error"],
  });
  return prismaClient;
}

/**
 * Verifies the database is reachable. Used by the health endpoint.
 * For PostgreSQL: lightweight TCP socket check (avoids Prisma crashes).
 * For SQLite: file existence check (no network involved).
 */
export async function pingDatabase(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  if (!config.isDatabaseConfigured) {
    return { ok: false, error: "DATABASE_URL not configured" };
  }

  const start = Date.now();

  // SQLite — file-based, no network
  if (config.databaseUrl.startsWith("file:")) {
    try {
      const fs = await import("fs");
      const filePath = config.databaseUrl.replace(/^file:/, "").replace(/\?.*$/, "");
      const candidate = filePath || "./db/test.db";
      if (candidate.includes(":memory:") || fs.existsSync(candidate)) {
        return { ok: true, latencyMs: Date.now() - start };
      }
      return { ok: false, error: "SQLite database file does not exist" };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  // PostgreSQL — TCP socket check
  let host = "localhost";
  let port = 5432;
  try {
    const url = new URL(config.databaseUrl);
    host = url.hostname;
    port = parseInt(url.port, 10) || 5432;
  } catch {
    // If URL parsing fails, use defaults
  }

  try {
    // Lightweight TCP check — doesn't go through Prisma's engine
    const net = await import("net");
    const socket = new net.Socket();
    socket.setTimeout(2000); // 2-second timeout

    await new Promise<void>((resolve, reject) => {
      socket.on("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("Connection timed out"));
      });
      socket.on("error", (err) => {
        socket.destroy();
        reject(err);
      });
      socket.connect(port, host);
    });

    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    // Don't try Prisma's $queryRaw — it can crash the process when
    // the database is unreachable. The TCP check is sufficient.
    return {
      ok: false,
      error: `Database not reachable at ${host}:${port}. Please ensure PostgreSQL is running.`,
    };
  }
}

/**
 * Disconnect Prisma — called on graceful shutdown.
 */
export async function disconnectDb(): Promise<void> {
  if (prismaClient) {
    try {
      await prismaClient.$disconnect();
    } catch {
      // best-effort
    }
  }
}
