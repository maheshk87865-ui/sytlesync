"use client";

import { Sparkles, Camera, MessageSquare, ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/salon-store";
import { useAiPhotoStore } from "@/lib/ai-photo-store";

const EXAMPLE_PROMPTS = [
  { label: "Professional look", emoji: "💼" },
  { label: "Wedding-ready", emoji: "💍" },
  { label: "Low-maintenance style", emoji: "🌿" },
  { label: "Beard & grooming", emoji: "🧔" },
  { label: "Skin & beauty", emoji: "✨" },
];

const SUGGESTIONS = [
  { tag: "Wedding-ready", services: "Bridal makeup · Hair updo · Manicure", salons: 4 },
  { tag: "Office professional", services: "Haircut · Beard shape · Cleanup", salons: 9 },
  { tag: "Quick refresh", services: "Spa · Facial · Head massage", salons: 7 },
];

export function AiAssistantCard() {
  const setView = useAppStore((s) => s.setView);
  const openPhotoSheet = useAiPhotoStore((s) => s.openPhotoSheet);

  // Open the photo sheet, but first switch to the AI view so the result
  // card has somewhere to render when the user completes the analysis.
  const handleUploadPhoto = () => {
    setView("ai");
    // Defer to next tick so the AiView has mounted
    setTimeout(openPhotoSheet, 50);
  };

  return (
    <section
      aria-label="StyleSync AI assistant"
      className="relative overflow-hidden rounded-[28px] ss-glass"
    >
      {/* Decorative soft champagne + sage glows (very subtle) */}
      <div
        className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#0EA5E9]/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#0284C7]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative grid gap-8 p-6 sm:p-8 md:grid-cols-[1.4fr_1fr] md:items-stretch">
        {/* Left column — pitch + actions */}
        <div className="flex flex-col">
          {/* Badge with champagne AI icon */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-secondary/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Wand2 className="h-3 w-3 ss-champagne" suppressHydrationWarning />
            StyleSync AI · Discovery Assistant
          </div>

          {/* Heading — deep charcoal */}
          <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            Not sure what to book?
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Tell StyleSync what you are looking for and we will surface services
            and salons that fit your preferences, schedule and budget.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {/* PRIMARY CTA — emerald filled */}
            <Button
              onClick={() => setView("ai")}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <MessageSquare className="mr-2 h-4 w-4" suppressHydrationWarning />
              Ask StyleSync AI
            </Button>
            {/* SECONDARY CTA — white with emerald border */}
            <Button
              onClick={handleUploadPhoto}
              size="lg"
              variant="outline"
              className="border-primary/40 bg-white text-primary hover:bg-secondary hover:border-primary/60"
            >
              <Camera className="mr-2 h-4 w-4" suppressHydrationWarning />
              Upload Photo
            </Button>
          </div>

          {/* Example prompts */}
          <div className="mt-6">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Try an example
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setView("ai")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-foreground/80 transition hover:border-primary/40 hover:bg-secondary hover:text-primary"
                >
                  <span aria-hidden="true">{p.emoji}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* CTA at bottom */}
          <button
            onClick={() => setView("ai")}
            className="mt-6 inline-flex w-fit items-center gap-1 text-xs font-semibold text-primary hover:gap-2 transition-all"
          >
            Open AI Assistant <ArrowRight className="h-3 w-3" suppressHydrationWarning />
          </button>
        </div>

        {/* Right column — AI suggestion sub-cards (white/ivory) */}
        <div className="flex flex-col rounded-2xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 ss-champagne" suppressHydrationWarning />
            AI Suggestions
          </div>

          <div className="mt-3 grid flex-1 gap-2.5">
            {SUGGESTIONS.map((row) => (
              <div
                key={row.tag}
                className="ss-glass-suggestion group flex items-center justify-between gap-3 rounded-xl p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {/* Small emerald accent dot */}
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <div className="text-sm font-semibold text-foreground">{row.tag}</div>
                  </div>
                  <div className="mt-1 truncate text-[11px] text-muted-foreground">
                    {row.services}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {/* Champagne tinted salon count badge */}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {row.salons} salons
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" suppressHydrationWarning />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setView("ai")}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:gap-2 transition-all"
          >
            See all suggestions <ArrowRight className="h-3 w-3" suppressHydrationWarning />
          </button>
        </div>
      </div>
    </section>
  );
}
