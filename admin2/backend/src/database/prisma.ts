// ============================================================
// Prisma client singleton
// - One instance per process (avoids exhausting connections in dev hot reload)
// ============================================================

import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: config.app.env === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });

if (config.app.env !== 'production') {
  globalForPrisma.__prisma = prisma;
}

// Verify DB connectivity
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected');
  } catch (err) {
    logger.error('Database connection failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
