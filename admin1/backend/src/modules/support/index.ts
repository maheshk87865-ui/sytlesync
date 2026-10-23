/**
 * Support module — customer support tickets.
 * ------------------------------------------------------------
 * Endpoints (all require auth — customer can only see their own tickets):
 *   GET    /api/v1/support/tickets           → list (with optional status filter)
 *   POST   /api/v1/support/tickets           → create ticket
 *   GET    /api/v1/support/tickets/:ticketId  → single ticket detail
 *   POST   /api/v1/support/tickets/:ticketId/reply → append a reply
 *
 * Categories: Booking, Payment, Salon, Account, Technical, Other
 * Statuses: OPEN, IN_PROGRESS, RESOLVED, CLOSED
 *
 * Security:
 *   - Customer can only see their own tickets (customerId from JWT)
 *   - All queries filter by req.customerId — Customer A can never
 *     access Customer B's support tickets
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../database";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate-request";
import { generateTicketId } from "../../utils/helpers";

export const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────
const SUPPORT_CATEGORIES = ["Booking", "Payment", "Salon", "Account", "Technical", "Other"] as const;
const SUPPORT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const createSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  bookingId: z.string().max(50).optional(),
});

const ticketIdParam = z.object({ ticketId: z.string().min(1) });

const listQuery = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(),
  category: z.enum(SUPPORT_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const replySchema = z.object({
  text: z.string().min(1, "Reply text is required").max(5000),
});

// ─── Handlers ────────────────────────────────────────────────────

/** GET /api/v1/support/tickets — list (own tickets only, with status filter) */
async function list(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { status, category, limit, offset } = (req.query as any);

  const where: any = { customerId: req.customerId! };
  if (status) where.status = status;
  if (category) where.category = category;

  const tickets = await db.supportTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit ?? 50,
    skip: offset ?? 0,
  }).catch((e) => { throw Errors.database("Could not load tickets.", e); });

  return sendSuccess(res, tickets);
}

/** POST /api/v1/support/tickets — create ticket */
async function create(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { category, subject, message, bookingId } = req.body;

  // If bookingId provided, verify the booking belongs to this customer
  if (bookingId) {
    const booking = await db.booking.findFirst({
      where: { id: bookingId, customerId: req.customerId! },
      select: { id: true },
    }).catch(() => null);
    if (!booking) {
      return sendError(res, Errors.validation("The booking ID does not belong to you."));
    }
  }

  let attempts = 0;
  let ticket: any;
  while (attempts < 3) {
    attempts++;
    try {
      ticket = await db.supportTicket.create({
        data: {
          ticketId: generateTicketId(),
          customerId: req.customerId!,
          bookingId: bookingId || null,
          category,
          subject,
          message,
          status: "OPEN",
          replies: [],
        },
      });
      break;
    } catch (e: any) {
      if (e?.code !== "P2002") {
        return sendError(res, Errors.database("Could not create the ticket.", e));
      }
    }
  }

  if (!ticket) {
    return sendError(res, Errors.database("Could not create the ticket."));
  }

  return sendSuccess(res, ticket, "Support ticket created", 201);
}

/** GET /api/v1/support/tickets/:ticketId — single ticket detail (own only) */
async function getOne(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { ticketId } = req.params;

  // CRITICAL: filter by customerId — Customer A can never see Customer B's ticket
  const ticket = await db.supportTicket.findFirst({
    where: { customerId: req.customerId!, ticketId },
  }).catch((e) => { throw Errors.database("Could not load the ticket.", e); });

  if (!ticket) {
    return sendError(res, Errors.notFound("Ticket not found."));
  }
  return sendSuccess(res, ticket);
}

/** POST /api/v1/support/tickets/:ticketId/reply — append a reply (own ticket only) */
async function reply(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { ticketId } = req.params;
  const { text } = req.body;

  const existing = await db.supportTicket.findFirst({
    where: { customerId: req.customerId!, ticketId },
  }).catch((e) => { throw Errors.database("Could not load the ticket.", e); });

  if (!existing) {
    return sendError(res, Errors.notFound("Ticket not found."));
  }

  // Cannot reply to a CLOSED ticket
  if (existing.status === "CLOSED") {
    return sendError(res, Errors.validation("This ticket is closed. Please create a new ticket."));
  }

  const replies: any[] = Array.isArray(existing.replies) ? [...existing.replies] : [];
  replies.push({ from: "user", text, at: new Date().toISOString() });

  // If ticket was RESOLVED and customer replies, move back to IN_PROGRESS
  const newStatus = existing.status === "RESOLVED" ? "IN_PROGRESS" : existing.status;

  const updated = await db.supportTicket.update({
    where: { id: existing.id },
    data: {
      replies,
      status: newStatus,
      updatedAt: new Date(),
    },
  }).catch((e) => { throw Errors.database("Could not post your reply.", e); });

  return sendSuccess(res, updated, "Reply posted");
}

// ─── Routes ──────────────────────────────────────────────────────
router.get("/tickets", requireAuth, validateQuery(listQuery), list);
router.post("/tickets", requireAuth, validateBody(createSchema), create);
router.get("/tickets/:ticketId", requireAuth, validateParams(ticketIdParam), getOne);
router.post("/tickets/:ticketId/reply", requireAuth, validateParams(ticketIdParam), validateBody(replySchema), reply);

export default router;
