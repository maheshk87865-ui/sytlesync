// StyleSync Salon Partner App - Main Store (single source of truth)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { salonApi } from './api';
import type {
  Salon, Service, Staff, Customer, Booking, BlockedSlot, Review, Payment,
  Notification, SupportTicket, SalonSettings, ViewKey, BookingStatus,
  PaymentStatus, ServiceCategory, StaffRole, StaffStatus, TicketStatus,
} from './types';
import {
  SEED_SALON, SEED_SERVICES, SEED_STAFF, SEED_CUSTOMERS, SEED_BOOKINGS,
  SEED_BLOCKED_SLOTS, SEED_REVIEWS, SEED_PAYMENTS, SEED_NOTIFICATIONS,
  SEED_TICKETS, SEED_SETTINGS,
} from './seedData';

const timeStr = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const addMins = (t: string, mins: number) => {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  return timeStr(Math.floor(total / 60) % 24, total % 60);
};

interface SalonState {
  // Data
  salon: Salon;
  services: Service[];
  staff: Staff[];
  customers: Customer[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  reviews: Review[];
  payments: Payment[];
  notifications: Notification[];
  tickets: SupportTicket[];
  settings: SalonSettings;

  // UI state
  currentView: ViewKey;
  currentRole: 'SALON_OWNER' | 'SALON_MANAGER' | 'SALON_STAFF';
  selectedBookingId: string | null;
  selectedCustomerId: string | null;
  selectedStaffId: string | null;
  selectedDate: string; // for calendar/availability
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];

  // Cross-view booking filter state (used by Dashboard → Bookings navigation)
  bookingFilter: {
    tab: 'ALL' | 'TODAY' | 'PENDING' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
    dateFilter: 'ALL' | 'TODAY' | 'PAST' | 'FUTURE';
    statusFilter: 'ALL' | 'PENDING' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
    staffFilter: string; // staff id or 'ALL'
    serviceFilter: string; // service id or 'ALL'
    search: string;
  };

  // Cross-view payment filter state (used by Dashboard → Payments navigation)
  paymentFilter: {
    range: 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'CUSTOM';
    statusFilter: 'ALL' | 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';
    search: string;
    // When range === 'CUSTOM', these define the custom period:
    customMode: 'MONTH' | 'YEAR';   // pick a specific month or a full year
    customYear: number;             // e.g. 2026
    customMonth: number;            // 1-12 (used only when customMode === 'MONTH')
  };

  // Navigation
  setView: (view: ViewKey) => void;
  setRole: (role: 'SALON_OWNER' | 'SALON_MANAGER' | 'SALON_STAFF') => void;
  selectBooking: (id: string | null) => void;
  selectCustomer: (id: string | null) => void;
  selectStaff: (id: string | null) => void;
  selectDate: (date: string) => void;
  setBookingFilter: (filter: Partial<SalonState['bookingFilter']>) => void;
  resetBookingFilter: () => void;
  setPaymentFilter: (filter: Partial<SalonState['paymentFilter']>) => void;
  resetPaymentFilter: () => void;

  // Toast
  pushToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Salon operations
  toggleSalonStatus: () => void;
  setSalonStatus: (status: 'OPEN' | 'CLOSED') => void;
  setTemporaryClosure: (start: string, end: string, reason: string) => void;
  clearTemporaryClosure: () => void;
  updateSalon: (updates: Partial<Salon>) => void;

  // Service operations
  addService: (svc: Omit<Service, 'id' | 'salonId' | 'totalBookings'>) => string;
  updateService: (id: string, updates: Partial<Service>) => void;
  deleteService: (id: string) => void;
  toggleServiceActive: (id: string) => void;

  // Staff operations
  addStaff: (s: Omit<Staff, 'id' | 'salonId'>) => string;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  removeStaff: (id: string) => void;
  toggleStaffStatus: (id: string) => void;
  addStaffUnavailability: (staffId: string, date: string, startTime: string, endTime: string, reason: string) => void;
  removeStaffUnavailability: (staffId: string, idx: number) => void;

  // Customer operations
  addCustomer: (c: Omit<Customer, 'id' | 'totalBookings' | 'completedBookings' | 'cancelledBookings' | 'totalSpent' | 'joinedDate' | 'favoriteServices' | 'preferredStaff'>) => string;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;

  // Booking operations
  createBooking: (input: {
    customerId?: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    serviceId: string;
    staffId: string;
    date: string;
    startTime: string;
    notes?: string;
    paymentStatus?: PaymentStatus;
  }) => { success: boolean; message: string; bookingId?: string };
  updateBookingStatus: (id: string, status: BookingStatus, reason?: string) => void;
  rescheduleBooking: (id: string, date: string, startTime: string) => { success: boolean; message: string };
  cancelBooking: (id: string, reason: string) => void;
  markBookingCompleted: (id: string) => void;

  // Slot operations
  blockSlot: (date: string, startTime: string, endTime: string, reason: string) => { success: boolean; message: string };
  addBreak: (date: string, startTime: string, endTime: string, label: string) => { success: boolean; message: string };
  unblockSlot: (id: string) => void;
  removeBreak: (id: string) => void;

  // Review operations
  replyToReview: (reviewId: string, reply: string) => void;

  // Payment operations — single source of truth for revenue.
  // Updating a payment status also keeps the linked booking's paymentStatus in sync.
  updatePaymentStatus: (paymentId: string, status: PaymentStatus) => void;
  markPaymentPaid: (paymentId: string) => void;
  refundPayment: (paymentId: string, reason: string) => void;
  updatePaymentMethod: (paymentId: string, method: Payment['method']) => void;

  // Notification operations
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Settings
  updateSettings: (updates: Partial<SalonSettings>) => void;

  // Support tickets
  createTicket: (subject: string, category: SupportTicket['category'], priority: SupportTicket['priority'], description: string) => void;
  respondTicket: (id: string, message: string) => void;

  // Conflict checks
  isSlotAvailable: (date: string, startTime: string, endTime: string, staffId: string, excludeBookingId?: string) => { available: boolean; reason?: string };
  getSlotsForDateStaff: (date: string, staffId: string) => { time: string; status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'BREAK'; booking?: Booking; reason?: string }[];

  // Reset
  resetData: () => void;
syncWithBackend: () => Promise<void>;
}

// Helper to get day of week key
const getDayKey = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[d.getDay()];
};

// Initial state factory
const initialState = () => ({
  salon: SEED_SALON,
  services: SEED_SERVICES,
  staff: SEED_STAFF,
  customers: SEED_CUSTOMERS,
  bookings: SEED_BOOKINGS,
  blockedSlots: SEED_BLOCKED_SLOTS,
  reviews: SEED_REVIEWS,
  payments: SEED_PAYMENTS,
  notifications: SEED_NOTIFICATIONS,
  tickets: SEED_TICKETS,
  settings: SEED_SETTINGS,
  currentView: 'dashboard' as ViewKey,
  currentRole: 'SALON_OWNER' as const,
  selectedBookingId: null as string | null,
  selectedCustomerId: null as string | null,
  selectedStaffId: null as string | null,
  selectedDate: new Date().toISOString().split('T')[0],
  toasts: [] as { id: string; message: string; type: 'success' | 'error' | 'info' }[],
  bookingFilter: {
    tab: 'ALL' as 'ALL' | 'TODAY' | 'PENDING' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED',
    dateFilter: 'ALL' as 'ALL' | 'TODAY' | 'PAST' | 'FUTURE',
    statusFilter: 'ALL' as 'ALL' | 'PENDING' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED',
    staffFilter: 'ALL',
    serviceFilter: 'ALL',
    search: '',
  },
  paymentFilter: {
    range: 'MONTH' as 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'CUSTOM',
    statusFilter: 'ALL' as 'ALL' | 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED',
    search: '',
    customMode: 'MONTH' as 'MONTH' | 'YEAR',
    customYear: new Date().getFullYear(),
    customMonth: new Date().getMonth() + 1,
  },
});

const DEFAULT_BOOKING_FILTER = {
  tab: 'ALL' as const,
  dateFilter: 'ALL' as const,
  statusFilter: 'ALL' as const,
  staffFilter: 'ALL',
  serviceFilter: 'ALL',
  search: '',
};

const DEFAULT_PAYMENT_FILTER = {
  range: 'MONTH' as const,
  statusFilter: 'ALL' as const,
  search: '',
  customMode: 'MONTH' as const,
  customYear: new Date().getFullYear(),
  customMonth: new Date().getMonth() + 1,
};

let toastCounter = 0;

export const useSalonStore = create<SalonState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setView: (view) => set({ currentView: view }),
      setRole: (role) => set({ currentRole: role }),
      selectBooking: (id) => set({ selectedBookingId: id }),
      selectCustomer: (id) => set({ selectedCustomerId: id }),
      selectStaff: (id) => set({ selectedStaffId: id }),
      selectDate: (date) => set({ selectedDate: date }),
      setBookingFilter: (filter) => set(s => ({ bookingFilter: { ...s.bookingFilter, ...filter } })),
      resetBookingFilter: () => set({ bookingFilter: { ...DEFAULT_BOOKING_FILTER } }),
      setPaymentFilter: (filter) => set(s => ({ paymentFilter: { ...s.paymentFilter, ...filter } })),
      resetPaymentFilter: () => set({ paymentFilter: { ...DEFAULT_PAYMENT_FILTER } }),

      pushToast: (message, type = 'success') => {
        const id = `toast-${++toastCounter}-${Date.now()}`;
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
          set(st => ({ toasts: st.toasts.filter(t => t.id !== id) }));
        }, 3500);
      },
      dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

      toggleSalonStatus: () => set(s => ({
        salon: { ...s.salon, status: s.salon.status === 'OPEN' ? 'CLOSED' : 'OPEN' },
      })),
      setSalonStatus: (status) => set(s => ({ salon: { ...s.salon, status } })),
      setTemporaryClosure: (start, end, reason) => set(s => ({
        salon: { ...s.salon, temporaryClosure: { start, end, reason } },
      })),
      clearTemporaryClosure: () => set(s => {
        const newSalon = { ...s.salon };
        delete newSalon.temporaryClosure;
        return { salon: newSalon };
      }),
      updateSalon: (updates) => set(s => ({ salon: { ...s.salon, ...updates } })),

      addService: (svc) => {
        const id = `svc-${Date.now()}`;
        set(s => ({
          services: [...s.services, { ...svc, id, salonId: s.salon.id, totalBookings: 0 }],
        }));
        get().pushToast('Service added successfully', 'success');
        return id;
      },
      updateService: (id, updates) => {
        set(s => ({ services: s.services.map(sv => sv.id === id ? { ...sv, ...updates } : sv) }));
        get().pushToast('Service updated', 'success');
      },
      deleteService: (id) => {
        set(s => ({ services: s.services.filter(sv => sv.id !== id) }));
        get().pushToast('Service deleted', 'success');
      },
      toggleServiceActive: (id) => {
        set(s => ({ services: s.services.map(sv => sv.id === id ? { ...sv, active: !sv.active } : sv) }));
        const svc = get().services.find(sv => sv.id === id);
        get().pushToast(`Service ${svc?.active ? 'activated' : 'deactivated'}`, 'success');
      },

      addStaff: (s) => {
        const id = `staff-${Date.now()}`;
        set(st => ({
          staff: [...st.staff, { ...s, id, salonId: st.salon.id }],
        }));
        get().pushToast('Staff member added', 'success');
        return id;
      },
      updateStaff: (id, updates) => {
        set(s => ({ staff: s.staff.map(st => st.id === id ? { ...st, ...updates } : st) }));
        get().pushToast('Staff updated', 'success');
      },
      removeStaff: (id) => {
        set(s => ({ staff: s.staff.filter(st => st.id !== id) }));
        get().pushToast('Staff removed', 'success');
      },
      toggleStaffStatus: (id) => {
        set(s => ({ staff: s.staff.map(st => st.id === id ? { ...st, status: st.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : st) }));
        const st = get().staff.find(x => x.id === id);
        get().pushToast(`Staff ${st?.status === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'success');
      },
      addStaffUnavailability: (staffId, date, startTime, endTime, reason) => {
        set(s => ({
          staff: s.staff.map(st => st.id === staffId
            ? { ...st, unavailability: [...(st.unavailability || []), { date, startTime, endTime, reason }] }
            : st),
        }));
        get().pushToast('Unavailability added', 'success');
      },
      removeStaffUnavailability: (staffId, idx) => {
        set(s => ({
          staff: s.staff.map(st => st.id === staffId
            ? { ...st, unavailability: (st.unavailability || []).filter((_, i) => i !== idx) }
            : st),
        }));
        get().pushToast('Unavailability removed', 'success');
      },

      addCustomer: (c) => {
        const id = `cust-${Date.now()}`;
        set(s => ({
          customers: [...s.customers, {
            ...c, id,
            totalBookings: 0, completedBookings: 0, cancelledBookings: 0, totalSpent: 0,
            joinedDate: new Date().toISOString().split('T')[0],
            favoriteServices: [], preferredStaff: [],
          }],
        }));
        get().pushToast('Customer added', 'success');
        return id;
      },
      updateCustomer: (id, updates) => {
        set(s => ({ customers: s.customers.map(c => c.id === id ? { ...c, ...updates } : c) }));
        get().pushToast('Customer updated', 'success');
      },

      createBooking: (input) => {
        const state = get();
        const service = state.services.find(s => s.id === input.serviceId);
        if (!service) return { success: false, message: 'Service not found' };

        const staff = state.staff.find(s => s.id === input.staffId);
        if (!staff) return { success: false, message: 'Staff not found' };

        // Check salon open
        if (state.salon.status === 'CLOSED') {
          return { success: false, message: 'Salon is currently closed' };
        }

        // Check salon hours
        const dayKey = getDayKey(input.date);
        const salonHours = state.salon.openingHours[dayKey as keyof typeof state.salon.openingHours];
        if (salonHours.closed) {
          return { success: false, message: 'Salon is closed on this day' };
        }
        const endTime = addMins(input.startTime, service.duration);
        if (input.startTime < salonHours.open || endTime > salonHours.close) {
          return { success: false, message: `Booking must be within salon hours (${salonHours.open} - ${salonHours.close})` };
        }

        // Check staff schedule
        const staffDay = staff.schedule[dayKey as keyof typeof staff.schedule];
        if (staffDay.off) {
          return { success: false, message: `${staff.name} is off on this day` };
        }
        if (input.startTime < staffDay.start || endTime > staffDay.end) {
          return { success: false, message: `${staff.name} works ${staffDay.start} - ${staffDay.end}` };
        }

        // Check staff unavailability
        const unavail = (staff.unavailability || []).find(u => u.date === input.date);
        if (unavail) {
          if (input.startTime < unavail.endTime && endTime > unavail.startTime) {
            return { success: false, message: `${staff.name} is unavailable ${unavail.startTime} - ${unavail.endTime} (${unavail.reason})` };
          }
        }

        // Check staff assigned to service
        if (!service.assignedStaff.includes(input.staffId)) {
          return { success: false, message: `${staff.name} is not assigned to ${service.name}` };
        }

        // Check conflict with existing bookings
        const conflict = state.bookings.find(b =>
          b.staffId === input.staffId &&
          b.date === input.date &&
          b.status !== 'CANCELLED' &&
          input.startTime < b.endTime &&
          endTime > b.startTime
        );
        if (conflict) {
          return { success: false, message: `${staff.name} is already booked ${conflict.startTime} - ${conflict.endTime}` };
        }

        // Check blocked slots
        const blockedConflict = state.blockedSlots.find(blk =>
          blk.date === input.date &&
          input.startTime < blk.endTime &&
          endTime > blk.startTime
        );
        if (blockedConflict) {
          return { success: false, message: `This time is ${blockedConflict.type === 'BREAK' ? 'a break' : 'blocked'}: ${blockedConflict.reason}` };
        }

        // Find or create customer
        let customerId = input.customerId;
        let customer = state.customers.find(c => c.id === customerId);
        if (!customer && input.customerName) {
          const existing = state.customers.find(c =>
            c.phone === input.customerPhone || c.email === input.customerEmail
          );
          if (existing) {
            customerId = existing.id;
            customer = existing;
          } else {
            customerId = `cust-${Date.now()}`;
            const newCust: Customer = {
              id: customerId,
              name: input.customerName,
              phone: input.customerPhone,
              email: input.customerEmail,
              image: `https://ui-avatars.com/api/?name=${encodeURIComponent(input.customerName)}&background=B76E79&color=fff`,
              totalBookings: 0, completedBookings: 0, cancelledBookings: 0, totalSpent: 0,
              favoriteServices: [], preferredStaff: [],
              notes: '', joinedDate: new Date().toISOString().split('T')[0],
            };
            set(s => ({ customers: [...s.customers, newCust] }));
          }
        }

        const id = `bk-${Date.now()}`;
        const booking: Booking = {
          id,
          customerId: customerId || '',
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          serviceId: input.serviceId,
          serviceName: service.name,
          category: service.category,
          staffId: input.staffId,
          staffName: staff.name,
          date: input.date,
          startTime: input.startTime,
          endTime,
          duration: service.duration,
          price: service.price,
          paymentStatus: input.paymentStatus || 'PENDING',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          notes: input.notes || '',
          customerPreferences: '',
        };
        // Create a corresponding payment record (1:1 with booking) — single source of truth
        const payment: Payment = {
          id: `pay-${Date.now()}`,
          bookingId: id,
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          staffName: booking.staffName,
          amount: booking.price,
          method: 'Cash',
          status: (input.paymentStatus || 'PENDING') === 'PAID' ? 'PAID' : 'PENDING',
          date: booking.date,
          transactionId: input.paymentStatus === 'PAID' ? `TXN${Date.now().toString().slice(-6)}` : undefined,
          createdAt: booking.createdAt,
        };
        set(s => ({
          bookings: [...s.bookings, booking],
          payments: [...s.payments, payment],
          services: s.services.map(sv => sv.id === input.serviceId ? { ...sv, totalBookings: sv.totalBookings + 1 } : sv),
          customers: s.customers.map(c => c.id === customerId ? { ...c, totalBookings: c.totalBookings + 1, nextAppointment: input.date } : c),
          notifications: [{
            id: `n-${Date.now()}`,
            type: 'new_booking',
            title: 'New booking created',
            message: `${input.customerName} - ${service.name} on ${input.date} at ${input.startTime}`,
            read: false,
            createdAt: new Date().toISOString(),
            linkType: 'booking',
            linkId: id,
          }, ...s.notifications],
        }));
        get().pushToast('Booking created successfully', 'success');
        return { success: true, message: 'Booking created', bookingId: id };
      },

      updateBookingStatus: (id, status, reason) => {
        const booking = get().bookings.find(b => b.id === id);
        // Dispatch asynchronous update to authoritative backend
        salonApi.updateBookingStatus(id, status, reason).catch(() => {});
        if (!booking) return;
        // Validate transition
        const validTransitions: Record<BookingStatus, BookingStatus[]> = {
          PENDING: ['UPCOMING', 'COMPLETED', 'CANCELLED'],
          UPCOMING: ['COMPLETED', 'CANCELLED'],
          COMPLETED: [],
          CANCELLED: [],
        };
        if (!validTransitions[booking.status].includes(status)) {
          get().pushToast(`Cannot change status from ${booking.status} to ${status}`, 'error');
          return;
        }
        // Existing payment record (1:1 with booking)
        const existingPayment = get().payments.find(p => p.bookingId === id);

        set(s => ({
          bookings: s.bookings.map(b => b.id === id ? {
            ...b,
            status,
            cancelledAt: status === 'CANCELLED' ? new Date().toISOString() : b.cancelledAt,
            cancellationReason: status === 'CANCELLED' ? reason : b.cancellationReason,
            paymentStatus: status === 'COMPLETED' ? 'PAID' : (status === 'CANCELLED' && b.paymentStatus === 'PAID' ? 'REFUNDED' : b.paymentStatus),
          } : b),
        }));

        // Update the corresponding payment record (no duplicates)
        if (status === 'COMPLETED' && existingPayment) {
          const wasAlreadyPaid = existingPayment.status === 'PAID';
          set(s => ({
            customers: s.customers.map(c => c.id === booking.customerId ? {
              ...c,
              completedBookings: c.completedBookings + 1,
              totalSpent: c.totalSpent + booking.price,
              lastVisit: booking.date,
            } : c),
            payments: s.payments.map(p => p.bookingId === id ? {
              ...p,
              status: 'PAID' as const,
              transactionId: p.transactionId || `TXN${Date.now().toString().slice(-6)}`,
            } : p),
            notifications: wasAlreadyPaid ? s.notifications : [{
              id: `n-${Date.now()}`,
              type: 'payment_received',
              title: 'Payment received',
              message: `₹${booking.price.toLocaleString('en-IN')} received from ${booking.customerName} for ${booking.serviceName}.`,
              read: false,
              createdAt: new Date().toISOString(),
              linkType: 'payment',
              linkId: booking.id,
            }, ...s.notifications],
          }));
        } else if (status === 'CANCELLED') {
          // If the booking was already paid, mark the payment as REFUNDED (audit preserved).
          // If it was unpaid, leave the payment as PENDING (never collected).
          set(s => ({
            customers: s.customers.map(c => c.id === booking.customerId ? {
              ...c,
              cancelledBookings: c.cancelledBookings + 1,
            } : c),
            payments: existingPayment && existingPayment.status === 'PAID'
              ? s.payments.map(p => p.bookingId === id ? {
                  ...p,
                  status: 'REFUNDED' as const,
                  refundAmount: p.amount,
                  refundDate: new Date().toISOString(),
                  refundReason: reason || 'Booking cancelled',
                } : p)
              : s.payments,
          }));
        }
        get().pushToast(`Booking marked as ${status}`, 'success');
      },

      rescheduleBooking: (id, date, startTime) => {
        const booking = get().bookings.find(b => b.id === id);
        if (!booking) return { success: false, message: 'Booking not found' };
        const service = get().services.find(s => s.id === booking.serviceId);
        if (!service) return { success: false, message: 'Service not found' };
        const endTime = addMins(startTime, service.duration);
        // Check conflicts (excluding this booking)
        const conflict = get().bookings.find(b =>
          b.id !== id &&
          b.staffId === booking.staffId &&
          b.date === date &&
          b.status !== 'CANCELLED' &&
          startTime < b.endTime &&
          endTime > b.startTime
        );
        if (conflict) {
          return { success: false, message: `${booking.staffName} is already booked ${conflict.startTime} - ${conflict.endTime}` };
        }
        set(s => ({
          bookings: s.bookings.map(b => b.id === id ? { ...b, date, startTime, endTime } : b),
        }));
        get().pushToast('Booking rescheduled', 'success');
        return { success: true, message: 'Rescheduled' };
      },

      cancelBooking: (id, reason) => get().updateBookingStatus(id, 'CANCELLED', reason),
      markBookingCompleted: (id) => get().updateBookingStatus(id, 'COMPLETED'),

      blockSlot: (date, startTime, endTime, reason) => {
        // Check if any booking conflicts
        const booking = get().bookings.find(b =>
          b.date === date &&
          b.status !== 'CANCELLED' &&
          startTime < b.endTime &&
          endTime > b.startTime
        );
        if (booking) {
          return { success: false, message: `Cannot block: ${booking.customerName} is booked ${booking.startTime} - ${booking.endTime}` };
        }
        const id = `blk-${Date.now()}`;
        set(s => ({
          blockedSlots: [...s.blockedSlots, { id, salonId: s.salon.id, date, startTime, endTime, reason, type: 'BLOCKED' as const }],
        }));
        get().pushToast('Slot blocked', 'success');
        return { success: true, message: 'Blocked' };
      },

      addBreak: (date, startTime, endTime, label) => {
        const id = `brk-${Date.now()}`;
        set(s => ({
          blockedSlots: [...s.blockedSlots, { id, salonId: s.salon.id, date, startTime, endTime, reason: label, type: 'BREAK' as const }],
        }));
        get().pushToast('Break added', 'success');
        return { success: true, message: 'Break added' };
      },

      unblockSlot: (id) => {
        set(s => ({ blockedSlots: s.blockedSlots.filter(b => b.id !== id) }));
        get().pushToast('Slot unblocked', 'success');
      },
      removeBreak: (id) => {
        set(s => ({ blockedSlots: s.blockedSlots.filter(b => b.id !== id) }));
        get().pushToast('Break removed', 'success');
      },

      replyToReview: (reviewId, reply) => {
        set(s => ({
          reviews: s.reviews.map(r => r.id === reviewId ? { ...r, salonReply: reply, repliedAt: new Date().toISOString() } : r),
        }));
        get().pushToast('Reply posted', 'success');
      },

      // Payment operations — keep payments[] in sync with bookings[] paymentStatus.
      // Every revenue number in the app is calculated from payments[] so these
      // actions automatically update Dashboard, Payments view, and Analytics.
      updatePaymentStatus: (paymentId, status) => {
        const payment = get().payments.find(p => p.id === paymentId);
        if (!payment) return;
        const bookingId = payment.bookingId;
        const now = new Date().toISOString();
        set(s => ({
          payments: s.payments.map(p => p.id === paymentId ? {
            ...p,
            status,
            transactionId: status === 'PAID' && !p.transactionId ? `TXN${Date.now().toString().slice(-6)}` : p.transactionId,
            refundAmount: status === 'REFUNDED' ? p.amount : p.refundAmount,
            refundDate: status === 'REFUNDED' ? now : p.refundDate,
          } : p),
          // Keep booking's paymentStatus in sync
          bookings: s.bookings.map(b => b.id === bookingId ? {
            ...b,
            paymentStatus: status === 'PAID' ? 'PAID'
              : status === 'REFUNDED' ? 'REFUNDED'
              : status === 'FAILED' ? 'FAILED'
              : 'PENDING',
          } : b),
        }));

        // Update customer totalSpent if revenue actually changes
        const booking = get().bookings.find(b => b.id === bookingId);
        if (booking) {
          const wasContributing = payment.status === 'PAID';
          const willContribute = status === 'PAID';
          if (wasContributing !== willContribute) {
            const delta = willContribute ? booking.price : -booking.price;
            set(s => ({
              customers: s.customers.map(c => c.id === booking.customerId ? {
                ...c, totalSpent: Math.max(0, c.totalSpent + delta),
              } : c),
            }));
          }
        }

        // Notify on payment received
        if (status === 'PAID' && payment.status !== 'PAID') {
          set(s => ({
            notifications: [{
              id: `n-${Date.now()}`,
              type: 'payment_received',
              title: 'Payment received',
              message: `₹${payment.amount.toLocaleString('en-IN')} received from ${payment.customerName} for ${payment.serviceName}.`,
              read: false,
              createdAt: now,
              linkType: 'payment',
              linkId: bookingId,
            }, ...s.notifications],
          }));
        }
        get().pushToast(`Payment marked as ${status}`, 'success');
      },

      markPaymentPaid: (paymentId) => get().updatePaymentStatus(paymentId, 'PAID'),

      refundPayment: (paymentId, reason) => {
        const payment = get().payments.find(p => p.id === paymentId);
        if (!payment) return;
        if (payment.status !== 'PAID') {
          get().pushToast('Only paid payments can be refunded', 'error');
          return;
        }
        const bookingId = payment.bookingId;
        const now = new Date().toISOString();
        set(s => ({
          payments: s.payments.map(p => p.id === paymentId ? {
            ...p,
            status: 'REFUNDED' as const,
            refundAmount: p.amount,
            refundDate: now,
            refundReason: reason,
          } : p),
          bookings: s.bookings.map(b => b.id === bookingId ? { ...b, paymentStatus: 'REFUNDED' as const } : b),
          customers: s.customers.map(c => c.id === (get().bookings.find(b => b.id === bookingId)?.customerId) ? {
            ...c, totalSpent: Math.max(0, c.totalSpent - payment.amount),
          } : c),
          notifications: [{
            id: `n-${Date.now()}`,
            type: 'booking_cancelled',
            title: 'Payment refunded',
            message: `₹${payment.amount.toLocaleString('en-IN')} refunded to ${payment.customerName}. Reason: ${reason}`,
            read: false,
            createdAt: now,
            linkType: 'payment',
            linkId: bookingId,
          }, ...s.notifications],
        }));
        get().pushToast('Payment refunded', 'success');
      },

      updatePaymentMethod: (paymentId, method) => {
        set(s => ({
          payments: s.payments.map(p => p.id === paymentId ? { ...p, method } : p),
        }));
        get().pushToast('Payment method updated', 'success');
      },

      markNotificationRead: (id) => {
        set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
      },
      markAllNotificationsRead: () => {
        set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) }));
        get().pushToast('All notifications marked as read', 'success');
      },

      updateSettings: (updates) => {
        set(s => ({ settings: { ...s.settings, ...updates } }));
        get().pushToast('Settings updated', 'success');
      },

      createTicket: (subject, category, priority, description) => {
        const id = `tkt-${Date.now()}`;
        const now = new Date().toISOString();
        set(s => ({
          tickets: [{
            id, subject, category, priority, description, status: 'OPEN',
            createdAt: now, updatedAt: now,
            responses: [{ from: 'salon', message: description, timestamp: now }],
          }, ...s.tickets],
        }));
        get().pushToast('Support ticket created', 'success');
      },
      respondTicket: (id, message) => {
        const now = new Date().toISOString();
        set(s => ({
          tickets: s.tickets.map(t => t.id === id ? {
            ...t, updatedAt: now,
            responses: [...t.responses, { from: 'salon', message, timestamp: now }],
          } : t),
        }));
        get().pushToast('Reply sent', 'success');
      },

      isSlotAvailable: (date, startTime, endTime, staffId, excludeBookingId) => {
        const state = get();
        if (state.salon.status === 'CLOSED') {
          return { available: false, reason: 'Salon is currently closed' };
        }
        const dayKey = getDayKey(date);
        const salonHours = state.salon.openingHours[dayKey as keyof typeof state.salon.openingHours];
        if (salonHours.closed) {
          return { available: false, reason: 'Salon is closed on this day' };
        }
        if (startTime < salonHours.open || endTime > salonHours.close) {
          return { available: false, reason: `Outside salon hours` };
        }
        const staff = state.staff.find(s => s.id === staffId);
        if (!staff) return { available: false, reason: 'Staff not found' };
        const staffDay = staff.schedule[dayKey as keyof typeof staff.schedule];
        if (staffDay.off) {
          return { available: false, reason: `${staff.name} is off this day` };
        }
        if (startTime < staffDay.start || endTime > staffDay.end) {
          return { available: false, reason: `Outside ${staff.name}'s working hours` };
        }
        const unavail = (staff.unavailability || []).find(u => u.date === date);
        if (unavail && startTime < unavail.endTime && endTime > unavail.startTime) {
          return { available: false, reason: `${staff.name} unavailable ${unavail.startTime}-${unavail.endTime}` };
        }
        const conflict = state.bookings.find(b =>
          b.id !== excludeBookingId &&
          b.staffId === staffId &&
          b.date === date &&
          b.status !== 'CANCELLED' &&
          startTime < b.endTime &&
          endTime > b.startTime
        );
        if (conflict) {
          return { available: false, reason: `${staff.name} already booked ${conflict.startTime}-${conflict.endTime}` };
        }
        const blocked = state.blockedSlots.find(blk =>
          blk.date === date &&
          startTime < blk.endTime &&
          endTime > blk.startTime
        );
        if (blocked) {
          return { available: false, reason: `Slot ${blocked.type === 'BREAK' ? 'is a break' : 'is blocked'}: ${blocked.reason}` };
        }
        return { available: true };
      },

      getSlotsForDateStaff: (date, staffId) => {
        const state = get();
        const dayKey = getDayKey(date);
        const salonHours = state.salon.openingHours[dayKey as keyof typeof state.salon.openingHours];
        if (salonHours.closed) return [];
        const staff = state.staff.find(s => s.id === staffId);
        if (!staff) return [];
        const staffDay = staff.schedule[dayKey as keyof typeof staff.schedule];
        if (staffDay.off) return [];

        // Use the later of salon open / staff start, and earlier of salon close / staff end (the intersection)
        const dayStart = salonHours.open > staffDay.start ? salonHours.open : staffDay.start;
        const dayEnd = salonHours.close < staffDay.end ? salonHours.close : staffDay.end;

        // Generate 30-min slots
        const slots: { time: string; status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'BREAK'; booking?: Booking; reason?: string }[] = [];
        const [sh, sm] = dayStart.split(':').map(Number);
        const [eh, em] = dayEnd.split(':').map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;
        for (let t = startMins; t + 30 <= endMins; t += 30) {
          const slotStart = timeStr(Math.floor(t / 60), t % 60);
          const slotEnd = timeStr(Math.floor((t + 30) / 60), (t + 30) % 60);

          // Check staff unavailability
          const unavail = (staff.unavailability || []).find(u => u.date === date && slotStart < u.endTime && slotEnd > u.startTime);
          if (unavail) {
            slots.push({ time: slotStart, status: 'BLOCKED', reason: unavail.reason });
            continue;
          }

          // Check break/blocked
          const blocked = state.blockedSlots.find(blk =>
            blk.date === date && slotStart < blk.endTime && slotEnd > blk.startTime
          );
          if (blocked) {
            slots.push({ time: slotStart, status: blocked.type === 'BREAK' ? 'BREAK' : 'BLOCKED', reason: blocked.reason });
            continue;
          }

          // Check booking
          const booking = state.bookings.find(b =>
            b.staffId === staffId &&
            b.date === date &&
            b.status !== 'CANCELLED' &&
            slotStart < b.endTime &&
            slotEnd > b.startTime
          );
          if (booking) {
            slots.push({ time: slotStart, status: 'BOOKED', booking });
            continue;
          }

          slots.push({ time: slotStart, status: 'AVAILABLE' });
        }
        return slots;
      },

      
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

      resetData: () => {
        set({ ...initialState() });
        get().pushToast('Demo data restored', 'success');
      },
    }),
    {
      name: 'stylesync-salon-store',
      version: 7, // bump this when the seed data shape/targets change to force a re-seed
      // When the version changes, discard the old persisted state so the user sees
      // the new seed data instead of stale localStorage from a previous session.
      migrate: (_persisted: any, _version: number) => {
        return {} as any; // signals "discard" — initialState() will be re-applied
      },
      partialize: (s) => ({
        salon: s.salon,
        services: s.services,
        staff: s.staff,
        customers: s.customers,
        bookings: s.bookings,
        blockedSlots: s.blockedSlots,
        reviews: s.reviews,
        payments: s.payments,
        notifications: s.notifications,
        tickets: s.tickets,
        settings: s.settings,
      }),
    }
  )
);
