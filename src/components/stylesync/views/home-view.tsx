"use client";

import { useState, useEffect } from "react";
import { salons, getSalonById, type Salon } from "@/lib/salon-data";
import { getSalons } from "@/lib/services/salon";
import { useAppStore } from "@/lib/salon-store";
import { AiAssistantCard } from "../ai-assistant-card";
import { ServiceCategories } from "../service-categories";
import { PopularServices } from "../popular-services";
import { SalonCard } from "../salon-card";
import { ChevronRight, Sparkles, Calendar, ShieldCheck, Database } from "lucide-react";

export function HomeView() {
  const { setView, setSelectedSalon } = useAppStore();
  const [liveSalons, setLiveSalons] = useState<Salon[] | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let active = true;
    getSalons()
      .then((records) => {
        if (!active || !Array.isArray(records) || records.length === 0) return;
        const mapped: Salon[] = records.map((r: any) => {
          const local = getSalonById(r.id);
          return {
            id: r.id,
            slug: local?.slug,
            name: r.name,
            tagline: r.tagline || local?.tagline || "",
            description: r.description || local?.description || "",
            category: (r.category || local?.category || "Hair") as any,
            cover: r.coverImage || local?.cover || "/salons/salon-29.jpg",
            gallery: local?.gallery || [],
            rating: r.rating ?? local?.rating ?? 4.8,
            reviews: r.reviewCount ?? local?.reviews ?? 0,
            distanceKm: r.distanceKm ?? local?.distanceKm ?? 1.0,
            priceFrom: r.priceFrom ?? local?.priceFrom ?? 300,
            openUntil: r.openUntil || local?.openUntil || "21:00",
            isOpen: r.isOpen ?? local?.isOpen ?? true,
            nextSlot: local?.nextSlot || { day: "Today", time: r.openUntil || "Open" },
            popularServices: local?.popularServices || [],
            services: local?.services || [],
            staff: local?.staff || [],
            verified: r.verified ?? local?.verified ?? true,
            address: r.address || local?.address || "Srinagar",
            cancellationPolicy: r.cancellationPolicy || local?.cancellationPolicy || "Free cancellation up to 2 hours before the appointment.",
            features: local?.features || [],
            tags: local?.tags || [],
          };
        });
        setLiveSalons(mapped);
        setIsLive(true);
      })
      .catch(() => {
        // Retain local fallback cleanly
      });

    return () => { active = false; };
  }, []);

  const baseSalons = liveSalons && liveSalons.length > 0 ? liveSalons : salons;

  // Merge, deduplicate and prioritize
  const allSalonIds = new Set<string>();
  baseSalons.forEach((s) => allSalonIds.add(s.id));
  const featuredSalons = Array.from(allSalonIds)
    .map((id) => baseSalons.find((s) => s.id === id)!)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.distanceKm - b.distanceKm;
    });

  return (
    <div className="flex flex-col">
      {/* ===========================================================
         HERO BAND — full-bleed premium salon photo + dark green
         gradient overlay. White text + green accents. The hero band
         breaks out of the parent's padding using the negative-margin
         trick so it spans the full viewport width.
      ============================================================ */}
      <section
        aria-label="Hero"
        className="ss-hero relative w-screen ml-[calc(-50vw+50%)] overflow-hidden"
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              {/* Greeting */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                <Sparkles className="h-3 w-3 ss-champagne" suppressHydrationWarning />
                Most Welcome 😊
              </div>

              {/* Heading */}
              <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Find the <span className="text-white">service</span> you need.
              </h1>

              {/* Subtitle — premium quote */}
              <p className="mt-4 text-lg font-normal italic text-white sm:text-xl" suppressHydrationWarning>
                “Why wait<br />when you can book?”
              </p>

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setView("discover")}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0284C7] shadow-lg shadow-black/20 transition hover:bg-white/90"
                >
                  Explore salons
                  <ChevronRight className="h-4 w-4" suppressHydrationWarning />
                </button>
                <button
                  onClick={() => setView("ai")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <Sparkles className="h-4 w-4 ss-champagne" suppressHydrationWarning />
                  Ask StyleSync AI
                </button>
              </div>

              {/* Trust strip */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 ss-champagne" suppressHydrationWarning />
                  Verified salons
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 ss-champagne" suppressHydrationWarning />
                  Real-time availability
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full ss-champagne-bg" />
                  Transparent pricing
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===========================================================
         BELOW-HERO THEME WRAPPER — Everything below the locked
         sky-blue Welcome/Hero section uses the new deep blue-teal
         StyleSync theme (#10232D family). The hero above remains
         in :root (sky-blue) for visual continuity with the locked
         Welcome/Hero section.
      ============================================================ */}
      <div className="teal-theme bg-background text-foreground flex flex-col">
        {/* ===========================================================
           AI BAND — sits right under hero, has its own subtle salon
           background (ss-ai-band) so the AI assistant card glows on
           top of it as a translucent glass card.
        ============================================================ */}
        <section className="ss-ai-band relative w-screen ml-[calc(-50vw+50%)] overflow-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
            <AiAssistantCard />
          </div>
        </section>

        {/* ===========================================================
           REMAINING SECTIONS — deep teal background, max-w-7xl
           container. Each section has its own spacing.
        ============================================================ */}
        <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pt-10 pb-16 sm:px-6 lg:pt-12">
          {/* Categories */}
          <ServiceCategories />

          {/* Popular services */}
          <PopularServices />

          {/* ===========================================================
             FEATURED SALONS — ONE single merged salon section.
             All unique salons merged and deduplicated by salon ID.
             Vertical responsive grid (NOT a horizontal carousel).
          ============================================================ */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">Featured Salons</h3>
                  {isLive ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      ● Live SQLite DB ({featuredSalons.length} salons)
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                      Offline Preview (Sample Data)
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isLive
                    ? "Live data from StyleSync REST API and configured test database."
                    : "Displaying sample fallback data while backend connects."}
                </p>
              </div>
              <button
                onClick={() => setView("discover")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                See all
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featuredSalons.map((s) => (
                <SalonCard key={s.id} salon={s} variant="grid" onOpen={(id) => setSelectedSalon(id)} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
