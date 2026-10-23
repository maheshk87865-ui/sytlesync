// ============================================================
// HTTP server entry point
// - Boots the Express app on the configured port
// - Verifies DB connectivity at startup
// - Graceful shutdown on SIGINT/SIGTERM
// ============================================================

import { config } from './config/index.js';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './database/prisma.js';
import { logger } from './config/logger.js';

async function main() {
  // Try to connect to the database. If it fails, log a warning and continue
  // (the health endpoint will report it as down; tests can still run against the schema).
  try {
    await connectDatabase();
  } catch (err) {
    logger.warn('Continuing without a live database connection — health endpoint will report down', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const app = createApp();
  const server = app.listen(config.app.port, () => {
    logger.info(`${config.app.name} listening on port ${config.app.port}`, {
      env: config.app.env,
      port: config.app.port,
    });
  });

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed');
      process.exit(0);
    });
    // Force exit after 10 seconds if graceful shutdown stalls
    setTimeout(() => {
      logger.warn('Forcing exit after shutdown timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal error during startup', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
