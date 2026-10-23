"use client";

import { create } from "zustand";

/* ====================================================================
   PROFILE DEMO STORE
   --------------------------------------------------------------------
   Local, in-memory demo state for the Profile section. Nothing here
   is persisted to a backend — all data is DEMO DATA for the
   StyleSync prototype. State survives during the current session.
   ==================================================================== */

export interface DemoUser {
  name: string;
  email: string;
  mobile: string;        // masked, e.g. "+91 XXXXX 43210"
  city: string;
  preferredServices: string[];   // category names: "Hair", "Beard & Grooming", ...
  memberSince: string;            // e.g. "September 2026"
  avatarInitial: string;
  stats: {
    bookings: number;
    completed: number;
    savedSalons: number;
    savedLooks: number;
    reviews: number;
  };
}

export interface DemoNotification {
  id: string;
  category: "booking" | "availability" | "ai" | "salon" | "review" | "system";
  title: string;
  description: string;
  timestamp: string;      // human-readable relative time
  section: "Today" | "Yesterday" | "Earlier";
  read: boolean;
  iconName: string;      // lucide icon name (rendered by sheet)
  actionLabel?: string;
  actionType?: "view-booking" | "view-salon" | "view-look" | "view-ai";
  actionPayload?: string;
}

export type PaymentMethodType = "upi" | "card" | "wallet";

export interface DemoPaymentMethod {
  id: string;
  type: PaymentMethodType;
  label: string;          // e.g. "mahesh@upi" or "•••• •••• •••• 4821"
  subLabel?: string;       // e.g. "Expires 09/29"
  isDefault: boolean;
  addedDate: string;
}

export interface DemoSupportTicket {
  id: string;
  subject: string;
  topic: string;
  status: "Open" | "Resolved" | "Closed";
  created: string;        // human-readable
  message: string;
  replies: { from: "user" | "support"; text: string; at: string }[];
}

export type ProfileSheetId =
  | "notifications"
  | "payment-methods"
  | "add-payment-method"
  | "trust-verification"
  | "settings"
  | "edit-profile"
  | "service-preferences"
  | "notification-preferences"
  | "help-support"
  | "help-topic"
  | "contact-support"
  | "support-ticket"
  | "sign-out"
  | null;

interface ProfileState {
  user: DemoUser;
  updateUser: (patch: Partial<DemoUser>) => void;

  notifications: DemoNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearReadNotifications: () => void;

  notificationSettings: Record<string, boolean>;
  setNotificationSetting: (key: string, value: boolean) => void;

  paymentMethods: DemoPaymentMethod[];
  addPaymentMethod: (pm: Omit<DemoPaymentMethod, "id" | "addedDate" | "isDefault">) => void;
  removePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;

  verification: {
    identity: boolean;
    email: boolean;
    mobile: boolean;
    profile: boolean;
  };
  accountSecurity: {
    twoStepVerification: boolean;
    loginAlerts: boolean;
  };
  setAccountSecurity: (patch: Partial<ProfileState["accountSecurity"]>) => void;

  settings: {
    profileVisibility: "public" | "private";
    language: string;
    appearance: string;
  };
  setSettings: (patch: Partial<ProfileState["settings"]>) => void;

  supportTickets: DemoSupportTicket[];
  addSupportTicket: (subject: string, topic: string, message: string, bookingId?: string) => string;

  /* Sheet management */
  activeSheet: ProfileSheetId;
  openSheet: (sheet: ProfileSheetId) => void;
  closeSheet: () => void;

  /* Help topic */
  activeHelpTopicId: string | null;
  openHelpTopic: (id: string) => void;
  closeHelpTopic: () => void;

  /* Support ticket detail */
  activeSupportTicketId: string | null;
  openSupportTicket: (id: string) => void;
  closeSupportTicket: () => void;

  /* Sign out flow */
  signedOut: boolean;
  signOut: () => void;
  continueAsDemoUser: () => void;
}

const DEFAULT_USER: DemoUser = {
  name: "Mahesh Kumar",
  email: "mahesh@example.com",
  mobile: "+91 XXXXX 43210",
  city: "Srinagar",
  preferredServices: ["Hair", "Beard & Grooming"],
  memberSince: "September 2026",
  avatarInitial: "M",
  stats: {
    bookings: 12,
    completed: 9,
    savedSalons: 2,
    savedLooks: 0,
    reviews: 5,
  },
};

const DEFAULT_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "ntf-1",
    category: "booking",
    title: "Booking confirmed",
    description: "Your haircut appointment at Premium Roots is confirmed for today at 5:30 PM.",
    timestamp: "10 min ago",
    section: "Today",
    read: false,
    iconName: "CheckCircle2",
    actionLabel: "View Booking",
    actionType: "view-booking",
    actionPayload: "premium-roots",
  },
  {
    id: "ntf-2",
    category: "availability",
    title: "New availability",
    description: "A 6:30 PM slot is now available at Royal Roots.",
    timestamp: "1 hour ago",
    section: "Today",
    read: false,
    iconName: "Clock",
    actionLabel: "View Salon",
    actionType: "view-salon",
    actionPayload: "royal-roots",
  },
  {
    id: "ntf-3",
    category: "ai",
    title: "AI Style Recommendation",
    description: 'Your saved "Textured Quiff" look has 6 matching salons available.',
    timestamp: "2 hours ago",
    section: "Today",
    read: false,
    iconName: "Sparkles",
    actionLabel: "View AI",
    actionType: "view-ai",
  },
  {
    id: "ntf-4",
    category: "booking",
    title: "Booking reminder",
    description: "Your appointment at Kashmir Beauty Studio is tomorrow at 6:00 PM.",
    timestamp: "Yesterday",
    section: "Yesterday",
    read: true,
    iconName: "Calendar",
    actionLabel: "View Booking",
    actionType: "view-booking",
    actionPayload: "kashmir-beauty-studio",
  },
  {
    id: "ntf-5",
    category: "salon",
    title: "New salon",
    description: "A verified salon has recently joined StyleSync in Srinagar.",
    timestamp: "Yesterday",
    section: "Yesterday",
    read: true,
    iconName: "ShieldCheck",
    actionLabel: "Discover",
    actionType: "view-salon",
  },
];

const DEFAULT_PAYMENT_METHODS: DemoPaymentMethod[] = [
  {
    id: "pm-upi-1",
    type: "upi",
    label: "mahesh@upi",
    subLabel: "UPI",
    isDefault: true,
    addedDate: "Sep 2026",
  },
  {
    id: "pm-card-1",
    type: "card",
    label: "•••• •••• •••• 4821",
    subLabel: "Expires 09/29",
    isDefault: false,
    addedDate: "Aug 2026",
  },
];

const DEFAULT_SUPPORT_TICKETS: DemoSupportTicket[] = [
  {
    id: "SS-DEMO-1042",
    subject: "Booking question",
    topic: "Booking",
    status: "Open",
    created: "Today",
    message: "Can I change my appointment time for Premium Roots to a later slot today?",
    replies: [
      { from: "support" as const, text: "Hi Mahesh, thanks for reaching out. A demo agent will reply shortly. (Demo response — no real agent involved.)", at: "10 min ago" },
    ],
  },
  {
    id: "SS-DEMO-0981",
    subject: "Payment method question",
    topic: "Payment",
    status: "Resolved",
    created: "Yesterday",
    message: "How do I change my default UPI ID?",
    replies: [
      { from: "support" as const, text: "Open Payment methods → tap the method → Set as default. (Demo response.)", at: "Yesterday" },
      { from: "user" as const, text: "Thanks, that worked!", at: "Yesterday" },
    ],
  },
];

export const useProfileStore = create<ProfileState>((set, get) => ({
  user: DEFAULT_USER,
  updateUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),

  notifications: DEFAULT_NOTIFICATIONS,
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
  clearReadNotifications: () =>
    set((s) => ({
      notifications: s.notifications.filter((n) => !n.read),
    })),

  notificationSettings: {
    "Booking reminders": true,
    "Booking confirmations": true,
    "Salon offers": false,
    "AI recommendations": true,
    "Review reminders": true,
  },
  setNotificationSetting: (key, value) =>
    set((s) => ({
      notificationSettings: { ...s.notificationSettings, [key]: value },
    })),

  paymentMethods: DEFAULT_PAYMENT_METHODS,
  addPaymentMethod: (pm) => {
    const id = `pm-${Date.now().toString(36)}`;
    const newPm: DemoPaymentMethod = {
      ...pm,
      id,
      isDefault: false,
      addedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };
    set((s) => ({ paymentMethods: [...s.paymentMethods, newPm] }));
  },
  removePaymentMethod: (id) =>
    set((s) => ({ paymentMethods: s.paymentMethods.filter((p) => p.id !== id) })),
  setDefaultPaymentMethod: (id) =>
    set((s) => ({
      paymentMethods: s.paymentMethods.map((p) => ({ ...p, isDefault: p.id === id })),
    })),

  verification: {
    identity: true,
    email: true,
    mobile: true,
    profile: true,
  },
  accountSecurity: {
    twoStepVerification: false,
    loginAlerts: true,
  },
  setAccountSecurity: (patch) =>
    set((s) => ({ accountSecurity: { ...s.accountSecurity, ...patch } })),

  settings: {
    profileVisibility: "public",
    language: "English",
    appearance: "Deep Blue-Teal",
  },
  setSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),

  supportTickets: DEFAULT_SUPPORT_TICKETS,
  addSupportTicket: (subject, topic, message, bookingId) => {
    const num = 1043 + get().supportTickets.length;
    const id = `SS-DEMO-${num}`;
    const fullMessage = bookingId ? `${message}\n\nRelated booking ID: ${bookingId}` : message;
    const ticket: DemoSupportTicket = {
      id,
      subject,
      topic,
      status: "Open",
      created: "Just now",
      message: fullMessage,
      replies: [],
    };
    set((s) => ({ supportTickets: [ticket, ...s.supportTickets] }));
    return id;
  },

  activeSheet: null,
  openSheet: (sheet) => set({ activeSheet: sheet }),
  closeSheet: () => set({ activeSheet: null }),

  activeHelpTopicId: null,
  openHelpTopic: (id) => set({ activeHelpTopicId: id }),
  closeHelpTopic: () => set({ activeHelpTopicId: null }),

  activeSupportTicketId: null,
  openSupportTicket: (id) => set({ activeSupportTicketId: id }),
  closeSupportTicket: () => set({ activeSupportTicketId: null }),

  signedOut: false,
  signOut: () => set({ signedOut: true, activeSheet: null }),
  continueAsDemoUser: () => set({ signedOut: false }),
}));
