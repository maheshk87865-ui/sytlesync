/**
 * Server entry point.
 * ------------------------------------------------------------
 * Starts the Express server on the configured PORT and registers
 * graceful shutdown handlers so the Prisma client disconnects
 * cleanly on SIGTERM / SIGINT.
 */

import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";
import { disconnectDb } from "./database";

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      nodeEnv: config.nodeEnv,
      apiBase: "/api/v1",
      health: `http://localhost:${config.port}/api/v1/health`,
      database: config.isDatabaseConfigured ? "configured" : "not configured (will report degraded)",
      auth: config.isJwtConfigured ? "configured" : "dev secret",
      ai: config.isAiConfigured ? config.aiModelLabel : "demo pixel-analysis",
    },
    "StyleSync Customer Backend started"
  );
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received, closing server...");
  server.close(async () => {
    await disconnectDb();
    logger.info("Server closed, database disconnected. Exiting.");
    process.exit(0);
  });
  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => {
    logger.warn("Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Catch unhandled errors so they don't crash the process silently
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err: err.message, stack: err.stack }, "Uncaught exception");
  // Don't exit immediately — let the request finish. If the error is
  // fatal, the next request will trigger another exit path.
});

export { server, app };
