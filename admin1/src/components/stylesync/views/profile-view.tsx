"use client";

import { useAppStore } from "@/lib/salon-store";
import { useProfileStore } from "@/lib/profile-store";
import { useAiPhotoStore } from "@/lib/ai-photo-store";
import { useAuthStore } from "@/lib/auth-store";
import { salons, getSalonById, formatINR } from "@/lib/salon-data";
import { SalonCard } from "../salon-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./discover-view";
import {
  Heart, Bell, CreditCard, Settings, HelpCircle, ChevronRight, ShieldCheck, LogOut,
  Calendar, Clock, MapPin, Sparkles, Star, Eye, User,
} from "lucide-react";
import { ProfileSheetManager, SignedOutView, DEMO_BOOKINGS, DEFAULT_SAVED_LOOKS } from "../profile-sheets";
import { useState, useMemo, useEffect } from "react";

export function ProfileView() {
  const { savedSalons, setView, setBookingSalon, setSelectedSalon } = useAppStore();
  const profile = useProfileStore();
  const { isAuthenticated, currentUser, openAuth } = useAuthStore();
  const { savedLooks } = useAiPhotoStore();

  /* When the auth user changes (sign-in / sign-up), sync their name and
     contact details into profile-store.user so the existing UI (Edit
     Profile, header, etc.) shows consistent information. */
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const u = profile.user;
    if (u.name !== currentUser.name || u.email !== currentUser.email || u.mobile !== currentUser.mobile) {
      profile.updateUser({
        name: currentUser.name,
        email: currentUser.email,
        mobile: currentUser.mobile,
        city: currentUser.city,
        avatarInitial: currentUser.avatarInitial,
      });
    }
  }, [isAuthenticated, currentUser]);

  const saved = savedSalons.map((id) => salons.find((s) => s.id === id)).filter(Boolean);

  /* Build menu items dynamically — values reflect current demo state.
     Computed here so all hooks run unconditionally before any early
     return (React's rules of hooks require stable hook ordering). */
  const menuItems = useMemo(() => [
    { id: "notifications" as const, icon: Bell, label: "Notifications", value: profile.notifications.filter((n) => !n.read).length > 0 ? `${profile.notifications.filter((n) => !n.read).length} new` : "All read" },
    { id: "payment-methods" as const, icon: CreditCard, label: "Payment methods", value: `${profile.paymentMethods.filter((p) => p.type === "upi").length} UPI · ${profile.paymentMethods.filter((p) => p.type === "card").length} card` },
    { id: "trust-verification" as const, icon: ShieldCheck, label: "Trust & verification", value: "Verified user" },
    { id: "settings" as const, icon: Settings, label: "Settings", value: undefined },
    { id: "help-support" as const, icon: HelpCircle, label: "Help & support", value: undefined },
    { id: "sign-out" as const, icon: LogOut, label: "Sign out", value: undefined },
  ], [profile.notifications, profile.paymentMethods]);

  const upcomingBookings = useMemo(() => DEMO_BOOKINGS.filter((b) => b.section === "Upcoming"), []);
  const pastBookings = useMemo(() => DEMO_BOOKINGS.filter((b) => b.section === "Past"), []);

  /* Combine saved looks from AI photo store with defaults for demo */
  const allSavedLooks = useMemo(() => {
    if (savedLooks.length > 0) {
      return savedLooks.map((rec, i) => ({
        id: `ai-${i}`,
        style: rec.style,
        category: rec.category,
        description: rec.reason,
        serviceName: rec.serviceName || rec.serviceType,
        visualPreview: rec.visualPreview,
      }));
    }
    return DEFAULT_SAVED_LOOKS.map((l) => ({ ...l, visualPreview: undefined }));
  }, [savedLooks]);

  /* Sync demo user's saved-looks count + saved-salons count.
     MUST be a useEffect (not a direct call during render) — otherwise
     we'd be updating profile-store while ProfileView is still rendering,
     which React doesn't allow ("Cannot update a component while rendering
     a different component"). The useEffect must also be declared BEFORE
     any conditional early-returns to satisfy React's rules-of-hooks
     (hooks must run in the same order on every render). */
  useEffect(() => {
    if (profile.user.stats.savedLooks !== allSavedLooks.length || profile.user.stats.savedSalons !== saved.length) {
      profile.updateUser({ stats: { ...profile.user.stats, savedLooks: allSavedLooks.length, savedSalons: saved.length } });
    }
  }, [allSavedLooks.length, saved.length]);

  /* If the user is not authenticated, show a sign-in CTA at the top of
     the Profile page instead of the full profile. Saved salons remain
     visible since those are stored client-side. */
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <div className="space-y-6">
          {/* Sign-in CTA */}
          <section className="rounded-3xl border border-border/60 bg-card p-6 ss-card-shadow">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-primary">
                <User className="h-8 w-8" suppressHydrationWarning />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-foreground">Sign in to StyleSync</h1>
                <p className="mt-1 text-sm text-muted-foreground">Book appointments, save salons, and track your style — all in one place.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => openAuth("signin")}>
                    Sign in
                  </Button>
                  <Button variant="outline" className="border-primary/30 text-primary hover:bg-secondary" onClick={() => openAuth("signup")}>
                    Create account
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground">
              StyleSync is a prototype. Demo authentication — no real account is created or SMS sent.
            </p>
          </section>

          {/* Saved salons (still browsable without auth) */}
          {saved.length > 0 && (
            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold">
                    <Heart className="h-4 w-4 fill-[#0EA5E9] text-[#0EA5E9]" suppressHydrationWarning />
                    Saved salons
                  </h3>
                  <p className="text-sm text-muted-foreground">Salons you can revisit any time.</p>
                </div>
                <button onClick={() => setView("discover")} className="text-xs font-semibold text-primary hover:underline">
                  Discover more
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {saved.map((s) => <SalonCard key={s!.id} salon={s!} variant="grid" />)}
              </div>
            </section>
          )}
        </div>
        <ProfileSheetManager />
      </>
    );
  }

  /* If signed out, show signed-out state */
  if (profile.signedOut) {
    return (
      <>
        <SignedOutView />
        <ProfileSheetManager />
      </>
    );
  }

  const handleMenuItem = (id: string) => {
    if (id === "sign-out") {
      profile.openSheet("sign-out");
    } else {
      profile.openSheet(id as any);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <section className="rounded-3xl ss-brand-gradient p-6 text-white ss-card-shadow">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-2xl font-bold ring-2 ring-white/20">
            {profile.user.avatarInitial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{profile.user.name}</h1>
            <p className="text-sm text-white/80">Customer · {profile.user.city}</p>
            <p className="text-xs text-white/70">{profile.user.email}</p>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
              <ShieldCheck className="h-3 w-3" suppressHydrationWarning /> Verified user · Member since {profile.user.memberSince}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "Bookings", value: profile.user.stats.bookings },
            { label: "Completed", value: profile.user.stats.completed },
            { label: "Saved salons", value: saved.length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/10 p-3 text-center">
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/70">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Saved salons */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold">
              <Heart className="h-4 w-4 fill-[#0EA5E9] text-[#0EA5E9]" suppressHydrationWarning />
              Saved salons
            </h3>
            <p className="text-sm text-muted-foreground">Salons you can revisit any time.</p>
          </div>
          <button
            onClick={() => setView("discover")}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Discover more
          </button>
        </div>
        {saved.length === 0 ? (
          <EmptyState
            title="No saved salons yet"
            description="Tap the heart on any salon to save it for later."
            actionLabel="Explore salons"
            onAction={() => setView("discover")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((s) => (
              <SalonCard key={s!.id} salon={s!} variant="grid" />
            ))}
          </div>
        )}
      </section>

      {/* Saved AI looks */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="h-4 w-4 ss-champagne" suppressHydrationWarning />
              Saved AI looks
            </h3>
            <p className="text-sm text-muted-foreground">Personalised styles you&apos;ve saved from AI recommendations.</p>
          </div>
          <button
            onClick={() => setView("ai")}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Open AI Assistant
          </button>
        </div>
        {allSavedLooks.length === 0 ? (
          <EmptyState
            title="No saved AI looks yet"
            description="Ask the StyleSync AI for recommendations and tap the heart to save a look."
            actionLabel="Try AI Assistant"
            onAction={() => setView("ai")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allSavedLooks.map((look) => (
              <div key={look.id} className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card ss-card-shadow">
                {look.visualPreview ? (
                  <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
                    <img src={look.visualPreview} alt={look.style} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="grid aspect-[3/4] w-full place-items-center bg-secondary text-primary">
                    <Sparkles className="h-10 w-10 opacity-60" suppressHydrationWarning />
                  </div>
                )}
                <div className="p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">{look.category}</div>
                  <div className="text-sm font-bold text-foreground">{look.style}</div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{look.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" variant="outline" className="flex-1 border-border/60 text-xs" onClick={() => setView("ai")}>
                      <Eye className="mr-1 h-3 w-3" suppressHydrationWarning /> View Look
                    </Button>
                    <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs" onClick={() => setView("discover")}>
                      Find Salons <ChevronRight className="ml-1 h-3 w-3" suppressHydrationWarning />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming bookings */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold">
              <Calendar className="h-4 w-4 text-primary" suppressHydrationWarning />
              Upcoming bookings
            </h3>
            <p className="text-sm text-muted-foreground">Your next appointments.</p>
          </div>
          <button
            onClick={() => setView("bookings")}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all
          </button>
        </div>
        <div className="space-y-2">
          {upcomingBookings.map((b) => {
            const salon = getSalonById(b.salonId);
            if (!salon) return null;
            return (
              <button
                key={b.id}
                onClick={() => setBookingSalon(b.salonId)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left transition hover:bg-secondary"
              >
                <img src={salon.cover} alt={salon.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{salon.name}</span>
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">{b.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{b.serviceName} · {b.staffName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" suppressHydrationWarning /> {b.date}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" suppressHydrationWarning /> {b.time}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" suppressHydrationWarning /> {salon.distanceKm} km</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary">{formatINR(b.price)}</div>
                  <div className="text-[10px] font-semibold text-primary">View Booking <ChevronRight className="ml-0.5 inline h-2.5 w-2.5" suppressHydrationWarning /></div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Past bookings */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold">
              <Star className="h-4 w-4 ss-champagne" suppressHydrationWarning />
              Past appointments
            </h3>
            <p className="text-sm text-muted-foreground">Leave a review for completed services.</p>
          </div>
        </div>
        <div className="space-y-2">
          {pastBookings.map((b) => {
            const salon = getSalonById(b.salonId);
            if (!salon) return null;
            return (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedSalon(b.salonId)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedSalon(b.salonId); } }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left transition hover:bg-secondary"
              >
                <img src={salon.cover} alt={salon.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{salon.name}</div>
                  <div className="text-xs text-muted-foreground">{b.serviceName} · {b.date}</div>
                </div>
                <span className="inline-flex items-center rounded-md border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary hover:bg-secondary">
                  Leave Review
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Menu */}
      <section className="rounded-2xl border border-border/60 bg-card p-2 ss-card-shadow">
        {menuItems.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.label}
              onClick={() => handleMenuItem(m.id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-secondary"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <span className="flex-1 text-left font-medium">{m.label}</span>
              {m.value && <span className="text-xs text-muted-foreground">{m.value}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" suppressHydrationWarning />
            </button>
          );
        })}
      </section>

      <p className="px-2 text-center text-[10px] text-muted-foreground">
        StyleSync is a prototype. All salons, bookings, payment methods and support tickets shown here are DEMO DATA and do not represent real accounts or transactions.
      </p>

      <ProfileSheetManager />
    </div>
  );
}
