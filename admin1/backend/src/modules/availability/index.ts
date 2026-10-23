/**
 * Availability module — real-time slot availability.
 * ------------------------------------------------------------
 * Endpoints (public — no auth required for reading):
 *   GET  /api/v1/availability/:salonId          → generate + return slots
 *   GET  /api/v1/availability/:salonId/today    → today's slots
 *
 * POST /api/v1/availability/:salonId/hold       → hold a slot (auth required)
 * POST /api/v1/availability/hold/:holdId/confirm → confirm a hold (auth)
 * POST /api/v1/availability/hold/:holdId/release → release a hold (auth)
 *
 * The slot engine generates slots on-the-fly based on:
 *   - Salon operating hours
 *   - Staff availability (working hours, breaks, days off)
 *   - Service duration (consecutive slot requirements)
 *   - Existing bookings + holds + blocked periods
 *
 * Real-time: slots that are HELD or BOOKED by another customer
 * appear with the correct status immediately.
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../database";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { guardDatabase } from "../../middleware/guard-database";
import { validateParams, validateQuery, validateBody } from "../../middleware/validate-request";
import { generateSlots, verifySlotBookable } from "../../services/slot-engine";
import { holdSlot, confirmHold, releaseHold, cleanupExpiredHolds } from "../../services/slot-hold";

export const router = Router();

const salonIdParam = z.object({ salonId: z.string().uuid() });
const holdIdParam = z.object({ holdId: z.string().uuid() });

const listQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  service_id: z.string().uuid().optional(),
  staff_id: z.string().uuid().optional(),
  slot_interval: z.coerce.number().int().min(15).max(60).optional(),
});

const holdBody = z.object({
  staffId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM"),
  durationMin: z.number().int().min(15).max(240),
  slotIntervalMin: z.number().int().min(15).max(60).optional(),
});

function guardDb(res: any): boolean {
  if (!config.isDatabaseConfigured) {
    sendError(res, Errors.config("Database is not configured."));
    return false;
  }
  return true;
}

/** GET /api/v1/availability/:salonId — generate + return slots */
async function list(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { salonId } = req.params as any;
  const { date, service_id, staff_id, slot_interval } = req.query as any;

  // Clean up expired holds before generating slots (lazy cleanup)
  await cleanupExpiredHolds(db).catch(() => {});

  const slots = await generateSlots(db, {
    salonId,
    serviceId: service_id,
    staffId: staff_id,
    date: new Date(date.includes("T") ? date : date + "T00:00:00.000Z"),
    slotIntervalMin: slot_interval || 30,
  }).catch((e) => { throw Errors.database("Could not generate availability.", e); });

  // Get service price for the response
  let price: number | null = null;
  let serviceName: string | null = null;
  if (service_id) {
    const service = await db.salonService.findUnique({
      where: { id: service_id },
      select: { priceFrom: true, name: true },
    }).catch(() => null);
    if (service) {
      price = service.priceFrom;
      serviceName = service.name;
    }
  }

  return sendSuccess(res, {
    salonId,
    date,
    service: serviceName ? { id: service_id, name: serviceName, priceFrom: price } : null,
    staffId: staff_id || null,
    slotIntervalMin: slot_interval || 30,
    totalSlots: slots.length,
    availableSlots: slots.filter((s) => s.canBook).length,
    slots,
  });
}

/** GET /api/v1/availability/:salonId/today */
async function today(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { salonId } = req.params as any;
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  await cleanupExpiredHolds(db).catch(() => {});

  const slots = await generateSlots(db, {
    salonId,
    date: todayDate,
    slotIntervalMin: 30,
  }).catch((e) => { throw Errors.database("Could not generate today's availability.", e); });

  return sendSuccess(res, {
    salonId,
    date: todayDate.toISOString().slice(0, 10),
    totalSlots: slots.length,
    availableSlots: slots.filter((s) => s.canBook).length,
    slots,
  });
}

/** POST /api/v1/availability/:salonId/hold — temporarily hold a slot */
async function hold(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  if (!req.customerId) {
    return sendError(res, Errors.auth("Authentication required to hold a slot."));
  }
  const db = getDb();
  const { salonId } = req.params as any;
  const { staffId, serviceId, date, startTime, durationMin, slotIntervalMin } = req.body;

  const result = await holdSlot(db, {
    customerId: req.customerId,
    salonId,
    staffId,
    serviceId,
    date: new Date(date),
    startTime,
    durationMin,
    slotIntervalMin,
  }).catch((e) => {
    if (e instanceof Errors.constructor || (e as any).kind) throw e;
    throw Errors.database("Could not hold the slot.", e);
  });

  return sendSuccess(res, result, "Slot held. Complete your booking within 10 minutes.", 201);
}

/** POST /api/v1/availability/hold/:holdId/confirm — confirm a hold */
async function confirmHoldHandler(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  if (!req.customerId) {
    return sendError(res, Errors.auth("Authentication required."));
  }
  const db = getDb();
  const { holdId } = req.params as any;

  // Verify the hold belongs to this customer
  const hold = await db.slotHold.findUnique({
    where: { id: holdId },
    select: { customerId: true, status: true },
  }).catch(() => null);

  if (!hold) {
    return sendError(res, Errors.notFound("Hold not found."));
  }
  if (hold.customerId !== req.customerId) {
    return sendError(res, Errors.permission("You do not own this hold."));
  }

  await confirmHold(db, holdId).catch((e) => {
    if ((e as any).kind) throw e;
    throw Errors.database("Could not confirm the hold.", e);
  });

  return sendSuccess(res, { holdId, status: "CONFIRMED" }, "Hold confirmed. Slots are now booked.");
}

/** POST /api/v1/availability/hold/:holdId/release — release a hold */
async function releaseHoldHandler(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  if (!req.customerId) {
    return sendError(res, Errors.auth("Authentication required."));
  }
  const db = getDb();
  const { holdId } = req.params as any;

  const hold = await db.slotHold.findUnique({
    where: { id: holdId },
    select: { customerId: true },
  }).catch(() => null);

  if (!hold) {
    return sendError(res, Errors.notFound("Hold not found."));
  }
  if (hold.customerId !== req.customerId) {
    return sendError(res, Errors.permission("You do not own this hold."));
  }

  await releaseHold(db, holdId).catch(() => {});

  return sendSuccess(res, { holdId, status: "RELEASED" }, "Hold released. Slots are available again.");
}

/** POST /api/v1/availability/verify — verify a slot is bookable (no hold) */
async function verify(req: AuthenticatedRequest, res: any, _next: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { salonId, staffId, date, startTime, durationMin } = req.body;

  const result = await verifySlotBookable(db, {
    salonId,
    staffId,
    date: new Date(date),
    startTime,
    durationMin,
  }).catch((e) => { throw Errors.database("Could not verify the slot.", e); });

  return sendSuccess(res, result);
}

const verifyBody = z.object({
  salonId: z.string().uuid(),
  staffId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.number().int().min(15).max(240),
});

// ─── Routes ──────────────────────────────────────────────────────
// Public routes — guardDatabase first (no auth needed)
router.post("/verify", guardDatabase, validateBody(verifyBody), verify);
router.get("/:salonId/today", guardDatabase, validateParams(salonIdParam), today);
router.get("/:salonId", guardDatabase, validateParams(salonIdParam), validateQuery(listQuery), list);
// Protected routes — requireAuth FIRST (so unauth users get 401 even if DB is down), then guardDatabase
router.post("/:salonId/hold", requireAuth, guardDatabase, validateParams(salonIdParam), validateBody(holdBody), hold);
router.post("/hold/:holdId/confirm", requireAuth, guardDatabase, validateParams(holdIdParam), confirmHoldHandler);
router.post("/hold/:holdId/release", requireAuth, guardDatabase, validateParams(holdIdParam), releaseHoldHandler);

export default router;
