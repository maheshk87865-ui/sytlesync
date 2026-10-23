/**
 * Saved Look Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/ai/saved-looks for
 * the customer's saved AI looks.
 *
 * Customer isolation: backend uses JWT customerId, never frontend input.
 */

import { api } from "@/lib/backend/client";
import type { SavedLookRecord } from "@/lib/types";
import { validationError } from "./errors";

export interface SaveLookInput {
  customer_id: string;        // ignored by backend
  style: string;
  category: string;
  description: string;
  service_name: string;
  visual_preview: string | null;
  visual_preview_source: "reference-image" | "ai-generated" | null;
}

// ─── Backend response shape ────────────────────────────────────
interface BackendSavedLook {
  id: string;
  customerId?: string;
  style: string;
  category?: string;
  styleCategory?: string;
  description: string;
  serviceName?: string;
  service?: { name: string };
  visualPreview?: string | null;
  previewUrl?: string | null;
  visualPreviewSource?: string | null;
  previewSource?: string | null;
  createdAt?: string;
}

/** Get the customer's saved looks. */
export async function getSavedLooks(_customer_id: string): Promise<SavedLookRecord[]> {
  const result = await api.get<BackendSavedLook[] | { looks: BackendSavedLook[] }>("/ai/saved-looks");
  const rows = Array.isArray(result) ? result : (result?.looks || []);
  return rows.map(mapToLook);
}

/** Save an AI look. */
export async function saveLook(input: SaveLookInput): Promise<SavedLookRecord> {
  if (!input.style.trim()) throw validationError("Look style is required.");

  const result = await api.post<BackendSavedLook>("/ai/saved-looks", {
    style: input.style,
    category: input.category,
    styleCategory: input.category,
    description: input.description,
    serviceName: input.service_name,
    visualPreview: input.visual_preview,
    previewUrl: input.visual_preview,
    visualPreviewSource: input.visual_preview_source,
    previewSource: input.visual_preview_source,
  });
  return mapToLook(result);
}

/** Remove a saved look. */
export async function removeSavedLook(_customer_id: string, lookId: string): Promise<void> {
  await api.del(`/ai/saved-looks/${lookId}`);
}

/** Check if a look is already saved. */
export async function isLookSaved(_customer_id: string, style: string, serviceName: string): Promise<boolean> {
  try {
    const looks = await getSavedLooks(_customer_id);
    return looks.some((l) => l.style === style && l.service_name === serviceName);
  } catch {
    return false;
  }
}

// ─── Mapper ────────────────────────────────────────────────────
function mapToLook(l: BackendSavedLook): SavedLookRecord {
  const source = l.visualPreviewSource || l.previewSource;
  return {
    id: l.id,
    customer_id: l.customerId || "",
    style: l.style,
    category: l.category || l.styleCategory || "Other",
    description: l.description,
    service_name: l.serviceName || l.service?.name || "",
    visual_preview: l.visualPreview ?? l.previewUrl ?? null,
    visual_preview_source: (source as any) ?? null,
    created_at: l.createdAt || "",
  };
}
