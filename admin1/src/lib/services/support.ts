/**
 * Support Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/support/* for
 * customer support tickets.
 *
 * Customer isolation: backend uses JWT customerId, never frontend input.
 * The backend generates the ticket_id (e.g. SS-DEMO-1042) server-side.
 */

import { api } from "@/lib/backend/client";
import type { SupportTicketRecord } from "@/lib/types";
import { notFoundError, validationError } from "./errors";

export interface CreateSupportTicketInput {
  customer_id: string;        // ignored by backend (uses JWT customerId)
  subject: string;
  topic: string;
  message: string;
  booking_id: string | null;
}

// ─── Backend response shape ────────────────────────────────────
interface BackendSupportTicket {
  id: string;
  ticketId?: string;
  customerId?: string;
  subject: string;
  topic?: string;
  category?: string;
  message?: string;
  description?: string;
  bookingId?: string | null;
  status?: string;
  replies?: Array<{ from: string; text: string; at: string; author?: string; message?: string; createdAt?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

/** Get the customer's support tickets (most recent first). */
export async function getSupportTickets(_customer_id: string): Promise<SupportTicketRecord[]> {
  const result = await api.get<BackendSupportTicket[] | { tickets: BackendSupportTicket[] }>(
    "/support/tickets"
  );
  const rows = Array.isArray(result) ? result : (result?.tickets || []);
  return rows.map(mapToTicket);
}

/** Create a new support ticket. */
export async function createSupportTicket(input: CreateSupportTicketInput): Promise<SupportTicketRecord> {
  if (!input.subject.trim()) throw validationError("Subject is required.");
  if (!input.message.trim()) throw validationError("Message is required.");
  if (!input.topic) throw validationError("Please pick a topic.");

  const result = await api.post<BackendSupportTicket>("/support/tickets", {
    subject: input.subject,
    topic: input.topic,
    category: input.topic, // backend may use either name
    message: input.message,
    bookingId: input.booking_id,
  });
  return mapToTicket(result);
}

/** Get a single support ticket by ID. */
export async function getSupportTicket(_customer_id: string, ticketId: string): Promise<SupportTicketRecord> {
  try {
    const result = await api.get<BackendSupportTicket>(`/support/tickets/${encodeURIComponent(ticketId)}`);
    return mapToTicket(result);
  } catch (e: any) {
    if (e?.kind === "not_found") throw notFoundError("Ticket not found.");
    throw e;
  }
}

/** Append a customer reply to an existing ticket. */
export async function replyToTicket(_customer_id: string, ticketId: string, text: string): Promise<SupportTicketRecord> {
  const result = await api.post<BackendSupportTicket>(
    `/support/tickets/${encodeURIComponent(ticketId)}/replies`,
    { text }
  );
  return mapToTicket(result);
}

// ─── Mapper ────────────────────────────────────────────────────
function mapToTicket(t: BackendSupportTicket): SupportTicketRecord {
  // Normalize status → lowercase
  const status = (t.status || "open").toLowerCase() as "open" | "resolved" | "closed";

  // Normalize replies — backend may use different keys
  const replies = (t.replies || []).map((r) => {
    const from = (r.from || r.author || "user").toLowerCase() === "support" ? "support" : "user";
    return {
      from: from as "user" | "support",
      text: r.text || r.message || "",
      at: r.at || r.createdAt || "",
    };
  });

  return {
    id: t.id,
    customer_id: t.customerId || "",
    ticket_id: t.ticketId || t.id,
    subject: t.subject,
    topic: t.topic || t.category || "Other",
    status,
    message: t.message || t.description || "",
    booking_id: t.bookingId || null,
    replies,
    created_at: t.createdAt || "",
    updated_at: t.updatedAt || t.createdAt || "",
  };
}
