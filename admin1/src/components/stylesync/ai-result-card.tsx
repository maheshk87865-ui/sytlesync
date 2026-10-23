"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useAiPhotoStore, type AiRecommendation } from "@/lib/ai-photo-store";
import { salons, type Salon } from "@/lib/salon-data";
import { getSalonServices, formatPrice } from "@/lib/salon-services-data";
import { matchSalonsForLook, type SalonSortOption, type MatchedSalonResult, classifyServiceComplexity } from "@/lib/services/salon-matching";
import { SalonCard } from "./salon-card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, RefreshCw, AlertCircle, Clock, Gauge, ChevronRight,
  Wand2, Camera, Heart, Star, Users, ArrowRight, Check, Eye, ShieldCheck, MapPin, Zap, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/salon-store";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";


export function findSalonsForRecommendation(rec: AiRecommendation) {
  const want = rec.serviceType.toLowerCase().trim();
  const wantCat = rec.category.toLowerCase().trim();
  const wantFirst = want.split(" ")[0];
  const matches = new Map<string, { salon: Salon; matchedService: string; priceFrom: number; duration: string }>();

  for (const salon of salons) {
    const allServices = getSalonServices(salon.id);
    let best: { name: string; priceFrom: number; durationLabel: string } | null = null;
    let bestScore = 0;
    for (const svc of allServices) {
      const name = svc.name.toLowerCase();
      let score = 0;
      if (name === want) score = 100;
      else if (name.includes(want) || want.includes(name)) score = 70;
      else if (wantFirst && (name.includes(wantFirst) || wantFirst.includes(name.split(" ")[0]))) score = 50;
      else if (svc.category.toLowerCase() === wantCat) score = 25;
      if (score > bestScore) { bestScore = score; best = { name: svc.name, priceFrom: svc.priceFrom, durationLabel: svc.durationLabel }; }
    }
    if (!best || bestScore < 25) {
      for (const svc of salon.services) {
        const name = svc.name.toLowerCase();
        let score = 0;
        if (name === want) score = 100;
        else if (name.includes(want) || want.includes(name)) score = 70;
        else if (wantFirst && (name.includes(wantFirst) || wantFirst.includes(name.split(" ")[0]))) score = 50;
        else if (svc.category.toLowerCase() === wantCat) score = 25;
        if (score > bestScore) { bestScore = score; best = { name: svc.name, priceFrom: svc.priceFrom, durationLabel: svc.duration }; }
      }
    }
    if (best && bestScore >= 25) {
      const existing = matches.get(salon.id);
      if (!existing || best.priceFrom < existing.priceFrom) {
        matches.set(salon.id, { salon, matchedService: best.name, priceFrom: best.priceFrom, duration: best.durationLabel });
      }
    }
  }
  return { salons: Array.from(matches.values()).sort((a, b) => b.salon.rating - a.salon.rating) };
}

function MaintenanceBadge({ level }: { level: "Low" | "Medium" | "High" }) {
  const colors: Record<string, string> = {
    Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    High: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", colors[level])}>
      <Gauge className="h-3 w-3" suppressHydrationWarning />{level} maintenance
    </span>
  );
}

function TryOnImage({ idx, rec }: { idx: number; rec: AiRecommendation }) {
  const { capturedImage } = useAiPhotoStore();
  const hasTriggeredRef = useRef(false);

  const triggerGeneration = () => {
    if (!capturedImage) return;
    const store = useAiPhotoStore.getState();
    store.setRecommendationPreviewLoading(idx, true);

    fetch("/api/style-tryon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: capturedImage.base64,
        styleDescription: rec.styleDescription || rec.style,
        serviceType: rec.serviceType,
      }),
    })
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (data.imageUrl) {
          useAiPhotoStore.getState().updateRecommendationPreview(
            idx,
            data.imageUrl,
            data.source || "ai-generated",
            data.label || `AI Visualization — ${rec.style}`
          );
        } else {
          useAiPhotoStore.getState().setRecommendationPreviewError(
            idx,
            data?.error || data?.errorMessage || "Image generation service not configured or unavailable."
          );
        }
      })
      .catch(err => {
        useAiPhotoStore.getState().setRecommendationPreviewError(
          idx,
          err?.message || "Network error. Please check your connection."
        );
      });
  };

  // Auto-trigger try-on when the recommendation first appears.
  // Stagger slightly (1s between cards) so requests don't collide.
  useEffect(() => {
    const store = useAiPhotoStore.getState();
    const recs = store.recommendations;
    if (!recs || !recs[idx]) return;
    const current = recs[idx];
    if (current.visualPreview || current.visualPreviewError || current.visualPreviewLoading) return;
    if (!capturedImage) return;
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const delay = idx * 1000;
    const timer = setTimeout(() => {
      const s = useAiPhotoStore.getState();
      const rs = s.recommendations;
      if (!rs || !rs[idx]) return;
      const r = rs[idx];
      if (r.visualPreview || r.visualPreviewError || r.visualPreviewLoading) return;
      triggerGeneration();
    }, delay);

    return () => clearTimeout(timer);
  }, [idx, capturedImage]);

  // Loading state — shows user's photo with animated face-preservation overlay
  if (rec.visualPreviewLoading) {
    return (
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
        {capturedImage && (
          <img src={capturedImage.url} alt="Face reference" className="h-full w-full object-cover opacity-40 blur-[1px]" />
        )}
        <div className="absolute inset-0 grid place-items-center bg-slate-950/70 p-3 text-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-400" suppressHydrationWarning />
            <span className="text-xs font-semibold text-white">Generating {rec.style}…</span>
            <span className="text-[10px] text-slate-400">Preserving face & identity</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state — shows original photo with clear error message and retry button
  if (rec.visualPreviewError) {
    return (
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
        {capturedImage && (
          <img src={capturedImage.url} alt="Original photo" className="h-full w-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-3 text-center">
          <AlertCircle className="h-5 w-5 text-amber-400" suppressHydrationWarning />
          <p className="mt-1 line-clamp-2 text-[10px] font-medium text-slate-200">{rec.visualPreviewError}</p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-2 h-7 px-3 text-[11px] font-semibold bg-white text-slate-900 hover:bg-slate-200 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              triggerGeneration();
            }}
          >
            <RefreshCw className="mr-1.5 h-3 w-3" suppressHydrationWarning />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Success — show the real AI transformed photo
  if (rec.visualPreview) {
    const label = rec.visualPreviewLabel || `AI Generated — ${rec.style}`;
    return (
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-slate-800/80 shadow-lg group">
        <img src={rec.visualPreview} alt={`${rec.style} preview`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerGeneration();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-200 hover:text-white hover:bg-blue-600 transition shadow-md"
          title="Regenerate hairstyle preview"
        >
          <RefreshCw className="h-3.5 w-3.5" suppressHydrationWarning />
        </button>
        <div className="absolute bottom-1.5 left-1.5 right-1.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800/80 px-2.5 py-1 text-[10px] font-medium text-slate-200 shadow-md">
          {label}
        </div>
      </div>
    );
  }

  // Fallback / Initial idle state before generation triggers
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
      {capturedImage && (
        <img src={capturedImage.url} alt="Original photo" className="h-full w-full object-cover opacity-60" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 p-3 text-center">
        <Sparkles className="h-5 w-5 text-blue-400" suppressHydrationWarning />
        <p className="mt-1 text-[11px] font-medium text-white">Preview ready to generate</p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-2 h-7 px-3 text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            triggerGeneration();
          }}
        >
          <Wand2 className="mr-1.5 h-3 w-3 text-white" suppressHydrationWarning />
          Generate Preview
        </Button>
      </div>
    </div>
  );
}

function RecommendationCard({ rec, idx }: { rec: AiRecommendation; idx: number }) {
  const { activeRecommendationIdx, setActiveRecommendation, selectedLookIdx, selectLook, toggleSaveLook, savedLooks, capturedImage, resetAnalysis, openPhotoSheet } = useAiPhotoStore();
  const { setSelectedSalon, setBookingSalon, setBookingPreselect, openServicesCatalog, setSelectedLook } = useAppStore();
  const active = activeRecommendationIdx === idx;
  const isSelected = selectedLookIdx === idx;
  const isSaved = savedLooks.some(r => r.style === rec.style && r.serviceType === rec.serviceType);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SalonSortOption>("best-match");

  const lookData = useMemo(() => ({
    style: rec.style,
    category: rec.category,
    serviceType: rec.serviceType,
    serviceName: rec.serviceName || rec.serviceType,
    reason: rec.reason,
    visualPreview: rec.visualPreview,
    visualPreviewSource: rec.visualPreviewSource,
    maintenance: rec.maintenance,
    duration: rec.duration,
  }), [rec]);

  const matched = useMemo(() => matchSalonsForLook(lookData, { sortBy }), [lookData, sortBy]);
  const complexity = useMemo(() => classifyServiceComplexity(rec.style + " " + rec.serviceType), [rec]);

  const handleSelectLook = () => {
    selectLook(idx);
    setSelectedLook(lookData);
    setActiveRecommendation(idx);
  };

  const handleBook = (res: MatchedSalonResult) => {
    setSelectedLook(lookData);
    setBookingPreselect(res.matchedService.id, res.recommendedStaff?.id || null);
    setBookingSalon(res.salon.id);
  };

  return (
    <div className={cn("rounded-2xl border bg-slate-900/90 p-5 transition-all duration-300 shadow-xl backdrop-blur-md", active ? "border-blue-500/60 ring-2 ring-blue-500/20" : "border-slate-800 hover:border-slate-700")}>
      {/* BEFORE / AFTER header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" suppressHydrationWarning />
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">{rec.category}</span>
        </div>
        <span className={cn(
          "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
          complexity === "COMPLEX" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
          complexity === "MEDIUM" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        )}>
          {complexity === "COMPLEX" ? "Complex Treatment" : complexity === "MEDIUM" ? "Styling & Cut" : "Simple Cut"}
        </span>
      </div>

      <h4 className="text-xl font-bold tracking-tight text-white">{rec.style}</h4>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">{rec.reason}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
        <MaintenanceBadge level={rec.maintenance} />
        {rec.duration && (
          <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
            <Clock className="h-3 w-3 text-slate-400" suppressHydrationWarning />{rec.duration}
          </span>
        )}
        <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-blue-400 font-semibold text-[10px]">
          AI Match: {Math.round(rec.confidence * 100)}%
        </span>
      </div>

      {/* BEFORE → AFTER visual comparison */}
      <div className="mt-4 flex items-center gap-3">
        {/* BEFORE — customer's original photo */}
        <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-800 shadow-md">
          {capturedImage ? (
            <img src={capturedImage.url} alt="Your current look" className="aspect-[3/4] w-full object-cover" />
          ) : (
            <div className="aspect-[3/4] w-full bg-slate-900" />
          )}
          <div className="absolute bottom-1.5 left-1.5 rounded bg-slate-950/80 backdrop-blur-sm border border-slate-800/80 px-2 py-0.5 text-[9px] font-bold tracking-wider text-slate-300 uppercase">
            BEFORE
          </div>
        </div>

        {/* Arrow Divider */}
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-800 border border-slate-700 shadow-sm text-blue-400">
          <ArrowRight className="h-4 w-4" suppressHydrationWarning />
        </div>

        {/* AFTER — AI-transformed photo */}
        <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-800 shadow-md">
          <TryOnImage idx={idx} rec={rec} />
          <div className="absolute bottom-1.5 left-1.5 rounded bg-blue-950/80 backdrop-blur-sm border border-blue-500/40 px-2 py-0.5 text-[9px] font-bold tracking-wider text-blue-300 uppercase">
            AFTER
          </div>
        </div>
      </div>

      {/* Service mapping */}
      <div className="mt-3.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs flex items-center justify-between">
        <div>
          <span className="text-slate-400">Service: </span>
          <span className="font-semibold text-white">{rec.serviceName || rec.serviceType}</span>
        </div>
        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-emerald-400 font-medium text-[11px]">
          {matched.length} verified in Srinagar
        </span>
      </div>

      {/* Action buttons */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          className={cn(
            "flex-1 font-semibold text-xs",
            isSelected
              ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30"
              : "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/25 border-0"
          )}
          onClick={handleSelectLook}
        >
          {isSelected ? (<><Check className="mr-1.5 h-3.5 w-3.5" suppressHydrationWarning />Selected</>) : "Select Look"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs"
          onClick={() => { setActiveRecommendation(idx); setSelectedLook(lookData); }}
        >
          Salons ({matched.length})
          <ChevronRight className="ml-1 h-3.5 w-3.5" suppressHydrationWarning />
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="mr-1 h-3.5 w-3.5 text-blue-400" suppressHydrationWarning />Preview
        </Button>

        <button
          onClick={() => toggleSaveLook(rec)}
          className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition"
          aria-label="Save look"
        >
          <Heart className={cn("h-4 w-4", isSaved && "fill-rose-500 text-rose-500")} suppressHydrationWarning />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            const store = useAiPhotoStore.getState();
            const recs = store.recommendations;
            if (recs) {
              const updated = recs.filter((_, i) => i !== idx);
              useAiPhotoStore.setState({ recommendations: updated });
            }
          }}
          className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition"
          title="Delete this result"
          aria-label="Delete result"
        >
          <Trash2 className="h-4 w-4" suppressHydrationWarning />
        </button>
      </div>

      {/* Matching salons */}
      {active && matched.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {matched.length} Verified Salon{matched.length > 1 ? "s" : ""} Matching {rec.serviceType}
            </div>
            {/* Sorting controls */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              {(["best-match", "nearest", "lowest-price", "highest-rated", "earliest-availability"] as SalonSortOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSortBy(opt)}
                  className={cn(
                    "rounded-md px-2 py-0.5 font-medium transition",
                    sortBy === opt
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                  )}
                >
                  {opt === "best-match" ? "Best Match" :
                   opt === "nearest" ? "Nearest" :
                   opt === "lowest-price" ? "Lowest Price" :
                   opt === "highest-rated" ? "Top Rated" : "Earliest"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {matched.map((res) => (
              <div key={res.salon.id} className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 shadow-md transition hover:border-blue-500/40">
                <div>
                  <div className="flex items-start gap-3">
                    <img src={res.salon.cover} alt={res.salon.name} className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-800" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white truncate">{res.salon.name}</span>
                        {res.verified && (
                          <span title="Verified Partner">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-blue-400 truncate">{res.matchedService.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span className="inline-flex items-center gap-0.5 text-amber-400 font-semibold">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" suppressHydrationWarning />
                          {res.salon.rating.toFixed(1)} <span className="text-slate-400 font-normal">({res.salon.reviews})</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-slate-400">
                          <MapPin className="h-2.5 w-2.5 text-slate-500" />
                          {res.locality} ({res.distanceKm} km)
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-white">₹{res.matchedService.priceFrom}</div>
                      <div className="text-[10px] text-slate-400">{res.matchedService.duration}</div>
                    </div>
                  </div>

                  {/* Evidence explanation */}
                  <div className="mt-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 p-2 text-[11px] leading-snug text-slate-300">
                    <span className="font-semibold text-blue-400">Match Reason: </span>
                    {res.matchReason}
                  </div>

                  {/* Recommended staff & next slot */}
                  <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                    {res.recommendedStaff ? (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-200">
                        <Users className="h-3 w-3 text-blue-400" /> {res.recommendedStaff.name} ({res.recommendedStaff.role})
                      </span>
                    ) : (
                      <span>Experienced Stylist</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                      <Zap className="h-3 w-3 text-emerald-400" /> Slot: {res.nextSlotTime}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  <Button size="sm" className="flex-1 bg-blue-600 text-white hover:bg-blue-500 font-medium text-xs shadow-md" onClick={() => handleBook(res)}>
                    Book This Look
                  </Button>
                  <Button size="sm" variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs" onClick={() => setSelectedSalon(res.salon.id)}>
                    Profile
                  </Button>
                  <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs" onClick={() => openServicesCatalog(res.salon.id)}>
                    Services
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active && matched.length === 0 && (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-center">
          <AlertCircle className="h-6 w-6 text-slate-400" suppressHydrationWarning />
          <p className="mt-1.5 text-sm font-semibold text-slate-200">No salons found</p>
          <p className="mt-0.5 text-xs text-slate-400">Try another recommendation or adjust your filters.</p>
        </div>
      )}

      {/* Full preview sheet — BEFORE/AFTER comparison */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-2xl overflow-y-auto p-0 sm:rounded-t-3xl border-slate-800 bg-slate-900 text-white">
          <SheetHeader className="border-b border-slate-800 bg-slate-950/60 p-4">
            <SheetTitle className="flex items-center gap-2 text-lg text-white">
              <Sparkles className="h-5 w-5 text-blue-400" suppressHydrationWarning />
              {rec.style}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-400">{rec.category} · AI Visualization — Actual results may vary.</SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {/* BEFORE */}
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Before</div>
                <div className="relative overflow-hidden rounded-xl border border-slate-800">
                  {capturedImage && (
                    <img src={capturedImage.url} alt="Original" className="aspect-[3/4] w-full object-cover" />
                  )}
                </div>
              </div>
              {/* AFTER */}
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">After</div>
                <div className="relative overflow-hidden rounded-xl border border-slate-800">
                  <TryOnImage idx={idx} rec={rec} />
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">{rec.reason}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <MaintenanceBadge level={rec.maintenance} />
              {rec.duration && <span className="inline-flex items-center gap-1 text-slate-400"><Clock className="h-3 w-3" suppressHydrationWarning />{rec.duration}</span>}
            </div>
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs">
              <span className="text-slate-400">Service: </span>
              <span className="font-semibold text-blue-400">{rec.serviceName || rec.serviceType}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-500" onClick={() => { handleSelectLook(); setPreviewOpen(false); }}>
                <Check className="mr-1 h-3.5 w-3.5" suppressHydrationWarning />Select This Look
              </Button>
              <Button size="sm" variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white" onClick={() => { resetAnalysis(); openPhotoSheet(); setPreviewOpen(false); }}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" suppressHydrationWarning />Try Another Look
              </Button>
              <Button size="sm" variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white" onClick={() => { resetAnalysis(); openPhotoSheet(); setPreviewOpen(false); }}>
                <Camera className="mr-1 h-3.5 w-3.5" suppressHydrationWarning />Change Photo
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function AiResultCard() {
  const { recommendations, analysisError, capturedImage, resetAnalysis, openPhotoSheet } = useAiPhotoStore();

  if (analysisError) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400" suppressHydrationWarning />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-200">AI Analysis Notice</h4>
            <p className="mt-1 text-xs text-amber-300/90">{analysisError}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-500" onClick={() => {
                if (capturedImage) {
                  useAiPhotoStore.getState().startAnalysis();
                  const text = (document.querySelector("[data-ai-text-input]") as HTMLInputElement | null)?.value;
                  fetch("/api/style-analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: capturedImage.base64, text }) })
                    .then(r => r.json()).then(data => {
                      const id = useAiPhotoStore.getState().analyzeRequestId || "";
                      if (data?.recommendations) useAiPhotoStore.getState().setAnalysisResult(id, data.recommendations);
                      else useAiPhotoStore.getState().setAnalysisError(id, data?.error || "Retry failed.");
                    }).catch(err => useAiPhotoStore.getState().setAnalysisError(useAiPhotoStore.getState().analyzeRequestId || "", err?.message || "Network error."));
                } else { resetAnalysis(); openPhotoSheet(); }
              }}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" suppressHydrationWarning />Retry
              </Button>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => { resetAnalysis(); openPhotoSheet(); }}>Change Photo</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Studio Header & Profile Bar */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {capturedImage && (
              <div className="relative shrink-0">
                <img
                  src={capturedImage.url}
                  alt="Your Reference"
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-xl"
                />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-900" title="Active Facial Analysis">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400 border border-blue-500/20">
                <Sparkles className="h-3 w-3" /> AI Style Studio · Srinagar
              </div>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-white">Your Tailored Hairstyle Matches</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Curated for your facial structure & hair texture · Linked with verified partner salons in Srinagar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
              onClick={() => { resetAnalysis(); openPhotoSheet(); }}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5 text-blue-400" />
              Retake / Change Photo
            </Button>
          </div>
        </div>
      </div>

      {/* Mandatory Salon Disclaimer Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-200 backdrop-blur-md shadow-lg">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" suppressHydrationWarning />
        <div className="leading-relaxed">
          <span className="font-semibold uppercase tracking-wider text-blue-300 mr-1.5">Salon Disclaimer:</span>
          AI hairstyle preview — actual salon results may vary. Facial appearance is intended to remain consistent, but generated previews may contain visual differences.
        </div>
      </div>

      {/* Recommendation gallery */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {recommendations.map((rec, idx) => (
          <RecommendationCard key={`${rec.style}-${idx}`} rec={rec} idx={idx} />
        ))}
      </div>

      {/* Mandatory Bottom Disclaimer Notice */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2.5 text-center text-[11px] text-slate-400">
        AI hairstyle preview — actual salon results may vary. Facial appearance is intended to remain consistent, but generated previews may contain visual differences.
      </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <Button size="sm" variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white" onClick={() => { resetAnalysis(); openPhotoSheet(); }}>
          <Camera className="mr-1.5 h-3.5 w-3.5 text-blue-400" suppressHydrationWarning />Change Photo
        </Button>
        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => useAppStore.getState().setView("discover")}>
          Browse all salons <ArrowRight className="ml-1 h-3.5 w-3.5 text-blue-400" suppressHydrationWarning />
        </Button>
      </div>
    </div>
  );
}
