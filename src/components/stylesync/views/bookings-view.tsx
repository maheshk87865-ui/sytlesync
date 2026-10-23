"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/salon-store";
import { useAuthStore, bootstrapBackendSession } from "@/lib/auth-store";
import { getSalonById, formatINR } from "@/lib/salon-data";
import { getBookings, cancelBooking } from "@/lib/services/booking";
import type { BookingRecord } from "@/lib/types";
import { getAccessToken } from "@/lib/backend/client";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  LogIn,
  CheckCircle2,
} from "lucide-react";
import { EmptyState } from "./discover-view";
import { toast } from "sonner";

export function BookingsView() {
  const { setView, setBookingSalon, setSelectedSalon } = useAppStore();
  const { isAuthenticated, currentUser, openAuth } = useAuthStore();

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      if (!getAccessToken()) {
        await bootstrapBackendSession();
      }
      const records = await getBookings(currentUser?.id || "", "all");
      setBookings(records);
    } catch (err: any) {
      setError(err?.message || "Could not retrieve bookings from the database.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated, fetchBookings]);

  const handleCancel = async (bookingId: string, salonName: string) => {
    setCancellingId(bookingId);
    try {
      await cancelBooking(currentUser?.id || "", bookingId);
      toast.success(`Cancelled appointment at ${salonName}.`);
      await fetchBookings();
    } catch (err: any) {
      toast.error(err?.message || "Could not cancel appointment.");
    } finally {
      setCancellingId(null);
    }
  };

  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending"
  );
  const past = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real persisted appointments belonging to your authenticated account.
          </p>
        </div>
        {isAuthenticated && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Live SQLite DB
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBookings}
              disabled={loading}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              Refresh
            </Button>
          </div>
        )}
      </header>

      {/* Unauthenticated State */}
      {!isAuthenticated && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 p-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold">Sign in to view your bookings</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Sign in with demo credentials or your mobile number to view and manage appointments stored in the database.
          </p>
          <Button
            onClick={() => openAuth("signin")}
            className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Sign in to StyleSync
          </Button>
        </div>
      )}

      {/* Error / Network Disconnected State */}
      {isAuthenticated && error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-destructive">Database Connection Issue</h4>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBookings}
                className="mt-3 h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Retry connection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isAuthenticated && loading && bookings.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 animate-pulse"
            >
              <div className="h-5 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
              </div>
              <div className="h-8 bg-muted rounded w-full pt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Upcoming Section */}
      {isAuthenticated && !loading && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming ({upcoming.length})
          </h3>
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming bookings"
              description="You don't have any appointments scheduled in the database."
              actionLabel="Book a salon"
              onAction={() => setView("discover")}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {upcoming.map((b) => {
                const salon = getSalonById(b.salon_id);
                const displaySalonName = b.salon_name || salon?.name || "Salon";
                const displayServiceName = b.service_name || "Service";
                const displayStaffName = b.staff_name || "Stylist";
                const displayPrice = b.price ? formatINR(b.price) : "";
                const isCancelling = cancellingId === b.booking_id;

                return (
                  <div
                    key={b.id || b.booking_id}
                    className="rounded-2xl border border-border/60 bg-card p-4 ss-card-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-bold text-foreground">{displaySalonName}</div>
                        <div className="text-xs text-muted-foreground">{displayServiceName}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 uppercase">
                          {b.status}
                        </span>
                        {displayPrice && (
                          <span className="text-xs font-bold text-primary">{displayPrice}</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" suppressHydrationWarning />
                        <span>{b.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" suppressHydrationWarning />
                        <span>{b.time}</span>
                      </div>
                      {salon && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" suppressHydrationWarning />
                          <span>{salon.address || "Srinagar"}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" suppressHydrationWarning />
                        <span>{displayStaffName}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-muted-foreground font-mono">
                      Ref: {b.booking_id}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-border/60"
                        onClick={() => {
                          if (salon) setSelectedSalon(salon.id);
                          else setSelectedSalon(b.salon_id);
                        }}
                      >
                        View salon
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isCancelling}
                        className="flex-1 border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                        onClick={() => handleCancel(b.booking_id, displaySalonName)}
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          "Cancel"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Past Section */}
      {isAuthenticated && !loading && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Past appointments ({past.length})
          </h3>
          {past.length === 0 ? (
            <EmptyState
              title="No past appointments yet"
              description="Completed or cancelled bookings will appear here."
              actionLabel="Explore salons"
              onAction={() => setView("discover")}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {past.map((b) => {
                const salon = getSalonById(b.salon_id);
                const displaySalonName = b.salon_name || salon?.name || "Salon";
                const displayServiceName = b.service_name || "Service";

                return (
                  <div
                    key={`past-${b.id || b.booking_id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{displaySalonName}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                            b.status === "cancelled"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {displayServiceName} · {b.date} · {b.time}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => setBookingSalon(b.salon_id)}
                    >
                      Book again <ChevronRight className="h-3.5 w-3.5" suppressHydrationWarning />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
