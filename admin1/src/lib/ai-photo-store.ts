"use client";

import { create } from "zustand";
import type { UserPreferences, Top5HairstyleCandidate } from "./ai-service/types";

export interface AiRecommendation {
  style: string;
  category: string;
  reason: string;
  confidence: number;
  serviceType: string;
  maintenance: "Low" | "Medium" | "High";
  duration?: string;
  visualPreview?: string;       // transformed image data URL (real AI try-on result)
  visualPreviewLoading?: boolean; // true while try-on is processing
  visualPreviewError?: string;    // error message if try-on failed
  visualPreviewSource?: "reference-image" | "ai-generated" | "unavailable"; // distinguishes real AI image from demo reference image
  visualPreviewLabel?: string;    // human-readable label from /api/style-tryon
  serviceName?: string;        // mapped real service name
  styleDescription?: string;   // description for the try-on prompt
}

export interface CapturedImage {
  url: string;
  base64: string;
  name: string;
  size: number;
  type: string;
}

interface AiPhotoState {
  photoSheetOpen: boolean;
  openPhotoSheet: () => void;
  closePhotoSheet: () => void;
  capturedImage: CapturedImage | null;
  setCapturedImage: (img: CapturedImage | null) => void;
  analyzing: boolean;
  analysisError: string | null;
  recommendations: AiRecommendation[] | null;
  analyzeRequestId: string | null;
  activeRecommendationIdx: number;
  setActiveRecommendation: (idx: number) => void;
  startAnalysis: () => string;
  setAnalysisResult: (reqId: string, recs: AiRecommendation[]) => void;
  setAnalysisError: (reqId: string, error: string) => void;
  resetAnalysis: () => void;
  clearAll: () => void;
  // Selected look
  selectedLookIdx: number | null;
  selectLook: (idx: number) => void;
  // Saved looks
  savedLooks: AiRecommendation[];
  toggleSaveLook: (rec: AiRecommendation) => void;
  // Hairstyle Preferences
  preferences: UserPreferences;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  // Top 5 Hairstyles Generator State
  isGeneratingTop5: boolean;
  top5Candidates: Top5HairstyleCandidate[] | null;
  top5Error: string | null;
  top5Model: string | null;
  top5Disclaimer: string | null;
  startTop5Generation: () => void;
  setTop5Result: (candidates: Top5HairstyleCandidate[], model: string, disclaimer: string) => void;
  setTop5Error: (error: string) => void;
  deleteTop5Candidate: (id: string) => void;
  regenerateTop5Candidate: (id: string, updated: Top5HairstyleCandidate) => void;
  // Update a recommendation's visual preview (after try-on API returns).
  updateRecommendationPreview: (idx: number, preview: string, source?: string, label?: string) => void;
  setRecommendationPreviewLoading: (idx: number, loading: boolean) => void;
  setRecommendationPreviewError: (idx: number, error: string) => void;
}

export const useAiPhotoStore = create<AiPhotoState>((set, get) => ({
  photoSheetOpen: false,
  openPhotoSheet: () => set({ photoSheetOpen: true }),
  closePhotoSheet: () => set({ photoSheetOpen: false }),
  capturedImage: null,
  setCapturedImage: (img) => {
    const prev = get().capturedImage;
    if (prev?.url && prev.url.startsWith("blob:")) {
      try { URL.revokeObjectURL(prev.url); } catch {}
    }
    set({ capturedImage: img, analysisError: null });
  },
  analyzing: false,
  analysisError: null,
  recommendations: null,
  analyzeRequestId: null,
  activeRecommendationIdx: 0,
  setActiveRecommendation: (idx) => set({ activeRecommendationIdx: idx }),
  startAnalysis: () => {
    const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    set({ analyzing: true, analysisError: null, recommendations: null, analyzeRequestId: reqId, activeRecommendationIdx: 0, selectedLookIdx: null });
    return reqId;
  },
  setAnalysisResult: (reqId, recs) => {
    if (get().analyzeRequestId !== reqId) return;
    set({ analyzing: false, recommendations: recs, analysisError: null });
  },
  setAnalysisError: (reqId, error) => {
    if (get().analyzeRequestId !== reqId) return;
    set({ analyzing: false, analysisError: error });
  },
  preferences: {
    hairLength: "any",
    hairTexture: "any",
    haircutStyle: "any",
    hairColor: "any",
    maintenance: "Low",
    occasion: "daily",
  },
  setPreferences: (prefs) => set({ preferences: { ...get().preferences, ...prefs } }),
  isGeneratingTop5: false,
  top5Candidates: null,
  top5Error: null,
  top5Model: null,
  top5Disclaimer: null,
  startTop5Generation: () => set({ isGeneratingTop5: true, top5Error: null }),
  setTop5Result: (candidates, model, disclaimer) =>
    set({
      isGeneratingTop5: false,
      top5Candidates: candidates,
      top5Model: model,
      top5Disclaimer: disclaimer,
      top5Error: null,
    }),
  setTop5Error: (error) => set({ isGeneratingTop5: false, top5Error: error }),
  deleteTop5Candidate: (id) => {
    const curr = get().top5Candidates;
    if (!curr) return;
    set({ top5Candidates: curr.filter((c) => c.id !== id) });
  },
  regenerateTop5Candidate: (id, updated) => {
    const curr = get().top5Candidates;
    if (!curr) return;
    set({ top5Candidates: curr.map((c) => (c.id === id ? updated : c)) });
  },
  resetAnalysis: () => {
    const prev = get().capturedImage;
    if (prev?.url && prev.url.startsWith("blob:")) {
      try { URL.revokeObjectURL(prev.url); } catch {}
    }
    set({
      capturedImage: null, analyzing: false, analysisError: null,
      recommendations: null, analyzeRequestId: null, activeRecommendationIdx: 0, selectedLookIdx: null,
      isGeneratingTop5: false, top5Candidates: null, top5Error: null,
    });
  },
  clearAll: () => { get().resetAnalysis(); set({ photoSheetOpen: false }); },
  selectedLookIdx: null,
  selectLook: (idx) => set({ selectedLookIdx: idx }),
  savedLooks: [],
  toggleSaveLook: (rec) => {
    const existing = get().savedLooks.find(r => r.style === rec.style && r.serviceType === rec.serviceType);
    if (existing) {
      set({ savedLooks: get().savedLooks.filter(r => r !== existing) });
    } else {
      set({ savedLooks: [...get().savedLooks, rec] });
    }
  },
  updateRecommendationPreview: (idx, preview, source, label) => { console.log("[STORE] updateRecommendationPreview", idx, "source:", source);
    const recs = get().recommendations;
    if (!recs || idx < 0 || idx >= recs.length) return;
    const updated = [...recs];
    updated[idx] = {
      ...updated[idx],
      visualPreview: preview,
      visualPreviewLoading: false,
      visualPreviewError: undefined,
      visualPreviewSource: source as any,
      visualPreviewLabel: label,
    };
    set({ recommendations: updated });
  },
  setRecommendationPreviewLoading: (idx, loading) => { console.log("[STORE] setRecommendationPreviewLoading", idx, loading);
    const recs = get().recommendations;
    if (!recs || idx < 0 || idx >= recs.length) return;
    const updated = [...recs];
    updated[idx] = { ...updated[idx], visualPreviewLoading: loading };
    set({ recommendations: updated });
  },
  setRecommendationPreviewError: (idx, error) => { console.log("[STORE] setRecommendationPreviewError", idx, error);
    const recs = get().recommendations;
    if (!recs || idx < 0 || idx >= recs.length) return;
    const updated = [...recs];
    updated[idx] = { ...updated[idx], visualPreviewLoading: false, visualPreviewError: error };
    set({ recommendations: updated });
  },
}));
