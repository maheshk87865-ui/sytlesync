import { prisma } from '../src/lib/prisma';
import { createToken } from '../src/lib/auth';

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

async function runCalendarTests() {
  console.log('======================================================');
  console.log('   STYLESYNC CALENDAR & SLOT AVAILABILITY TEST SUITE  ');
  console.log('======================================================\n');

  const admin = await prisma.admin.findUnique({ where: { email: 'admin@stylesync.in' } });
  if (!admin) throw new Error('Admin not found');

  const token = await createToken({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role as any,
  });

  const headers = {
    'Content-Type': 'application/json',
    Cookie: `stylesync_admin_token=${token}`,
  };

  const BASE_URL = 'http://localhost:3000';

  try {
    // TEST 1: DAY VIEW
    console.log('[TEST 1: Day View Functionality]');
    const resDay = await fetch(`${BASE_URL}/api/calendar?view=day&date=2026-10-13`, { headers });
    check(resDay.ok, 'Day View endpoint responded 200 OK');
    const dayData = await resDay.json();
    check(dayData.view === 'day', 'Day View view parameter returned correctly');
    check(dayData.currentDate === '2026-10-13', 'Day View target date is 2026-10-13');
    check(dayData.bookings.length > 0, `Day View loaded ${dayData.bookings.length} appointments for 2026-10-13`);
    check(
      dayData.bookings.every((b: any) => b.appointmentDate === '2026-10-13'),
      'All Day View appointments match selected date strictly'
    );

    // Verify detailed fields on appointment card
    const sampleBooking = dayData.bookings[0];
    check(Boolean(sampleBooking.bookingNumber), `Appointment contains bookingNumber: ${sampleBooking.bookingNumber}`);
    check(Boolean(sampleBooking.customer?.name), `Appointment contains customer: ${sampleBooking.customer.name}`);
    check(Boolean(sampleBooking.customer?.phone), `Appointment contains customer contact: ${sampleBooking.customer.phone}`);
    check(Boolean(sampleBooking.salon?.name), `Appointment contains salon: ${sampleBooking.salon.name}`);
    check(Boolean(sampleBooking.salon?.address), `Appointment contains salon address: ${sampleBooking.salon.address}`);
    check(Boolean(sampleBooking.service?.name), `Appointment contains service: ${sampleBooking.service.name}`);
    check(Boolean(sampleBooking.startTime && sampleBooking.endTime), `Appointment contains time interval: ${sampleBooking.startTime} - ${sampleBooking.endTime}`);
    check(sampleBooking.price > 0, `Appointment contains gross price: ₹${sampleBooking.price}`);
    check(sampleBooking.commissionAmount >= 0, `Appointment contains commission: ₹${sampleBooking.commissionAmount}`);
    check(sampleBooking.salonPayoutAmount > 0, `Appointment contains salon payout: ₹${sampleBooking.salonPayoutAmount}`);

    // TEST 2: WEEK VIEW
    console.log('\n[TEST 2: Week View Functionality]');
    const resWeek = await fetch(`${BASE_URL}/api/calendar?view=week&date=2026-10-13`, { headers });
    check(resWeek.ok, 'Week View endpoint responded 200 OK');
    const weekData = await resWeek.json();
    check(weekData.view === 'week', 'Week View view parameter returned correctly');
    check(weekData.weekDays.length === 7, 'Week View returned exactly 7 consecutive days');
    check(weekData.weekDays[0] <= '2026-10-13' && weekData.weekDays[6] >= '2026-10-13', 'Week interval contains selected date');
    check(weekData.bookings.length >= dayData.bookings.length, `Week View loaded ${weekData.bookings.length} appointments`);

    // TEST 3: MONTH VIEW
    console.log('\n[TEST 3: Month View Functionality]');
    const resMonth = await fetch(`${BASE_URL}/api/calendar?view=month&date=2026-10-13`, { headers });
    check(resMonth.ok, 'Month View endpoint responded 200 OK');
    const monthData = await resMonth.json();
    check(monthData.view === 'month', 'Month View view parameter returned correctly');
    check(monthData.monthGrid.length >= 28 && monthData.monthGrid.length % 7 === 0, `Month grid forms rectangular 7-day grid (${monthData.monthGrid.length} cells)`);
    check(monthData.bookings.length >= weekData.bookings.length, `Month View loaded ${monthData.bookings.length} appointments for October 2026`);
    check(monthData.summary.total === monthData.bookings.length, `Summary metrics match total bookings count (${monthData.summary.total})`);

    // TEST 4: SALON & STAFF FILTERING
    console.log('\n[TEST 4: Salon & Staff Filtering]');
    const sampleSalonId = sampleBooking.salonId;
    const resSalonFiltered = await fetch(`${BASE_URL}/api/calendar?view=week&date=2026-10-13&salonId=${sampleSalonId}`, { headers });
    const salonFilteredData = await resSalonFiltered.json();
    check(
      salonFilteredData.bookings.length > 0 && salonFilteredData.bookings.every((b: any) => b.salonId === sampleSalonId),
      `Salon filter strictly returns appointments for selected salon (${salonFilteredData.bookings.length} found)`
    );

    if (sampleBooking.staffId) {
      const sampleStaffId = sampleBooking.staffId;
      const resStaffFiltered = await fetch(`${BASE_URL}/api/calendar?view=week&date=2026-10-13&staffId=${sampleStaffId}`, { headers });
      const staffFilteredData = await resStaffFiltered.json();
      check(
        staffFilteredData.bookings.length > 0 && staffFilteredData.bookings.every((b: any) => b.staffId === sampleStaffId),
        `Staff filter strictly returns appointments for selected staff (${staffFilteredData.bookings.length} found)`
      );
    }

    // TEST 5: SLOT AVAILABILITY MANAGEMENT & CONFLICT SAFEGUARDS
    console.log('\n[TEST 5: Slot Availability Management & Conflict Safeguards]');
    // 5a. Attempt to block a slot occupied by an active booking -> must return 409 Conflict
    const resConflict = await fetch(`${BASE_URL}/api/calendar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'BLOCK_SLOT',
        salonId: sampleBooking.salonId,
        date: sampleBooking.appointmentDate,
        startTime: sampleBooking.startTime,
        endTime: sampleBooking.endTime,
        reason: 'Unauthorized conflict test',
      }),
    });
    check(resConflict.status === 409, 'Server-side conflict safeguard rejects blocking slot occupied by an active appointment (409 Conflict)');

    // 5b. Block an available slot (e.g. 06:00 to 07:00 when no bookings exist)
    const testBlockDate = '2026-10-13';
    const testStartTime = '06:00';
    const testEndTime = '07:00';
    const testReason = 'Early Morning Salon Sanitation';

    const resBlock = await fetch(`${BASE_URL}/api/calendar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'BLOCK_SLOT',
        salonId: sampleSalonId,
        date: testBlockDate,
        startTime: testStartTime,
        endTime: testEndTime,
        reason: testReason,
      }),
    });
    check(resBlock.ok, 'Successfully blocked available time slot');
    const blockData = await resBlock.json();
    const createdSlotId = blockData.blockedSlot?.id;
    check(Boolean(createdSlotId), `Created blocked slot record with ID: ${createdSlotId}`);

    // 5c. Query calendar and verify the blocked slot is returned
    const resVerifyBlock = await fetch(`${BASE_URL}/api/calendar?view=day&date=${testBlockDate}&salonId=${sampleSalonId}`, { headers });
    const verifyBlockData = await resVerifyBlock.json();
    check(
      verifyBlockData.blockedSlots.some((s: any) => s.id === createdSlotId),
      'Blocked slot actively appears in calendar response'
    );

    // 5d. Unblock the slot
    const resUnblock = await fetch(`${BASE_URL}/api/calendar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'UNBLOCK_SLOT',
        slotId: createdSlotId,
      }),
    });
    check(resUnblock.ok, 'Unblock time slot succeeded');

    // 5e. Verify slot is removed from calendar
    const resVerifyUnblock = await fetch(`${BASE_URL}/api/calendar?view=day&date=${testBlockDate}&salonId=${sampleSalonId}`, { headers });
    const verifyUnblockData = await resVerifyUnblock.json();
    check(
      !verifyUnblockData.blockedSlots.some((s: any) => s.id === createdSlotId),
      'Unblocked slot is removed and slot availability is restored'
    );

  } catch (err: any) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`CALENDAR SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  if (failed > 0) process.exit(1);
}

runCalendarTests();
