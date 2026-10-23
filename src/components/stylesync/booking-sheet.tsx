"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/salon-store";
import { useAuthStore, type PendingBooking, bootstrapBackendSession } from "@/lib/auth-store";
import { useProfileStore } from "@/lib/profile-store";
import { getSalonById, formatINR, todaySlots, type TimeSlot } from "@/lib/salon-data";
import { createBooking } from "@/lib/services/booking";
import { getTodayDateStringIST } from "@/lib/services/helpers";
import { getAccessToken, api } from "@/lib/backend/client";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Check,
  Loader2,
  Wand2,
  Sparkles,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3 | 4 | 5;
const STEP_LABELS = ["Service", "Staff", "Time", "Review", "Pay", "Done"];

function toHHMM(timeStr: string): string {
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  if (/^\d{1}:\d{2}$/.test(timeStr)) return `0${timeStr}`;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "10:00";
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3]?.toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}

function formatSlotLabel(hhmm: string): string {
  if (!hhmm || !hhmm.includes(":")) return hhmm;
  if (/\d\s*(AM|PM|am|pm)/.test(hhmm)) return hhmm;
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BookingSheet() {
  const {
    bookingSalon,
    setBookingSalon,
    setView,
    bookingPreselectServiceId,
    bookingPreselectStaffId,
    selectedLook,
    setSelectedLook,
  } = useAppStore();

  const salon = bookingSalon ? getSalonById(bookingSalon) : undefined;
  const [step, setStep] = useState<Step>(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [bookingId, setBookingId] = useState<string>("SS-DEMO");
  const [paymentDetails, setPaymentDetails] = useState<{
    orderId: string;
    paymentId: string;
    status: string;
    amount: number;
  } | null>(null);

  // Real availability slots state
  const [liveSlots, setLiveSlots] = useState<TimeSlot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Booking submission & error state
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Auth store
  const { isAuthenticated, pendingBooking, setPendingBooking, openAuth } = useAuthStore();

  const open = !!salon;

  const reset = () => {
    setStep(0);
    setServiceId(null);
    setStaffId(null);
    setSlot(null);
    setBookingId("SS-DEMO");
    setPaymentDetails(null);
    setLiveSlots(null);
    setBookingError(null);
    setSubmitting(false);
  };

  const close = () => {
    setBookingSalon(null);
    setPendingBooking(null);
    setTimeout(reset, 200);
  };

  // Consume preselection when opening from AI Result Card
  useEffect(() => {
    if (!open || !salon) return;
    if (bookingPreselectServiceId) {
      setServiceId(bookingPreselectServiceId);
      if (bookingPreselectStaffId) {
        setStaffId(bookingPreselectStaffId);
        setStep(2); // Jump directly to picking slot
      } else {
        setStep(1); // Jump to picking stylist
      }
    }
  }, [open, salon, bookingPreselectServiceId, bookingPreselectStaffId]);

  // Auth resume hook: restores salon, service, staff, and selected AI hairstyle look
  useEffect(() => {
    if (!open || !salon) return;
    if (isAuthenticated && pendingBooking && pendingBooking.salonId === salon.id) {
      if (pendingBooking.serviceId) setServiceId(pendingBooking.serviceId);
      if (pendingBooking.staffId) setStaffId(pendingBooking.staffId);
      if (pendingBooking.selectedLook) setSelectedLook(pendingBooking.selectedLook);
      setPendingBooking(null);
      setStep(pendingBooking.staffId ? 2 : 1);
    }
  }, [isAuthenticated, pendingBooking, open, salon, setSelectedLook, setPendingBooking]);

  const service = salon?.services.find((s) => s.id === serviceId || (s as any).slug === serviceId);
  const staff = salon?.staff.find((m) => m.id === staffId || (m as any).slug === staffId);
  const total = service?.priceFrom ?? salon?.priceFrom ?? 0;

  // Real-time slot fetcher from backend slot-engine
  useEffect(() => {
    if (step !== 2 || !salon || !service || !staff) return;
    let active = true;
    setLoadingSlots(true);

    const todayStr = getTodayDateStringIST();
    api.get<{ slots?: Array<{ startTime: string; canBook: boolean; status: string }>; totalSlots?: number }>(
      `/availability/${salon.id}`,
      {
        auth: false,
        query: {
          date: todayStr,
          service_id: service.id,
          staff_id: staff.id,
        },
      }
    )
      .then((resp) => {
        if (!active) return;
        const slotsArray = resp?.slots || (resp as any)?.data?.slots || [];
        if (Array.isArray(slotsArray) && slotsArray.length > 0) {
          const mapped: TimeSlot[] = slotsArray.map((s) => ({
            time: formatSlotLabel(s.startTime),
            status: s.canBook ? "available" : "booked",
          }));
          setLiveSlots(mapped);
        }
      })
      .catch(() => {
        // Fallback cleanly to default slots if network/offline
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => { active = false; };
  }, [step, salon, service, staff]);

  if (!salon) {
    return null;
  }

  const maybeRequireAuth = (): boolean => {
    if (isAuthenticated) return true;
    const snapshot: PendingBooking = {
      salonId: salon.id,
      salonName: salon.name,
      serviceId: service?.id ?? serviceId ?? "",
      serviceName: service?.name ?? "",
      price: total,
      staffId: staff?.id ?? staffId ?? "",
      staffName: staff?.name ?? "",
      staffRole: staff?.role,
      staffRating: staff?.rating,
      duration: service?.duration,
      selectedLook: selectedLook || null,
    };
    setPendingBooking(snapshot);
    openAuth("signin");
    return false;
  };

  const pushBookingConfirmation = (finalBookingId: string) => {
    const id = finalBookingId;
    const newNtf = {
      id: `ntf-booking-${id}`,
      category: "booking" as const,
      title: "Booking confirmed",
      description: `Your ${service?.name || "appointment"} at ${salon.name} is confirmed.`,
      timestamp: "Just now",
      section: "Today" as const,
      read: false,
      iconName: "CheckCircle2",
      actionLabel: "View Booking",
      actionType: "view-booking" as const,
      actionPayload: salon.id,
    };
    useProfileStore.setState((s) => ({
      notifications: [newNtf, ...s.notifications],
      user: { ...s.user, stats: { ...s.user.stats, bookings: s.user.stats.bookings + 1 } },
    }));
  };

  const handlePay = async () => {
    if (!salon || !service || !staff || !slot) return;
    setSubmitting(true);
    setBookingError(null);

    try {
      if (!getAccessToken()) {
        await bootstrapBackendSession();
      }

      const startTime24 = toHHMM(slot.time);
      const dateStr = getTodayDateStringIST();

      // Encode selected AI look into notes for salon partner & admin visibility
      const notes = selectedLook
        ? `[AI Look: ${selectedLook.style} | Category: ${selectedLook.category}${selectedLook.visualPreview ? ` | Preview: ${selectedLook.visualPreview}` : ""}]`
        : null;

      // 1. Create booking in SQLite (test.db)
      const res = await createBooking({
        customer_id: "",
        salon_id: salon.id,
        service_id: service.id,
        staff_id: staff.id,
        slot_id: null,
        service_name: service.name,
        staff_name: staff.name,
        salon_name: salon.name,
        date: dateStr,
        time: startTime24,
        duration_label: service.duration,
        price: total,
        payment_method: "razorpay",
        cancellation_policy: salon.cancellationPolicy,
        notes,
      });

      const confirmedId = res.booking_id || res.id;
      const internalBookingId = (res as any).id || confirmedId;

      // 2. Request Payment Intent from Backend
      const intentRes = await api.post<any>("/payments/intent", {
        bookingId: internalBookingId,
      }).catch((e) => {
        console.warn("Intent endpoint response:", e);
        return null;
      });

      const providerOrderId = intentRes?.providerOrderId || intentRes?.data?.providerOrderId || `order_${Date.now()}`;
      const amountPaise = intentRes?.amount || total * 100;

      // 3. Razorpay Checkout Flow
      const isScriptLoaded = await loadRazorpayScript();
      const user = useProfileStore.getState().user;
      const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (isScriptLoaded && (window as any).Razorpay && rzpKey && rzpKey.startsWith("rzp_test_")) {
        // Open official Razorpay modal
        const options = {
          key: rzpKey,
          amount: amountPaise,
          currency: "INR",
          name: "StyleSync",
          description: `${service.name} at ${salon.name}`,
          order_id: providerOrderId.startsWith("order_") ? providerOrderId : undefined,
          prefill: {
            name: user.name || "Customer",
            email: user.email || "customer@stylesync.in",
            contact: (user as any).phone || user.mobile || "+919419000000",
          },
          theme: { color: "#0ea5e9" },
          handler: async function (response: any) {
            try {
              // Server-side verification of signature
              await api.post("/payments/verify", {
                providerOrderId: response.razorpay_order_id || providerOrderId,
                providerPaymentId: response.razorpay_payment_id,
                providerSignature: response.razorpay_signature,
                method: "razorpay_checkout",
              });
              setBookingId(confirmedId);
              setPaymentDetails({
                orderId: response.razorpay_order_id || providerOrderId,
                paymentId: response.razorpay_payment_id,
                status: "PAID",
                amount: total,
              });
              pushBookingConfirmation(confirmedId);
              toast.success(`Payment verified! Booking confirmed at ${salon.name}`);
              setStep(5);
            } catch (err: any) {
              setBookingError("Payment signature verification failed. Please contact support.");
              toast.error("Payment verification failed.");
            }
          },
          modal: {
            ondismiss: function () {
              setBookingError("Payment was cancelled. Your slot is held temporarily.");
              toast.info("Payment cancelled.");
            }
          }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Test / Sandbox simulation verification against backend
        const simulatedPaymentId = `pay_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await api.post<any>("/payments/verify", {
          providerOrderId,
          providerPaymentId: simulatedPaymentId,
          method: "razorpay_test_upi",
        });

        setBookingId(confirmedId);
        setPaymentDetails({
          orderId: providerOrderId,
          paymentId: simulatedPaymentId,
          status: "PAID",
          amount: total,
        });
        pushBookingConfirmation(confirmedId);
        toast.success(`Test Payment verified! Booking confirmed at ${salon.name}`);
        setStep(5);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to process payment and confirm booking. Please try again.";
      setBookingError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const displaySlots = liveSlots && liveSlots.length > 0 ? liveSlots : todaySlots;


  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="right"
        className="teal-theme w-full overflow-y-auto sm:max-w-lg p-0"
      >
        <SheetHeader className="border-b border-border/60 p-4">
          <SheetTitle className="text-lg">Book at {salon.name}</SheetTitle>
          <SheetDescription className="text-xs">{salon.tagline}</SheetDescription>
        </SheetHeader>

        {/* Progress */}
        <div className="border-b border-border/60 p-4">
          <div className="flex items-center">
            {STEP_LABELS.map((label, idx) => (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition",
                      idx < step
                        ? "bg-primary text-primary-foreground"
                        : idx === step
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {idx < step ? <Check className="h-3.5 w-3.5" suppressHydrationWarning /> : idx + 1}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-[9px] font-semibold uppercase tracking-wide",
                      idx <= step ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </div>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div
                    className={cn(
                      "mx-1 h-0.5 flex-1 rounded-full transition",
                      idx < step ? "bg-primary" : "bg-secondary"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="p-4">
          {step === 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Choose a service</h4>
              {salon.services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setServiceId(s.id);
                    setStep(1);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition",
                    serviceId === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/40"
                  )}
                >
                  <div>
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.duration} · {s.category}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-primary">
                    {formatINR(s.priceFrom)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Choose a stylist</h4>
              {salon.staff.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setStaffId(m.id);
                    const svc = salon.services.find((s) => s.id === serviceId);
                    const snapshot: PendingBooking = {
                      salonId: salon.id,
                      salonName: salon.name,
                      serviceId: svc?.id ?? serviceId ?? "",
                      serviceName: svc?.name ?? "",
                      price: svc?.priceFrom ?? salon.priceFrom,
                      staffId: m.id,
                      staffName: m.name,
                      staffRole: m.role,
                      staffRating: m.rating,
                      duration: svc?.duration,
                    };
                    if (isAuthenticated) {
                      setStep(2);
                    } else {
                      setPendingBooking(snapshot);
                      openAuth("signin");
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                    staffId === m.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/40"
                  )}
                >
                  <div
                    className="grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: m.avatarColor }}
                    suppressHydrationWarning
                  >
                    {m.initials}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.role}</div>
                  </div>
                  <div className="text-xs font-semibold">{m.rating}★</div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Pick a time</h4>
                {liveSlots && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    ● Real-time availability
                  </span>
                )}
              </div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">Today</div>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Calendar className="mr-1 h-3 w-3" suppressHydrationWarning /> Change day
                </Button>
              </div>
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="mb-2 h-5 w-5 animate-spin text-primary" />
                  Checking slot engine availability...
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {displaySlots.map((t) => (
                    <button
                      key={t.time}
                      disabled={t.status === "booked"}
                      onClick={() => {
                        setSlot(t);
                        setStep(3);
                      }}
                      className={cn(
                        "rounded-xl border p-2 text-center transition",
                        t.status === "booked"
                          ? "border-border/40 bg-muted text-muted-foreground line-through cursor-not-allowed opacity-60"
                          : slot?.time === t.time
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border/60 hover:border-primary/40"
                      )}
                    >
                      <div className="text-sm font-semibold">{t.time}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {t.status === "booked"
                          ? "Booked"
                          : t.status === "limited"
                          ? "1 left"
                          : "Open"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Review your booking</h4>

              {/* Attached AI Look Card if customer came from AI Try-on */}
              {selectedLook && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                  <div className="flex items-center gap-3">
                    {selectedLook.visualPreview ? (
                      <img
                        src={selectedLook.visualPreview}
                        alt="Selected Look"
                        className="h-14 w-14 rounded-lg object-cover border border-primary/20 shadow-sm"
                      />
                    ) : (
                      <div className="grid h-14 w-14 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Wand2 className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Attached AI Hairstyle</span>
                      </div>
                      <div className="text-sm font-bold text-foreground truncate">{selectedLook.style}</div>
                      <div className="text-xs text-muted-foreground">{selectedLook.category} · {selectedLook.maintenance || "Medium"} maintenance</div>
                    </div>
                  </div>
                  <div className="mt-2 rounded bg-white/70 px-2 py-1 text-[10px] text-muted-foreground">
                    This reference photo will be shared with your assigned stylist for consultation at the salon.
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border/60 p-3 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Salon</span>
                  <span className="font-semibold">{salon.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-semibold text-right">{salon.address}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-semibold">{service?.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Stylist</span>
                  <span className="font-semibold">{staff?.name} ({staff?.role})</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Appointment</span>
                  <span className="font-semibold">
                    {salon.nextSlot.day}, {slot?.time}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Service Duration</span>
                  <span className="font-semibold">{service?.duration}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2 mt-2">
                  <span className="text-muted-foreground">Total Service Fee</span>
                  <span className="font-bold text-primary">{formatINR(total)}</span>
                </div>
                <div className="flex justify-between py-1 text-xs text-muted-foreground">
                  <span>Payable Now (100% Advance)</span>
                  <span className="font-semibold text-foreground">{formatINR(total)}</span>
                </div>
                <div className="flex justify-between py-1 text-xs text-muted-foreground">
                  <span>Due at Salon</span>
                  <span className="font-semibold text-foreground">₹0</span>
                </div>
              </div>
              <div className="rounded-xl bg-secondary/40 p-3 text-xs text-foreground/80">
                <span className="font-semibold">Cancellation Policy: </span>
                {salon.cancellationPolicy}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Payment Method</h4>
              {bookingError && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="h-4 w-4 text-primary" suppressHydrationWarning />
                    <span>Razorpay Secure Gateway</span>
                  </div>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                    Test Mode Ready
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Supports UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards & Net Banking in Srinagar.
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-primary/20 pt-2 text-xs font-medium">
                  <span className="text-muted-foreground">Payable Amount:</span>
                  <span className="text-sm font-bold text-primary">{formatINR(total)}</span>
                </div>
              </div>
              <div className="rounded-xl bg-secondary/40 p-3 text-xs text-foreground/80">
                <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-primary" suppressHydrationWarning />
                Secured by Razorpay HMAC-SHA256 signature verification · Verified server-side.
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" suppressHydrationWarning />
              </div>
              <h4 className="mt-3 text-base font-bold">Booking Confirmed & Verified!</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {service?.name} with {staff?.name} at {salon.name} on {salon.nextSlot.day} {slot?.time}.
              </p>

              {/* Selected Look confirmation */}
              {selectedLook && (
                <div className="mt-3 w-full rounded-xl border border-primary/20 bg-primary/5 p-3 text-left">
                  <div className="flex items-center gap-2.5">
                    {selectedLook.visualPreview ? (
                      <img src={selectedLook.visualPreview} alt="Look" className="h-10 w-10 rounded-lg object-cover border" />
                    ) : (
                      <Wand2 className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <div className="text-[10px] font-semibold text-primary uppercase">Attached Look Reference</div>
                      <div className="text-xs font-bold text-foreground">{selectedLook.style}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 w-full rounded-xl border border-border/60 p-3 text-sm">
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Booking Reference</span>
                  <span className="font-mono font-semibold">{bookingId}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold text-primary">{formatINR(total)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Payment Status</span>
                  <span className="font-semibold text-emerald-600">PAID (Verified)</span>
                </div>
                {paymentDetails?.paymentId && (
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Gateway Payment ID</span>
                    <span className="font-mono text-xs text-foreground truncate max-w-[160px]">{paymentDetails.paymentId}</span>
                  </div>
                )}
                <div className="flex justify-between py-0.5 border-t border-border/40 mt-1.5 pt-1.5">
                  <span className="text-muted-foreground">Salon Address</span>
                  <span className="text-xs text-foreground font-medium text-right">{salon.address}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Backend Sync</span>
                  <span className="text-xs text-emerald-600 font-medium">SQLite (test.db) · Synced</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 5 && (
          <div className="sticky bottom-0 flex items-center gap-2 border-t border-border/60 bg-background/95 p-3 backdrop-blur">
            <div className="flex-1 text-sm">
              {service ? (
                <div>
                  <div className="text-xs text-muted-foreground">{service.name}</div>
                  <div className="font-bold text-primary">{formatINR(total)}</div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  From <span className="font-semibold text-foreground">{formatINR(salon.priceFrom)}</span>
                </div>
              )}
            </div>
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => setStep((s) => (s - 1) as Step)}
              >
                <ChevronLeft className="h-4 w-4" suppressHydrationWarning /> Back
              </Button>
            )}
            {step < 4 && (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={step === 0 && !serviceId}
                onClick={() => {
                  if (step === 1 && !maybeRequireAuth()) return;
                  setStep((s) => (s + 1) as Step);
                }}
              >
                Continue <ChevronRight className="h-4 w-4" suppressHydrationWarning />
              </Button>
            )}
            {step === 4 && (
              <Button
                size="sm"
                disabled={submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  if (!maybeRequireAuth()) {
                    setStep(1);
                    return;
                  }
                  handlePay();
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Confirming booking...
                  </>
                ) : (
                  `Pay ${formatINR(total)}`
                )}
              </Button>
            )}
          </div>
        )}
        {step === 5 && (
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border/60 bg-background/95 p-3 backdrop-blur">
            <Button variant="outline" size="sm" onClick={close}>
              Close
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                close();
                setView("bookings");
              }}
            >
              View bookings
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
