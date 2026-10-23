"use client";

import {
  Scissors,
  User,
  Sparkles,
  Hand,
  Palette,
  Waves,
  Wind,
  Crown,
  ChevronRight,
} from "lucide-react";
import { serviceCategories } from "@/lib/salon-data";
import { useAppStore } from "@/lib/salon-store";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string; suppressHydrationWarning?: boolean }>> = {
  Scissors,
  User,
  Sparkles,
  Hand,
  Palette,
  Waves,
  Wind,
  Crown,
};

export function ServiceCategories() {
  const setView = useAppStore((s) => s.setView);

  return (
    <section aria-labelledby="cats-heading">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 id="cats-heading" className="text-lg font-bold tracking-tight text-foreground">
            Browse by category
          </h3>
          <p className="text-sm text-muted-foreground">Pick a service to explore nearby salons.</p>
        </div>
        <button
          onClick={() => setView("discover")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:gap-2 transition-all"
        >
          See all <ChevronRight className="h-3.5 w-3.5" suppressHydrationWarning />
        </button>
      </div>

      {/* Mobile horizontal scroll; desktop grid */}
      <div
        className="grid grid-flow-col auto-cols-[6.5rem] gap-3 overflow-x-auto ss-no-scrollbar pb-1 sm:auto-cols-[10rem] sm:grid-flow-row sm:grid-cols-4 sm:overflow-visible lg:grid-cols-8"
        role="list"
      >
        {serviceCategories.map((cat) => {
          const Icon = ICONS[cat.icon] ?? Sparkles;
          return (
            <button
              key={cat.id}
              onClick={() => setView("discover")}
              role="listitem"
              className="group flex flex-col items-center rounded-2xl border border-border bg-white p-3 text-center transition hover:border-primary/40 hover:shadow-md ss-card-shadow sm:items-start sm:text-left"
            >
              {/* Icon container: light sage bg + emerald icon, small champagne accent dot */}
              <div className="relative">
                <div
                  className="grid h-12 w-12 place-items-center rounded-xl bg-secondary transition group-hover:scale-105"
                  aria-hidden="true"
                  suppressHydrationWarning
                >
                  <Icon className="h-6 w-6 text-primary" suppressHydrationWarning />
                </div>
                {/* Small champagne accent dot in top-right */}
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ss-champagne-bg ring-2 ring-white" />
              </div>
              <div className="mt-2.5 w-full">
                <div className="text-sm font-semibold leading-tight text-foreground">{cat.name}</div>
                <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {cat.description}
                </div>
                <div className="mt-1 hidden text-[10px] font-medium uppercase tracking-wide text-primary sm:block">
                  {cat.services} services · {cat.salons} salons
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
