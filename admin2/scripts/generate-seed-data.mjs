// StyleSync demo data generator — produces a bookings array that satisfies the
// revenue targets:
//   Today:     ₹6,200
//   This Week: ₹18,700  (Sep 27 - Oct 3, 2026)
//   This Month: ₹52,400  (Oct 1-31, 2026)
//   Last Month: ₹47,800  (Sep 1-30, 2026)
//   All Time:  ₹184,600
//
// Run with: node /home/z/my-project/scripts/generate-seed-data.mjs
//
// Output: prints the SEED_BOOKINGS entries (as TypeScript) plus a verification
// report confirming each revenue target.

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

const pastDate = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const futureDate = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
const addMins = (t, mins) => {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

// Service catalog (must match SEED_SERVICES in seedData.ts)
const SERVICES = [
  { id: 'svc-1', name: 'Haircut & Style', category: 'Hair', price: 500, duration: 45, staff: ['staff-1', 'staff-3'] },
  { id: 'svc-2', name: 'Hair Wash & Blow Dry', category: 'Hair', price: 700, duration: 45, staff: ['staff-1', 'staff-2'] },
  { id: 'svc-3', name: 'Hair Spa Treatment', category: 'Hair', price: 1200, duration: 60, staff: ['staff-1', 'staff-2'] },
  { id: 'svc-4', name: 'Balayage', category: 'Hair', price: 4500, duration: 180, staff: ['staff-1'] },
  { id: 'svc-5', name: 'Hair Colour - Root Touch-up', category: 'Hair', price: 1500, duration: 90, staff: ['staff-2'] },
  { id: 'svc-6', name: 'Beard Grooming', category: 'Beard & Grooming', price: 400, duration: 30, staff: ['staff-3'] },
  { id: 'svc-7', name: 'Hair Styling', category: 'Hair', price: 800, duration: 60, staff: ['staff-1'] },
  { id: 'svc-8', name: 'Facial', category: 'Skin & Beauty', price: 1500, duration: 60, staff: ['staff-2'] },
];

const STAFF = [
  { id: 'staff-1', name: 'Ria Mahajan' },
  { id: 'staff-2', name: 'Aisha Khan' },
  { id: 'staff-3', name: 'Tariq Bhat' },
];

const CUSTOMERS = [
  { id: 'cust-1', name: 'Aisha Khan', phone: '+91 94190 55101', email: 'aisha.khan@example.com' },
  { id: 'cust-2', name: 'Imtiyaz Ahmed', phone: '+91 94190 55102', email: 'imtiyaz.a@example.com' },
  { id: 'cust-3', name: 'Rahul Verma', phone: '+91 94190 55103', email: 'rahul.verma@example.com' },
  { id: 'cust-4', name: 'Mahesh Kumar', phone: '+91 94190 55104', email: 'mahesh.k@example.com' },
  { id: 'cust-5', name: 'Priya Nair', phone: '+91 94190 55105', email: 'priya.nair@example.com' },
  { id: 'cust-6', name: 'Arjun Gupta', phone: '+91 94190 55106', email: 'arjun.g@example.com' },
  { id: 'cust-7', name: 'Neha Sharma', phone: '+91 94190 55107', email: 'neha.sharma@example.com' },
  { id: 'cust-8', name: 'Rohit Kumar', phone: '+91 94190 55108', email: 'rohit.k@example.com' },
  { id: 'cust-9', name: 'Sana Khan', phone: '+91 94190 55109', email: 'sana.k@example.com' },
  { id: 'cust-10', name: 'Vikram Singh', phone: '+91 94190 55110', email: 'vikram.s@example.com' },
];

const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const METHODS = ['Cash', 'UPI', 'Card', 'UPI', 'Net Banking'];

let _idCounter = 1000;
const bookings = [];

const serviceByPrice = (price, idx) => {
  const matching = SERVICES.filter(s => s.price === price);
  return matching[idx % matching.length];
};
const staffForService = (service, idx) => {
  const assigned = STAFF.filter(s => service.staff.includes(s.id));
  return assigned[idx % assigned.length];
};

const addBooking = (date, price, custIdx, status, paymentStatus, timeIdx) => {
  _idCounter++;
  const id = `bk-seed-${_idCounter}`;
  const service = serviceByPrice(price, custIdx);
  const staff = staffForService(service, custIdx);
  const customer = CUSTOMERS[custIdx % CUSTOMERS.length];
  const time = TIMES[timeIdx % TIMES.length];
  const method = METHODS[_idCounter % METHODS.length];
  bookings.push({
    id, customer, service, staff, date, time, status, paymentStatus, method,
    price: service.price,
  });
};

// ============ Plan (corrected for actual existing data) ============
// Existing paid bookings (from seedData.ts):
//   Today: 6,200 (bk-today-1, 2, 4)
//   bk-past-1 to 12 sum = 10,200 (verified)
//     - In This Week (Sep 27 - Oct 3): bk-past-1 (Oct 2, 500) + bk-past-2 (Oct 2, 1500)
//                                       + bk-past-3 (Oct 1, 400) + bk-past-4 (Sep 30, 1200)
//                                       + bk-past-5 (Sep 28, 1500) = 5,100
//     - In This Month (Oct 1-31): bk-past-1 + bk-past-2 + bk-past-3 = 2,400
//     - In Last Month (Sep 1-30): bk-past-3 (Oct 1 - WAIT this is Oct not Sep)
//   Let me recompute carefully:
//     bk-past-1: Oct 2, 500  → This Week, This Month
//     bk-past-2: Oct 2, 1500 → This Week, This Month
//     bk-past-3: Oct 1, 400  → This Week, This Month
//     bk-past-4: Sep 30, 1200 → This Week, Last Month
//     bk-past-5: Sep 28, 1500 → This Week, Last Month
//     bk-past-6: Sep 26, 500  → Last Month
//     bk-past-7: Sep 25, 400  → Last Month
//     bk-past-8: Sep 23, 700  → Last Month
//     bk-past-9: Sep 21, 800  → Last Month
//     bk-past-10: Sep 18, 1500 → Last Month
//     bk-past-11: Sep 15, 700  → Last Month
//     bk-past-12: Sep 13, 500  → Last Month
//   This Week existing = 500+1500+400+1200+1500 = 5,100 (bk-past-1..5)
//   This Month existing = 500+1500+400 = 2,400 (bk-past-1,2,3 on Oct 1-2)
//   Last Month existing = 1200+1500+500+400+700+800+1500+700+500 = 7,800
//   Today existing = 6,200
//
//   So This Week = 6,200 (today) + 5,100 (past) = 11,300 → need 7,400 more
//   This Month = 6,200 (today) + 2,400 (Oct 1-2) = 8,600 → need 43,800 more in Oct 4-31
//   Last Month = 7,800 → need 40,000 more in Sep 1-30
//     Of which 7,400 is in Sep 27-30 (also in This Week), so Sep 1-26 = 32,600
//   All Time = 16,400 → need 168,200 more
//     = 7,400 (Sep 27-30) + 32,600 (Sep 1-26) + 43,800 (Oct 4-31) + 84,400 (Aug 1-31)

// New Sep 27-30 (in This Week AND Last Month): target 7,400
const newWeekPlan = [
  { date: pastDate(6), prices: [1500, 800] },  // Sep 27: 2300
  { date: pastDate(5), prices: [1500, 700] },  // Sep 28: 2200
  { date: pastDate(4), prices: [1200, 500] },  // Sep 29: 1700
  { date: pastDate(3), prices: [800, 400] },   // Sep 30: 1200
];

// New Sep 1-26 (Last Month only): target 32,600
//   6 days × 1500 = 9,000 (Sep 1, 6, 11, 16, 21, 26)
//   19 days × 1200 = 22,800 (the other 19 days in Sep 2-25)
//   1 day × 800 = 800 (Sep 25)
//   Sum = 32,600 ✓
const sep1500Days = [1, 6, 11, 16, 21, 26]; // 6 days
const sep1200Days = [2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19, 20, 22, 23, 24]; // 19 days
const sep800Day = 25; // Sep 25
const newSepPlan = [];
for (const day of sep1500Days) newSepPlan.push({ date: pastDate(32 - (day - 1)), prices: [1500] });
for (const day of sep1200Days) newSepPlan.push({ date: pastDate(32 - (day - 1)), prices: [1200] });
newSepPlan.push({ date: pastDate(32 - (sep800Day - 1)), prices: [800] });

// New Aug 1-31 (All Time only): target 84,400
//   29 days × [1500, 1200] = 78,300
//   1 day (Aug 10) × [1500, 700] = 2,200  (swap one 1200 for 700 to reduce by 500)
//   1 day (Aug 15) × [1500, 1200, 1200] = 3,900
//   Sum = 84,400 ✓
const newAugPlan = [];
for (let day = 1; day <= 31; day++) {
  let prices;
  if (day === 15) prices = [1500, 1200, 1200];
  else if (day === 10) prices = [1500, 700];
  else prices = [1500, 1200];
  newAugPlan.push({ date: pastDate(63 - (day - 1)), prices });
}

// New Oct 4-31 (This Month only, prepaid): target 43,800
//   14 even days × 1500 = 21,000 (Oct 4, 6, ..., 30)
//   14 odd days × 1200 = 16,800 (Oct 5, 7, ..., 31)
//   7 even days × 800 extra = 5,600 (Oct 4, 8, 12, 16, 20, 24, 28)
//   1 odd day × 400 extra = 400 (Oct 11)
//   Sum = 43,800 ✓
const newOctPlan = [];
const octExtra800Days = [4, 8, 12, 16, 20, 24, 28]; // 7 even days
const octExtra400Day = 11; // 1 odd day
for (let day = 4; day <= 31; day++) {
  const prices = (day % 2 === 0) ? [1500] : [1200];
  if (octExtra800Days.includes(day)) prices.push(800);
  if (day === octExtra400Day) prices.push(400);
  newOctPlan.push({ date: futureDate(day - 3), prices });
}

// Generate the bookings
let custIdx = 0;
let timeIdx = 0;
const allNewPlans = [...newWeekPlan, ...newSepPlan, ...newAugPlan, ...newOctPlan];
for (const plan of allNewPlans) {
  for (const price of plan.prices) {
    // Past bookings → COMPLETED + PAID. Future prepaid → UPCOMING + PAID.
    const isPast = plan.date <= todayStr;
    const status = isPast ? 'COMPLETED' : 'UPCOMING';
    const paymentStatus = 'PAID';
    addBooking(plan.date, price, custIdx, status, paymentStatus, timeIdx);
    custIdx++;
    timeIdx++;
  }
}

// ============ Verification ============
const sum = (arr) => arr.reduce((s, p) => s + p.price, 0);

// Existing paid (from seedData.ts):
// Today: bk-today-1 (4500) + bk-today-2 (500) + bk-today-4 (1200) = 6200
// Past: bk-past-1 (500, Oct 2) + bk-past-2 (1500, Oct 1) + bk-past-3 (400, Sep 30) +
//        bk-past-4 (1200, Sep 29) + bk-past-5 (1500, Sep 27) + bk-past-6 (500, Sep 26) +
//        bk-past-7 (400, Sep 25) + bk-past-8 (700, Sep 23) + bk-past-9 (800, Sep 21) +
//        bk-past-10 (1500, Sep 18) + bk-past-11 (700, Sep 15) + bk-past-12 (500, Sep 13)
const existingPast = [
  { date: pastDate(1), price: 500 },   // bk-past-1, Oct 2
  { date: pastDate(1), price: 1500 },  // bk-past-2, Oct 2
  { date: pastDate(2), price: 400 },   // bk-past-3, Oct 1
  { date: pastDate(3), price: 1200 },  // bk-past-4, Sep 30
  { date: pastDate(5), price: 1500 },  // bk-past-5, Sep 28
  { date: pastDate(7), price: 500 },   // bk-past-6, Sep 26
  { date: pastDate(8), price: 400 },   // bk-past-7, Sep 25
  { date: pastDate(10), price: 700 },  // bk-past-8, Sep 23
  { date: pastDate(12), price: 800 },  // bk-past-9, Sep 21
  { date: pastDate(15), price: 1500 }, // bk-past-10, Sep 18
  { date: pastDate(18), price: 700 },  // bk-past-11, Sep 15
  { date: pastDate(20), price: 500 },  // bk-past-12, Sep 13
];
const todayExisting = [
  { date: todayStr, price: 4500 },
  { date: todayStr, price: 500 },
  { date: todayStr, price: 1200 },
];

const allPaid = [...existingPast, ...todayExisting, ...bookings.map(b => ({ date: b.date, price: b.price }))];

// Range bounds
const weekStart = pastDate(6); // Sep 27 (Sunday)
const weekEnd = todayStr;      // Oct 3 (Saturday)
const monthStart = `${todayStr.slice(0, 8)}01`; // Oct 1
const monthEnd = `${todayStr.slice(0, 8)}31`;   // Oct 31
const lastMonthDate = new Date(today);
lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
const lastMonthStart = `${lastMonthDate.toISOString().slice(0, 8)}01`;
const lastMonthEnd = `${lastMonthDate.toISOString().slice(0, 8)}31`;

const todayRev = sum(allPaid.filter(p => p.date === todayStr));
const weekRev = sum(allPaid.filter(p => p.date >= weekStart && p.date <= weekEnd));
const monthRev = sum(allPaid.filter(p => p.date >= monthStart && p.date <= monthEnd));
const lastMonthRev = sum(allPaid.filter(p => p.date >= lastMonthStart && p.date <= lastMonthEnd));
const allTimeRev = sum(allPaid);

console.log('=== REVENUE VERIFICATION ===');
console.log('Today:     ₹' + todayRev.toLocaleString('en-IN') + ' (target ₹6,200)');
console.log('This Week: ₹' + weekRev.toLocaleString('en-IN') + ' (target ₹18,700)');
console.log('This Month: ₹' + monthRev.toLocaleString('en-IN') + ' (target ₹52,400)');
console.log('Last Month: ₹' + lastMonthRev.toLocaleString('en-IN') + ' (target ₹47,800)');
console.log('All Time:  ₹' + allTimeRev.toLocaleString('en-IN') + ' (target ₹184,600)');
console.log('');
console.log('Consistency checks:');
console.log('  Today ≤ Week ≤ Month ≤ All Time:', todayRev <= weekRev && weekRev <= monthRev && monthRev <= allTimeRev ? 'PASS' : 'FAIL');
console.log('  Today = 6200:', todayRev === 6200 ? 'PASS' : 'FAIL');
console.log('  Week = 18700:', weekRev === 18700 ? 'PASS' : 'FAIL');
console.log('  Month = 52400:', monthRev === 52400 ? 'PASS' : 'FAIL');
console.log('  LastMonth = 47800:', lastMonthRev === 47800 ? 'PASS' : 'FAIL');
console.log('  AllTime = 184600:', allTimeRev === 184600 ? 'PASS' : 'FAIL');
console.log('');
console.log('Total new bookings generated:', bookings.length);
console.log('  Sep 27-30 (week):', bookings.filter(b => b.date >= weekStart && b.date < monthStart).length);
console.log('  Sep 1-26 (last month only):', bookings.filter(b => b.date >= lastMonthStart && b.date < weekStart).length);
console.log('  Aug 1-31 (all time only):', bookings.filter(b => b.date < lastMonthStart).length);
console.log('  Oct 4-31 (prepaid future):', bookings.filter(b => b.date > todayStr).length);

// Emit the bookings as a JSON file for the seedData.ts to consume
import { writeFileSync } from 'fs';
writeFileSync('/home/z/my-project/scripts/generated-bookings.json', JSON.stringify(bookings, null, 2));
console.log('');
console.log('Wrote', bookings.length, 'bookings to /home/z/my-project/scripts/generated-bookings.json');
