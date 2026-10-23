"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SalonCarouselProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  cta?: { label: string; onClick: () => void };
}

export function SalonCarousel({
  title,
  subtitle,
  children,
  className,
  cta,
}: SalonCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section
      aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
      className={cn("w-full overflow-hidden", className)}
    >
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h3
            id={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
            className="text-lg font-bold tracking-tight text-foreground"
          >
            {title}
          </h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {cta && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs font-semibold text-primary hover:bg-secondary"
              onClick={cta.onClick}
            >
              {cta.label}
            </Button>
          )}
          <div className="hidden sm:flex sm:items-center sm:gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/60"
              onClick={() => scrollBy(-360)}
              aria-label="Scroll salons left"
            >
              <ChevronLeft className="h-4 w-4" suppressHydrationWarning />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/60"
              onClick={() => scrollBy(360)}
              aria-label="Scroll salons right"
            >
              <ChevronRight className="h-4 w-4" suppressHydrationWarning />
            </Button>
          </div>
        </div>
      </div>

      {/* Carousel — scrolls INSIDE its own container only */}
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto ss-no-scrollbar pb-1 snap-x snap-mandatory"
        style={{ scrollPaddingLeft: "0.5rem", scrollPaddingRight: "0.5rem" }}
      >
        {children}
      </div>
    </section>
  );
}
