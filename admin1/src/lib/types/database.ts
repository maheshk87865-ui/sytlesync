/**
 * StyleSync Customer App — Backend Types
 * --------------------------------------------------------------------
 * Type definitions that mirror the database schema AND the existing
 * customer app data shapes (src/lib/salon-data.ts). The data-access
 * services in src/lib/services/ return these types so the existing
 * UI doesn't need to change.
 *
 * Why a separate file from salon-data.ts? The existing salon-data.ts
 * contains hardcoded DEMO data; these backend types are the canonical
 * shapes the Supabase-backed services will eventually return. The two
 * are kept in sync by the service layer (services fall back to demo
 * data when Supabase isn't configured).
 */

// ─── Customer ──────────────────────────────────────────────────────
export interface CustomerProfile {
  id: string;
  auth_id: string;          // Supabase Auth user ID
  name: string;
  email: string;
  mobile: string | null;    // masked when displayed
  city: string | null;
  preferred_services: string[];
  avatar_url: string | null;
  member_since: string;     // ISO date
  stats: {
    bookings: number;
    completed: number;
    saved_salons: number;
    saved_looks: number;
    reviews: number;
  };
  created_at: string;
  updated_at: string;
}

// ─── Salon ─────────────────────────────────────────────────────────
export type SalonCategory = "Hair" | "Beard & Grooming" | "Skin & Beauty" | "Nails" | "Makeup" | "Treatments";

export interface SalonRecord {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: SalonCategory;
  cover_image: string;     // Supabase Storage URL or /salons/... path
  gallery: string[];
  rating: number;
  reviews: number;
  distance_km: number;
  price_from: number;
  open_until: string;
  is_open: boolean;
  verified: boolean;
  address: string;
  cancellation_policy: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface SalonServiceRecord {
  id: string;
  salon_id: string;
  name: string;
  description: string;
  category: SalonCategory;
  duration_min: number;
  duration_label: string;
  price_from: number;
  price_to: number | null;
  rating: number;
  reviews: number;
  image_url: string | null;
  whats_included: string[];
  popular: boolean;
  created_at: string;
}

export interface StaffMemberRecord {
  id: string;
  salon_id: string;
  name: string;
  role: string;
  rating: number;
  reviews: number;
  avatar_color: string;
  initials: string;
  years_experience: number;
  bio: string;
  specializations: string[];
  working_hours: { start: string; end: string };
  breaks: { start: string; end: string }[];
  days_off: number[];        // 0=Sunday, 6=Saturday
  service_ids: string[];
}

// ─── Availability ──────────────────────────────────────────────────
export type SlotStatus = "open" | "limited" | "booked";

export interface AvailabilitySlot {
  id: string;
  salon_id: string;
  staff_id: string;
  service_id: string;
  date: string;             // ISO date (YYYY-MM-DD)
  time: string;              // e.g. "5:30 PM"
  status: SlotStatus;
  // Realtime: slot status updates broadcast via Supabase Realtime
  // on the `availability_slots` table.
}

// ─── Booking ───────────────────────────────────────────────────────
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface BookingRecord {
  id: string;
  booking_id: string;        // human-readable, e.g. "SS-DEMO-XXXXXX"
  customer_id: string;
  salon_id: string;
  service_id: string;
  staff_id: string;
  slot_id: string | null;
  service_name: string;
  staff_name: string;
  salon_name: string;
  date: string;
  time: string;
  duration_label: string;
  price: number;
  status: BookingStatus;
  payment_status: "pending" | "paid" | "refunded" | "failed";
  payment_method: string | null;
  cancellation_policy: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Review ────────────────────────────────────────────────────────
export interface ReviewRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  salon_id: string;
  booking_id: string | null;
  rating: number;            // 1..5
  text: string;
  reply: string | null;
  created_at: string;
}

// ─── Favorite ──────────────────────────────────────────────────────
export interface FavoriteRecord {
  id: string;
  customer_id: string;
  salon_id: string;
  created_at: string;
}

// ─── Payment Method ───────────────────────────────────────────────
export interface PaymentMethodRecord {
  id: string;
  customer_id: string;
  type: "upi" | "card" | "wallet";
  label: string;             // masked, e.g. "•••• 4821" or "mahesh@upi"
  sub_label: string | null;  // e.g. "Expires 09/29"
  is_default: boolean;
  // Real card data is stored ONLY in a vaulted payment provider token.
  // Never store full card numbers in the database.
  provider_token: string | null;
  created_at: string;
}

// ─── Notification ─────────────────────────────────────────────────
export type NotificationCategory =
  | "booking"
  | "availability"
  | "ai"
  | "salon"
  | "review"
  | "system";

export interface NotificationRecord {
  id: string;
  customer_id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  action_label: string | null;
  action_type: string | null;
  action_payload: string | null;
  created_at: string;
}

// ─── Support ──────────────────────────────────────────────────────
export interface SupportTicketRecord {
  id: string;
  customer_id: string;
  ticket_id: string;        // e.g. "SS-DEMO-1042"
  subject: string;
  topic: string;
  status: "open" | "resolved" | "closed";
  message: string;
  booking_id: string | null;
  replies: {
    from: "user" | "support";
    text: string;
    at: string;
  }[];
  created_at: string;
  updated_at: string;
}

// ─── Saved AI Look ─────────────────────────────────────────────────
export interface SavedLookRecord {
  id: string;
  customer_id: string;
  style: string;
  category: string;
  description: string;
  service_name: string;
  visual_preview: string | null;
  visual_preview_source: "reference-image" | "ai-generated" | null;
  created_at: string;
}
