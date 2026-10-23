/**
 * Bookings module — production-ready customer booking engine.
 * ------------------------------------------------------------
 * Endpoints (all require auth):
 *   GET    /api/v1/bookings                        → list (upcoming/past/cancelled/completed/all)
 *   GET    /api/v1/bookings/:bookingId            → single booking (customer's own only)
 *   POST   /api/v1/bookings                        → create booking
 *   POST   /api/v1/bookings/:bookingId/cancel     → cancel booking
 *   POST   /api/v1/bookings/:bookingId/reschedule → reschedule to new date/time
 *   POST   /api/v1/bookings/:bookingId/rebook     → rebook with current price/duration
 *
 * Security:
 *   - Customer can only access their own bookings (customerId from JWT)
 *   - Price + duration are ALWAYS retrieved from the DB server-side
 *   - Slot availability is re-verified server-side before booking
 *   - Booking creation is transactional (prevents race conditions)
 *   - Cancellation respects cancellation policy (free cancel up to 2h before)
 *   - Rescheduling re-checks availability + releases old slot + books new slot
 *   - Rebook retrieves current price/duration from the DB
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../database";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate-request";
import { generateBookingId, sanitizeId, getTodayDateStringIST } from "../../utils/helpers";
import { verifySlotBookable } from "../../services/slot-engine";
import { holdSlot, confirmHold, releaseHold, cleanupExpiredHolds } from "../../services/slot-hold";
import { audit } from "../../services/audit-log";
import { getIdempotentResponse, storeIdempotentResponse, getIdempotencyKey } from "../../services/idempotency";
import { parsePagination, paginate } from "../../utils/pagination";

export const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────
const createSchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  holdId: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM"),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  // NOTE: price and duration are NEVER accepted from the frontend.
  // They are always retrieved from the DB server-side.
}).refine((data) => data.salonId && data.serviceId && data.staffId, {
  message: "salonId, serviceId, and staffId are all required.",
});

const bookingIdParam = z.object({ bookingId: z.string().min(1) });

const listQuery = z.object({
  section: z.enum(["upcoming", "past", "cancelled", "completed", "all"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const rescheduleSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM"),
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ─── Time helpers ───────────────────────────────────────────────
function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Response shape — strips internal fields, includes salon/service/staff names */
function bookingResponse(b: any) {
  return {
    id: b.id,
    bookingId: b.bookingId,
    salonId: b.salonId,
    salonName: b.salonName,
    serviceId: b.serviceId,
    serviceName: b.serviceName,
    staffId: b.staffId,
    staffName: b.staffName,
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    duration: b.duration,
    durationLabel: b.durationLabel,
    price: b.price,
    status: b.status,
    paymentStatus: b.paymentStatus,
    paymentMethod: b.paymentMethod,
    cancellationPolicy: b.cancellationPolicy,
    notes: b.notes,
    cancelledAt: b.cancelledAt,
    completedAt: b.completedAt,
    cancelledReason: b.cancelledReason,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

// ─── Handlers ────────────────────────────────────────────────────

/** GET /api/v1/bookings — list with section filter + pagination */
async function list(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { section } = (req.query as any);
  const { page, limit, offset } = parsePagination(req.query);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let where: any = { customerId: req.customerId };
  let orderBy: any = { date: "desc" };

  switch (section) {
    case "upcoming":
      where = { ...where, date: { gte: today }, status: { in: ["PENDING", "CONFIRMED"] } };
      orderBy = { date: "asc" };
      break;
    case "past":
      where = {
        ...where,
        OR: [
          { date: { lt: today } },
          { status: { in: ["COMPLETED", "EXPIRED"] } },
        ],
        status: { notIn: ["CANCELLED"] },
      };
      break;
    case "cancelled":
      where = { ...where, status: "CANCELLED" };
      break;
    case "completed":
      where = { ...where, status: "COMPLETED" };
      break;
    case "all":
    default:
      break;
  }

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    }).catch((e) => { throw Errors.database("Could not load bookings.", e); }),
    db.booking.count({ where }).catch(() => 0),
  ]);

  return sendSuccess(res, paginate(bookings.map(bookingResponse), total, page, limit));
}

/** GET /api/v1/bookings/:bookingId — single booking (customer's own only) */
async function getOne(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { bookingId } = req.params;

  const sanitized = sanitizeId(bookingId);
  const booking = await db.booking.findFirst({
    where: {
      customerId: req.customerId,
      OR: [{ bookingId: sanitized }, { id: sanitized }],
    },
  }).catch((e) => { throw Errors.database("Could not load the booking.", e); });

  if (!booking) {
    return sendError(res, Errors.notFound("Booking not found in your history."));
  }
  return sendSuccess(res, bookingResponse(booking));
}

/** POST /api/v1/bookings — create booking (server-side price/duration/slot verification) */
async function create(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const data = req.body;

  // ─── Step 1: Verify salon exists + is active ────────────────
  const salon = await db.salon.findUnique({
    where: { id: data.salonId },
    select: { id: true, name: true, isPublished: true, status: true, cancellationPolicy: true },
  }).catch(() => null);
  if (!salon || !salon.isPublished || salon.status !== "active") {
    return sendError(res, Errors.validation("Salon not found or no longer available."));
  }

  // ─── Step 2: Verify service exists + is offered by this salon ──
  // CRITICAL: price and duration are retrieved from the DB, NOT from the frontend.
  const service = await db.salonService.findFirst({
    where: {
      id: data.serviceId,
      salonId: data.salonId,
      isPublished: true,
      status: "active",
    },
    select: {
      id: true, name: true, durationMin: true, durationLabel: true,
      priceFrom: true, priceTo: true, category: true, popular: true,
    },
  }).catch(() => null);
  if (!service) {
    return sendError(res, Errors.validation("This service is not offered by this salon."));
  }

  // ─── Step 3: Verify staff exists + can perform this service ──
  const staff = await db.staffMember.findFirst({
    where: {
      id: data.staffId,
      salonId: data.salonId,
      isPublished: true,
    },
    select: {
      id: true, name: true, role: true, serviceIds: true,
      workingHours: true, breaks: true, daysOff: true,
    },
  }).catch(() => null);
  if (!staff) {
    return sendError(res, Errors.validation("Staff member not found at this salon."));
  }
  // Verify staff can perform this service (check serviceIds array — JSON-encoded in SQLite)
  const serviceIdsList = Array.isArray(staff.serviceIds) ? staff.serviceIds :
    (typeof staff.serviceIds === "string" ? (() => { try { return JSON.parse(staff.serviceIds); } catch { return []; } })() : []);
  if (serviceIdsList.length > 0 && !serviceIdsList.includes(data.serviceId)) {
    return sendError(res, Errors.validation("This staff member does not offer the selected service."));
  }

  // ─── Step 4: Verify date is valid (not in the past in Asia/Kolkata) ─────────
  const dateOnly = data.date.includes("T") ? data.date.split("T")[0] : data.date;
  const todayIST = getTodayDateStringIST();
  if (dateOnly < todayIST) {
    return sendError(res, Errors.validation("Cannot book in the past. Please select a future date."));
  }
  const bookingDate = new Date(data.date.includes("T") ? data.date : data.date + "T00:00:00.000Z");

  // ─── Step 5: Server-side slot verification ──────────────────
  // The price and duration come from the DB — never from the frontend.
  const durationMin = service.durationMin;
  const price = service.priceFrom;
  const endTime = minutesToTime(parseTime(data.startTime) + durationMin);

  // If a holdId was provided, verify the hold
  let holdId = data.holdId;
  if (holdId) {
    const hold = await db.slotHold.findUnique({
      where: { id: holdId },
      select: { customerId: true, status: true, expiresAt: true },
    }).catch(() => null);
    if (!hold || hold.customerId !== req.customerId) {
      return sendError(res, Errors.permission("You do not own this hold."));
    }
    if (hold.status !== "HELD") {
      return sendError(res, Errors.conflict("Hold is no longer active."));
    }
    if (hold.expiresAt < new Date()) {
      return sendError(res, Errors.conflict("The hold has expired. Please select a new time slot."));
    }
  } else {
    // No hold — verify the slot is bookable using the slot engine
    const verification = await verifySlotBookable(db, {
      salonId: data.salonId,
      staffId: data.staffId,
      date: bookingDate,
      startTime: data.startTime,
      durationMin,
    });
    if (!verification.ok) {
      return sendError(res, Errors.conflict(verification.reason || "This slot is no longer available."));
    }
  }

  // ─── Step 6: Create the booking transactionally ───────────
  // The transaction prevents race conditions — two customers cannot
  // book the same slot simultaneously.
  let attempts = 0;
  let booking: any;
  while (attempts < 3) {
    attempts++;
    try {
      booking = await db.$transaction(async (tx) => {
        // Re-check slot availability INSIDE the transaction (double-check)
        // This prevents race conditions where two customers pass Step 5
        // simultaneously but only one should succeed.
        const conflictCheck = await tx.availabilitySlot.findFirst({
          where: {
            salonId: data.salonId,
            staffId: data.staffId,
            date: bookingDate,
            startTime: data.startTime,
            status: { in: ["BOOKED", "BLOCKED"] },
          },
        });
        if (conflictCheck && (!holdId || conflictCheck.holdId !== holdId)) {
          throw Errors.conflict("This slot was just booked. Please pick another time.");
        }

        // Also check the Booking table directly
        const existingBooking = await tx.booking.findFirst({
          where: {
            staffId: data.staffId,
            date: bookingDate,
            startTime: data.startTime,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        });
        if (existingBooking) {
          throw Errors.conflict("This slot has a conflicting booking.");
        }

        // Create the booking record — price and duration come from the DB
        const newBooking = await tx.booking.create({
          data: {
            bookingId: generateBookingId(),
            customerId: req.customerId!,
            salonId: data.salonId,
            serviceId: data.serviceId,
            staffId: data.staffId,
            holdId: holdId || null,
            serviceName: service.name,
            staffName: staff.name,
            salonName: salon.name,
            date: bookingDate,
            time: data.startTime,
            startTime: data.startTime,
            endTime,
            duration: durationMin,
            durationLabel: service.durationLabel,
            price,  // ← server-retrieved, never from frontend
            status: "CONFIRMED",
            paymentStatus: data.paymentMethod ? "paid" : "pending",
            paymentMethod: data.paymentMethod || null,
            cancellationPolicy: salon.cancellationPolicy,
            notes: data.notes || null,
          },
        });

        // If a hold exists, confirm it
        if (holdId) {
          await tx.slotHold.update({
            where: { id: holdId },
            data: { status: "CONFIRMED", confirmedAt: new Date(), bookingId: newBooking.id },
          });
        }

        // Mark all sub-slots as BOOKED
        const slotInterval = 30;
        const slotsNeeded = Math.ceil(durationMin / slotInterval);
        const startMins = parseTime(data.startTime);
        for (let i = 0; i < slotsNeeded; i++) {
          const slotStart = minutesToTime(startMins + i * slotInterval);
          await tx.availabilitySlot.upsert({
            where: { salonId_staffId_date_startTime: { salonId: data.salonId, staffId: data.staffId, date: bookingDate, startTime: slotStart } },
            create: {
              salonId: data.salonId, staffId: data.staffId,
              serviceId: data.serviceId,
              date: bookingDate,
              startTime: slotStart,
              endTime: minutesToTime(startMins + (i + 1) * slotInterval),
              durationMin: slotInterval,
              time: slotStart,
              status: "BOOKED",
            },
            update: { status: "BOOKED", heldUntil: null, holdId: holdId || null },
          });
        }

        return newBooking;
      });
      break;
    } catch (e: any) {
      // Retry on bookingId collision (P2002 on booking_id)
      if (e?.code === "P2002" && e?.meta?.target?.includes("booking_id")) {
        continue;
      }
      // If it's a BackendError (conflict), return it directly
      if (e instanceof Errors.constructor || (e as any).kind) {
        return sendError(res, e);
      }
      return sendError(res, Errors.database("Could not create the booking.", e));
    }
  }

  if (!booking) {
    return sendError(res, Errors.database("Could not create the booking. Please try again."));
  }

  // Audit log + idempotency store
  await audit(db, {
    customerId: req.customerId!,
    action: "BOOKING_CREATED",
    entityType: "booking",
    entityId: booking.id,
    details: { salonId: data.salonId, serviceId: data.serviceId, date: data.date, startTime: data.startTime, price: booking.price },
  });
  const idemKey = getIdempotencyKey(req);
  if (idemKey) storeIdempotentResponse(idemKey, bookingResponse(booking));

  return sendSuccess(res, bookingResponse(booking), "Booking confirmed", 201);
}

/** POST /api/v1/bookings/:bookingId/cancel — cancel with rules + slot release */
async function cancel(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { bookingId } = req.params;
  const { reason } = req.body || {};

  const sanitized = sanitizeId(bookingId);
  const existing = await db.booking.findFirst({
    where: {
      customerId: req.customerId,
      OR: [{ bookingId: sanitized }, { id: sanitized }],
    },
  }).catch((e) => { throw Errors.database("Could not find the booking.", e); });
  if (!existing) {
    return sendError(res, Errors.notFound("Booking not found in your history."));
  }

  // ─── Cancellation rules ──────────────────────────────────────
  // Cannot cancel a booking that's already cancelled, completed, or expired
  if (existing.status === "CANCELLED") {
    return sendError(res, Errors.validation("This booking is already cancelled."));
  }
  if (existing.status === "COMPLETED") {
    return sendError(res, Errors.validation("Cannot cancel a completed booking."));
  }
  if (existing.status === "EXPIRED") {
    return sendError(res, Errors.validation("This booking has already expired."));
  }

  // Check cancellation policy — free cancel up to 2 hours before the appointment
  const appointmentDateTime = new Date(existing.date);
  const [h, m] = existing.startTime.split(":").map(Number);
  appointmentDateTime.setHours(h, m, 0, 0);
  const now = new Date();
  const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  let refundStatus = existing.paymentStatus;
  if (hoursUntilAppointment < 2) {
    // Late cancellation — no refund (demo policy)
    if (existing.paymentStatus === "paid") {
      refundStatus = "paid"; // keep as paid — no refund for late cancel
    }
  } else {
    // Free cancellation — refund if paid
    if (existing.paymentStatus === "paid") {
      refundStatus = "refunded";
    }
  }

  // ─── Transactionally cancel + release slots ──────────────────
  const updated = await db.$transaction(async (tx) => {
    const cancelled = await tx.booking.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledReason: reason || null,
        paymentStatus: refundStatus,
        updatedAt: new Date(),
      },
    });

    // Release all linked slots (mark as AVAILABLE)
    if (existing.staffId) {
      const slotInterval = 30;
      const slotsNeeded = Math.ceil(existing.duration / slotInterval);
      const startMins = parseTime(existing.startTime);
      for (let i = 0; i < slotsNeeded; i++) {
        const slotStart = minutesToTime(startMins + i * slotInterval);
        await tx.availabilitySlot.updateMany({
          where: {
            salonId: existing.salonId,
            staffId: existing.staffId,
            date: existing.date,
            startTime: slotStart,
          },
          data: { status: "AVAILABLE", holdId: null, heldUntil: null },
        });
      }
    }

    // Release any linked hold
    if (existing.holdId) {
      await tx.slotHold.update({
        where: { id: existing.holdId },
        data: { status: "RELEASED", releasedAt: new Date() },
      }).catch(() => {});
    }

    return cancelled;
  }).catch((e) => { throw Errors.database("Could not cancel the booking.", e); });

  // Audit log
  await audit(db, {
    customerId: req.customerId!,
    action: "BOOKING_CANCELLED",
    entityType: "booking",
    entityId: existing.id,
    details: { reason: reason || null, refundStatus },
  });

  return sendSuccess(res, bookingResponse(updated), "Booking cancelled" +
    (refundStatus === "refunded" ? ". Refund will be processed." : ""));
}

/** POST /api/v1/bookings/:bookingId/reschedule — reschedule to new date/time */
async function reschedule(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { bookingId } = req.params;
  const { newDate, newStartTime } = req.body;

  const sanitized = sanitizeId(bookingId);
  const existing = await db.booking.findFirst({
    where: {
      customerId: req.customerId,
      OR: [{ bookingId: sanitized }, { id: sanitized }],
    },
  }).catch((e) => { throw Errors.database("Could not find the booking.", e); });
  if (!existing) {
    return sendError(res, Errors.notFound("Booking not found in your history."));
  }

  // Only allow rescheduling confirmed/pending bookings
  if (!["PENDING", "CONFIRMED"].includes(existing.status)) {
    return sendError(res, Errors.validation(`Cannot reschedule a ${existing.status} booking.`));
  }

  // Verify the new date is in the future
  const newDateObj = new Date(newDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (newDateObj < today) {
    return sendError(res, Errors.validation("Cannot reschedule to a past date."));
  }

  // ─── Server-side re-check availability for the new slot ─────
  // The customer can't just change the time — the server re-verifies.
  const verification = await verifySlotBookable(db, {
    salonId: existing.salonId,
    staffId: existing.staffId!,
    date: newDateObj,
    startTime: newStartTime,
    durationMin: existing.duration,
  });
  if (!verification.ok) {
    return sendError(res, Errors.conflict(verification.reason || "The new time slot is not available."));
  }

  // ─── Transactionally: release old slots + book new slots ────
  const updated = await db.$transaction(async (tx) => {
    // Double-check inside the transaction (race condition prevention)
    const conflict = await tx.booking.findFirst({
      where: {
        staffId: existing.staffId,
        date: newDateObj,
        startTime: newStartTime,
        status: { in: ["PENDING", "CONFIRMED"] },
        id: { not: existing.id },  // exclude the current booking
      },
    });
    if (conflict) {
      throw Errors.conflict("This slot was just booked. Please pick another time.");
    }

    // Release old slots
    if (existing.staffId) {
      const slotInterval = 30;
      const slotsNeeded = Math.ceil(existing.duration / slotInterval);
      const oldStartMins = parseTime(existing.startTime);
      for (let i = 0; i < slotsNeeded; i++) {
        const slotStart = minutesToTime(oldStartMins + i * slotInterval);
        await tx.availabilitySlot.updateMany({
          where: {
            salonId: existing.salonId,
            staffId: existing.staffId,
            date: existing.date,
            startTime: slotStart,
          },
          data: { status: "AVAILABLE", holdId: null, heldUntil: null },
        });
      }
    }

    // Book new slots
    const newEndTime = minutesToTime(parseTime(newStartTime) + existing.duration);
    const slotInterval = 30;
    const slotsNeeded = Math.ceil(existing.duration / slotInterval);
    const newStartMins = parseTime(newStartTime);
    for (let i = 0; i < slotsNeeded; i++) {
      const slotStart = minutesToTime(newStartMins + i * slotInterval);
      await tx.availabilitySlot.upsert({
        where: { salonId_staffId_date_startTime: { salonId: existing.salonId, staffId: existing.staffId!, date: newDateObj, startTime: slotStart } },
        create: {
          salonId: existing.salonId, staffId: existing.staffId!,
          serviceId: existing.serviceId,
          date: newDateObj,
          startTime: slotStart,
          endTime: minutesToTime(newStartMins + (i + 1) * slotInterval),
          durationMin: slotInterval,
          time: slotStart,
          status: "BOOKED",
        },
        update: { status: "BOOKED", heldUntil: null },
      });
    }

    // Update the booking
    const rescheduled = await tx.booking.update({
      where: { id: existing.id },
      data: {
        date: newDateObj,
        startTime: newStartTime,
        time: newStartTime,
        endTime: newEndTime,
        updatedAt: new Date(),
      },
    });

    return rescheduled;
  }).catch((e) => {
    if ((e as any).kind) return sendError(res, e);
    throw Errors.database("Could not reschedule the booking.", e);
  });

  // If the transaction returned a response (conflict error), return it
  if (updated && (updated as any).status === false) {
    return updated;
  }

  // Audit log
  await audit(db, {
    customerId: req.customerId!,
    action: "BOOKING_RESCHEDULED",
    entityType: "booking",
    entityId: existing.id,
    details: { oldDate: existing.date, oldStartTime: existing.startTime, newDate: newDate, newStartTime: newStartTime },
  });

  return sendSuccess(res, bookingResponse(updated), "Booking rescheduled successfully");
}

/** POST /api/v1/bookings/:bookingId/rebook — rebook with current price/duration */
async function rebook(req: AuthenticatedRequest, res: any, _next: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { bookingId } = req.params;

  const sanitized = sanitizeId(bookingId);
  const original = await db.booking.findFirst({
    where: {
      customerId: req.customerId,
      OR: [{ bookingId: sanitized }, { id: sanitized }],
    },
  }).catch((e) => { throw Errors.database("Could not find the booking.", e); });
  if (!original) {
    return sendError(res, Errors.notFound("Booking not found in your history."));
  }

  // ─── Retrieve current price + duration from the DB ──────────
  // The price/duration may have changed since the original booking.
  // We always use the CURRENT values from the database.
  const currentService = await db.salonService.findFirst({
    where: {
      id: original.serviceId || undefined,
      salonId: original.salonId,
      isPublished: true,
      status: "active",
    },
    select: {
      id: true, name: true, durationMin: true, durationLabel: true,
      priceFrom: true, priceTo: true, category: true, popular: true,
    },
  }).catch(() => null);

  if (!currentService) {
    return sendError(res, Errors.validation("This service is no longer offered by this salon."));
  }

  // Check if the salon is still active
  const salon = await db.salon.findUnique({
    where: { id: original.salonId },
    select: { id: true, name: true, status: true, isPublished: true },
  }).catch(() => null);
  if (!salon || !salon.isPublished || salon.status !== "active") {
    return sendError(res, Errors.validation("This salon is no longer available."));
  }

  // Check if the staff is still available
  const staff = await db.staffMember.findFirst({
    where: { id: original.staffId || undefined, salonId: original.salonId, isPublished: true },
    select: { id: true, name: true, role: true },
  }).catch(() => null);

  // ─── Generate available dates for the next 14 days ──────────
  // Uses the slot engine to check which days have availability.
  const availableDates: { date: string; hasAvailability: boolean; availableSlotCount: number }[] = [];
  const { generateSlots } = await import("../../services/slot-engine");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + i);
    try {
      const slots = await generateSlots(db, {
        salonId: original.salonId,
        serviceId: currentService.id,
        staffId: staff?.id || undefined,
        date: checkDate,
        slotIntervalMin: 30,
      });
      const availableCount = slots.filter((s: any) => s.canBook).length;
      availableDates.push({
        date: checkDate.toISOString().slice(0, 10),
        hasAvailability: availableCount > 0,
        availableSlotCount: availableCount,
      });
    } catch {
      availableDates.push({
        date: checkDate.toISOString().slice(0, 10),
        hasAvailability: false,
        availableSlotCount: 0,
      });
    }
  }

  // Return the rebook context — the customer will then call POST /bookings
  // with the new date/time to create the actual booking.
  return sendSuccess(res, {
    salonId: original.salonId,
    salonName: salon.name,
    serviceId: currentService.id,
    serviceName: currentService.name,
    staffId: staff?.id || null,
    staffName: staff?.name || null,
    // Current price + duration from the DB (may differ from original)
    currentPrice: currentService.priceFrom,
    currentDurationMin: currentService.durationMin,
    currentDurationLabel: currentService.durationLabel,
    originalPrice: original.price,
    originalDuration: original.duration,
    priceChanged: currentService.priceFrom !== original.price,
    durationChanged: currentService.durationMin !== original.duration,
    // Available dates for the next 14 days (server-computed)
    availableDates,
  }, "Ready to rebook. Use POST /api/v1/bookings to confirm with the new date/time.");
}

// ─── Routes ──────────────────────────────────────────────────────
router.get("/", requireAuth, validateQuery(listQuery), list);
router.get("/:bookingId", requireAuth, validateParams(bookingIdParam), getOne);
router.post("/", requireAuth, validateBody(createSchema), create);
router.post("/:bookingId/cancel", requireAuth, validateParams(bookingIdParam), validateBody(cancelSchema), cancel);
router.post("/:bookingId/reschedule", requireAuth, validateParams(bookingIdParam), validateBody(rescheduleSchema), reschedule);

// --- Salon Partner Endpoints ---
const salonListQuery = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "ALL"]).optional(),
  date: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
  cancellationReason: z.string().max(500).optional(),
});

async function listForSalon(req: AuthenticatedRequest, res: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { salonId } = req.params;
  const { status, date, limit = 50, offset = 0 } = (req.query as any);

  const where: any = { salonId };
  if (status && status !== "ALL") {
    where.status = status;
  }
  if (date) {
    const d = new Date(date.includes("T") ? date : date + "T00:00:00.000Z");
    where.date = d;
  }

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
      include: { customer: true, payment: true }
    }),
    db.booking.count({ where }),
  ]);

  return sendSuccess(res, {
    bookings: bookings.map((b: any) => ({
      ...bookingResponse(b),
      customerName: b.customer?.name || "Customer",
      customerPhone: b.customer?.mobile || null,
      customerEmail: b.customer?.email || null,
    })),
    total,
  });
}

async function updateSalonBookingStatus(req: AuthenticatedRequest, res: any) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL?.startsWith("placeholder")) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { bookingId } = req.params;
  const { status, cancellationReason } = req.body;

  const sanitized = sanitizeId(bookingId);
  const existing = await db.booking.findFirst({
    where: { OR: [{ bookingId: sanitized }, { id: sanitized }] },
  });
  if (!existing) {
    return sendError(res, Errors.notFound("Booking not found."));
  }

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === "CANCELLED") {
    updateData.cancelledAt = new Date();
    updateData.cancelledReason = cancellationReason || "Cancelled by Salon Partner";
  } else if (status === "COMPLETED") {
    updateData.completedAt = new Date();
    updateData.paymentStatus = "paid";
  }

  const updated = await db.booking.update({
    where: { id: existing.id },
    data: updateData,
  });

  // Also release availability slots if cancelled
  if (status === "CANCELLED" && existing.staffId) {
    await db.availabilitySlot.updateMany({
      where: {
        salonId: existing.salonId,
        staffId: existing.staffId,
        date: existing.date,
        startTime: existing.startTime,
      },
      data: { status: "AVAILABLE", holdId: null },
    });
  }

  // Audit log
  await audit(db, {
    customerId: existing.customerId,
    action: status === "CANCELLED" ? "BOOKING_CANCELLED" : (status === "COMPLETED" ? "BOOKING_COMPLETED" : "BOOKING_CREATED"),
    entityType: "booking",
    entityId: existing.id,
    details: { updatedBy: req.role || "SALON_PARTNER", previousStatus: existing.status, newStatus: status },
  });

  return sendSuccess(res, bookingResponse(updated), `Booking status updated to ${status}`);
}

router.post("/:bookingId/rebook", requireAuth, validateParams(bookingIdParam), rebook);
router.get("/salon/:salonId", requireAuth, validateParams(z.object({ salonId: z.string().uuid() })), validateQuery(salonListQuery), listForSalon);
router.patch("/:bookingId/status", requireAuth, validateParams(bookingIdParam), validateBody(statusUpdateSchema), updateSalonBookingStatus);

export default router;
