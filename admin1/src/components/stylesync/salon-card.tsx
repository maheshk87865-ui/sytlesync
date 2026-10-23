"use client";

import Image from "next/image";
import {
  Star,
  MapPin,
  Clock,
  Heart,
  CheckSquare,
  Square,
  ShieldCheck,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Salon, formatINR } from "@/lib/salon-data";
import { useAppStore } from "@/lib/salon-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SalonCardProps {
  salon: Salon;
  variant?: "carousel" | "grid";
  onOpen?: (id: string) => void;
}

export function SalonCard({ salon, variant = "grid", onOpen }: SalonCardProps) {
  const { savedSalons, toggleSaved, comparedSalons, toggleCompare, setSelectedSalon, setBookingSalon, openServicesCatalog } =
    useAppStore();
  const isSaved = savedSalons.includes(salon.id) || (Boolean(salon.slug) && savedSalons.includes(salon.slug!));
  const isCompared = comparedSalons.includes(salon.id) || (Boolean(salon.slug) && comparedSalons.includes(salon.slug!));
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleBook = () => {
    setBookingSalon(salon.id);
  };
  const handleOpen = () => {
    setSelectedSalon(salon.id);
    onOpen?.(salon.id);
  };

  const coverUrl = salon.cover || (salon as any).coverImage || "/salons/salon-29.jpg";
  const reviewCount = salon.reviews ?? (salon as any).reviewCount ?? 0;
  const popServices = salon.popularServices || [];
  const nextSlot = salon.nextSlot || { day: "Today", time: salon.openUntil || "Open" };

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300",
        "hover:border-primary/40 hover:-translate-y-0.5 hover:ss-card-shadow-hover",
        variant === "carousel" ? "w-[18rem] sm:w-[20rem] shrink-0" : "w-full"
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
        <Image
          src={coverUrl}
          alt={`${salon.name} — ${salon.tagline}`}
          fill
          sizes="(max-width: 640px) 80vw, (max-width: 1024px) 33vw, 25vw"
          className={cn(
            "object-cover transition-all duration-500 group-hover:scale-105",
            !imgLoaded && "opacity-0"
          )}
          onLoad={() => setImgLoaded(true)}
          suppressHydrationWarning
        />
        {/* Status pill — soft emerald bg for OPEN, soft gray for CLOSED */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ring-1",
              salon.isOpen
                ? "bg-[#E0F2FE] text-[#0284C7] ring-[#0EA5E9]/30"
                : "bg-white/80 text-[#64748B] ring-[#64748B]/20"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                salon.isOpen ? "bg-[#0284C7]" : "bg-[#64748B]"
              )}
            />
            {salon.isOpen ? "OPEN" : "CLOSED"}
          </span>
          {salon.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm ring-1 ring-primary/20">
              <ShieldCheck className="h-3 w-3" suppressHydrationWarning />
              Verified
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSaved(salon.id);
          }}
          aria-label={isSaved ? "Unsave salon" : "Save salon"}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-sm transition hover:bg-white"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition",
              isSaved ? "fill-[#0EA5E9] text-[#0EA5E9]" : "text-foreground/70"
            )} suppressHydrationWarning
          />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <button onClick={handleOpen} className="text-left">
            <h3 className="text-base font-bold leading-tight tracking-tight text-foreground hover:text-primary">
              {salon.name}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{salon.tagline}</p>
          </button>
        </div>

        {/* Rating (champagne star + charcoal) + distance (muted gray) + price (charcoal) */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 ss-champagne fill-[#0EA5E9]" suppressHydrationWarning />
            <span className="font-bold text-foreground">{(salon.rating || 0).toFixed(1)}</span>
            <span className="text-muted-foreground">({reviewCount} reviews)</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" suppressHydrationWarning />
            {salon.distanceKm} km
          </div>
          <div className="font-semibold text-foreground">
            {formatINR(salon.priceFrom)} <span className="text-xs font-normal text-muted-foreground">onwards</span>
          </div>
        </div>

        {/* Availability */}
        <div className="mt-3 rounded-xl border border-border/50 bg-card/40 p-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" suppressHydrationWarning /> Open until {salon.openUntil}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" suppressHydrationWarning /> Next available
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {popServices.map((svc) => (
                <span
                  key={svc}
                  className="rounded-full border border-border/60 bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs font-semibold text-primary">
            {nextSlot.day} · {nextSlot.time}
          </div>
        </div>

        {/* Actions — two rows for clarity */}
        {/* Row 1: View Profile + View Services */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            onClick={handleOpen}
            variant="outline"
            size="sm"
            className="flex-1 justify-center border-border text-foreground hover:bg-secondary"
          >
            View Profile
          </Button>
          <Button
            onClick={() => openServicesCatalog(salon.id)}
            variant="outline"
            size="sm"
            className="flex-1 justify-center border-primary/30 text-primary hover:bg-secondary"
          >
            View Services
          </Button>
        </div>
        {/* Row 2: Book Now + Compare */}
        <div className="mt-2 flex items-center gap-2">
          <Button
            onClick={handleBook}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            size="sm"
          >
            Book now
          </Button>
          <Button
            onClick={() => toggleCompare(salon.id)}
            variant={isCompared ? "default" : "outline"}
            size="sm"
            className={cn(
              "px-2.5",
              isCompared && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            aria-label="Toggle compare"
          >
            {isCompared ? (
              <CheckSquare className="h-4 w-4" suppressHydrationWarning />
            ) : (
              <Square className="h-4 w-4" suppressHydrationWarning />
            )}
            <span className="hidden sm:inline">Compare</span>
          </Button>
        </div>
      </div>
    </article>
  );
}
