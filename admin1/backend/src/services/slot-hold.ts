/**
 * Slot Hold Service — temporary reservation during booking.
 * ------------------------------------------------------------
 * When a customer starts the payment/confirmation flow:
 *   1. The slot is put on HOLD (status=HELD, heldUntil=now+10min)
 *   2. If the customer completes booking → hold becomes CONFIRMED, slot becomes BOOKED
 *   3. If the customer abandons or payment fails → hold expires, slot becomes AVAILABLE again
 *
 * Automatic expiration: a background cleanup job (or lazy check on
 * next availability query) releases expired holds.
 */

import type { PrismaClient } from "@prisma/client";
import { Errors } from "../utils/errors";

const HOLD_DURATION_MINUTES = 10; // slots are held for 10 minutes

/**
 * Place a temporary hold on a slot.
 * Called when the customer starts the payment/confirmation flow.
 *
 * Steps:
 *   1. Verify the slot is currently AVAILABLE (server-side check)
 *   2. Verify the staff is available at this time
 *   3. Create a SlotHold record (status=HELD, expiresAt=now+10min)
 *   4. Update the AvailabilitySlot status to HELD
 *
 * Returns the hold record (with holdId) or throws a BackendError.
 */
export async function holdSlot(
  db: PrismaClient,
  opts: {
    customerId: string;
    salonId: string;
    staffId: string;
    serviceId?: string;
    date: Date;
    startTime: string;
    durationMin: number;
    slotIntervalMin?: number;
  }
): Promise<{ holdId: string; expiresAt: Date }> {
  const { customerId, salonId, staffId, serviceId, date, startTime, durationMin, slotIntervalMin = 30 } = opts;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_DURATION_MINUTES * 60 * 1000);

  // 1. Verify the slot is bookable using the slot engine
  const { verifySlotBookable } = await import("./slot-engine");
  const verification = await verifySlotBookable(db, {
    salonId,
    staffId,
    date,
    startTime,
    durationMin,
    slotIntervalMin,
  });

  if (!verification.ok) {
    throw Errors.conflict(verification.reason || "This slot is no longer available.");
  }

  // 2. Create or update the AvailabilitySlot for each sub-slot
  const slotsNeeded = Math.ceil(durationMin / slotIntervalMin);
  const startMins = parseTime(startTime);
  const slotIds: string[] = [];

  for (let i = 0; i < slotsNeeded; i++) {
    const slotStart = minutesToTime(startMins + i * slotIntervalMin);
    const slotEnd = minutesToTime(startMins + (i + 1) * slotIntervalMin);

    // Upsert the slot — create if it doesn't exist, or verify + update if it does
    const existing = await db.availabilitySlot.findFirst({
      where: { salonId, staffId, date, startTime: slotStart },
    }).catch(() => null);

    if (existing && existing.status !== "AVAILABLE") {
      // Check if a HELD slot has expired
      if (existing.status === "HELD" && existing.heldUntil && existing.heldUntil < now) {
        // Expired hold — release it first
        await releaseExpiredHold(db, existing.id).catch(() => {});
      } else {
        throw Errors.conflict(`Slot at ${slotStart} is already ${existing.status}.`);
      }
    }

    // Create or update the slot to HELD
    const slot = await db.availabilitySlot.upsert({
      where: existing
        ? { salonId_staffId_date_startTime: { salonId, staffId, date, startTime: slotStart } }
        : { id: "never-matches" }, // force create if no existing
      create: {
        salonId,
        staffId,
        serviceId: serviceId || null,
        date,
        startTime: slotStart,
        endTime: slotEnd,
        durationMin: slotIntervalMin,
        time: slotStart,
        status: "HELD",
        heldUntil: expiresAt,
      },
      update: {
        status: "HELD",
        heldUntil: expiresAt,
        updatedAt: now,
      },
    }).catch((e: any) => {
      throw Errors.database("Could not hold the slot.", e);
    });

    slotIds.push(slot.id);
  }

  // 3. Create the SlotHold record (linked to the first slot)
  const hold = await db.slotHold.create({
    data: {
      slotId: slotIds[0],
      customerId,
      salonId,
      staffId,
      serviceId: serviceId || null,
      date,
      startTime,
      endTime: minutesToTime(startMins + durationMin),
      status: "HELD",
      expiresAt,
    },
  }).catch((e: any) => {
    throw Errors.database("Could not create the hold.", e);
  });

  // Link the hold to all sub-slots
  await db.availabilitySlot.updateMany({
    where: { id: { in: slotIds } },
    data: { holdId: hold.id, status: "HELD", heldUntil: expiresAt },
  }).catch(() => {});

  return { holdId: hold.id, expiresAt };
}

/**
 * Confirm a hold — converts it from HELD to CONFIRMED and marks
 * the slots as BOOKED. Called when the booking is created.
 */
export async function confirmHold(db: PrismaClient, holdId: string): Promise<void> {
  const hold = await db.slotHold.findUnique({
    where: { id: holdId },
  }).catch(() => null);

  if (!hold) {
    throw Errors.notFound("Hold not found.");
  }
  if (hold.status !== "HELD") {
    throw Errors.conflict("Hold is no longer active.");
  }
  if (hold.expiresAt < new Date()) {
    // Expired — release it
    await releaseHold(db, holdId).catch(() => {});
    throw Errors.conflict("The hold has expired. Please select a new time slot.");
  }

  await db.$transaction(async (tx) => {
    // Mark hold as confirmed
    await tx.slotHold.update({
      where: { id: holdId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    // Mark all linked slots as BOOKED
    // Find all slots for this staff+date+startTime range
    const startMins = parseTime(hold.startTime);
    const endMins = parseTime(hold.endTime);
    const slotIntervalMin = 30; // default
    const slotsNeeded = Math.ceil((endMins - startMins) / slotIntervalMin);

    for (let i = 0; i < slotsNeeded; i++) {
      const slotStart = minutesToTime(startMins + i * slotIntervalMin);
      await tx.availabilitySlot.updateMany({
        where: { salonId: hold.salonId, staffId: hold.staffId, date: hold.date, startTime: slotStart },
        data: { status: "BOOKED", holdId: holdId, heldUntil: null },
      });
    }
  }).catch((e: any) => {
    throw Errors.database("Could not confirm the hold.", e);
  });
}

/**
 * Release a hold — marks it as RELEASED and frees the slots.
 */
export async function releaseHold(db: PrismaClient, holdId: string): Promise<void> {
  const hold = await db.slotHold.findUnique({
    where: { id: holdId },
  }).catch(() => null);

  if (!hold) return;

  await db.$transaction(async (tx) => {
    await tx.slotHold.update({
      where: { id: holdId },
      data: { status: "RELEASED", releasedAt: new Date() },
    });

    // Free all linked slots
    const startMins = parseTime(hold.startTime);
    const endMins = parseTime(hold.endTime);
    const slotIntervalMin = 30;
    const slotsNeeded = Math.ceil((endMins - startMins) / slotIntervalMin);

    for (let i = 0; i < slotsNeeded; i++) {
      const slotStart = minutesToTime(startMins + i * slotIntervalMin);
      await tx.availabilitySlot.updateMany({
        where: {
          salonId: hold.salonId,
          staffId: hold.staffId,
          date: hold.date,
          startTime: slotStart,
          holdId: holdId,
        },
        data: { status: "AVAILABLE", holdId: null, heldUntil: null },
      });
    }
  }).catch(() => {});
}

/**
 * Release an expired hold by slot ID.
 * Called lazily when generating slots or checking availability.
 */
async function releaseExpiredHold(db: PrismaClient, slotId: string): Promise<void> {
  const slot = await db.availabilitySlot.findUnique({
    where: { id: slotId },
    select: { id: true, holdId: true },
  }).catch(() => null);

  if (slot?.holdId) {
    await releaseHold(db, slot.holdId).catch(() => {});
  }
}

/**
 * Clean up all expired holds.
 * Called periodically (or on each availability query) to release
 * slots whose holds have expired.
 */
export async function cleanupExpiredHolds(db: PrismaClient): Promise<number> {
  const now = new Date();

  const expiredHolds = await db.slotHold.findMany({
    where: {
      status: "HELD",
      expiresAt: { lt: now },
    },
    select: { id: true },
  }).catch(() => []);

  for (const hold of expiredHolds) {
    await releaseHold(db, hold.id).catch(() => {});
  }

  // Mark holds as EXPIRED in the DB
  if (expiredHolds.length > 0) {
    await db.slotHold.updateMany({
      where: { id: { in: expiredHolds.map((h: any) => h.id) } },
      data: { status: "EXPIRED" },
    }).catch(() => {});
  }

  return expiredHolds.length;
}

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
