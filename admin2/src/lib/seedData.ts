// StyleSync Seed Data - Premium Roots Salon, Srinagar
import type {
  Salon, Service, Staff, Customer, Booking, BlockedSlot, Review, Payment,
  Notification, SupportTicket, SalonSettings
} from './types';

// Helper: today's date string (yyyy-mm-dd) in local time
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

// Past dates relative to today
const pastDate = (daysAgo: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

// Future dates relative to today
const futureDate = (daysAhead: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

export const SEED_SALON: Salon = {
  id: 'salon-1',
  name: 'Premium Roots',
  description: 'A premium salon offering hair, beauty, and grooming services in the heart of Srinagar.',
  address: '12 Residency Road, Lal Chowk',
  phone: '+91 94190 12345',
  email: 'hello@premiumroots.in',
  area: 'Lal Chowk',
  city: 'Srinagar',
  latitude: 34.0735,
  longitude: 74.8088,
  coverImage: 'https://images.pexels.com/photos/2079246/pexels-photo-2079246.jpeg?auto=compress&w=1400&h=500&fit=crop',
  logo: 'https://ui-avatars.com/api/?name=Premium+Roots&background=B76E79&color=fff&size=200&bold=true&length=2',
  openingHours: {
    monday: { open: '09:00', close: '19:00', closed: false },
    tuesday: { open: '09:00', close: '19:00', closed: false },
    wednesday: { open: '09:00', close: '19:00', closed: false },
    thursday: { open: '09:00', close: '19:00', closed: false },
    friday: { open: '09:00', close: '19:00', closed: false },
    saturday: { open: '09:00', close: '19:00', closed: false },
    sunday: { open: '10:00', close: '17:00', closed: false },
  },
  amenities: ['Free WiFi', 'AC', 'Card Payment', 'Parking', 'Refreshments', 'Music'],
  about: 'Premium Roots is Srinagar\'s destination for modern hair, beauty, and grooming services. Our experienced stylists use premium products and the latest techniques to deliver a personalized experience for every client.',
  photos: [
    'https://images.pexels.com/photos/2079246/pexels-photo-2079246.jpeg?auto=compress&w=400&h=300&fit=crop',
    'https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg?auto=compress&w=400&h=300&fit=crop',
    'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&w=400&h=300&fit=crop',
  ],
  status: 'OPEN',
  rating: 4.6,
  totalReviews: 47,
  joinedDate: '2025-06-15',
};

export const SEED_STAFF: Staff[] = [
  {
    id: 'staff-1',
    salonId: 'salon-1',
    name: 'Ria Mahajan',
    role: 'Owner',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    experience: '12 years',
    services: ['svc-1', 'svc-2', 'svc-3', 'svc-4', 'svc-7'],
    schedule: {
      monday: { start: '09:00', end: '18:00', off: false },
      tuesday: { start: '09:00', end: '18:00', off: false },
      wednesday: { start: '09:00', end: '18:00', off: false },
      thursday: { start: '09:00', end: '18:00', off: false },
      friday: { start: '09:00', end: '18:00', off: false },
      saturday: { start: '09:00', end: '17:00', off: false },
      sunday: { start: '', end: '', off: true },
    },
    status: 'ACTIVE',
    phone: '+91 94190 11111',
    email: 'ria@premiumroots.in',
  },
  {
    id: 'staff-2',
    salonId: 'salon-1',
    name: 'Aisha Khan',
    role: 'Manager',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
    experience: '8 years',
    services: ['svc-2', 'svc-3', 'svc-5', 'svc-8'],
    schedule: {
      monday: { start: '09:00', end: '18:00', off: false },
      tuesday: { start: '09:00', end: '18:00', off: false },
      wednesday: { start: '', end: '', off: true },
      thursday: { start: '09:00', end: '18:00', off: false },
      friday: { start: '09:00', end: '18:00', off: false },
      saturday: { start: '09:00', end: '17:00', off: false },
      sunday: { start: '10:00', end: '17:00', off: false },
    },
    status: 'ACTIVE',
    phone: '+91 94190 22222',
    email: 'aisha@premiumroots.in',
  },
  {
    id: 'staff-3',
    salonId: 'salon-1',
    name: 'Tariq Bhat',
    role: 'Staff',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    experience: '5 years',
    services: ['svc-1', 'svc-6', 'svc-9'],
    schedule: {
      monday: { start: '10:00', end: '19:00', off: false },
      tuesday: { start: '10:00', end: '19:00', off: false },
      wednesday: { start: '10:00', end: '19:00', off: false },
      thursday: { start: '10:00', end: '19:00', off: false },
      friday: { start: '10:00', end: '19:00', off: false },
      saturday: { start: '10:00', end: '17:00', off: false },
      sunday: { start: '', end: '', off: true },
    },
    status: 'ACTIVE',
    phone: '+91 94190 33333',
    email: 'tariq@premiumroots.in',
  },
];

export const SEED_SERVICES: Service[] = [
  {
    id: 'svc-1',
    salonId: 'salon-1',
    name: 'Haircut & Style',
    category: 'Hair',
    description: 'Professional haircut and styling tailored to your face shape and preferences.',
    price: 500,
    duration: 45,
    assignedStaff: ['staff-1', 'staff-3'],
    active: true,
    image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=300&fit=crop',
    totalBookings: 156,
  },
  {
    id: 'svc-2',
    salonId: 'salon-1',
    name: 'Hair Wash & Blow Dry',
    category: 'Hair',
    description: 'Refreshing hair wash with conditioning treatment and professional blow dry.',
    price: 700,
    duration: 45,
    assignedStaff: ['staff-1', 'staff-2'],
    active: true,
    image: 'https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&w=400&h=300&fit=crop',
    totalBookings: 124,
  },
  {
    id: 'svc-3',
    salonId: 'salon-1',
    name: 'Hair Spa Treatment',
    category: 'Hair',
    description: 'Deep conditioning spa treatment to nourish and rejuvenate your hair.',
    price: 1200,
    duration: 60,
    assignedStaff: ['staff-1', 'staff-2'],
    active: true,
    image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=400&h=300&fit=crop',
    totalBookings: 98,
  },
  {
    id: 'svc-4',
    salonId: 'salon-1',
    name: 'Balayage',
    category: 'Hair',
    description: 'Premium balayage coloring technique for a natural, sun-kissed look.',
    price: 4500,
    duration: 180,
    assignedStaff: ['staff-1'],
    active: true,
    image: 'https://images.pexels.com/photos/4939461/pexels-photo-4939461.jpeg?auto=compress&w=400&h=300&fit=crop',
    totalBookings: 42,
  },
  {
    id: 'svc-5',
    salonId: 'salon-1',
    name: 'Hair Colour - Root Touch-up',
    category: 'Hair',
    description: 'Professional root touch-up to refresh your hair color.',
    price: 1500,
    duration: 90,
    assignedStaff: ['staff-2'],
    active: true,
    image: 'https://images.pexels.com/photos/4939461/pexels-photo-4939461.jpeg?auto=compress&w=400&h=300&fit=crop',
    totalBookings: 67,
  },
  {
    id: 'svc-6',
    salonId: 'salon-1',
    name: 'Beard Grooming',
    category: 'Beard & Grooming',
    description: 'Professional beard shaping, trimming, and grooming.',
    price: 400,
    duration: 30,
    assignedStaff: ['staff-3'],
    active: true,
    image: 'https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg?auto=compress&w=400&h=300&fit=crop',
    totalBookings: 89,
  },
  {
    id: 'svc-7',
    salonId: 'salon-1',
    name: 'Hair Styling',
    category: 'Hair',
    description: 'Special occasion hair styling and finishing.',
    price: 800,
    duration: 60,
    assignedStaff: ['staff-1'],
    active: true,
    image: 'https://images.pexels.com/photos/2065200/pexels-photo-2065200.jpeg?auto=compress&w=400&h=300&fit=crop',
    totalBookings: 73,
  },
  {
    id: 'svc-8',
    salonId: 'salon-1',
    name: 'Facial',
    category: 'Skin & Beauty',
    description: 'Premium facial treatment to cleanse, exfoliate, and nourish your skin.',
    price: 1500,
    duration: 60,
    assignedStaff: ['staff-2'],
    active: true,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=300&fit=crop',
    totalBookings: 54,
  },
  {
    id: 'svc-9',
    salonId: 'salon-1',
    name: 'Clean Shave',
    category: 'Beard & Grooming',
    description: 'Traditional hot towel clean shave with premium products.',
    price: 300,
    duration: 30,
    assignedStaff: ['staff-3'],
    active: false,
    image: 'https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg?auto=compress&w=400&h=300&fit=crop',
    totalBookings: 31,
  },
];

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1', name: 'Aisha Khan', phone: '+91 94190 55101', email: 'aisha.khan@example.com',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    totalBookings: 12, completedBookings: 10, cancelledBookings: 2, totalSpent: 8500,
    lastVisit: pastDate(8), nextAppointment: todayStr,
    favoriteServices: ['svc-2', 'svc-3', 'svc-7'], preferredStaff: ['staff-1'],
    notes: 'Prefers morning appointments. Allergic to ammonia.', joinedDate: '2025-08-12',
  },
  {
    id: 'cust-2', name: 'Imtiyaz Ahmed', phone: '+91 94190 55102', email: 'imtiyaz.a@example.com',
    image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop',
    totalBookings: 8, completedBookings: 7, cancelledBookings: 1, totalSpent: 18500,
    lastVisit: pastDate(15), nextAppointment: todayStr,
    favoriteServices: ['svc-4', 'svc-1'], preferredStaff: ['staff-1'],
    notes: 'Premium client. Always tips well.', joinedDate: '2025-07-04',
  },
  {
    id: 'cust-3', name: 'Rahul Verma', phone: '+91 94190 55103', email: 'rahul.verma@example.com',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
    totalBookings: 15, completedBookings: 14, cancelledBookings: 1, totalSpent: 9200,
    lastVisit: pastDate(5), nextAppointment: todayStr,
    favoriteServices: ['svc-1', 'svc-6'], preferredStaff: ['staff-1', 'staff-3'],
    notes: 'Regular monthly visitor.', joinedDate: '2025-06-20',
  },
  {
    id: 'cust-4', name: 'Mahesh Kumar', phone: '+91 94190 55104', email: 'mahesh.k@example.com',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop',
    totalBookings: 6, completedBookings: 5, cancelledBookings: 1, totalSpent: 4500,
    lastVisit: pastDate(20), nextAppointment: todayStr,
    favoriteServices: ['svc-2'], preferredStaff: ['staff-1'],
    notes: 'Quick service preferred.', joinedDate: '2025-08-25',
  },
  {
    id: 'cust-5', name: 'Priya Nair', phone: '+91 94190 55105', email: 'priya.nair@example.com',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    totalBookings: 11, completedBookings: 10, cancelledBookings: 1, totalSpent: 14200,
    lastVisit: pastDate(3), nextAppointment: todayStr,
    favoriteServices: ['svc-3', 'svc-8'], preferredStaff: ['staff-2'],
    notes: 'Prefers Aisha for all services.', joinedDate: '2025-06-30',
  },
  {
    id: 'cust-6', name: 'Arjun Gupta', phone: '+91 94190 55106', email: 'arjun.g@example.com',
    image: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=200&h=200&fit=crop',
    totalBookings: 4, completedBookings: 3, cancelledBookings: 1, totalSpent: 6800,
    lastVisit: pastDate(12), nextAppointment: todayStr,
    favoriteServices: ['svc-5'], preferredStaff: ['staff-2'],
    notes: 'Color sensitive skin. Patch test required.', joinedDate: '2025-09-01',
  },
  {
    id: 'cust-7', name: 'Neha Sharma', phone: '+91 94190 55107', email: 'neha.sharma@example.com',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop',
    totalBookings: 9, completedBookings: 8, cancelledBookings: 1, totalSpent: 11300,
    lastVisit: pastDate(7), nextAppointment: todayStr,
    favoriteServices: ['svc-8', 'svc-3'], preferredStaff: ['staff-2'],
    notes: 'Books skin & beauty services regularly.', joinedDate: '2025-07-22',
  },
  {
    id: 'cust-8', name: 'Rohit Kumar', phone: '+91 94190 55108', email: 'rohit.k@example.com',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
    totalBookings: 7, completedBookings: 6, cancelledBookings: 1, totalSpent: 3200,
    lastVisit: pastDate(2), nextAppointment: todayStr,
    favoriteServices: ['svc-6', 'svc-1'], preferredStaff: ['staff-3'],
    notes: 'Likes Tariq for beard work.', joinedDate: '2025-08-15',
  },
  {
    id: 'cust-9', name: 'Sana Khan', phone: '+91 94190 55109', email: 'sana.k@example.com',
    image: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=200&h=200&fit=crop',
    totalBookings: 5, completedBookings: 4, cancelledBookings: 1, totalSpent: 5600,
    lastVisit: pastDate(18), nextAppointment: todayStr,
    favoriteServices: ['svc-7', 'svc-2'], preferredStaff: ['staff-1'],
    notes: 'Bridal packages interested.', joinedDate: '2025-09-05',
  },
  {
    id: 'cust-10', name: 'Vikram Singh', phone: '+91 94190 55110', email: 'vikram.s@example.com',
    image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop',
    totalBookings: 3, completedBookings: 3, cancelledBookings: 0, totalSpent: 2100,
    lastVisit: pastDate(25),
    favoriteServices: ['svc-1', 'svc-6'], preferredStaff: ['staff-3'],
    notes: 'Walk-in customer.', joinedDate: '2025-09-15',
  },
];

// Generate time string from hours and minutes
const timeStr = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
// Add minutes to time string
const addMins = (t: string, mins: number) => {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  return timeStr(Math.floor(total / 60), total % 60);
};

// Build today's bookings exactly as specified
const todaysBookingsData: Omit<Booking, 'id' | 'createdAt' | 'notes' | 'customerPreferences' | 'paymentStatus' | 'cancellationReason' | 'cancelledAt'>[] = [
  { customerId: 'cust-2', customerName: 'Imtiyaz Ahmed', customerPhone: '+91 94190 55102', customerEmail: 'imtiyaz.a@example.com', serviceId: 'svc-4', serviceName: 'Balayage', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: todayStr, startTime: '09:00', endTime: '12:00', duration: 180, price: 4500, status: 'COMPLETED' },
  { customerId: 'cust-3', customerName: 'Rahul Verma', customerPhone: '+91 94190 55103', customerEmail: 'rahul.verma@example.com', serviceId: 'svc-1', serviceName: 'Haircut & Style', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: todayStr, startTime: '09:30', endTime: '10:15', duration: 45, price: 500, status: 'COMPLETED' },
  { customerId: 'cust-4', customerName: 'Mahesh Kumar', customerPhone: '+91 94190 55104', customerEmail: 'mahesh.k@example.com', serviceId: 'svc-2', serviceName: 'Hair Wash & Blow Dry', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: todayStr, startTime: '10:00', endTime: '10:45', duration: 45, price: 700, status: 'CANCELLED' },
  { customerId: 'cust-5', customerName: 'Priya Nair', customerPhone: '+91 94190 55105', customerEmail: 'priya.nair@example.com', serviceId: 'svc-3', serviceName: 'Hair Spa Treatment', category: 'Hair', staffId: 'staff-2', staffName: 'Aisha Khan', date: todayStr, startTime: '11:00', endTime: '12:00', duration: 60, price: 1200, status: 'COMPLETED' },
  { customerId: 'cust-1', customerName: 'Aisha Khan', customerPhone: '+91 94190 55101', customerEmail: 'aisha.khan@example.com', serviceId: 'svc-2', serviceName: 'Hair Wash & Blow Dry', category: 'Hair', staffId: 'staff-2', staffName: 'Aisha Khan', date: todayStr, startTime: '12:00', endTime: '12:45', duration: 45, price: 700, status: 'UPCOMING' },
  { customerId: 'cust-6', customerName: 'Arjun Gupta', customerPhone: '+91 94190 55106', customerEmail: 'arjun.g@example.com', serviceId: 'svc-5', serviceName: 'Hair Colour - Root Touch-up', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: todayStr, startTime: '13:00', endTime: '14:30', duration: 90, price: 1500, status: 'UPCOMING' },
  { customerId: 'cust-7', customerName: 'Neha Sharma', customerPhone: '+91 94190 55107', customerEmail: 'neha.sharma@example.com', serviceId: 'svc-8', serviceName: 'Facial', category: 'Skin & Beauty', staffId: 'staff-2', staffName: 'Aisha Khan', date: todayStr, startTime: '14:00', endTime: '15:00', duration: 60, price: 1500, status: 'UPCOMING' },
  { customerId: 'cust-8', customerName: 'Rohit Kumar', customerPhone: '+91 94190 55108', customerEmail: 'rohit.k@example.com', serviceId: 'svc-6', serviceName: 'Beard Grooming', category: 'Beard & Grooming', staffId: 'staff-3', staffName: 'Tariq Bhat', date: todayStr, startTime: '15:00', endTime: '15:30', duration: 30, price: 400, status: 'UPCOMING' },
  { customerId: 'cust-9', customerName: 'Sana Khan', customerPhone: '+91 94190 55109', customerEmail: 'sana.k@example.com', serviceId: 'svc-7', serviceName: 'Hair Styling', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: todayStr, startTime: '16:00', endTime: '17:00', duration: 60, price: 800, status: 'UPCOMING' },
];

// ============================================================
// HISTORICAL + PREPAID FUTURE BOOKINGS GENERATOR
// Produces 133 dated PAID bookings so the shared calculateRevenue()
// function naturally produces these targets:
//   Today ₹6,200 | This Week ₹18,700 | This Month ₹52,400
//   Last Month ₹47,800 | All Time ₹184,600
// (Today ≤ Week ≤ Month ≤ All Time is mathematically guaranteed
// because each period is a superset of the previous one's PAID payments.)
// ============================================================
const _genTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const _genMethods: Payment['method'][] = ['Cash', 'UPI', 'Card', 'UPI', 'Net Banking'];

let _genIdCounter = 1000;
const _serviceByPrice = (price: number, idx: number): Service => {
  const matching = SEED_SERVICES.filter(s => s.price === price && s.active);
  return matching[idx % matching.length];
};
const _staffForService = (service: Service, idx: number): Staff => {
  const assigned = SEED_STAFF.filter(s => service.assignedStaff.includes(s.id));
  return assigned[idx % assigned.length];
};
const _makeGenBooking = (
  date: string, price: number, custIdx: number, timeIdx: number,
  status: Booking['status'], paymentStatus: Payment['status'],
): Booking => {
  _genIdCounter++;
  const id = `bk-seed-${_genIdCounter}`;
  const service = _serviceByPrice(price, custIdx);
  const staff = _staffForService(service, custIdx);
  const customer = SEED_CUSTOMERS[custIdx % SEED_CUSTOMERS.length];
  const startTime = _genTimes[timeIdx % _genTimes.length];
  const [h, m] = startTime.split(':').map(Number);
  const endMins = h * 60 + m + service.duration;
  const endTime = `${String(Math.floor(endMins / 60) % 24).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
  return {
    id,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    serviceId: service.id,
    serviceName: service.name,
    category: service.category,
    staffId: staff.id,
    staffName: staff.name,
    date,
    startTime,
    endTime,
    duration: service.duration,
    price: service.price,
    paymentStatus,
    status,
    createdAt: date + 'T09:00:00.000Z',
    notes: '',
    customerPreferences: '',
  };
};

function generateHistoricalAndPrepaidBookings(): Booking[] {
  const out: Booking[] = [];
  let custIdx = 0;
  let timeIdx = 0;
  const add = (date: string, prices: number[], isPast: boolean) => {
    for (const price of prices) {
      out.push(_makeGenBooking(
        date, price, custIdx, timeIdx,
        isPast ? 'COMPLETED' : 'UPCOMING',
        'PAID',
      ));
      custIdx++;
      timeIdx++;
    }
  };

  // --- Sep 27-30 (in This Week AND Last Month): ₹7,400 ---
  add(pastDate(6), [1500, 800], true);  // Sep 27
  add(pastDate(5), [1500, 700], true);  // Sep 28
  add(pastDate(4), [1200, 500], true);  // Sep 29
  add(pastDate(3), [800, 400], true);   // Sep 30

  // --- Sep 1-26 (Last Month only): ₹32,600 ---
  // 6 days × 1500 + 19 days × 1200 + 1 day × 800 = 9000 + 22800 + 800 = 32,600
  for (const day of [1, 6, 11, 16, 21, 26]) add(pastDate(32 - (day - 1)), [1500], true);
  for (const day of [2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19, 20, 22, 23, 24]) add(pastDate(32 - (day - 1)), [1200], true);
  add(pastDate(32 - (25 - 1)), [800], true);  // Sep 25

  // --- Aug 1-31 (All Time only): ₹84,400 ---
  // 29 days × [1500, 1200] + 1 day (Aug 10) × [1500, 700] + 1 day (Aug 15) × [1500, 1200, 1200]
  //   = 78,300 + 2,200 + 3,900 = 84,400
  for (let day = 1; day <= 31; day++) {
    if (day === 15) add(pastDate(63 - (day - 1)), [1500, 1200, 1200], true);
    else if (day === 10) add(pastDate(63 - (day - 1)), [1500, 700], true);
    else add(pastDate(63 - (day - 1)), [1500, 1200], true);
  }

  // --- Oct 4-31 (This Month only, prepaid future): ₹43,800 ---
  // 14 even days × 1500 + 14 odd days × 1200 + 7 even days × 800 extra + 1 odd day (11) × 400 extra
  //   = 21,000 + 16,800 + 5,600 + 400 = 43,800
  const octExtra800Days = [4, 8, 12, 16, 20, 24, 28];
  for (let day = 4; day <= 31; day++) {
    const prices: number[] = (day % 2 === 0) ? [1500] : [1200];
    if (octExtra800Days.includes(day)) prices.push(800);
    if (day === 11) prices.push(400);
    add(futureDate(day - 3), prices, false);
  }

  return out;
}


export const SEED_BOOKINGS: Booking[] = [
  ...todaysBookingsData.map((b, i) => ({
    ...b,
    id: `bk-today-${i + 1}`,
    paymentStatus: b.status === 'COMPLETED' ? 'PAID' as const : b.status === 'CANCELLED' ? 'PENDING' as const : 'PENDING' as const,
    createdAt: pastDate(2),
    notes: '',
    customerPreferences: '',
    cancellationReason: b.status === 'CANCELLED' ? 'Customer had a change of schedule' : undefined,
    cancelledAt: b.status === 'CANCELLED' ? pastDate(0) : undefined,
  })),
  // Past completed bookings (for revenue and history)
  { id: 'bk-past-1', customerId: 'cust-3', customerName: 'Rahul Verma', customerPhone: '+91 94190 55103', customerEmail: 'rahul.verma@example.com', serviceId: 'svc-1', serviceName: 'Haircut & Style', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: pastDate(1), startTime: '11:00', endTime: '11:45', duration: 45, price: 500, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(3), notes: '', customerPreferences: 'Side parting' },
  { id: 'bk-past-2', customerId: 'cust-5', customerName: 'Priya Nair', customerPhone: '+91 94190 55105', customerEmail: 'priya.nair@example.com', serviceId: 'svc-8', serviceName: 'Facial', category: 'Skin & Beauty', staffId: 'staff-2', staffName: 'Aisha Khan', date: pastDate(1), startTime: '15:00', endTime: '16:00', duration: 60, price: 1500, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(2), notes: '', customerPreferences: 'Sensitive skin' },
  { id: 'bk-past-3', customerId: 'cust-8', customerName: 'Rohit Kumar', customerPhone: '+91 94190 55108', customerEmail: 'rohit.k@example.com', serviceId: 'svc-6', serviceName: 'Beard Grooming', category: 'Beard & Grooming', staffId: 'staff-3', staffName: 'Tariq Bhat', date: pastDate(2), startTime: '12:00', endTime: '12:30', duration: 30, price: 400, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(4), notes: '', customerPreferences: '' },
  { id: 'bk-past-4', customerId: 'cust-1', customerName: 'Aisha Khan', customerPhone: '+91 94190 55101', customerEmail: 'aisha.khan@example.com', serviceId: 'svc-3', serviceName: 'Hair Spa Treatment', category: 'Hair', staffId: 'staff-2', staffName: 'Aisha Khan', date: pastDate(3), startTime: '14:00', endTime: '15:00', duration: 60, price: 1200, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(5), notes: '', customerPreferences: '' },
  { id: 'bk-past-5', customerId: 'cust-7', customerName: 'Neha Sharma', customerPhone: '+91 94190 55107', customerEmail: 'neha.sharma@example.com', serviceId: 'svc-8', serviceName: 'Facial', category: 'Skin & Beauty', staffId: 'staff-2', staffName: 'Aisha Khan', date: pastDate(5), startTime: '16:00', endTime: '17:00', duration: 60, price: 1500, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(7), notes: '', customerPreferences: '' },
  { id: 'bk-past-6', customerId: 'cust-2', customerName: 'Imtiyaz Ahmed', customerPhone: '+91 94190 55102', customerEmail: 'imtiyaz.a@example.com', serviceId: 'svc-1', serviceName: 'Haircut & Style', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: pastDate(7), startTime: '11:00', endTime: '11:45', duration: 45, price: 500, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(10), notes: '', customerPreferences: '' },
  { id: 'bk-past-7', customerId: 'cust-10', customerName: 'Vikram Singh', customerPhone: '+91 94190 55110', customerEmail: 'vikram.s@example.com', serviceId: 'svc-6', serviceName: 'Beard Grooming', category: 'Beard & Grooming', staffId: 'staff-3', staffName: 'Tariq Bhat', date: pastDate(8), startTime: '13:00', endTime: '13:30', duration: 30, price: 400, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(11), notes: '', customerPreferences: '' },
  { id: 'bk-past-8', customerId: 'cust-4', customerName: 'Mahesh Kumar', customerPhone: '+91 94190 55104', customerEmail: 'mahesh.k@example.com', serviceId: 'svc-2', serviceName: 'Hair Wash & Blow Dry', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: pastDate(10), startTime: '15:00', endTime: '15:45', duration: 45, price: 700, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(13), notes: '', customerPreferences: '' },
  { id: 'bk-past-9', customerId: 'cust-9', customerName: 'Sana Khan', customerPhone: '+91 94190 55109', customerEmail: 'sana.k@example.com', serviceId: 'svc-7', serviceName: 'Hair Styling', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: pastDate(12), startTime: '12:00', endTime: '13:00', duration: 60, price: 800, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(15), notes: '', customerPreferences: '' },
  { id: 'bk-past-10', customerId: 'cust-6', customerName: 'Arjun Gupta', customerPhone: '+91 94190 55106', customerEmail: 'arjun.g@example.com', serviceId: 'svc-5', serviceName: 'Hair Colour - Root Touch-up', category: 'Hair', staffId: 'staff-2', staffName: 'Aisha Khan', date: pastDate(15), startTime: '14:00', endTime: '15:30', duration: 90, price: 1500, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(18), notes: '', customerPreferences: '' },
  { id: 'bk-past-11', customerId: 'cust-1', customerName: 'Aisha Khan', customerPhone: '+91 94190 55101', customerEmail: 'aisha.khan@example.com', serviceId: 'svc-2', serviceName: 'Hair Wash & Blow Dry', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: pastDate(18), startTime: '10:00', endTime: '10:45', duration: 45, price: 700, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(21), notes: '', customerPreferences: '' },
  { id: 'bk-past-12', customerId: 'cust-3', customerName: 'Rahul Verma', customerPhone: '+91 94190 55103', customerEmail: 'rahul.verma@example.com', serviceId: 'svc-1', serviceName: 'Haircut & Style', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: pastDate(20), startTime: '11:30', endTime: '12:15', duration: 45, price: 500, paymentStatus: 'PAID', status: 'COMPLETED', createdAt: pastDate(23), notes: '', customerPreferences: '' },
  // A few cancelled past bookings
  { id: 'bk-past-13', customerId: 'cust-2', customerName: 'Imtiyaz Ahmed', customerPhone: '+91 94190 55102', customerEmail: 'imtiyaz.a@example.com', serviceId: 'svc-4', serviceName: 'Balayage', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: pastDate(6), startTime: '14:00', endTime: '17:00', duration: 180, price: 4500, paymentStatus: 'PENDING', status: 'CANCELLED', createdAt: pastDate(8), notes: '', customerPreferences: '', cancellationReason: 'Customer travel emergency', cancelledAt: pastDate(7) },
  { id: 'bk-past-14', customerId: 'cust-5', customerName: 'Priya Nair', customerPhone: '+91 94190 55105', customerEmail: 'priya.nair@example.com', serviceId: 'svc-3', serviceName: 'Hair Spa Treatment', category: 'Hair', staffId: 'staff-2', staffName: 'Aisha Khan', date: pastDate(4), startTime: '13:00', endTime: '14:00', duration: 60, price: 1200, paymentStatus: 'PENDING', status: 'CANCELLED', createdAt: pastDate(6), notes: '', customerPreferences: '', cancellationReason: 'Customer unwell', cancelledAt: pastDate(5) },
  // Future bookings
  { id: 'bk-fut-1', customerId: 'cust-1', customerName: 'Aisha Khan', customerPhone: '+91 94190 55101', customerEmail: 'aisha.khan@example.com', serviceId: 'svc-3', serviceName: 'Hair Spa Treatment', category: 'Hair', staffId: 'staff-2', staffName: 'Aisha Khan', date: futureDate(1), startTime: '11:00', endTime: '12:00', duration: 60, price: 1200, paymentStatus: 'PENDING', status: 'UPCOMING', createdAt: pastDate(1), notes: '', customerPreferences: '' },
  { id: 'bk-fut-2', customerId: 'cust-3', customerName: 'Rahul Verma', customerPhone: '+91 94190 55103', customerEmail: 'rahul.verma@example.com', serviceId: 'svc-1', serviceName: 'Haircut & Style', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: futureDate(1), startTime: '15:00', endTime: '15:45', duration: 45, price: 500, paymentStatus: 'PENDING', status: 'UPCOMING', createdAt: pastDate(0), notes: '', customerPreferences: '' },
  { id: 'bk-fut-3', customerId: 'cust-7', customerName: 'Neha Sharma', customerPhone: '+91 94190 55107', customerEmail: 'neha.sharma@example.com', serviceId: 'svc-8', serviceName: 'Facial', category: 'Skin & Beauty', staffId: 'staff-2', staffName: 'Aisha Khan', date: futureDate(2), startTime: '10:00', endTime: '11:00', duration: 60, price: 1500, paymentStatus: 'PENDING', status: 'UPCOMING', createdAt: pastDate(0), notes: '', customerPreferences: '' },
  { id: 'bk-fut-4', customerId: 'cust-8', customerName: 'Rohit Kumar', customerPhone: '+91 94190 55108', customerEmail: 'rohit.k@example.com', serviceId: 'svc-6', serviceName: 'Beard Grooming', category: 'Beard & Grooming', staffId: 'staff-3', staffName: 'Tariq Bhat', date: futureDate(3), startTime: '14:00', endTime: '14:30', duration: 30, price: 400, paymentStatus: 'PENDING', status: 'UPCOMING', createdAt: pastDate(0), notes: '', customerPreferences: '' },
  { id: 'bk-fut-5', customerId: 'cust-2', customerName: 'Imtiyaz Ahmed', customerPhone: '+91 94190 55102', customerEmail: 'imtiyaz.a@example.com', serviceId: 'svc-4', serviceName: 'Balayage', category: 'Hair', staffId: 'staff-1', staffName: 'Ria Mahajan', date: futureDate(5), startTime: '09:00', endTime: '12:00', duration: 180, price: 4500, paymentStatus: 'PENDING', status: 'UPCOMING', createdAt: pastDate(0), notes: '', customerPreferences: '' },
  // ============================================================
  // GENERATED HISTORICAL + PREPAID FUTURE BOOKINGS
  // These produce the revenue targets:
  //   Today ₹6,200 | This Week ₹18,700 | This Month ₹52,400
  //   Last Month ₹47,800 | All Time ₹184,600
  // Generated by scripts/generate-seed-data.mjs — do not edit by hand.
  // ============================================================
  ...generateHistoricalAndPrepaidBookings(),
];

export const SEED_BLOCKED_SLOTS: BlockedSlot[] = [
  { id: 'blk-1', salonId: 'salon-1', date: todayStr, startTime: '12:30', endTime: '13:00', reason: 'Lunch Break', type: 'BREAK' },
  { id: 'blk-2', salonId: 'salon-1', date: todayStr, startTime: '14:30', endTime: '15:00', reason: 'Staff Break', type: 'BREAK' },
  { id: 'blk-3', salonId: 'salon-1', date: todayStr, startTime: '10:30', endTime: '11:00', reason: 'Staff meeting', type: 'BLOCKED' },
  { id: 'blk-4', salonId: 'salon-1', date: futureDate(1), startTime: '15:00', endTime: '16:00', reason: 'Maintenance', type: 'BLOCKED' },
  { id: 'blk-5', salonId: 'salon-1', date: futureDate(2), startTime: '13:00', endTime: '13:30', reason: 'Lunch Break', type: 'BREAK' },
  { id: 'blk-6', salonId: 'salon-1', date: futureDate(5), startTime: '13:00', endTime: '14:00', reason: 'Private event', type: 'BLOCKED' },
];

export const SEED_REVIEWS: Review[] = [
  { id: 'rev-1', customerId: 'cust-1', customerName: 'Aisha Khan', customerImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', serviceId: 'svc-3', serviceName: 'Hair Spa Treatment', staffId: 'staff-2', staffName: 'Aisha Khan', rating: 5, comment: 'Very good service and friendly staff. Aisha did a wonderful job with my hair spa. Will visit again!', date: pastDate(8), salonReply: 'Thank you Aisha! Looking forward to your next visit.', repliedAt: pastDate(7) },
  { id: 'rev-2', customerId: 'cust-2', customerName: 'Imtiyaz Ahmed', customerImage: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop', serviceId: 'svc-4', serviceName: 'Balayage', staffId: 'staff-1', staffName: 'Ria Mahajan', rating: 5, comment: 'Ria is a true artist. Best balayage I have ever had in Srinagar.', date: pastDate(15) },
  { id: 'rev-3', customerId: 'cust-3', customerName: 'Rahul Verma', customerImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop', serviceId: 'svc-1', serviceName: 'Haircut & Style', staffId: 'staff-1', staffName: 'Ria Mahajan', rating: 4, comment: 'Good haircut, slightly long wait but worth it.', date: pastDate(5) },
  { id: 'rev-4', customerId: 'cust-5', customerName: 'Priya Nair', customerImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop', serviceId: 'svc-8', serviceName: 'Facial', staffId: 'staff-2', staffName: 'Aisha Khan', rating: 5, comment: 'Aisha\'s facial treatment left my skin glowing. Highly recommend.', date: pastDate(3) },
  { id: 'rev-5', customerId: 'cust-8', customerName: 'Rohit Kumar', customerImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop', serviceId: 'svc-6', serviceName: 'Beard Grooming', staffId: 'staff-3', staffName: 'Tariq Bhat', rating: 4, comment: 'Tariq is excellent with beard shaping. Quick and clean.', date: pastDate(2) },
  { id: 'rev-6', customerId: 'cust-7', customerName: 'Neha Sharma', customerImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop', serviceId: 'svc-8', serviceName: 'Facial', staffId: 'staff-2', staffName: 'Aisha Khan', rating: 5, comment: 'Best salon in Srinagar for skin treatments. Loved every minute.', date: pastDate(7) },
  { id: 'rev-7', customerId: 'cust-4', customerName: 'Mahesh Kumar', customerImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop', serviceId: 'svc-2', serviceName: 'Hair Wash & Blow Dry', staffId: 'staff-1', staffName: 'Ria Mahajan', rating: 3, comment: 'Service was fine but the wait time was longer than expected.', date: pastDate(20) },
  { id: 'rev-8', customerId: 'cust-9', customerName: 'Sana Khan', customerImage: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=200&h=200&fit=crop', serviceId: 'svc-7', serviceName: 'Hair Styling', staffId: 'staff-1', staffName: 'Ria Mahajan', rating: 5, comment: 'Ria styled my hair beautifully for an event. Got many compliments!', date: pastDate(18) },
];

// SEED_PAYMENTS: one payment record per booking — the single source of truth
// for all revenue calculations across the app. Status mirrors the booking's
// paymentStatus so PAID bookings contribute to revenue, PENDING/CANCELLED ones
// do not, and REFUNDED ones (after a cancellation of a paid booking) are
// preserved for audit history.
const paymentMethods = ['Cash', 'UPI', 'Card', 'UPI', 'Net Banking'] as const;
export const SEED_PAYMENTS: Payment[] = SEED_BOOKINGS.map((b, i) => {
  // Cancelled bookings that were not paid remain PENDING (no transaction happened).
  // Cancelled bookings that were paid before cancellation become REFUNDED.
  // In the demo data, all cancelled bookings are pre-cancellation (no payment),
  // so they remain PENDING.
  let status: Payment['status'] = 'PENDING';
  if (b.paymentStatus === 'PAID') status = 'PAID';
  else if (b.status === 'CANCELLED') status = 'PENDING'; // unpaid cancellation — never collected
  else status = 'PENDING';

  return {
    id: `pay-${i + 1}`,
    bookingId: b.id,
    customerName: b.customerName,
    serviceName: b.serviceName,
    staffName: b.staffName,
    amount: b.price,
    method: paymentMethods[i % paymentMethods.length],
    status,
    date: b.date,
    transactionId: status === 'PAID' ? `TXN${String(10000 + i).padStart(6, '0')}` : undefined,
    createdAt: b.createdAt,
  };
});

export const SEED_NOTIFICATIONS: Notification[] = [
  { id: 'n-1', type: 'new_booking', title: 'New booking received', message: 'Sana Khan booked Hair Styling for today at 4:00 PM.', read: false, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), linkType: 'booking', linkId: 'bk-today-9' },
  { id: 'n-2', type: 'upcoming_appointment', title: 'Upcoming appointment in 30 minutes', message: 'Rohit Kumar - Beard Grooming at 3:00 PM.', read: false, createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), linkType: 'booking', linkId: 'bk-today-8' },
  { id: 'n-3', type: 'new_review', title: 'Customer left a new review', message: 'Aisha Khan left a 5-star review for Hair Spa Treatment.', read: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), linkType: 'review', linkId: 'rev-1' },
  { id: 'n-4', type: 'payment_received', title: 'Payment received', message: '₹1,500 received from Priya Nair for Hair Spa Treatment.', read: true, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), linkType: 'payment', linkId: 'bk-today-4' },
  { id: 'n-5', type: 'booking_cancelled', title: 'Booking cancelled by customer', message: 'Mahesh Kumar cancelled today\'s 10:00 AM appointment.', read: true, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), linkType: 'booking', linkId: 'bk-today-3' },
  { id: 'n-6', type: 'new_booking', title: 'New booking received', message: 'Imtiyaz Ahmed booked Balayage for 5 days from now.', read: true, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), linkType: 'booking', linkId: 'bk-fut-5' },
  { id: 'n-7', type: 'profile_attention', title: 'Your salon profile needs attention', message: 'Add more photos to attract 2.3x more customers.', read: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), linkType: 'profile' },
];

export const SEED_TICKETS: SupportTicket[] = [
  { id: 'tkt-1', subject: 'Payment not reflected for booking bk-past-3', category: 'Payment Issue', priority: 'High', description: 'Customer paid ₹400 via UPI but payment shows as pending in the system.', status: 'IN PROGRESS', createdAt: pastDate(2), updatedAt: pastDate(1), responses: [
    { from: 'salon', message: 'Payment not reflected for a completed booking. Customer paid via UPI.', timestamp: pastDate(2) },
    { from: 'support', message: 'We are checking with the payment gateway. Will update within 24 hours.', timestamp: pastDate(1) },
  ] },
  { id: 'tkt-2', subject: 'Calendar not showing past bookings', category: 'Technical Problem', priority: 'Medium', description: 'Calendar view was not displaying bookings from last week.', status: 'RESOLVED', createdAt: pastDate(10), updatedAt: pastDate(8), responses: [
    { from: 'salon', message: 'Past bookings not visible in calendar.', timestamp: pastDate(10) },
    { from: 'support', message: 'This has been resolved in the latest update. Please refresh.', timestamp: pastDate(8) },
  ] },
];

export const SEED_SETTINGS: SalonSettings = {
  account: { ownerName: 'Ria Mahajan', email: 'ria@premiumroots.in', phone: '+91 94190 11111' },
  notifications: { newBooking: true, bookingCancelled: true, upcomingAppointment: true, newReview: true, paymentReceived: true },
  booking: { allowAdvanceDays: 30, minCancelHours: 4, autoConfirm: false, requireDeposit: false, depositPercent: 20 },
  cancellation: { freeCancelHours: 4, lateCancelFeePercent: 30, noShowFeePercent: 50 },
  payment: { acceptCash: true, acceptCard: true, acceptUPI: true, acceptNetBanking: false },
  staffPermissions: { managerCanEditServices: true, managerCanManageStaff: false, staffCanSeeAllBookings: false, staffCanEditOwnSchedule: true },
  security: { twoFactor: false, loginAlerts: true },
};
