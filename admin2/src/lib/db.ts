// Optional Prisma client wrapper for server-side operations if needed
// Uses dynamic import or conditional typing to avoid compile failures when Prisma is not generated
let dbInstance: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client');
  const globalForPrisma = globalThis as unknown as { prisma: any };
  dbInstance = globalForPrisma.prisma ?? new PrismaClient({ log: ['query'] });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = dbInstance;
} catch {
  // Prisma client not generated yet
}

export const db = dbInstance;