import fs from 'fs';

const file = 'D:/AntiGravity/admin2/src/lib/store.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add salonApi import
code = code.replace(
  "import { persist } from 'zustand/middleware';",
  "import { persist } from 'zustand/middleware';\nimport { salonApi } from './api';"
);

// 2. Add syncWithBackend method to SalonState interface
code = code.replace(
  'resetData: () => void;',
  'resetData: () => void;\nsyncWithBackend: () => Promise<void>;'
);

// 3. Add syncWithBackend implementation and hook up updateBookingStatus to salonApi
const syncImpl = `
      syncWithBackend: async () => {
        try {
          const salonId = '00000000-0000-0000-0001-000000000001';
          const res = await salonApi.getBookings(salonId);
          if (res.success && res.data && res.data.bookings) {
            const apiBookings = res.data.bookings.map((b: any) => ({
              id: b.id || b.bookingId,
              customerId: b.customerId || '',
              customerName: b.customerName || 'Customer',
              customerPhone: b.customerPhone || '',
              customerEmail: b.customerEmail || '',
              serviceId: b.serviceId || '',
              serviceName: b.serviceName,
              category: 'Hair' as any,
              staffId: b.staffId || '',
              staffName: b.staffName || '',
              date: b.date ? new Date(b.date).toISOString().split('T')[0] : '',
              startTime: b.startTime,
              endTime: b.endTime || b.startTime,
              duration: b.duration || 30,
              price: b.price,
              status: (b.status || 'CONFIRMED') as any,
              paymentStatus: (b.paymentStatus ? b.paymentStatus.toUpperCase() : 'PAID') as any,
              createdAt: b.createdAt || new Date().toISOString(),
            }));
            set(s => ({
              bookings: [...apiBookings, ...s.bookings.filter(sb => !apiBookings.some((ab: any) => ab.id === sb.id))]
            }));
          }
        } catch {
          // Gracefully fallback to local state if backend is offline
        }
      },
`;

code = code.replace(
  'resetData: () => {',
  syncImpl + '\n      resetData: () => {'
);

// Hook updateBookingStatus with backend sync call
const oldUpdateBooking = `updateBookingStatus: (id, status, reason) => {
        const booking = get().bookings.find(b => b.id === id);`;

const newUpdateBooking = `updateBookingStatus: (id, status, reason) => {
        const booking = get().bookings.find(b => b.id === id);
        // Dispatch asynchronous update to authoritative backend
        salonApi.updateBookingStatus(id, status, reason).catch(() => {});`;

code = code.replace(oldUpdateBooking, newUpdateBooking);

fs.writeFileSync(file, code, 'utf8');
console.log('Successfully added backend synchronization to admin2 store!');
