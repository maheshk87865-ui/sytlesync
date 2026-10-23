"use client";

import Image from "next/image";
import {
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  Heart,
  CheckSquare,
  Square,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/salon-store";
import { useSheetBrowserHistory } from "@/lib/use-sheet-history";
import { getSalonById, formatINR, todaySlots } from "@/lib/salon-data";
import { getSalonServiceStats } from "@/lib/salon-services-data";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SalonProfileSheet() {
  const { selectedSalon, setSelectedSalon, savedSalons, toggleSaved, comparedSalons, toggleCompare, setBookingSalon, openServicesCatalog } =
    useAppStore();
  const salon = selectedSalon ? getSalonById(selectedSalon) : undefined;
  const [activeTab, setActiveTab] = useState<"about" | "services" | "staff" | "gallery" | "reviews" | "availability">("about");

  const open = !!salon;
  const isSaved = salon ? savedSalons.includes(salon.id) : false;
  const isCompared = salon ? comparedSalons.includes(salon.id) : false;

  // Sync sheet open/close with browser history so the device back button
  // also closes the salon profile.
  const { goBack } = useSheetBrowserHistory(open, () => setSelectedSalon(null));

  // Helper: render a "Back to [Salon Name]" button for non-About tabs.
  // Clicking it switches back to the About (overview) tab.
  const renderTabBackButton = () => {
    if (!salon || activeTab === "about") return null;
    return (
      <button
        onClick={() => setActiveTab("about")}
        className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:gap-2.5"
        aria-label={`Back to ${salon.name}`}
      >
        <ArrowLeft className="h-4 w-4" suppressHydrationWarning />
        Back to {salon.name}
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && goBack()}>
      <SheetContent
        side="right"
        className="teal-theme w-full overflow-y-auto p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        {/* Back button — top-left, positioned over the cover image */}
        <button
          onClick={goBack}
          className="absolute left-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white"
          aria-label="Close salon profile"
        >
          <ArrowLeft className="h-4 w-4" suppressHydrationWarning />
        </button>
        {salon && (
          <>
            {/* Cover image */}
            <div className="relative h-56 w-full sm:h-72">
              <Image
                src={salon.cover}
                alt={salon.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                suppressHydrationWarning
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {/* Status + verified */}
              <div className="absolute left-4 top-4 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
                    salon.isOpen
                      ? "bg-[#E0F2FE] text-[#0284C7] ring-[#0EA5E9]/30"
                      : "bg-white/80 text-[#64748B] ring-[#64748B]/20"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", salon.isOpen ? "bg-[#0284C7]" : "bg-[#64748B]")} />
                  {salon.isOpen ? "Open now" : "Closed"}
                </span>
                {salon.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/20">
                    <ShieldCheck className="h-3 w-3" suppressHydrationWarning /> Verified
                  </span>
                )}
              </div>
              <SheetHeader className="absolute inset-x-0 bottom-0 p-4 text-white">
                <SheetTitle className="text-2xl font-bold leading-tight">{salon.name}</SheetTitle>
                <SheetDescription className="text-sm text-white/85">{salon.tagline}</SheetDescription>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" suppressHydrationWarning />
                    <span className="font-semibold">{salon.rating.toFixed(1)}</span>
                    <span className="text-white/70">({salon.reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" suppressHydrationWarning /> {salon.distanceKm} km away
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" suppressHydrationWarning /> Until {salon.openUntil}
                  </div>
                </div>
              </SheetHeader>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 border-b border-border/60 p-3">
              <Button
                onClick={() => {
                  setBookingSalon(salon.id);
                  setSelectedSalon(null);
                }}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                size="sm"
              >
                Book now · {formatINR(salon.priceFrom)}+
              </Button>
              <Button
                onClick={() => openServicesCatalog(salon.id)}
                variant="outline"
                size="sm"
                className="flex-1 border-primary/30 text-primary hover:bg-secondary"
              >
                View All Services
              </Button>
              <Button
                onClick={() => toggleSaved(salon.id)}
                variant={isSaved ? "default" : "outline"}
                size="sm"
                className={cn(isSaved && "bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90")}
              >
                <Heart className={cn("h-4 w-4", isSaved && "fill-current")} suppressHydrationWarning />
                <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
              </Button>
              <Button
                onClick={() => toggleCompare(salon.id)}
                variant={isCompared ? "default" : "outline"}
                size="sm"
                className={cn(isCompared && "bg-primary text-primary-foreground")}
              >
                {isCompared ? <CheckSquare className="h-4 w-4" suppressHydrationWarning /> : <Square className="h-4 w-4" suppressHydrationWarning />}
                <span className="hidden sm:inline">Compare</span>
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-border/60 px-2 ss-no-scrollbar">
              {[
                { id: "about", label: "About" },
                { id: "services", label: "Services" },
                { id: "staff", label: "Staff" },
                { id: "availability", label: "Availability" },
                { id: "gallery", label: "Gallery" },
                { id: "reviews", label: "Reviews" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "shrink-0 px-3 py-2.5 text-xs font-semibold transition border-b-2",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === "about" && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-foreground/85">{salon.description}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/60 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Address</div>
                      <div className="mt-1 text-sm font-medium">{salon.address}</div>
                    </div>
                    <div className="rounded-xl border border-border/60 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cancellation</div>
                      <div className="mt-1 text-xs">{salon.cancellationPolicy}</div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Features</div>
                    <div className="flex flex-wrap gap-1.5">
                      {salon.features.map((f) => (
                        <Badge key={f} variant="secondary" className="bg-secondary/60 text-foreground">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "services" && (
                <div>
                  {renderTabBackButton()}
                <div className="grid gap-2">
                  {salon.services.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3"
                    >
                      <div>
                        <div className="text-sm font-semibold">{s.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {s.duration} · {s.category}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{formatINR(s.priceFrom)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() => {
                            setBookingSalon(salon.id);
                            setSelectedSalon(null);
                          }}
                        >
                          Book
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              )}

              {activeTab === "staff" && (
                <div>
                  {renderTabBackButton()}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {salon.staff.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                      <div
                        className="grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: m.avatarColor }}
                        suppressHydrationWarning
                      >
                        {m.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.role}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" suppressHydrationWarning />
                        <span className="font-semibold">{m.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              )}

              {activeTab === "availability" && (
                <div>
                  {renderTabBackButton()}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Today&apos;s slots</div>
                      <div className="text-xs text-muted-foreground">Real-time availability</div>
                    </div>
                    <Button variant="outline" size="sm" className="border-border/60">
                      <Calendar className="mr-1.5 h-3.5 w-3.5" suppressHydrationWarning />
                      Pick another day
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {todaySlots.map((slot) => (
                      <button
                        key={slot.time}
                        disabled={slot.status === "booked"}
                        className={cn(
                          "rounded-xl border p-3 text-center transition",
                          slot.status === "booked"
                            ? "border-border/40 bg-muted text-muted-foreground line-through cursor-not-allowed"
                            : slot.status === "limited"
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100"
                        )}
                      >
                        <div className="text-sm font-semibold">{slot.time}</div>
                        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide">
                          {slot.status === "booked" ? (
                            <span className="inline-flex items-center gap-1">
                              <XCircle className="h-3 w-3" suppressHydrationWarning /> Booked
                            </span>
                          ) : slot.status === "limited" ? (
                            <span className="inline-flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" suppressHydrationWarning /> 1 left
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" suppressHydrationWarning /> Available
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                </div>
              )}

              {activeTab === "gallery" && (
                <div>
                  {renderTabBackButton()}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[salon.cover, ...salon.gallery].map((img, idx) => (
                    <div key={idx} className="relative aspect-square overflow-hidden rounded-xl">
                      <Image
                        src={img}
                        alt={`${salon.name} photo ${idx + 1}`}
                        fill
                        className="object-cover transition hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 33vw"
                        suppressHydrationWarning
                      />
                    </div>
                  ))}
                </div>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-3">
                  {renderTabBackButton()}
                  <div className="flex items-center gap-4 rounded-xl border border-border/60 p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{salon.rating.toFixed(1)}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{salon.reviews} reviews</div>
                    </div>
                    <div className="flex-1">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-3">{star}</span>
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" suppressHydrationWarning />
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${star === 5 ? 70 : star === 4 ? 20 : star === 3 ? 8 : 2}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {[
                    { name: "Aarav P.", days: 3, text: "Quick booking, excellent service. Will return.", rating: 5 },
                    { name: "Iqra M.", days: 7, text: "Sana did a great facial. Skin feels much better.", rating: 5 },
                    { name: "Rohit K.", days: 14, text: "Decent cut, slight wait. Good value overall.", rating: 4 },
                  ].map((r) => (
                    <div key={r.name} className="rounded-xl border border-border/60 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.days}d ago</div>
                      </div>
                      <div className="mt-0.5 flex items-center gap-0.5">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" suppressHydrationWarning />
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-foreground/85">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky bottom CTA */}
            <div className="sticky bottom-0 flex items-center gap-2 border-t border-border/60 bg-background/95 p-3 backdrop-blur">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Next slot · {salon.nextSlot.day}</div>
                <div className="text-sm font-bold text-primary">{salon.nextSlot.time}</div>
              </div>
              <Button
                onClick={() => {
                  setBookingSalon(salon.id);
                  setSelectedSalon(null);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                size="sm"
              >
                Continue booking <ChevronRight className="ml-1 h-3.5 w-3.5" suppressHydrationWarning />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
