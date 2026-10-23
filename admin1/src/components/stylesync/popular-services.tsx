"use client";

import { useRef } from "react";
import {
  Scissors,
  User,
  Sparkles,
  Palette,
  Crown,
  Hand,
  Waves,
  Wind,
  ArrowRight,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { popularServices, formatINR } from "@/lib/salon-data";
import { useAppStore } from "@/lib/salon-store";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, React.ComponentType<{ className?: string; suppressHydrationWarning?: boolean }>> = {
  Scissors,
  User,
  Sparkles,
  Palette,
  Crown,
  Hand,
  Waves,
  Wind,
};

export function PopularServices() {
  const setView = useAppStore((s) => s.setView);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section aria-labelledby="ps-heading" className="w-full overflow-hidden">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 id="ps-heading" className="text-lg font-bold tracking-tight text-foreground">
            Popular services
          </h3>
          <p className="text-sm text-muted-foreground">Most booked services this week.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("discover")}
            className="text-xs font-semibold text-primary hover:underline"
          >
            See all
          </button>
          {/* Desktop scroll arrows */}
          <div className="hidden items-center gap-1 sm:flex">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/60"
              onClick={() => scrollBy(-320)}
              aria-label="Scroll services left"
            >
              <ChevronLeft className="h-4 w-4" suppressHydrationWarning />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/60"
              onClick={() => scrollBy(320)}
              aria-label="Scroll services right"
            >
              <ChevronRight className="h-4 w-4" suppressHydrationWarning />
            </Button>
          </div>
        </div>
      </div>

      {/* Horizontal carousel — scrolls INSIDE its own container only */}
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto ss-no-scrollbar pb-1 snap-x snap-mandatory"
      >
        {popularServices.slice(0, 8).map((s) => {
          const Icon = ICONS[s.icon] ?? Sparkles;
          return (
            <div
              key={s.id}
              className="group relative flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-white p-4 transition hover:border-primary/40 hover:shadow-md ss-card-shadow sm:w-[300px]"
            >
              <div className="flex items-start justify-between">
                {/* Light sky-blue icon circle with dark navy icon */}
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-foreground shadow-sm">
                  <Icon className="h-5 w-5" suppressHydrationWarning />
                </div>
                {/* Salon count badge */}
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {s.salonsAvailable} salons
                </span>
              </div>

              <div className="mt-3 text-base font-semibold leading-tight text-foreground">{s.name}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" suppressHydrationWarning />
                {s.duration}
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">
                {formatINR(s.priceFrom)}
                {s.priceTo ? (
                  <span className="text-xs font-normal text-muted-foreground"> – {formatINR(s.priceTo)} onwards</span>
                ) : (
                  <span className="text-xs font-normal text-muted-foreground"> onwards</span>
                )}
              </div>

              {/* Sky-blue View salons button */}
              <Button
                size="sm"
                className="mt-3 w-full justify-between bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                onClick={() => setView("discover")}
              >
                View salons
                <ArrowRight className="h-3.5 w-3.5" suppressHydrationWarning />
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
