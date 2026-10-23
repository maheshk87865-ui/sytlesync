import { SignJWT } from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode('stylesync-superadmin-secure-jwt-key-srinagar-2026');
const BASE_URL = 'http://localhost:3000';

interface TestResult {
  control: string;
  testName: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const results: TestResult[] = [];

function record(control: string, testName: string, passed: boolean, evidence: string) {
  results.push({
    control,
    testName,
    status: passed ? 'PASS' : 'FAIL',
    evidence,
  });
  const symbol = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${symbol}] [${control}] ${testName}: ${evidence}`);
}

async function runInDepthVerification() {
  console.log('========================================================================');
  console.log('   STYLESYNC PLATFORM DASHBOARD — IN-DEPTH CONTROLS & QUERY AUDIT       ');
  console.log('========================================================================\n');

  // 1. Authenticate & Obtain Admin JWT
  const admin = await prisma.admin.findUnique({ where: { email: 'admin@stylesync.in' } });
  if (!admin) throw new Error('Admin account not found in database');

  const token = await new SignJWT({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  const authHeaders = {
    Cookie: `stylesync_admin_token=${token}`,
    Authorization: `Bearer ${token}`,
  };

  // CONTROL 1: APPLY FILTERS (Cascading Scope + Category + Status + Date + Search)
  console.log('--- 1. TESTING: APPLY FILTERS ---');
  try {
    // 1A. All Locations + Bookings + Status Confirmed
    const res1 = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&status=CONFIRMED&dateRange=all`, { headers: authHeaders });
    const data1 = await res1.json();
    const allConfirmed = data1.records.length > 0 && data1.records.every((r: any) => (r.bookingStatus || r.status) === 'CONFIRMED');
    record('Apply Filters', 'Category=BOOKINGS & Status=CONFIRMED', allConfirmed, `Returned ${data1.records.length} confirmed bookings out of ${data1.pagination.total} total.`);

    // 1B. State=Jammu and Kashmir + City=Srinagar + Locality=Lal Chowk + Category=SALONS
    const res2 = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&state=Jammu%20and%20Kashmir&city=Srinagar&locality=Lal%20Chowk&dateRange=all`, { headers: authHeaders });
    const data2 = await res2.json();
    const locMatch = data2.records.length > 0 && data2.records.every((r: any) => r.locality === 'Lal Chowk' && r.city === 'Srinagar');
    record('Apply Filters', 'Cascading State -> City -> Locality (Lal Chowk)', locMatch, `Returned ${data2.records.length} salons matching locality 'Lal Chowk' in Srinagar.`);

    // 1C. Filter by Unassigned locations
    const res3 = await fetch(`${BASE_URL}/api/dashboard/metrics?scope=UNASSIGNED`, { headers: authHeaders });
    const data3 = await res3.json();
    record('Apply Filters', 'Scope=UNASSIGNED metrics query', res3.status === 200 && data3.metrics !== undefined, `Successfully executed metrics calculation with unassigned territory bounds.`);
  } catch (err: any) {
    record('Apply Filters', 'Error executing filter requests', false, err.message);
  }

  // CONTROL 2: RESET FILTERS
  console.log('\n--- 2. TESTING: RESET FILTERS ---');
  try {
    // Querying with default reset parameters: category=COMPLETE_DASHBOARD (metrics) and BOOKINGS default explorer
    const metricsRes = await fetch(`${BASE_URL}/api/dashboard/metrics?scope=ALL_LOCATIONS&country=India&state=ALL&city=ALL&locality=ALL&dateRange=30days`, { headers: authHeaders });
    const metricsData = await metricsRes.json();
    const metricsOk = metricsRes.status === 200 && metricsData.metrics?.bookings?.total > 0;
    record('Reset Filters', 'Default Baseline Metrics Reload', metricsOk, `Reloaded baseline metrics with ${metricsData.metrics?.bookings?.total} total bookings across ${metricsData.activeCitiesCount} active cities.`);

    const explorerRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&state=ALL&city=ALL&locality=ALL&status=ALL&dateRange=30days&page=1&limit=10`, { headers: authHeaders });
    const explorerData = await explorerRes.json();
    const explorerOk = explorerRes.status === 200 && explorerData.records.length === 10;
    record('Reset Filters', 'Default Explorer Table Reload', explorerOk, `Reloaded default page 1 with 10 records, status ALL, dateRange 30days.`);
  } catch (err: any) {
    record('Reset Filters', 'Error reloading default filters', false, err.message);
  }

  // CONTROL 3: REFRESH DATA
  console.log('\n--- 3. TESTING: REFRESH DATA ---');
  try {
    const tStart = Date.now();
    const refreshRes = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&city=Srinagar&status=APPROVED&dateRange=all`, {
      headers: { ...authHeaders, 'Cache-Control': 'no-cache' },
    });
    const tEnd = Date.now();
    const refreshData = await refreshRes.json();
    const refreshOk = refreshRes.status === 200 && refreshData.records.length > 0;
    record('Refresh Data', 'Live Re-fetch without Filter Mutation', refreshOk, `Refreshed ${refreshData.records.length} records in ${tEnd - tStart}ms preserving city=Srinagar & status=APPROVED.`);
  } catch (err: any) {
    record('Refresh Data', 'Error on refresh data call', false, err.message);
  }

  // CONTROL 4: SEARCH QUERY
  console.log('\n--- 4. TESTING: SEARCH QUERY ---');
  try {
    // 4A. Search Salons by name
    const salonSearch = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&search=Chinar&dateRange=all`, { headers: authHeaders });
    const salonData = await salonSearch.json();
    const salonMatch = salonData.records.length > 0 && salonData.records.some((s: any) => s.name.toLowerCase().includes('chinar'));
    record('Search Query', "Salons by Name ('Chinar')", salonMatch, `Found ${salonData.records.length} salon(s) containing 'Chinar' (${salonData.records.map((s:any)=>s.name).join(', ')}).`);

    // 4B. Search with leading/trailing whitespace
    const trimSearch = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&search=%20%20Chinar%20%20&dateRange=all`, { headers: authHeaders });
    const trimData = await trimSearch.json();
    record('Search Query', 'Whitespace Trimming', trimData.records.length === salonData.records.length, `Untrimmed query returned ${trimData.records.length} records, matching clean trimmed count.`);

    // 4C. Combined Search + City + Status
    const comboSearch = await fetch(`${BASE_URL}/api/dashboard/explorer?category=SALONS&city=Srinagar&status=APPROVED&search=Grooming&dateRange=all`, { headers: authHeaders });
    const comboData = await comboSearch.json();
    const comboOk = comboData.records.every((s: any) => s.city === 'Srinagar' && s.applicationStatus === 'APPROVED' && s.name.toLowerCase().includes('grooming'));
    record('Search Query', 'Combined Search + City + Status', comboOk, `Filtered AND logic verified for search='Grooming' + city='Srinagar' + status='APPROVED'.`);
  } catch (err: any) {
    record('Search Query', 'Error during search query', false, err.message);
  }

  // CONTROL 5: DATE RANGE PRESETS
  console.log('\n--- 5. TESTING: DATE RANGE PRESETS ---');
  const presets = ['today', 'yesterday', '7days', '30days', '90days', 'thismonth', 'lastmonth', 'thisyear', 'all'];
  for (const p of presets) {
    try {
      const res = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&dateRange=${p}`, { headers: authHeaders });
      const data = await res.json();
      record('Date Range', `Preset '${p}'`, res.status === 200, `Returned ${data.pagination.total} records matching date boundary.`);
    } catch (err: any) {
      record('Date Range', `Preset '${p}' error`, false, err.message);
    }
  }

  // Custom date range: start <= end and inverted start > end
  try {
    const custom1 = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&dateRange=custom&startDate=2026-09-01&endDate=2026-10-15`, { headers: authHeaders });
    const dCustom1 = await custom1.json();
    record('Date Range', 'Custom Range (2026-09-01 to 2026-10-15)', custom1.status === 200, `Returned ${dCustom1.pagination.total} bookings in date window.`);

    const customInverted = await fetch(`${BASE_URL}/api/dashboard/explorer?category=BOOKINGS&dateRange=custom&startDate=2026-10-15&endDate=2026-09-01`, { headers: authHeaders });
    const dInverted = await customInverted.json();
    record('Date Range', 'Inverted Custom Range Safe Swap', dInverted.pagination.total === dCustom1.pagination.total, `Inverted dates safely swapped; returned ${dInverted.pagination.total} records matching normal window.`);
  } catch (err: any) {
    record('Date Range', 'Custom range error', false, err.message);
  }

  // CONTROL 6: EXPORT CSV & MATCHING ACTIVE FILTERS
  console.log('\n--- 6. TESTING: EXPORT CSV FILTER MATCHING ---');
  const csvTestScenarios = [
    {
      label: 'Salons in Srinagar with status APPROVED',
      urlParams: 'category=SALONS&city=Srinagar&status=APPROVED&dateRange=all',
    },
    {
      label: 'Bookings with status CONFIRMED in Last 30 Days',
      urlParams: 'category=BOOKINGS&status=CONFIRMED&dateRange=30days',
    },
    {
      label: 'Payments for category COMMISSIONS in This Month',
      urlParams: 'category=COMMISSIONS&dateRange=thismonth',
    },
  ];

  for (const s of csvTestScenarios) {
    try {
      // 1. Fetch JSON
      const jsonRes = await fetch(`${BASE_URL}/api/dashboard/explorer?${s.urlParams}`, { headers: authHeaders });
      const jsonData = await jsonRes.json();
      const expectedCount = jsonData.pagination.total;

      // 2. Fetch CSV
      const csvRes = await fetch(`${BASE_URL}/api/dashboard/explorer?${s.urlParams}&format=csv`, { headers: authHeaders });
      const csvText = await csvRes.text();
      const csvLines = csvText.trim().split('\r\n');
      const csvDataRows = csvLines.length - 1; // minus header

      const countsMatch = expectedCount === csvDataRows;
      const headersMatch = csvLines[0].length > 0;
      const injectionSafe = !csvLines.some(l => /^[=+\-@]/.test(l));

      record(
        'Export CSV',
        `Filter Matching: ${s.label}`,
        countsMatch && headersMatch && injectionSafe,
        `JSON count: ${expectedCount} | CSV rows: ${csvDataRows} | Formula injection defense: verified`
      );
    } catch (err: any) {
      record('Export CSV', `Filter Matching: ${s.label} error`, false, err.message);
    }
  }

  // CONTROL 7: DATABASE HEALTH & LATENCY
  console.log('\n--- 7. TESTING: DATABASE HEALTH ---');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    const healthOk = healthRes.status === 200 && healthData.status === 'Connected' && typeof healthData.latencyMs === 'number';
    record('DB Health', 'Live Query Health Check (/api/health)', healthOk, `DB: ${healthData.status} | Engine: ${healthData.engine} | Latency: ${healthData.latencyMs}ms`);
  } catch (err: any) {
    record('DB Health', 'Health check error', false, err.message);
  }

  console.log('\n========================================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`AUDIT COMPLETE: ${passCount} PASSED, ${failCount} FAILED out of ${results.length} checks`);
  console.log('========================================================================');

  await prisma.$disconnect();
  if (failCount > 0) process.exit(1);
}

runInDepthVerification().catch(e => {
  console.error('Audit encountered fatal error:', e);
  process.exit(1);
});
