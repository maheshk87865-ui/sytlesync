/**
 * Database Backup & Recovery Test Script
 * ------------------------------------------------------------
 * Safely tests backup creation and restoration verification
 * without modifying or overwriting the active database.
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

async function runBackupRecoveryTest() {
  console.log("================================================================");
  console.log("StyleSync (admin1) — Safe Database Backup & Recovery Test");
  console.log("================================================================");

  const activeDbPath = path.resolve(__dirname, "../db/test.db");
  const backupDir = path.resolve(__dirname, "../db/backups");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
  const restoreTestPath = path.join(backupDir, `restore-verification-${timestamp}.db`);

  // Step 1: Verify active database exists
  if (!fs.existsSync(activeDbPath)) {
    throw new Error(`Active database not found at ${activeDbPath}`);
  }
  const originalStats = fs.statSync(activeDbPath);
  console.log(`[PASS] 1. Active Database Located: ${activeDbPath} (${originalStats.size} bytes)`);

  // Step 2: Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Step 3: Perform atomic safe file copy backup
  fs.copyFileSync(activeDbPath, backupPath);
  const backupStats = fs.statSync(backupPath);
  console.log(`[PASS] 2. Backup Archive Created: ${backupPath} (${backupStats.size} bytes)`);

  if (backupStats.size !== originalStats.size) {
    throw new Error("Backup file size mismatch!");
  }

  // Step 4: Simulate restoration into an isolated verification instance
  fs.copyFileSync(backupPath, restoreTestPath);
  console.log(`[PASS] 3. Restored to Test Target: ${restoreTestPath}`);

  // Step 5: Connect Prisma to the restored database and query data integrity
  const restoredPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${restoreTestPath.replace(/\\/g, "/")}`,
      },
    },
  });

  try {
    await restoredPrisma.$connect();
    const [salonCount, userCount, serviceCount, bookingCount] = await Promise.all([
      restoredPrisma.salon.count(),
      restoredPrisma.user.count(),
      restoredPrisma.salonService.count(),
      restoredPrisma.booking.count(),
    ]);

    console.log(`[PASS] 4. Integrity Query on Restored Database:`);
    console.log(`   - Salons restored:   ${salonCount}`);
    console.log(`   - Users restored:    ${userCount}`);
    console.log(`   - Services restored: ${serviceCount}`);
    console.log(`   - Bookings restored: ${bookingCount}`);

    if (salonCount === 0 || serviceCount === 0) {
      throw new Error("Restored database verification failed: expected records missing.");
    }

    console.log("================================================================");
    console.log("BACKUP & RESTORATION VERIFICATION: SUCCESS");
    console.log("================================================================");
  } finally {
    await restoredPrisma.$disconnect();
    // Clean up temporary restore verification file
    if (fs.existsSync(restoreTestPath)) {
      fs.unlinkSync(restoreTestPath);
      console.log(`[CLEANUP] Temporary restore test file removed.`);
    }
  }
}

runBackupRecoveryTest().catch((err) => {
  console.error("Backup/Recovery Test FAILED:", err);
  process.exit(1);
});
