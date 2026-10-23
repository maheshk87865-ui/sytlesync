"use client";

import { useState, useEffect } from "react";
import { salons, getSalonById, serviceCategories, type Salon } from "@/lib/salon-data";
import { getSalons } from "@/lib/services/salon";
import { SalonCard } from "../salon-card";
import { useAppStore } from "@/lib/salon-store";
import { Filter, SlidersHorizontal, X, MapPin, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortKey = "distance" | "rating" | "price-low" | "price-high";
type FilterKey = "open-now" | "verified" | "nearby";

export function DiscoverView() {
  const { setView } = useAppStore();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("distance");
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
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
        // Fallback cleanly to sample data
      });

    return () => { active = false; };
  }, []);

  const baseSalons = liveSalons && liveSalons.length > 0 ? liveSalons : salons;

  const toggleFilter = (k: FilterKey) =>
    setActiveFilters((prev) =>
      prev.includes(k) ? prev.filter((f) => f !== k) : [...prev, k]
    );

  const filtered = baseSalons
    .filter((s) => (activeFilters.includes("open-now") ? s.isOpen : true))
    .filter((s) => (activeFilters.includes("verified") ? s.verified : true))
    .filter((s) => (activeFilters.includes("nearby") ? s.distanceKm <= 2 : true))
    .filter((s) => (activeCategory ? s.category === activeCategory : true))
    .filter((s) =>
      query
        ? `${s.name} ${s.tagline} ${(s.popularServices || []).join(" ")} ${(s.tags || []).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase())
        : true
    )
    .sort((a, b) => {
      if (sort === "distance") return a.distanceKm - b.distanceKm;
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price-low") return a.priceFrom - b.priceFrom;
      if (sort === "price-high") return b.priceFrom - a.priceFrom;
      return 0;
    });

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Discover salons & services</h1>
              {isLive ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                  ● Live SQLite DB ({filtered.length} salons)
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                  Offline Preview (Sample Data)
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLive
                ? "Search, filter and compare salons live from the database."
                : "Search and compare salons in Srinagar (fallback preview mode)."}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search salon, service or tag…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              !activeCategory
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 text-foreground/80 hover:border-primary/40"
            )}
          >
            All
          </button>
          {serviceCategories.slice(0, 6).map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(activeCategory === c.name ? null : c.name)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                activeCategory === c.name
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 text-foreground/80 hover:border-primary/40"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Filter + sort row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[
            { id: "open-now" as FilterKey, label: "Open now", icon: Clock },
            { id: "verified" as FilterKey, label: "Verified", icon: Star },
            { id: "nearby" as FilterKey, label: "≤ 2 km", icon: MapPin },
          ].map((f) => {
            const Icon = f.icon;
            const active = activeFilters.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 text-foreground/80 hover:border-primary/40"
                )}
              >
                <Icon className="h-3 w-3" /> {f.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" suppressHydrationWarning />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-border/60 bg-card px-2 py-1 text-xs font-medium outline-none focus:border-primary/40"
            >
              <option value="distance">Sort: nearest</option>
              <option value="rating">Sort: top-rated</option>
              <option value="price-low">Sort: price ↑</option>
              <option value="price-high">Sort: price ↓</option>
            </select>
          </div>
        </div>
      </section>

      {/* Results */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {filtered.length} salon{filtered.length !== 1 ? "s" : ""} found
          </h3>
          <button
            onClick={() => {
              setQuery("");
              setActiveFilters([]);
              setActiveCategory(null);
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No salons found"
            description="We couldn't find salons matching your filters."
            actionLabel="Clear filters"
            onAction={() => {
              setQuery("");
              setActiveFilters([]);
              setActiveCategory(null);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((s) => (
              <SalonCard key={s.id} salon={s} variant="grid" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border/80 bg-secondary/30 px-6 py-12 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-muted-foreground">
        <Filter className="h-7 w-7" suppressHydrationWarning />
      </div>
      <h4 className="mt-3 text-base font-semibold">{title}</h4>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-primary/30 text-primary hover:bg-primary/5"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
