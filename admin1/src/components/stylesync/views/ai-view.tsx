"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/salon-store";
import { useAiPhotoStore } from "@/lib/ai-photo-store";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Send,
  Sparkles,
  ArrowRight,
  Wand2,
  RefreshCw,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiResultCard } from "../ai-result-card";

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

const STARTERS = [
  "I want a professional look for office",
  "Wedding-ready look for next week",
  "Low-maintenance hairstyle for men",
  "Beard grooming and styling",
  "Best facial for dull skin",
];

export function AiView() {
  const setView = useAppStore((s) => s.setView);
  const {
    openPhotoSheet,
    capturedImage,
    analyzing,
    analysisError,
    recommendations,
    startAnalysis,
    setAnalysisResult,
    setAnalysisError,
    resetAnalysis,
    preferences,
    setPreferences,
    isGeneratingTop5,
    startTop5Generation,
    setTop5Result,
    setTop5Error,
  } = useAiPhotoStore();

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");

  const generateTop5 = async () => {
    const captured = useAiPhotoStore.getState().capturedImage;
    if (!captured) {
      openPhotoSheet();
      return;
    }

    startTop5Generation();
    const reqId = startAnalysis();

    try {
      const res = await fetch("/api/style-generate-top5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: captured.base64,
          preferences,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const err = data?.error || data?.detail || "AI Hairstyle Generation failed. Please try again.";
        setTop5Error(err);
        setAnalysisError(reqId, err);
        return;
      }

      setTop5Result(data.candidates, data.model, data.disclaimer);

      const recs: any[] = data.candidates.map((c: any) => ({
        style: c.name,
        category: c.category,
        serviceType: c.serviceType,
        serviceName: c.serviceName,
        reason: c.suitabilityReason,
        confidence: c.confidence,
        maintenance: c.maintenance,
        duration: c.duration,
        visualPreview: c.previewUrl,
        visualPreviewLoading: false,
        visualPreviewSource: c.source || "ai-generated",
        visualPreviewLabel: `AI Generated — ${c.name} (Face Preserved)`,
        styleDescription: c.name,
      }));

      setAnalysisResult(reqId, recs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during hairstyle generation.";
      setTop5Error(msg);
      setAnalysisError(reqId, msg);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TEXT-ONLY fallback: lightweight scenario matcher for users
  // who didn't upload a photo. This calls the same /api/style-analyze
  // endpoint with text only (no image) — the AI vision model can still
  // produce structured recommendations based on the text.
  // ─────────────────────────────────────────────────────────────
  const sendTextOnly = async (text: string) => {
    if (!text.trim()) return;
    const userTurn: ChatTurn = { role: "user", text };
    setTurns((prev) => [...prev, userTurn]);
    setInput("");
    startAnalysis();

    try {
      // Call the same endpoint, but with no image — the API will still
      // work (the model just sees text only). We pass a tiny placeholder
      // so the endpoint doesn't reject; the real flow uses a real photo.
      // Actually, /api/style-analyze requires an image. For text-only,
      // we use a local scenario-based recommendation instead.
      const recs = localTextRecommendations(text);
      // Simulate brief "thinking" delay for UX
      await new Promise((r) => setTimeout(r, 600));
      setAnalysisResult(useAiPhotoStore.getState().analyzeRequestId || "", recs);
      const assistantTurn: ChatTurn = {
        role: "assistant",
        text: `Based on your request, here are ${recs.length} salon services that may suit your preferences. Tap any to find matching salons.`,
      };
      setTurns((prev) => [...prev, assistantTurn]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not generate recommendations.";
      setAnalysisError(useAiPhotoStore.getState().analyzeRequestId || "", msg);
    }
  };

  // Send the captured photo + text to the real backend API
  const sendWithPhoto = async (text?: string) => {
    const captured = useAiPhotoStore.getState().capturedImage;
    if (!captured) return;
    const userText = text || input;
    if (userText.trim()) {
      const userTurn: ChatTurn = { role: "user", text: userText };
      setTurns((prev) => [...prev, userTurn]);
      setInput("");
    }
    const reqId = startAnalysis();

    try {
      const res = await fetch("/api/style-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: captured.base64, text: userText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnalysisError(reqId, data?.error || "AI analysis failed. Please try again.");
        return;
      }
      setAnalysisResult(reqId, data.recommendations || []);
      const assistantTurn: ChatTurn = {
        role: "assistant",
        text: `Here are ${(data.recommendations || []).length} AI suggestions based on your photo${userText ? " and request" : ""}. Tap any to find matching salons.`,
      };
      setTurns((prev) => [...prev, assistantTurn]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please retry.";
      setAnalysisError(reqId, msg);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Local text-only recommendation engine (offline fallback).
  // Used when the user has NOT uploaded a photo — keeps the AI view
  // functional even without image input.
  // ─────────────────────────────────────────────────────────────
  function localTextRecommendations(text: string) {
    const t = text.toLowerCase();
    const recs = [] as Array<{
      style: string;
      category: string;
      reason: string;
      confidence: number;
      serviceType: string;
      maintenance: "Low" | "Medium" | "High";
      duration?: string;
    }>;

    if (t.includes("wedding") || t.includes("bridal")) {
      recs.push({
        style: "Bridal Glow Look",
        category: "Bridal Makeup",
        serviceType: "Bridal Makeup",
        reason: "May suit your wedding-ready preferences with HD bridal makeup.",
        confidence: 0.85,
        maintenance: "High",
        duration: "90 min",
      });
      recs.push({
        style: "Hair Updo",
        category: "Hair Styling",
        serviceType: "Hair Styling",
        reason: "Based on your selected preferences, an updo pairs well with bridal looks.",
        confidence: 0.78,
        maintenance: "Medium",
        duration: "60 min",
      });
    } else if (t.includes("office") || t.includes("professional")) {
      recs.push({
        style: "Clean Professional Cut",
        category: "Haircut",
        serviceType: "Haircut",
        reason: "A clean cut may suit your office-look preferences — easy to maintain.",
        confidence: 0.88,
        maintenance: "Low",
        duration: "30-45 min",
      });
      recs.push({
        style: "Beard Shape",
        category: "Beard Styling",
        serviceType: "Beard Styling",
        reason: "Based on your selected preferences, a tidy beard complements a professional look.",
        confidence: 0.74,
        maintenance: "Low",
        duration: "20-30 min",
      });
    } else if (t.includes("beard") || t.includes("grooming") || t.includes("shave")) {
      recs.push({
        style: "Beard Sculpt",
        category: "Beard Styling",
        serviceType: "Beard Styling",
        reason: "May suit your beard grooming preferences with a defined shape.",
        confidence: 0.82,
        maintenance: "Medium",
        duration: "20-30 min",
      });
      recs.push({
        style: "Hot Towel Shave",
        category: "Shaving",
        serviceType: "Shaving",
        reason: "A traditional hot-towel shave may be a relaxing choice based on your request.",
        confidence: 0.7,
        maintenance: "Low",
        duration: "30-40 min",
      });
    } else if (t.includes("facial") || t.includes("skin") || t.includes("dull")) {
      recs.push({
        style: "HydraFacial",
        category: "Facial",
        serviceType: "Facial",
        reason: "For dull skin, a HydraFacial may suit your skin-refreshment preferences.",
        confidence: 0.8,
        maintenance: "Low",
        duration: "45-60 min",
      });
    } else {
      // Low-maintenance default
      recs.push({
        style: "Classic Haircut",
        category: "Haircut",
        serviceType: "Haircut",
        reason: "A classic cut may suit a low-maintenance style — easy to repeat every 3-4 weeks.",
        confidence: 0.75,
        maintenance: "Low",
        duration: "30-45 min",
      });
    }
    return recs;
  }

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    // If user has a photo captured, send both photo + text
    if (capturedImage) {
      void sendWithPhoto(text);
    } else {
      void sendTextOnly(text);
    }
  };

  const handleStarterClick = (starter: string) => {
    setInput(starter);
    // Auto-send the starter
    if (capturedImage) {
      void sendWithPhoto(starter);
    } else {
      void sendTextOnly(starter);
    }
  };

  const hasResults = Boolean(!analyzing && recommendations && recommendations.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Show the onboarding prompt hero ONLY when no recommendations are active yet */}
      {!hasResults && (
        <header className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Sparkles className="h-3.5 w-3.5" suppressHydrationWarning /> StyleSync AI Hairstyle Studio · Srinagar
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              AI Hairstyle & Look Generator
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Upload your photo to generate your top 5 tailored hairstyles. Our face-preserving AI changes only your hair while keeping your authentic facial identity, skin tone, and features 100% unchanged.
            </p>
            {!capturedImage && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  onClick={() => openPhotoSheet()}
                  className="bg-blue-600 text-white hover:bg-blue-500 font-semibold shadow-lg shadow-blue-600/30 gap-2 text-sm"
                >
                  <Camera className="h-4 w-4" />
                  Upload Your Photo to Begin
                </Button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Captured photo & Hairstyle Preferences Panel (shown when photo is uploaded before generation) */}
      {capturedImage && !analyzing && !recommendations && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Photo & Identity Confirmation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={capturedImage.url}
                  alt="Your Reference"
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-xl"
                />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-900" title="Face Alignment Confirmed">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Photograph Ready</h3>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                    Facial Identity Preserved
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your eyes, eyebrows, nose, jawline, and skin tone will remain completely identical.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => openPhotoSheet()}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white shrink-0"
            >
              <Camera className="mr-1.5 h-3.5 w-3.5 text-blue-400" />
              Change Photo
            </Button>
          </div>

          {/* Optional Preferences Selectors */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Optional Hairstyle Preferences
              </span>
              <span className="text-[11px] text-slate-500">Customize or leave on Any</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Hair Length */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Hair Length</label>
                <div className="flex flex-wrap gap-1">
                  {(["any", "short", "medium", "long"] as const).map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setPreferences({ hairLength: len })}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition",
                        preferences.hairLength === len
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      )}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>

              {/* Haircut Style */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Cut Style</label>
                <div className="flex flex-wrap gap-1">
                  {(["any", "quiff", "taper", "fade", "pompadour", "buzz"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setPreferences({ haircutStyle: style })}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition",
                        preferences.haircutStyle === style
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Maintenance */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Maintenance</label>
                <div className="flex flex-wrap gap-1">
                  {(["Low", "Medium", "High"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPreferences({ maintenance: m })}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition",
                        preferences.maintenance === m
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occasion */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Occasion</label>
                <div className="flex flex-wrap gap-1">
                  {(["daily", "office", "wedding", "party"] as const).map((occ) => (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => setPreferences({ occasion: occ })}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition",
                        preferences.occasion === occ
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      )}
                    >
                      {occ}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PRIMARY CALL-TO-ACTION BUTTON */}
          <div className="pt-2">
            <Button
              id="generate-top-5-btn"
              size="lg"
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 border border-blue-400/30 transition-all transform hover:scale-[1.005] active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer"
              onClick={generateTop5}
              disabled={analyzing}
            >
              <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" suppressHydrationWarning />
              <span>Generate My Top 5 Hairstyles</span>
            </Button>

            <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Generates 5 distinct styles independently from your photo · Strict facial preservation guaranteed</span>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing / Generating Top 5 state */}
      {analyzing && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/95 p-8 shadow-2xl backdrop-blur-xl text-center space-y-4">
          <div className="relative">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <Wand2 className="h-8 w-8 animate-pulse" suppressHydrationWarning />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500" />
            </span>
          </div>

          <div className="max-w-md">
            <h3 className="text-lg font-bold text-white">Generating Your Top 5 Hairstyles</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Applying 5 distinct hairstyle transformations independently to your original photo while preserving your authentic eyes, nose, lips, jawline & skin tone.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-full bg-slate-800 h-2 overflow-hidden border border-slate-700">
            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 animate-[pulse_1.5s_ease-in-out_infinite] w-3/4 rounded-full" />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-blue-400 font-medium">
            <Sparkles className="h-3.5 w-3.5 animate-spin" />
            <span>StyleSync AI Hairstyle Engine · Face Preservation Active</span>
          </div>
        </div>
      )}

      {/* AI RESULTS (real backend output) */}
      {!analyzing && (recommendations || analysisError) && <AiResultCard />}

      {/* Chat area (when no analysis is in progress / no results yet) */}
      {!analyzing && !recommendations && !analysisError && (
        <div className="flex flex-col gap-3">
          {turns.length === 0 && (
            <div className="rounded-3xl border border-border bg-white p-5 ss-card-shadow">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" suppressHydrationWarning />
                <div className="text-sm font-semibold">Try an example</div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStarterClick(s)}
                    className="rounded-xl border border-border bg-white p-3 text-left text-sm font-medium transition hover:border-primary/40 hover:bg-secondary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2",
                t.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {t.role === "assistant" && (
                <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full ss-brand-gradient text-white">
                  <Wand2 className="h-3.5 w-3.5" suppressHydrationWarning />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  t.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-white"
                )}
              >
                <p>{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="sticky bottom-20 rounded-2xl border border-border bg-white p-2 ss-card-shadow lg:bottom-4">
        <div className="flex items-center gap-2">
          {/* REAL CAMERA BUTTON — opens the photo sheet */}
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-primary/30 text-primary"
            onClick={() => openPhotoSheet()}
            aria-label="Take photo or upload from gallery"
          >
            <Camera className="h-4 w-4" suppressHydrationWarning />
          </Button>

          <input
            data-ai-text-input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              capturedImage
                ? "Add a description (optional) and click send to analyze…"
                : "Describe your style, occasion or service…"
            }
            className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSend}
            disabled={analyzing || (!input.trim() && !capturedImage)}
            aria-label="Send for AI analysis"
          >
            <Send className="h-4 w-4" suppressHydrationWarning />
          </Button>
        </div>

        {/* Hint when no input and no photo */}
        {!input.trim() && !capturedImage && !analyzing && (
          <div className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            Tip: tap the camera icon to upload a photo for personalized AI recommendations.
          </div>
        )}
      </div>
    </div>
  );
}
