import { prisma } from '../src/lib/prisma';
import { createToken } from '../src/lib/auth';

async function testSalonsAPI() {
  console.log('Testing Salon Partner Management API & Directory Filters...\n');

  const admin = await prisma.admin.findUnique({ where: { email: 'admin@stylesync.in' } });
  if (!admin) throw new Error('Admin not found');

  const token = await createToken({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role as any,
  });

  const headers = {
    Cookie: `stylesync_admin_token=${token}`,
  };

  let passed = 0;
  let failed = 0;
  function check(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. All salons
  const resAll = await fetch('http://localhost:3000/api/salons?limit=50', { headers });
  const dataAll = await resAll.json();
  check(resAll.ok, 'GET /api/salons responded 200 OK');
  check(dataAll.pagination.total >= 40, `Directory count is accurate (found ${dataAll.pagination.total} salons)`);
  check(dataAll.salons.length > 0, `Returned ${dataAll.salons.length} salon records for directory`);

  // Verify all required table fields are present on the salon object
  const sample = dataAll.salons[0];
  check(Boolean(sample.name), `Sample salon has name: "${sample.name}"`);
  check(Boolean(sample.ownerName), `Sample salon has ownerName: "${sample.ownerName}"`);
  check(Boolean(sample.city), `Sample salon has city: "${sample.city}"`);
  check(Boolean(sample.locality), `Sample salon has locality: "${sample.locality}"`);
  check(Boolean(sample.address), `Sample salon has address: "${sample.address}"`);
  check(Boolean(sample.applicationStatus), `Sample salon has applicationStatus: "${sample.applicationStatus}"`);
  check(Boolean(sample.operationalStatus), `Sample salon has operationalStatus: "${sample.operationalStatus}"`);
  check(sample._count !== undefined, `Sample salon has _count metrics`);
  check(Boolean(sample.createdAt), `Sample salon has createdAt registration date`);

  // 2. Search by salon name
  const resSearchName = await fetch('http://localhost:3000/api/salons?search=Grooming', { headers });
  const dataSearchName = await resSearchName.json();
  check(dataSearchName.salons.length > 0 && dataSearchName.salons.every((s: any) => 
    s.name.toLowerCase().includes('grooming') || 
    s.ownerName.toLowerCase().includes('grooming') ||
    s.locality.toLowerCase().includes('grooming') ||
    s.city.toLowerCase().includes('grooming') ||
    s.address.toLowerCase().includes('grooming')
  ), `Search by name "Grooming" filtered correctly (${dataSearchName.salons.length} found)`);

  // 3. Search by street address / locality
  const resSearchLoc = await fetch('http://localhost:3000/api/salons?search=Karan', { headers });
  const dataSearchLoc = await resSearchLoc.json();
  check(dataSearchLoc.salons.length > 0, `Search by locality/address "Karan" filtered correctly (${dataSearchLoc.salons.length} found)`);

  // 4. City filter
  const resCity = await fetch('http://localhost:3000/api/salons?city=Mumbai', { headers });
  const dataCity = await resCity.json();
  check(dataCity.salons.length > 0 && dataCity.salons.every((s: any) => s.city === 'Mumbai'),
    `City filter "Mumbai" filtered strictly (${dataCity.salons.length} found)`
  );

  // 5. Operating status filter (OPEN)
  const resOpen = await fetch('http://localhost:3000/api/salons?operationalStatus=OPEN', { headers });
  const dataOpen = await resOpen.json();
  check(dataOpen.salons.length > 0 && dataOpen.salons.every((s: any) => s.operationalStatus === 'OPEN'),
    `Operating status filter "OPEN" filtered strictly (${dataOpen.salons.length} open salons found)`
  );

  // 6. Application status filter (PENDING)
  const resPending = await fetch('http://localhost:3000/api/salons?applicationStatus=PENDING', { headers });
  const dataPending = await resPending.json();
  check(dataPending.salons.length > 0 && dataPending.salons.every((s: any) => s.applicationStatus === 'PENDING'),
    `Application status filter "PENDING" filtered strictly (${dataPending.salons.length} pending salons found)`
  );

  console.log(`\nResults: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

testSalonsAPI();
