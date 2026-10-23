"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, X, Check, Mail, Phone, User, ShieldCheck, AlertCircle,
  Loader2, ArrowRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, DEMO_OTP } from "@/lib/auth-store";
import { useProfileStore } from "@/lib/profile-store";

/* ==================================================================== */
/* Auth Modal — wraps all sign-in / OTP / sign-up screens              */
/* ==================================================================== */

export function AuthModal() {
  const { authModalOpen, closeAuth, authMode, pendingBooking } = useAuthStore();
  const open = authModalOpen;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeAuth()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-md lg:max-w-lg">
        <AuthModalContent />
      </SheetContent>
    </Sheet>
  );
}

function AuthModalContent() {
  const { authMode, pendingBooking, closeAuth, setAuthMode } = useAuthStore();

  /* If a pending booking exists, show a small summary banner at top */
  const showBookingBanner = !!pendingBooking;

  return (
    <>
      {/* Top bar: back / close + current mode */}
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/40 px-4 py-3">
        <button
          onClick={() => {
            /* Back behavior: from verify-* screens go back to sign-in/up;
               from sign-in/up just close (preserves booking). */
            if (authMode === "verify-signin" || authMode === "verify-signup") {
              setAuthMode(authMode === "verify-signup" ? "signup" : "signin");
            } else {
              closeAuth();
            }
          }}
          className="grid h-8 w-8 place-items-center rounded-full text-foreground hover:bg-secondary"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" suppressHydrationWarning />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {authMode === "signup" || authMode === "verify-signup" ? "Create account" : "Sign in"}
        </span>
        <button
          onClick={closeAuth}
          className="grid h-8 w-8 place-items-center rounded-full text-foreground hover:bg-secondary"
          aria-label="Close"
        >
          <X className="h-5 w-5" suppressHydrationWarning />
        </button>
      </div>

      {/* Pending booking banner */}
      {showBookingBanner && (
        <div className="border-b border-border/60 bg-secondary/30 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Booking</div>
          <div className="mt-1 text-sm font-bold text-foreground">{pendingBooking!.salonName}</div>
          <div className="text-xs text-muted-foreground">
            {pendingBooking!.serviceName} · {pendingBooking!.staffName}
          </div>
          {pendingBooking!.price != null && (
            <div className="mt-1 text-sm font-bold text-primary">₹{pendingBooking!.price}</div>
          )}
        </div>
      )}

      {authMode === "signin" && <SignInScreen />}
      {authMode === "signup" && <SignUpScreen />}
      {authMode === "verify-signin" && <VerifyScreen isSignup={false} />}
      {authMode === "verify-signup" && <VerifyScreen isSignup={true} />}
      {authMode === "profile-required" && <ProfileRequiredScreen />}
    </>
  );
}

/* ==================================================================== */
/* Sign-in screen                                                        */
/* ==================================================================== */

function SignInScreen() {
  const { openAuth, setAuthMode, sendOTP, pendingContact, setPendingContact, pendingError, continueWithGoogle } = useAuthStore();
  const [contact, setContact] = useState(pendingContact || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setPendingContact(contact);
    const v = useAuthStore.getState().validateContact(contact);
    if (!v.ok) { useAuthStore.getState().setPendingError(v.error ?? null); return; }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      sendOTP(contact);
    }, 600);
  };

  return (
    <div className="flex flex-col p-6">
      <SheetHeader className="mb-2 p-0 text-left">
        <SheetTitle className="text-2xl font-bold leading-tight">Sign in to continue</SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground">
          Sign in to complete your salon booking and keep your appointments in one place.
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Email or mobile number
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" suppressHydrationWarning />
            <input
              type="text"
              value={contact}
              onChange={(e) => { setContact(e.target.value); useAuthStore.getState().setPendingError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="Enter email or mobile"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 pl-9 text-sm outline-none focus:border-primary/40"
            />
          </div>
          {pendingError && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
              <AlertCircle className="h-3 w-3" suppressHydrationWarning /> {pendingError}
            </p>
          )}
        </div>

        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" suppressHydrationWarning /> Sending code…</>
          ) : (
            <>Continue <ArrowRight className="ml-2 h-4 w-4" suppressHydrationWarning /></>
          )}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Demo Google */}
        <Button
          variant="outline"
          className="w-full border-border/60 bg-card text-foreground hover:bg-secondary"
          onClick={continueWithGoogle}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          Continue with Google (Demo)
        </Button>

        {/* Create account link */}
        <div className="pt-2 text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => setAuthMode("signup")}
            className="font-semibold text-primary hover:underline"
          >
            Create account
          </button>
        </div>
      </div>

      <DemoAuthHint />
    </div>
  );
}

/* ==================================================================== */
/* Sign-up screen                                                        */
/* ==================================================================== */

function SignUpScreen() {
  const { setAuthMode, sendOTP, pendingName, pendingContact, setPendingName, setPendingContact, pendingError } = useAuthStore();
  const [name, setName] = useState(pendingName || "");
  const [contact, setContact] = useState(pendingContact || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) {
      useAuthStore.getState().setPendingError("Please enter your name.");
      return;
    }
    setPendingName(name);
    setPendingContact(contact);
    const v = useAuthStore.getState().validateContact(contact);
    if (!v.ok) { useAuthStore.getState().setPendingError(v.error ?? null); return; }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      sendOTP(contact);
    }, 600);
  };

  return (
    <div className="flex flex-col p-6">
      <SheetHeader className="mb-2 p-0 text-left">
        <SheetTitle className="text-2xl font-bold leading-tight">Create your StyleSync account</SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground">
          Quick sign-up — we&apos;ll use this to keep your bookings and saved salons in one place.
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Full name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" suppressHydrationWarning />
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); useAuthStore.getState().setPendingError(null); }}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 pl-9 text-sm outline-none focus:border-primary/40"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Email or mobile
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" suppressHydrationWarning />
            <input
              type="text"
              value={contact}
              onChange={(e) => { setContact(e.target.value); useAuthStore.getState().setPendingError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="Enter email or mobile"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 pl-9 text-sm outline-none focus:border-primary/40"
            />
          </div>
          {pendingError && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
              <AlertCircle className="h-3 w-3" suppressHydrationWarning /> {pendingError}
            </p>
          )}
        </div>

        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" suppressHydrationWarning /> Sending code…</>
          ) : (
            <>Continue <ArrowRight className="ml-2 h-4 w-4" suppressHydrationWarning /></>
          )}
        </Button>

        <div className="pt-2 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <button
            onClick={() => setAuthMode("signin")}
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>

      <DemoAuthHint />
    </div>
  );
}

/* ==================================================================== */
/* OTP verification screen                                              */
/* ==================================================================== */

function VerifyScreen({ isSignup }: { isSignup: boolean }) {
  const { pendingContact, verifyOTP, setAuthMode, pendingError, setPendingError } = useAuthStore();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [resendIn, setResendIn] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  /* Resend countdown */
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  /* Auto-focus first OTP box on mount */
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = v;
    setCode(next);
    setPendingError(null);
    if (v && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) inputsRef.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setCode(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async () => {
    const full = code.join("");
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await verifyOTP(full);
      if (!res.ok) setPendingError(res.error || "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const maskedContact = (() => {
    const c = pendingContact;
    if (!c) return "your contact";
    if (c.includes("@")) return c;
    // mask mobile middle digits
    return c.replace(/(\+?\d{2,3})[\d\s]+(\d{2})/, "$1 XXXXX $2");
  })();

  return (
    <div className="flex flex-col p-6">
      <SheetHeader className="mb-2 p-0 text-left">
        <SheetTitle className="text-2xl font-bold leading-tight">Verify your account</SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground">
          {isSignup
            ? "Enter the 6-digit code to activate your account."
            : `We sent a verification code to ${maskedContact}.`}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between gap-2" onPaste={handlePaste}>
          {code.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-14 w-12 rounded-lg border border-border bg-card text-center text-xl font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          ))}
        </div>

        {pendingError && (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="h-3 w-3" suppressHydrationWarning /> {pendingError}
          </p>
        )}

        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" suppressHydrationWarning /> Verifying…</>
          ) : (
            <>Verify <Check className="ml-2 h-4 w-4" suppressHydrationWarning /></>
          )}
        </Button>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setResendIn(30)}
            disabled={resendIn > 0}
            className={cn("text-xs font-semibold", resendIn > 0 ? "text-muted-foreground" : "text-primary hover:underline")}
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
          <button
            onClick={() => setAuthMode(isSignup ? "signup" : "signin")}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Change {pendingContact.includes("@") ? "email" : "number"}
          </button>
        </div>
      </div>

      <DemoAuthHint text={`Demo verification code: ${DEMO_OTP} — no real SMS is sent.`} />
    </div>
  );
}

/* ==================================================================== */
/* Profile-required screen (when user clicks Profile while signed out)  */
/* ==================================================================== */

function ProfileRequiredScreen() {
  const { setAuthMode, continueWithGoogle } = useAuthStore();
  return (
    <div className="flex flex-col p-6">
      <SheetHeader className="mb-2 p-0 text-left">
        <SheetTitle className="text-2xl font-bold leading-tight">Sign in to StyleSync</SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground">
          Sign in to view your bookings, saved salons, payment methods and more.
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAuthMode("signin")}>
          Sign in
        </Button>
        <Button variant="outline" className="w-full border-border/60 bg-card text-foreground hover:bg-secondary" onClick={() => setAuthMode("signup")}>
          Create account
        </Button>
        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full border-border/60 bg-card text-foreground hover:bg-secondary" onClick={continueWithGoogle}>
          <GoogleIcon className="mr-2 h-4 w-4" />
          Continue with Google (Demo)
        </Button>
      </div>

      <DemoAuthHint />
    </div>
  );
}

/* ==================================================================== */
/* Helpers                                                               */
/* ==================================================================== */

function DemoAuthHint({ text }: { text?: string }) {
  return (
    <div className="mt-6 flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-3 text-[10px] text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" suppressHydrationWarning />
      <span>
        {text ?? `Demo authentication — use any email/mobile and OTP ${DEMO_OTP}. No real SMS or email is sent. No real account is created.`}
      </span>
    </div>
  );
}

/* Inline Google "G" icon (multi-color) so we don't depend on an icon set */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" suppressHydrationWarning>
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.087,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20 s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.143,35.602,26.704,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.974,39.541,44,33.999,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );
}

/* ==================================================================== */
/* Small helper for callers — wrap profile-store + auth-store sync       */
/* ==================================================================== */

/* When the user signs out from profile-store, also clear the auth session. */
export function syncSignOut() {
  const profile = useProfileStore.getState();
  const auth = useAuthStore.getState();
  auth.logout();
  profile.signOut();
}
