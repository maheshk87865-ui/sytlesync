"use client";

import { create } from "zustand";
import { api, setBackendTokens, isBackendReachable } from "@/lib/backend/client";

/* ====================================================================
   AUTH STORE — DEMO + BACKEND CONNECTED
   --------------------------------------------------------------------
   The store still uses demo OTP (123456) for the UI flow so the
   prototype works without real OAuth providers. But every successful
   authentication now ALSO registers a session with the backend:

   - `signInDemo()` calls backend /auth/login (mahesh@example.com +
     demodemo123). If the account doesn't exist, it calls /auth/signup
     to create it. Either way, the JWT is stored and used by every
     authenticated service call.

   - `verifyOTP()` after a successful demo OTP also calls the backend
     to register the session.

   - `logout()` calls backend /auth/logout to revoke the refresh token
     server-side, then clears local state.

   This way, the backend is the SINGLE SOURCE OF TRUTH for the
   customer's identity. The frontend just stores the JWT and sends it
   with every request.
   ==================================================================== */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  mobile: string;       // masked, e.g. "+91 90000 00000"
  city: string;
  avatarInitial: string;
}

export interface PendingBooking {
  salonId: string;
  salonName: string;
  serviceId: string;
  serviceName: string;
  price: number;
  staffId: string;
  staffName: string;
  staffRole?: string;
  staffRating?: number;
  duration?: string;
  date?: string;
  time?: string;
  notes?: string;
  selectedLook?: any;
}

export type AuthModalMode =
  | "signin"
  | "signup"
  | "verify-signin"
  | "verify-signup"
  | "profile-required";

export const DEMO_OTP = "123456";

export const DEMO_USER: AuthUser = {
  id: "demo-mahesh",
  name: "Mahesh Kumar",
  email: "mahesh@example.com",
  mobile: "+91 90000 00000",
  city: "Srinagar",
  avatarInitial: "M",
};

// Demo credentials used to bootstrap a real account on the backend.
// These are well-known so the demo flow can sign in / sign up reliably.
// In production, real users would set their own password via the UI.
const DEMO_EMAIL = "mahesh@example.com";
const DEMO_PASSWORD = "demodemo123";
const DEMO_NAME = "Mahesh Kumar";

interface AuthState {
  isAuthenticated: boolean;
  currentUser: AuthUser | null;

  /* Pending booking preserved across the auth checkpoint */
  pendingBooking: PendingBooking | null;
  setPendingBooking: (b: PendingBooking | null) => void;

  /* Modal management */
  authModalOpen: boolean;
  authMode: AuthModalMode;
  pendingContact: string;        // email/mobile being verified
  pendingName: string;            // name being entered during signup
  pendingError: string | null;
  openAuth: (mode?: AuthModalMode) => void;
  closeAuth: () => void;
  setAuthMode: (m: AuthModalMode) => void;
  setPendingContact: (c: string) => void;
  setPendingName: (n: string) => void;
  setPendingError: (e: string | null) => void;

  /* Validation */
  validateContact: (c: string) => { ok: boolean; error?: string };

  /* Actions */
  sendOTP: (contact: string) => Promise<void> | void;
  verifyOTP: (code: string) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
  continueWithGoogle: () => void;

  /* Lifecycle */
  signInDemo: () => void;
  logout: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\+?[\d\s-]{8,15}$/;

/**
 * Best-effort backend bootstrap.
 * Tries to log in with the demo credentials; if the account doesn't
 * exist (401 / not_found), tries to sign up. Stores the JWT in
 * localStorage via setBackendTokens. Returns true on success.
 *
 * All errors are swallowed — the demo flow continues to work even if
 * the backend is unreachable. The user is still "authenticated"
 * locally as DEMO_USER, but backend calls will fail with auth errors
 * (which the UI surfaces as "please sign in" prompts).
 */
export async function bootstrapBackendSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!(await isBackendReachable())) return false;

  // Try login first
  try {
    const loginResp = await api.post<{ token: string; refreshToken: string; user: any; profile: any }>(
      "/auth/login",
      { email: DEMO_EMAIL, password: DEMO_PASSWORD },
      { auth: false }
    );
    if (loginResp?.token) {
      setBackendTokens(loginResp.token, loginResp.refreshToken || null);
      return true;
    }
  } catch (e: any) {
    // Fall through to signup if login fails
  }

  // Try signup
  try {
    const signupResp = await api.post<{ token: string; refreshToken: string; user: any; profile: any }>(
      "/auth/signup",
      { email: DEMO_EMAIL, password: DEMO_PASSWORD, fullName: DEMO_NAME },
      { auth: false }
    );
    if (signupResp?.token) {
      setBackendTokens(signupResp.token, signupResp.refreshToken || null);
      return true;
    }
  } catch (e: any) {
    // Backend signup failed (rate limited, validation, etc.) — swallow
    // so the demo flow still completes for the user.
  }

  return false;
}

/**
 * Logout from the backend — revokes the refresh token server-side,
 * then clears the local JWT. The demo state is also cleared.
 */
async function teardownBackendSession(): Promise<void> {
  try {
    await api.post("/auth/logout", {});
  } catch {
    // best-effort — even if the backend call fails, we clear local state
  }
  setBackendTokens(null, null);
}

function getInitialAuth(): { isAuthenticated: boolean; currentUser: AuthUser | null } {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, currentUser: null };
  }
  const token = localStorage.getItem("ss_access_token");
  if (!token) return { isAuthenticated: false, currentUser: null };
  try {
    const rawUser = localStorage.getItem("ss_user");
    const user = rawUser ? JSON.parse(rawUser) : DEMO_USER;
    return { isAuthenticated: true, currentUser: user };
  } catch {
    return { isAuthenticated: true, currentUser: DEMO_USER };
  }
}

const initialAuth = getInitialAuth();

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: initialAuth.isAuthenticated,
  currentUser: initialAuth.currentUser,

  pendingBooking: null,
  setPendingBooking: (b) => set({ pendingBooking: b }),

  authModalOpen: false,
  authMode: "signin",
  pendingContact: "",
  pendingName: "",
  pendingError: null,
  openAuth: (mode = "signin") => set({ authModalOpen: true, authMode: mode, pendingError: null }),
  closeAuth: () => set({ authModalOpen: false, pendingError: null }),
  setAuthMode: (m) => set({ authMode: m, pendingError: null }),
  setPendingContact: (c) => set({ pendingContact: c }),
  setPendingName: (n) => set({ pendingName: n }),
  setPendingError: (e) => set({ pendingError: e }),

  validateContact: (c) => {
    const v = c.trim();
    if (!v) return { ok: false, error: "Please enter your email or mobile number." };
    const isEmail = EMAIL_RE.test(v);
    const isMobile = MOBILE_RE.test(v);
    if (!isEmail && !isMobile) {
      return { ok: false, error: "Please enter a valid email or mobile number." };
    }
    return { ok: true };
  },

  sendOTP: async (contact: string) => {
    const v = get().validateContact(contact);
    if (!v.ok) { set({ pendingError: v.error }); return; }
    const clean = contact.trim();
    set({ pendingContact: clean, pendingError: null });

    // Attempt server-side OTP dispatch if phone format
    if (MOBILE_RE.test(clean)) {
      try {
        await api.post("/auth/phone-otp/send", { phone: clean }, { auth: false });
      } catch (err: any) {
        if (err?.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError")) {
          set({ pendingError: err.message });
          return;
        }
      }
    }

    set({
      authMode: get().authMode === "signup" ? "verify-signup" : "verify-signin",
      pendingError: null,
    });
  },

  verifyOTP: async (code: string) => {
    if (!code || !code.trim()) {
      return { ok: false, error: "Enter the verification code." };
    }
    const st = get();
    const cleanCode = code.trim();
    const cleanContact = st.pendingContact.trim();
    const isSignup = st.authMode === "verify-signup";
    const enteredName = st.pendingName.trim();

    // Attempt server-side OTP verification
    if (MOBILE_RE.test(cleanContact)) {
      try {
        const resp = await api.post<{ token: string; refreshToken?: string; user: any }>(
          "/auth/phone-otp/verify",
          {
            phone: cleanContact,
            code: cleanCode,
            fullName: enteredName || undefined,
          },
          { auth: false }
        );

        if (resp?.token) {
          setBackendTokens(resp.token, resp.refreshToken || null);
          const u = resp.user || {};
          const user: AuthUser = {
            id: u.id || "customer-phone",
            name: u.fullName || enteredName || "Customer",
            email: u.email || `${cleanContact}@stylesync.in`,
            mobile: u.phone || cleanContact,
            city: "Srinagar",
            avatarInitial: (u.fullName || enteredName || "C").charAt(0).toUpperCase(),
          };
          if (typeof window !== "undefined") {
            localStorage.setItem("ss_user", JSON.stringify(user));
          }
          set({
            isAuthenticated: true,
            currentUser: user,
            authModalOpen: false,
            authMode: "signin",
            pendingContact: "",
            pendingName: "",
            pendingError: null,
          });
          return { ok: true };
        }
      } catch (err: any) {
        if (err?.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError")) {
          return { ok: false, error: err.message };
        }
      }
    }

    // In production, demo fallback simulation is strictly disabled
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Incorrect verification code. Please check your SMS and try again." };
    }

    // Development-only fallback for demo code 123456
    if (cleanCode !== DEMO_OTP) {
      return { ok: false, error: "Incorrect verification code. Please try again." };
    }
    const user: AuthUser = {
      ...DEMO_USER,
      name: isSignup && enteredName ? enteredName : DEMO_USER.name,
      avatarInitial: (isSignup && enteredName ? enteredName : DEMO_USER.name).charAt(0).toUpperCase(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("ss_user", JSON.stringify(user));
    }
    set({
      isAuthenticated: true,
      currentUser: user,
      authModalOpen: false,
      authMode: "signin",
      pendingContact: "",
      pendingName: "",
      pendingError: null,
    });

    bootstrapBackendSession().catch(() => { /* best-effort */ });

    return { ok: true };
  },

  continueWithGoogle: () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ss_user", JSON.stringify(DEMO_USER));
    }
    set({
      isAuthenticated: true,
      currentUser: DEMO_USER,
      authModalOpen: false,
      authMode: "signin",
      pendingContact: "",
      pendingName: "",
      pendingError: null,
    });

    bootstrapBackendSession().catch(() => { /* best-effort */ });
  },

  signInDemo: () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ss_user", JSON.stringify(DEMO_USER));
    }
    set({
      isAuthenticated: true,
      currentUser: DEMO_USER,
      authModalOpen: false,
      authMode: "signin",
      pendingContact: "",
      pendingName: "",
      pendingError: null,
    });

    bootstrapBackendSession().catch(() => { /* best-effort */ });
  },

  logout: () => {
    teardownBackendSession().catch(() => { /* best-effort */ });
    if (typeof window !== "undefined") {
      localStorage.removeItem("ss_user");
    }

    set({
      isAuthenticated: false,
      currentUser: null,
      pendingBooking: null,
      pendingContact: "",
      pendingName: "",
      pendingError: null,
      authModalOpen: false,
      authMode: "signin",
    });
  },
}));
