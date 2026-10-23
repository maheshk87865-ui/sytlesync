"use client";

import { useEffect } from "react";
import { SiteHeader } from "@/components/stylesync/site-header";
import { BottomNav } from "@/components/stylesync/bottom-nav";
import { CompareBar } from "@/components/stylesync/compare-bar";
import { SalonProfileSheet } from "@/components/stylesync/salon-profile-sheet";
import { BookingSheet } from "@/components/stylesync/booking-sheet";
import { AiPhotoUploadSheet } from "@/components/stylesync/ai-photo-upload";
import { SalonServicesCatalogSheet } from "@/components/stylesync/salon-services-catalog";
import { ServiceDetailSheet } from "@/components/stylesync/service-detail-sheet";
import { StaffProfileSheet } from "@/components/stylesync/staff-profile-sheet";
import { AuthModal } from "@/components/stylesync/auth-modal";
import { HomeView } from "@/components/stylesync/views/home-view";
import { DiscoverView } from "@/components/stylesync/views/discover-view";
import { AiView } from "@/components/stylesync/views/ai-view";
import { BookingsView } from "@/components/stylesync/views/bookings-view";
import { ProfileView } from "@/components/stylesync/views/profile-view";
import { useAppStore, type AppView } from "@/lib/salon-store";

// Computed once at module load — same value on server and client during a
// single render pass, so no hydration mismatch.
const CURRENT_YEAR = 2026;

export default function Home() {
  const { view, setView } = useAppStore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view") || window.location.hash.replace("#", "");
    if (v && ["home", "discover", "ai", "bookings", "profile"].includes(v)) {
      setView(v as AppView);
    }
  }, [setView]);

  // Apply teal theme to ALL non-Home pages. Home page keeps the sky-blue :root theme.
  const isTeal = view !== "home";

  return (
    <div className={`flex min-h-screen flex-col bg-background ${isTeal ? "teal-theme" : ""}`} suppressHydrationWarning>
      <SiteHeader />

      {/* Page-level overflow controlled here. The horizontal salon carousel
          scrolls INSIDE its own container only. The Home view's hero band
          breaks out of this padded container using negative-margin trick. */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 sm:px-6 lg:pb-12 ss-page-no-overflow">
        {view === "home" && <HomeView />}
        {view === "discover" && <div className="pt-6 lg:pt-8"><DiscoverView /></div>}
        {view === "ai" && <div className="pt-6 lg:pt-8"><AiView /></div>}
        {view === "bookings" && <div className="pt-6 lg:pt-8"><BookingsView /></div>}
        {view === "profile" && <div className="pt-6 lg:pt-8"><ProfileView /></div>}
      </main>

      {/* Bottom navigation (mobile) */}
      <BottomNav />

      {/* Floating compare bar */}
      <CompareBar />

      {/* All sheets/modals ALWAYS use teal theme, even when opened from Home */}
      <div className="teal-theme">
        <SalonProfileSheet />
        <BookingSheet />
        <AiPhotoUploadSheet />
        <SalonServicesCatalogSheet />
        <ServiceDetailSheet />
        <StaffProfileSheet />
        {/* Auth modal — sits at the top level so it can interrupt any flow */}
        <AuthModal />
      </div>

      {/* Footer */}
      <footer className="hidden border-t border-border bg-secondary/40 py-6 lg:block">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {CURRENT_YEAR} StyleSync Prototype · All salons are demo data, not real businesses.
          </p>
          <div className="flex items-center gap-4">
            <a className="hover:text-primary" href="#">Privacy</a>
            <a className="hover:text-primary" href="#">Terms</a>
            <a className="hover:text-primary" href="#">For salons</a>
            <a className="hover:text-primary" href="#">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
