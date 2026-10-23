import { SignJWT } from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode('stylesync-superadmin-secure-jwt-key-srinagar-2026');

async function testFilteredCsv() {
  const admin = await prisma.admin.findUnique({ where: { email: 'admin@stylesync.in' } });
  if (!admin) throw new Error('Admin not found');

  const token = await new SignJWT({ id: admin.id, email: admin.email, name: admin.name, role: admin.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  const authHeaders = { Cookie: 'stylesync_admin_token=' + token, Authorization: 'Bearer ' + token };

  // 1. JSON query: Salons in Srinagar with status APPROVED
  const jsonRes = await fetch('http://localhost:3000/api/dashboard/explorer?category=SALONS&city=Srinagar&status=APPROVED&dateRange=all', { headers: authHeaders });
  const jsonData = await jsonRes.json();

  // 2. CSV query: same filters
  const csvRes = await fetch('http://localhost:3000/api/dashboard/explorer?category=SALONS&city=Srinagar&status=APPROVED&dateRange=all&format=csv', { headers: authHeaders });
  const csvText = await csvRes.text();
  const csvLines = csvText.trim().split('\n');
  const dataRowCount = csvLines.length - 1; // minus header

  console.log('JSON matching records:', jsonData.pagination.total);
  console.log('CSV data rows count:', dataRowCount);

  if (jsonData.pagination.total === dataRowCount) {
    console.log('SUCCESS: CSV export row count matches JSON filtered results count exactly (' + dataRowCount + ')');
  } else {
    console.error('MISMATCH: JSON count ' + jsonData.pagination.total + ' vs CSV count ' + dataRowCount);
    process.exit(1);
  }
}

testFilteredCsv().then(() => prisma.$disconnect()).catch((err) => {
  console.error(err);
  process.exit(1);
});
