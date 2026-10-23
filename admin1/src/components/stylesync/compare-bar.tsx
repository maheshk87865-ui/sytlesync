"use client";

import { CheckSquare, X, GitCompare, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/salon-store";
import { getSalonById, formatINR, type Salon } from "@/lib/salon-data";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useState } from "react";
import { Star, MapPin, Clock } from "lucide-react";

const MAX_COMPARE = 3;

export function CompareBar() {
  const { comparedSalons, compareOpen, setCompareOpen, toggleCompare, clearCompare, setView } =
    useAppStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (comparedSalons.length === 0 || !compareOpen) return null;

  const compared = comparedSalons.map((id) => getSalonById(id)).filter(Boolean);

  const openCompareSheet = () => {
    setSheetOpen(true);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 lg:bottom-4 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[680px] pointer-events-none">
        <div className="teal-theme mx-auto mb-0 lg:mb-4 lg:rounded-2xl border border-border/70 bg-card shadow-2xl ring-1 ring-primary/10 pointer-events-auto lg:mb-20 pb-[4.5rem] lg:pb-0">
          <div className="flex items-center gap-3 p-3 sm:p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <CheckSquare className="h-5 w-5" suppressHydrationWarning />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-foreground">
                {comparedSalons.length} salon{comparedSalons.length > 1 ? "s" : ""} selected
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {compared.map((s) => s!.name).join(" · ")}
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              {compared.map((s) => (
                <div
                  key={s!.id}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-secondary text-[10px] font-bold text-primary"
                >
                  {s!.name.charAt(0)}
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={clearCompare}
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              onClick={openCompareSheet}
              disabled={comparedSalons.length < 2}
            >
              <GitCompare className="mr-1.5 h-3.5 w-3.5" suppressHydrationWarning />
              Compare now
            </Button>
          </div>
        </div>
      </div>

      {/* Compare Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-3xl"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" suppressHydrationWarning />
              Compare {compared.length} salons
            </SheetTitle>
            <SheetDescription>
              Side-by-side comparison of price, distance, rating, services and policies.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-32 p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Field
                  </th>
                  {compared.map((s) => (
                    <th key={s!.id} className="p-3 text-left align-top">
                      <div className="font-bold text-foreground">{s!.name}</div>
                      <div className="text-xs font-normal text-muted-foreground">{s!.tagline}</div>
                      <button
                        onClick={() => toggleCompare(s!.id)}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="h-3 w-3" suppressHydrationWarning /> Remove
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Rating",
                    render: (s: Salon) => (
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" suppressHydrationWarning />
                        <span className="font-semibold">{s.rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({s.reviews})</span>
                      </div>
                    ),
                  },
                  {
                    label: "Distance",
                    render: (s: Salon) => (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" suppressHydrationWarning />
                        {s.distanceKm} km
                      </div>
                    ),
                  },
                  {
                    label: "Price from",
                    render: (s: Salon) => (
                      <span className="font-semibold text-foreground">{formatINR(s.priceFrom)}</span>
                    ),
                  },
                  {
                    label: "Open until",
                    render: (s: Salon) => (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" suppressHydrationWarning />
                        {s.openUntil}
                      </div>
                    ),
                  },
                  {
                    label: "Next slot",
                    render: (s: Salon) => (
                      <span className="font-semibold text-primary">
                        {s.nextSlot.day}, {s.nextSlot.time}
                      </span>
                    ),
                  },
                  {
                    label: "Popular services",
                    render: (s: Salon) => s.popularServices.join(", "),
                  },
                  {
                    label: "Cancellation",
                    render: (s: Salon) => s.cancellationPolicy,
                  },
                  {
                    label: "Verified",
                    render: (s: Salon) =>
                      s.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not yet</span>
                      ),
                  },
                ].map((row, idx) => (
                  <tr key={row.label} className={idx % 2 === 0 ? "bg-secondary/20" : ""}>
                    <td className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {row.label}
                    </td>
                    {compared.map((s) => (
                      <td key={s!.id} className="p-3 align-top text-foreground">
                        {row.render(s!)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={clearCompare}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" suppressHydrationWarning /> Clear all
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                setSheetOpen(false);
                setView("bookings");
              }}
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
