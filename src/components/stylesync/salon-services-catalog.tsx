"use client";

import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Clock, Star, Users, ChevronRight, X, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { useAppStore } from "@/lib/salon-store";
import { useSheetBrowserHistory } from "@/lib/use-sheet-history";
import { getSalonById, formatINR, type SalonCategory } from "@/lib/salon-data";
import { getSalonServices, getSalonCategories, getSalonServiceStats, getStaffForService, formatPrice, type SalonServiceFull } from "@/lib/salon-services-data";
import { cn } from "@/lib/utils";

type SortKey = "popular" | "price-low" | "price-high" | "rating" | "duration";

export function SalonServicesCatalogSheet() {
  const { servicesCatalogSalonId, closeServicesCatalog, openServiceDetail, setBookingSalon } = useAppStore();
  const salonId = servicesCatalogSalonId;
  const salon = salonId ? getSalonById(salonId) : undefined;
  const services = salonId ? getSalonServices(salonId) : [];
  const categories = salonId ? getSalonCategories(salonId) : [];
  const stats = salonId ? getSalonServiceStats(salonId) : null;
  const { goBack } = useSheetBrowserHistory(!!salonId, closeServicesCatalog);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<SalonCategory | "ALL">("ALL");
  const [priceFilter, setPriceFilter] = useState<"all" | "u300" | "300-500" | "500-1000" | "1000+">("all");
  const [durationFilter, setDurationFilter] = useState<"all" | "u30" | "30-60" | "60+">("all");
  const [ratingFilter, setRatingFilter] = useState<"all" | "4.5+" | "4.0+">("all");
  const [sort, setSort] = useState<SortKey>("popular");
  const [lastSalonId, setLastSalonId] = useState<string | null>(salonId);
  if (salonId !== lastSalonId) {
    setLastSalonId(salonId); setSearch(""); setActiveCategory("ALL");
    setPriceFilter("all"); setDurationFilter("all"); setRatingFilter("all"); setSort("popular");
  }

  const filtered = useMemo(() => {
    let list = services.slice();
    if (activeCategory !== "ALL") list = list.filter((s) => s.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
    }
    if (priceFilter !== "all") {
      list = list.filter((s) => {
        const p = s.priceFrom;
        if (priceFilter === "u300") return p < 300;
        if (priceFilter === "300-500") return p >= 300 && p <= 500;
        if (priceFilter === "500-1000") return p > 500 && p <= 1000;
        if (priceFilter === "1000+") return p > 1000;
        return true;
      });
    }
    if (durationFilter !== "all") {
      list = list.filter((s) => {
        const d = s.durationMin;
        if (durationFilter === "u30") return d < 30;
        if (durationFilter === "30-60") return d >= 30 && d <= 60;
        if (durationFilter === "60+") return d > 60;
        return true;
      });
    }
    if (ratingFilter !== "all") {
      const min = ratingFilter === "4.5+" ? 4.5 : 4.0;
      list = list.filter((s) => s.rating >= min);
    }
    switch (sort) {
      case "price-low": list.sort((a, b) => a.priceFrom - b.priceFrom); break;
      case "price-high": list.sort((a, b) => b.priceFrom - a.priceFrom); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      case "duration": list.sort((a, b) => a.durationMin - b.durationMin); break;
      default: list.sort((a, b) => Number(b.popular ?? false) - Number(a.popular ?? false) || b.reviews - a.reviews); break;
    }
    return list;
  }, [services, activeCategory, search, priceFilter, durationFilter, ratingFilter, sort]);

  const open = !!salonId && !!salon;

  const handleBook = (svc: SalonServiceFull) => {
    if (!salonId) return;
    useAppStore.getState().setBookingPreselect(svc.id, null);
    setBookingSalon(salonId);
    closeServicesCatalog();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent side="right" className="teal-theme w-full overflow-y-auto p-0 sm:max-w-2xl lg:max-w-3xl">
        {salon && (
          <button onClick={goBack} className="sticky top-0 z-30 flex items-center gap-1.5 border-b border-border bg-white/95 px-4 py-2.5 text-sm font-semibold text-primary backdrop-blur-sm transition hover:bg-secondary" aria-label={`Back to ${salon.name}`}>
            <ArrowLeft className="h-4 w-4" suppressHydrationWarning /> Back to {salon.name}
          </button>
        )}
        {salon && stats && (
          <>
            <SheetHeader className="border-b border-border bg-secondary/40 p-4">
              <SheetTitle className="flex items-center gap-2 text-lg">Services at {salon.name}</SheetTitle>
              <SheetDescription className="text-xs">Explore services, prices, duration and available professionals.</SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white px-2 py-0.5 font-semibold text-primary">{stats.serviceCount} services</span>
                {categories.map((c) => (<span key={c} className="inline-flex items-center rounded-full border border-border bg-white px-2 py-0.5 font-medium text-foreground/70">{c}</span>))}
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white px-2 py-0.5 font-semibold text-primary"><Users className="h-3 w-3" suppressHydrationWarning />{stats.staffCount} professionals</span>
              </div>
            </SheetHeader>
            <div className="border-b border-border bg-white p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" suppressHydrationWarning />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services…" className="h-10 rounded-full border-border bg-secondary/40 pl-9 pr-9 text-sm" />
                {search && (<button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary" aria-label="Clear search"><X className="h-3.5 w-3.5" suppressHydrationWarning /></button>)}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button onClick={() => setActiveCategory("ALL")} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", activeCategory === "ALL" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground/80 hover:border-primary/40 hover:bg-secondary")}>All</button>
                {categories.map((c) => (<button key={c} onClick={() => setActiveCategory(c)} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", activeCategory === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground/80 hover:border-primary/40 hover:bg-secondary")}>{c}</button>))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(["u300","300-500","500-1000","1000+"] as const).map((f) => (<button key={f} onClick={() => setPriceFilter(priceFilter === f ? "all" : f)} className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition", priceFilter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground/70 hover:border-primary/40 hover:bg-secondary")}>{f === "u300" ? "Under ₹300" : f === "300-500" ? "₹300–500" : f === "500-1000" ? "₹500–1000" : "₹1000+"}</button>))}
                <span className="mx-1 h-4 w-px bg-border" />
                {(["u30","30-60","60+"] as const).map((f) => (<button key={f} onClick={() => setDurationFilter(durationFilter === f ? "all" : f)} className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition", durationFilter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground/70 hover:border-primary/40 hover:bg-secondary")}>{f === "u30" ? "< 30 min" : f === "30-60" ? "30–60 min" : "60+ min"}</button>))}
                <span className="mx-1 h-4 w-px bg-border" />
                {(["4.5+","4.0+"] as const).map((f) => (<button key={f} onClick={() => setRatingFilter(ratingFilter === f ? "all" : f)} className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition", ratingFilter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground/70 hover:border-primary/40 hover:bg-secondary")}>{f} ★</button>))}
                <div className="ml-auto flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" suppressHydrationWarning />
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-lg border border-border bg-white px-2 py-1 text-xs font-medium outline-none focus:border-primary/40">
                    <option value="popular">Sort: Popular</option>
                    <option value="price-low">Price ↑</option>
                    <option value="price-high">Price ↓</option>
                    <option value="rating">Top rated</option>
                    <option value="duration">Shortest</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{filtered.length} service{filtered.length !== 1 ? "s" : ""} found</div>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-muted-foreground"><Search className="h-7 w-7" suppressHydrationWarning /></div>
                  <h4 className="mt-3 text-base font-semibold">No services found</h4>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">Try adjusting your filters or search.</p>
                  <Button variant="outline" size="sm" className="mt-4 border-primary/30 text-primary hover:bg-secondary" onClick={() => { setSearch(""); setActiveCategory("ALL"); setPriceFilter("all"); setDurationFilter("all"); setRatingFilter("all"); }}>Clear filters</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filtered.map((svc) => {
                    const staffCount = salonId ? getStaffForService(salonId, svc.id).length : 0;
                    return (
                      <article key={svc.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white ss-card-shadow">
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                          <img src={svc.image || salon.cover} alt={svc.name} className="h-full w-full object-cover" />
                          {svc.popular && <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary shadow-sm">Popular</span>}
                          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-foreground/80 shadow-sm">{svc.category}</span>
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <h4 className="text-sm font-bold leading-tight text-foreground">{svc.name}</h4>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{svc.description}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Star className="h-3 w-3 ss-champagne fill-[#0EA5E9]" suppressHydrationWarning />{svc.rating.toFixed(1)}<span className="font-normal text-muted-foreground">({svc.reviews})</span></span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" suppressHydrationWarning />{svc.durationLabel}</span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" suppressHydrationWarning />{staffCount} pro{staffCount !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="mt-2 text-sm font-bold text-foreground">{formatPrice(svc)}</div>
                          <div className="mt-3 flex items-center gap-2">
                            <Button size="sm" variant="outline" className="flex-1 justify-between border-primary/30 text-primary hover:bg-secondary" onClick={() => salonId && openServiceDetail(salonId, svc.id)}>View Details<ChevronRight className="h-3.5 w-3.5" suppressHydrationWarning /></Button>
                            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleBook(svc)}>Book</Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
