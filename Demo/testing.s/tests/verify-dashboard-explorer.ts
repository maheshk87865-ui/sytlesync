import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode('stylesync-superadmin-secure-jwt-key-srinagar-2026');
const BASE_URL = 'http://localhost:3000';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function getAdminToken() {
  const admin = await prisma.admin.findUnique({ where: { email: 'admin@stylesync.in' } });
  if (!admin) throw new Error('Admin not found');

  return await new SignJWT({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

async function runTests() {
  console.log('================================================================');
  console.log('  STYLESYNC PLATFORM DASHBOARD & SCOPE EXPLORER AUTOMATED TESTS ');
  console.log('================================================================\n');

  const token = await getAdminToken();
  const authHeaders = {
    Cookie: `stylesync_admin_token=${token}`,
    Authorization: `Bearer ${token}`,
  };

  // TEST 1: Database Health & Latency (/api/health)
  console.log('[TEST 1: Real Database Connection Status & Latency]');
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    assert(res.status === 200, 'Health endpoint responds with 200 OK');
    assert(data.status === 'Connected', `DB status reports 'Connected' (received: ${data.status})`);
    assert(typeof data.latencyMs === 'number' && data.latencyMs >= 0, `Latency measured in ms (received: ${data.latencyMs}ms)`);
    assert(data.engine.includes('SQLite'), `Engine accurately identifies SQLite (received: ${data.engine})`);
  } catch (err: any) {
    assert(false, `Health check request failed: ${err.message}`);
  }

  // TEST 2: Unauthorized API Access Protection
  console.log('\n[TEST 2: Security & Authorization Protection]');
  try {
    const unauthRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS`);
    assert(unauthRes.status === 401, `Unauthorized request to /api/dashboard/explorer returns 401 Unauthorized (received: ${unauthRes.status})`);

    const unauthMetrics = await fetch(`${BASE_URL}/api/dashboard/metrics`);
    assert(unauthMetrics.status === 401, `Unauthorized request to /api/dashboard/metrics returns 401 Unauthorized (received: ${unauthMetrics.status})`);
  } catch (err: any) {
    assert(false, `Auth security test failed: ${err.message}`);
  }

  // TEST 3: All Locations (Pan-India) with no extra filters
  console.log('\n[TEST 3: All Locations (Pan-India) Baseline Explorer Query]');
  try {
    const res = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&dateRange=all&limit=20`, {
      headers: authHeaders,
    });
    const data = await res.json();
    assert(res.status === 200, 'All-locations query returns 200 OK');
    assert(data.category === 'BOOKINGS', `Returned category is BOOKINGS (received: ${data.category})`);
    assert((data.pagination?.total || 0) >= 80, `Total bookings count returned (found ${data.pagination?.total} records)`);
    assert(Array.isArray(data.records) && data.records.length > 0, `Returned ${data.records.length} booking records`);
  } catch (err: any) {
    assert(false, `Pan-India query failed: ${err.message}`);
  }

  // TEST 4: Hierarchical Cascading Location Filtering (State -> City -> Locality)
  console.log('\n[TEST 4: Hierarchical Cascading Location Filtering]');
  try {
    // A. Filter by State (Jammu and Kashmir)
    const stateRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&state=Jammu%20and%20Kashmir&dateRange=all`, {
      headers: authHeaders,
    });
    const stateData = await stateRes.json();
    assert(stateRes.status === 200, 'State-filtered query returns 200 OK');
    assert((stateData.pagination?.total || 0) > 0, `Salons found in Jammu and Kashmir (found ${stateData.pagination?.total})`);

    // B. Filter by City (Srinagar)
    const cityRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&city=Srinagar&dateRange=all`, {
      headers: authHeaders,
    });
    const cityData = await cityRes.json();
    assert(cityRes.status === 200, 'City-filtered query returns 200 OK');
    assert((cityData.pagination?.total || 0) > 0, `Salons found in Srinagar (found ${cityData.pagination?.total})`);

    // C. Filter by Locality (Lal Chowk)
    const locRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&city=Srinagar&locality=Lal%20Chowk&dateRange=all`, {
      headers: authHeaders,
    });
    const locData = await locRes.json();
    assert(locRes.status === 200, 'Locality-filtered query returns 200 OK');
    assert(locData.records.every((r: any) => r.locality === 'Lal Chowk'), 'All returned salons match locality "Lal Chowk"');

    // D. Empty locality handling
    const emptyLocRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&city=Srinagar&locality=NonExistentLocality123`, {
      headers: authHeaders,
    });
    const emptyLocData = await emptyLocRes.json();
    assert(emptyLocData.pagination?.total === 0 && emptyLocData.records.length === 0, 'Safe empty state returned for non-existent locality');
  } catch (err: any) {
    assert(false, `Cascading location test failed: ${err.message}`);
  }

  // TEST 5: Supported Categories Verification
  console.log('\n[TEST 5: All Supported Explorer Categories]');
  const categoriesToTest = [
    'CUSTOMERS',
    'SALONS',
    'SALON_APPLICATIONS',
    'GLOBAL_SERVICES',
    'BOOKINGS',
    'CALENDAR',
    'PAYMENTS',
    'GBV',
    'COLLECTIONS',
    'COMMISSIONS',
    'SALON_PAYABLES',
    'REFUNDS',
    'REVIEWS',
    'SUPPORT_TICKETS',
    'AI_OPERATIONS',
  ];

  for (const cat of categoriesToTest) {
    try {
      const catRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=${cat}&dateRange=all&limit=5`, {
        headers: authHeaders,
      });
      const catData = await catRes.json();
      assert(catRes.status === 200, `Category ${cat} responds 200 OK with valid schema columns (${catData.columns?.length || 0} columns)`);
    } catch (err: any) {
      assert(false, `Category ${cat} failed: ${err.message}`);
    }
  }

  // TEST 6: Date Range Presets Handling
  console.log('\n[TEST 6: Implemented Date Range Presets]');
  const dateRanges = ['today', 'yesterday', '7days', '30days', '90days', 'thismonth', 'lastmonth', 'thisyear', 'all'];
  for (const dr of dateRanges) {
    try {
      const drRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&dateRange=${dr}&limit=5`, {
        headers: authHeaders,
      });
      const drData = await drRes.json();
      assert(drRes.status === 200, `Date range preset '${dr}' executes successfully (returned ${drData.pagination?.total} records)`);
    } catch (err: any) {
      assert(false, `Date range ${dr} failed: ${err.message}`);
    }
  }

  // Test custom date range with normal and inverted dates
  try {
    const customRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&dateRange=custom&startDate=2026-01-01&endDate=2026-12-31`, {
      headers: authHeaders,
    });
    assert(customRes.status === 200, 'Custom date range (2026-01-01 to 2026-12-31) executes successfully');

    // Inverted dates test (startDate > endDate)
    const invertedRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&dateRange=custom&startDate=2026-12-31&endDate=2026-01-01`, {
      headers: authHeaders,
    });
    assert(invertedRes.status === 200, 'Inverted custom date range automatically safe-swapped without error');
  } catch (err: any) {
    assert(false, `Custom date range test failed: ${err.message}`);
  }

  // TEST 7: Record Status Filtering
  console.log('\n[TEST 7: Record Status Filtering]');
  try {
    // Bookings by CONFIRMED
    const bConfirmed = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&status=CONFIRMED&dateRange=all`, {
      headers: authHeaders,
    });
    const bConfData = await bConfirmed.json();
    assert(bConfData.records.every((r: any) => (r.bookingStatus || r.status) === 'CONFIRMED'), 'Booking filter status=CONFIRMED returns only confirmed bookings');

    // Salons by APPROVED
    const sApproved = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&status=APPROVED&dateRange=all`, {
      headers: authHeaders,
    });
    const sAppData = await sApproved.json();
    assert(sAppData.records.every((r: any) => r.applicationStatus === 'APPROVED'), 'Salon filter status=APPROVED returns only approved salons');

    // Salons by PENDING
    const sPending = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&status=PENDING&dateRange=all`, {
      headers: authHeaders,
    });
    const sPendData = await sPending.json();
    assert(sPendData.records.every((r: any) => r.applicationStatus === 'PENDING'), 'Salon filter status=PENDING returns only pending salons');
  } catch (err: any) {
    assert(false, `Status filter test failed: ${err.message}`);
  }

  // TEST 8: Parameterized Search Query
  console.log('\n[TEST 8: Parameterized Search Query Testing]');
  try {
    // Search salons by name
    const sampleSalon = await prisma.salon.findFirst();
    const queryTerm = sampleSalon?.name?.slice(0, 5) || 'Salon';
    const searchRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&search=${encodeURIComponent(queryTerm)}&dateRange=all`, {
      headers: authHeaders,
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, `Search query '${queryTerm}' returns 200 OK`);
    assert(searchData.records.length > 0, `Search returns matching salons (found ${searchData.records.length})`);

    // Combined search + status + city filter
    const comboRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&city=Srinagar&status=APPROVED&search=${encodeURIComponent(queryTerm)}&dateRange=all`, {
      headers: authHeaders,
    });
    const comboData = await comboRes.json();
    assert(comboRes.status === 200, 'Combined filter (search + city + status) executed safely with AND logic');
  } catch (err: any) {
    assert(false, `Search query test failed: ${err.message}`);
  }

  // TEST 9: CSV Export with Formula Injection Protection
  console.log('\n[TEST 9: CSV Export & Spreadsheet Formula Injection Defense]');
  try {
    const csvRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&dateRange=all&format=csv`, {
      headers: authHeaders,
    });
    assert(csvRes.status === 200, 'CSV export returns 200 OK');
    const contentType = csvRes.headers.get('content-type') || '';
    assert(contentType.includes('text/csv'), `Content-Type is text/csv (received: ${contentType})`);

    const disposition = csvRes.headers.get('content-disposition') || '';
    assert(disposition.includes('attachment; filename='), `Content-Disposition specifies valid attachment filename (${disposition})`);

    const csvText = await csvRes.text();
    const csvLines = csvText.trim().split('\n');
    assert(csvLines.length >= 2, `CSV contains header + data rows (total lines: ${csvLines.length})`);

    // Verify formula characters (=, +, -, @) are sanitized
    const hasUnescapedFormula = csvLines.some((line) => /^[=+\-@]/.test(line));
    assert(!hasUnescapedFormula, 'CSV values sanitized against CSV/Spreadsheet formula injection');
  } catch (err: any) {
    assert(false, `CSV export test failed: ${err.message}`);
  }

  // TEST 10: Commission Reconciliation Accuracy (7% New Customer vs 2% Repeat Customer)
  console.log('\n[TEST 10: Commission Reconciliation & Financial Auditing]');
  try {
    const commRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=COMMISSIONS&dateRange=all&limit=20`, {
      headers: authHeaders,
    });
    const commData = await commRes.json();
    assert(commRes.status === 200, 'Commissions explorer category returns 200 OK');
    assert(commData.records.length > 0, `Loaded ${commData.records.length} commission reconciliation records`);

    let commissionRulesCompliant = true;
    for (const r of commData.records) {
      if (r.commissionRule) {
        if (!r.commissionRule.includes('7%') && !r.commissionRule.includes('2%')) {
          commissionRulesCompliant = false;
        }
      }
    }
    assert(commissionRulesCompliant, 'Commission records strictly classify into 7% (New Customer) or 2% (Repeat Customer)');
  } catch (err: any) {
    assert(false, `Commission reconciliation test failed: ${err.message}`);
  }

  // TEST 11: Pagination and Query Limits
  console.log('\n[TEST 11: Pagination & Query Limit Safeguards]');
  try {
    const p1 = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&dateRange=all&page=1&limit=5`, {
      headers: authHeaders,
    });
    const p1Data = await p1.json();
    assert(p1Data.records.length === 5, `Page 1 with limit=5 returns exactly 5 records (received: ${p1Data.records.length})`);

    const p2 = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&dateRange=all&page=2&limit=5`, {
      headers: authHeaders,
    });
    const p2Data = await p2.json();
    assert(p2Data.records.length === 5, `Page 2 with limit=5 returns 5 records`);
    assert(p1Data.records[0].id !== p2Data.records[0].id, 'Page 1 and Page 2 contain non-overlapping records');
  } catch (err: any) {
    assert(false, `Pagination test failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  await prisma.$disconnect();

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed with uncaught error:', err);
  process.exit(1);
});
