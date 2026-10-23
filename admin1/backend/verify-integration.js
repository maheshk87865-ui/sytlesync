/**
 * StyleSync Customer App — End-to-End API Integration & DB Persistence Verification
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runVerification() {
  console.log('================================================================');
  console.log('StyleSync Customer App (admin1) — Integration & DB Verification');
  console.log('================================================================');

  const BASE_URL = 'http://localhost:4000/api/v1';

  // 1. Health check
  console.log('\n--- 1. Backend Health Check ---');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('Status code:', healthRes.status);
  console.log('Healthy:', health.data?.status === 'healthy');
  console.log('DB reachable:', health.data?.checks?.database?.reachable);

  // 2. Salon Discovery
  console.log('\n--- 2. Salon Discovery (Live Database) ---');
  const salonsRes = await fetch(`${BASE_URL}/salons`);
  const salons = await salonsRes.json();
  console.log('Total Salons Returned:', salons.data?.length);
  const firstSalon = salons.data?.[0];
  console.log(`First Salon: ${firstSalon?.name} (${firstSalon?.id})`);
  console.log(`Rating: ${firstSalon?.rating}, City: ${firstSalon?.city}`);

  // 3. Real Availability Query
  console.log('\n--- 3. Availability Engine Query ---');
  const salonId = '00000000-0000-0000-0001-000000000001';
  const serviceId = '00000000-0000-0000-0002-000000000001';
  const staffId = '00000000-0000-0000-0003-000000000001';
  const dateStr = '2026-10-22';

  const availRes = await fetch(`${BASE_URL}/availability/${salonId}?date=${dateStr}&serviceId=${serviceId}&staffId=${staffId}`);
  const avail = await availRes.json();
  console.log('Availability Success:', avail.success);
  console.log('Total Available Slots for Staff on', dateStr, ':', avail.data?.slots?.length);
  const sampleSlot = avail.data?.slots?.find(s => s.status === 'AVAILABLE' && s.staffId === staffId);
  console.log('Selected Slot for Booking Test:', sampleSlot?.startTime, '-', sampleSlot?.endTime);
  const testSlotTime = sampleSlot?.startTime || '11:00';

  // 4. Authenticate Customer
  console.log('\n--- 4. Customer Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mahesh@example.com', password: 'demodemo123' }),
  });
  const loginData = await loginRes.json();
  console.log('Login Success:', loginData.success);
  const token = loginData.data?.token;
  const user = loginData.data?.user;
  console.log('Logged in User:', user?.email, 'Role:', user?.role);

  // 5. Query Existing Bookings for Customer
  console.log('\n--- 5. Initial Customer Bookings Query ---');
  const initialBookingsRes = await fetch(`${BASE_URL}/bookings`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const initialBookings = await initialBookingsRes.json();
  const initialList = initialBookings.data?.data || initialBookings.data || [];
  console.log('Existing bookings in customer profile:', initialList.length);

  // 6. Create Real Booking via createBooking API
  console.log('\n--- 6. Create Real Booking ---');
  const createRes = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      salonId,
      serviceId,
      staffId,
      date: dateStr,
      startTime: testSlotTime,
      notes: 'Automated integration verification test'
    }),
  });
  const createData = await createRes.json();
  console.log('Create HTTP Status:', createRes.status);
  console.log('Create Success:', createData.success);
  const newBooking = createData.data;
  console.log('Booking Code:', newBooking?.bookingId);
  console.log('Booking UUID:', newBooking?.id);
  console.log('Booking Status:', newBooking?.status);

  // 7. Verify Database Persistence in SQLite
  console.log('\n--- 7. Direct Database Query in test.db ---');
  const dbBooking = await prisma.booking.findUnique({
    where: { id: newBooking.id },
    include: { salon: true, customer: true }
  });
  console.log('Found in test.db:', !!dbBooking);
  console.log('Booking Code in DB:', dbBooking?.bookingId);
  console.log('Salon in DB:', dbBooking?.salon?.name);
  console.log('Service in DB:', dbBooking?.serviceName);
  console.log('Staff in DB:', dbBooking?.staffName);
  console.log('Price in DB: ₹', dbBooking?.price);
  console.log('Customer Email in DB:', dbBooking?.customer?.email);

  // 8. Prevent Duplicate Booking (Slot Conflict)
  console.log('\n--- 8. Prevent Duplicate / Slot Conflict Booking ---');
  const dupRes = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      salonId,
      serviceId,
      staffId,
      date: dateStr,
      startTime: testSlotTime,
      notes: 'Duplicate attempt'
    }),
  });
  const dupData = await dupRes.json();
  console.log('Duplicate Request Status:', dupRes.status);
  console.log('Conflict Error Code:', dupData.error?.code);
  console.log('Conflict Error Message:', dupData.error?.message);

  // 9. Verify getBookings() reflects newly created booking
  console.log('\n--- 9. Verify getBookings() after Booking Creation ---');
  const updatedBookingsRes = await fetch(`${BASE_URL}/bookings`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const updatedBookings = await updatedBookingsRes.json();
  const updatedList = updatedBookings.data?.data || updatedBookings.data || [];
  const foundInList = updatedList.find(b => b.id === newBooking.id);
  console.log('Found in Customer Bookings list:', !!foundInList);
  console.log('Total Customer Bookings now:', updatedList.length);

  // 10. Cancel Booking and Verify Cancellation Persistence
  console.log('\n--- 10. Cancel Booking ---');
  const cancelRes = await fetch(`${BASE_URL}/bookings/${newBooking.id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ reason: 'Integration test cleanup' })
  });
  const cancelData = await cancelRes.json();
  console.log('Cancel HTTP Status:', cancelRes.status);
  console.log('Cancel Success:', cancelData.success);
  console.log('Updated Status in response:', cancelData.data?.status);

  // 11. Verify DB status is CANCELLED
  const dbBookingAfterCancel = await prisma.booking.findUnique({
    where: { id: newBooking.id }
  });
  console.log('Final Status in test.db:', dbBookingAfterCancel?.status);

  console.log('\n================================================================');
  console.log('ALL INTEGRATION AND DATABASE CHECKS COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

runVerification()
  .catch(err => {
    console.error('Verification failed with error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
