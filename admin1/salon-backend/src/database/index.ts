/**
 * Prisma client singleton + DB reachability checks.
 *
 * For PostgreSQL: TCP socket probe (avoids Prisma crashes when DB is down).
 * For SQLite: file existence check (no network involved).
 */

import { PrismaClient } from "@prisma/client";
import { config } from "../config";
import { logger } from "../utils/logger";

let prismaClient: PrismaClient | null = null;
let connectionLogged = false;

let dbReachableCache: { ok: boolean; checkedAt: number } | null = null;
const DB_CHECK_CACHE_MS = 10_000;

export async function isDbReachable(): Promise<boolean> {
  if (dbReachableCache && Date.now() - dbReachableCache.checkedAt < DB_CHECK_CACHE_MS) {
    return dbReachableCache.ok;
  }

  if (!config.isDatabaseConfigured) {
    dbReachableCache = { ok: false, checkedAt: Date.now() };
    return false;
  }

  // SQLite — file-based, no network probe
  if (config.databaseUrl.startsWith("file:")) {
    try {
      const fs = await import("fs");
      const filePath = config.databaseUrl.replace(/^file:/, "").replace(/\?.*$/, "");
      const candidate = filePath || "./db/test.db";
      if (candidate.includes(":memory:") || fs.existsSync(candidate)) {
        dbReachableCache = { ok: true, checkedAt: Date.now() };
        return true;
      }
      dbReachableCache = { ok: false, checkedAt: Date.now() };
      return false;
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
    // use defaults
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

export function isDbConfigured(): boolean {
  return config.isDatabaseConfigured;
}

export function getDb(): PrismaClient {
  if (prismaClient) return prismaClient;
  if (!config.isDatabaseConfigured && !connectionLogged) {
    logger.warn(
      "[database] DATABASE_URL is not configured. Backend will start but DB-dependent routes will return 'not configured' errors."
    );
    connectionLogged = true;
  }
  prismaClient = new PrismaClient({
    log: config.isDev ? ["warn", "error"] : ["error"],
  });
  return prismaClient;
}

export async function pingDatabase(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  if (!config.isDatabaseConfigured) {
    return { ok: false, error: "DATABASE_URL not configured" };
  }
  const start = Date.now();
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

  let host = "localhost";
  let port = 5432;
  try {
    const url = new URL(config.databaseUrl);
    host = url.hostname;
    port = parseInt(url.port, 10) || 5432;
  } catch { /* defaults */ }

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
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, error: `Database not reachable at ${host}:${port}` };
  }
}

export async function disconnectDb(): Promise<void> {
  if (prismaClient) {
    try { await prismaClient.$disconnect(); } catch { /* best-effort */ }
  }
}
