// StyleSync Salon Partner App - Core Types

export type SalonStatus = 'OPEN' | 'CLOSED';
export type BookingStatus = 'PENDING' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';
export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'BREAK';
export type StaffRole = 'Owner' | 'Manager' | 'Staff';
export type StaffStatus = 'ACTIVE' | 'INACTIVE';
export type ServiceCategory = 'Hair' | 'Beard & Grooming' | 'Skin & Beauty' | 'Nails' | 'Makeup' | 'Other';
export type TicketStatus = 'OPEN' | 'IN PROGRESS' | 'RESOLVED' | 'CLOSED';
export type UserRole = 'SALON_OWNER' | 'SALON_MANAGER' | 'SALON_STAFF';

export interface Salon {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  coverImage: string;
  logo: string;
  openingHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  amenities: string[];
  about: string;
  photos: string[];
  status: SalonStatus;
  closureNote?: string;
  temporaryClosure?: { start: string; end: string; reason: string };
  rating: number;
  totalReviews: number;
  joinedDate: string;
}

export interface Service {
  id: string;
  salonId: string;
  name: string;
  category: ServiceCategory;
  description: string;
  price: number;
  duration: number; // minutes
  assignedStaff: string[]; // staff ids
  active: boolean;
  image?: string;
  totalBookings: number;
}

export interface Staff {
  id: string;
  salonId: string;
  name: string;
  role: StaffRole;
  photo: string;
  experience: string;
  services: string[]; // service ids
  schedule: {
    monday: { start: string; end: string; off: boolean };
    tuesday: { start: string; end: string; off: boolean };
    wednesday: { start: string; end: string; off: boolean };
    thursday: { start: string; end: string; off: boolean };
    friday: { start: string; end: string; off: boolean };
    saturday: { start: string; end: string; off: boolean };
    sunday: { start: string; end: string; off: boolean };
  };
  status: StaffStatus;
  phone?: string;
  email?: string;
  unavailability?: { date: string; startTime: string; endTime: string; reason: string }[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  image: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  lastVisit?: string;
  nextAppointment?: string;
  favoriteServices: string[]; // service ids
  preferredStaff: string[]; // staff ids
  notes: string;
  joinedDate: string;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration: number;
  price: number;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  createdAt: string;
  notes: string;
  customerPreferences: string;
  cancellationReason?: string;
  cancelledAt?: string;
}

export interface BlockedSlot {
  id: string;
  salonId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  type: 'BLOCKED' | 'BREAK';
}

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  customerImage: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  rating: number;
  comment: string;
  date: string;
  salonReply?: string;
  repliedAt?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
  staffName?: string;
  amount: number;
  method: 'Cash' | 'Card' | 'UPI' | 'Net Banking';
  status: PaymentStatus;
  date: string;
  transactionId?: string;
  createdAt?: string;
  refundAmount?: number;
  refundDate?: string;
  refundReason?: string;
}

export interface Notification {
  id: string;
  type: 'new_booking' | 'booking_cancelled' | 'upcoming_appointment' | 'new_review' | 'payment_received' | 'profile_attention';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  linkType?: 'booking' | 'review' | 'payment' | 'profile';
  linkId?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: 'Booking Problem' | 'Payment Issue' | 'Technical Problem' | 'Other';
  priority: 'Low' | 'Medium' | 'High';
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  responses: { from: 'salon' | 'support'; message: string; timestamp: string }[];
}

export interface SalonSettings {
  account: {
    ownerName: string;
    email: string;
    phone: string;
  };
  notifications: {
    newBooking: boolean;
    bookingCancelled: boolean;
    upcomingAppointment: boolean;
    newReview: boolean;
    paymentReceived: boolean;
  };
  booking: {
    allowAdvanceDays: number;
    minCancelHours: number;
    autoConfirm: boolean;
    requireDeposit: boolean;
    depositPercent: number;
  };
  cancellation: {
    freeCancelHours: number;
    lateCancelFeePercent: number;
    noShowFeePercent: number;
  };
  payment: {
    acceptCash: boolean;
    acceptCard: boolean;
    acceptUPI: boolean;
    acceptNetBanking: boolean;
  };
  staffPermissions: {
    managerCanEditServices: boolean;
    managerCanManageStaff: boolean;
    staffCanSeeAllBookings: boolean;
    staffCanEditOwnSchedule: boolean;
  };
  security: {
    twoFactor: boolean;
    loginAlerts: boolean;
  };
}

export type ViewKey =
  | 'dashboard'
  | 'bookings'
  | 'calendar'
  | 'services'
  | 'staff'
  | 'availability'
  | 'customers'
  | 'reviews'
  | 'analytics'
  | 'payments'
  | 'notifications'
  | 'profile'
  | 'support'
  | 'settings';
