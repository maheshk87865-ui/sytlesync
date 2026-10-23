/**
 * Quick SQLite table inspector — prints all tables + their row counts.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log("Tables:", JSON.stringify(tables, null, 2));
  } catch (e) {
    console.error("Query failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
