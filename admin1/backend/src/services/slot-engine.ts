/**
 * Slot Generation Engine
 * ------------------------------------------------------------
 * Generates available appointment slots based on:
 *   1. Salon operating hours (openingHours JSON field)
 *   2. Staff availability (workingHours, daysOff, breaks)
 *   3. Service duration (how many consecutive slots are needed)
 *   4. Existing bookings (already BOOKED/HELD slots)
 *   5. Blocked periods (BLOCKED status slots)
 *   6. Breaks (BREAK status slots)
 *   7. Temporary closures (salon.status = temporarily_closed)
 *
 * The engine runs entirely server-side — the frontend never
 * computes availability. It only displays what the API returns.
 *
 * Slot interval: 30 minutes by default (configurable per salon).
 */

import type { PrismaClient } from "@prisma/client";
import { isTodayIST, getCurrentMinutesInIST } from "../utils/helpers";

export type SlotStatus = "AVAILABLE" | "BOOKED" | "BLOCKED" | "BREAK" | "UNAVAILABLE" | "HELD";

export interface GeneratedSlot {
  startTime: string;
  endTime: string;
  durationMin: number;
  status: SlotStatus;
  staffId: string | null;
  staffName: string | null;
  serviceDurationMin: number | null;
  canBook: boolean;
  holdId: string | null;
}

export interface SlotGenerationInput {
  salonId: string;
  serviceId?: string;
  staffId?: string;
  date: Date;
  slotIntervalMin?: number;
}

interface DayHours { open: string; close: string; }

function getDayHours(openingHours: any, date: Date): DayHours | null {
  if (!openingHours) return null;
  const oh = typeof openingHours === "string" ? (() => { try { return JSON.parse(openingHours); } catch { return openingHours; } })() : openingHours;
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayName = dayNames[date.getDay()];
  const dayData = oh?.[dayName];
  if (!dayData || !dayData.open || !dayData.close) return null;
  return { open: dayData.open, close: dayData.close };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isStaffAvailable(staff: any, date: Date, startTime: string, endTime: string): boolean {
  const daysOff = typeof staff.daysOff === "string" ? (() => { try { return JSON.parse(staff.daysOff); } catch { return []; } })() : (staff.daysOff || []);
  if (Array.isArray(daysOff) && daysOff.includes(date.getDay())) return false;

  if (staff.workingHours) {
    const wh = typeof staff.workingHours === "string" ? (() => { try { return JSON.parse(staff.workingHours); } catch { return staff.workingHours; } })() : staff.workingHours;
    const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const dayName = dayNames[date.getDay()];
    const dayHours = wh?.[dayName] || (wh?.start && wh?.end ? { start: wh.start, end: wh.end } : null);
    if (!dayHours || !dayHours.start || !dayHours.end) return false;
    if (timeToMinutes(startTime) < timeToMinutes(dayHours.start) ||
        timeToMinutes(endTime) > timeToMinutes(dayHours.end)) return false;
  }
  const breaks = typeof staff.breaks === "string" ? (() => { try { return JSON.parse(staff.breaks); } catch { return []; } })() : (staff.breaks || []);
  if (Array.isArray(breaks)) {
    for (const brk of breaks) {
      if (!brk.start || !brk.end) continue;
      const slotStart = timeToMinutes(startTime);
      const slotEnd = timeToMinutes(endTime);
      const breakStart = timeToMinutes(brk.start);
      const breakEnd = timeToMinutes(brk.end);
      if (slotStart < breakEnd && slotEnd > breakStart) return false;
    }
  }
  return true;
}

export async function generateSlots(db: PrismaClient, input: SlotGenerationInput): Promise<GeneratedSlot[]> {
  const { salonId, serviceId, staffId, date, slotIntervalMin = 30 } = input;

  const salon = await db.salon.findUnique({
    where: { id: salonId },
    select: { id: true, status: true, openingHours: true },
  });
  if (!salon || salon.status === "closed" || salon.status === "temporarily_closed") return [];

  const dayHours = getDayHours(salon.openingHours, date);
  if (!dayHours) return [];

  const openMinutes = timeToMinutes(dayHours.open);
  const closeMinutes = timeToMinutes(dayHours.close);

  let serviceDurationMin: number | null = null;
  if (serviceId) {
    const service = await db.salonService.findUnique({
      where: { id: serviceId },
      select: { durationMin: true, status: true, isPublished: true },
    });
    if (!service || service.status !== "active" || !service.isPublished) return [];
    serviceDurationMin = service.durationMin;
  }

  let staffMembers: any[] = [];
  if (staffId) {
    const staff = await db.staffMember.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, workingHours: true, breaks: true, daysOff: true, isPublished: true },
    });
    if (staff && staff.isPublished) staffMembers = [staff];
  } else {
    staffMembers = await db.staffMember.findMany({
      where: { salonId, isPublished: true },
      select: { id: true, name: true, workingHours: true, breaks: true, daysOff: true },
    });
  }
  if (staffMembers.length === 0) return [];

  const existingSlots = await db.availabilitySlot.findMany({
    where: { salonId, date },
    select: { id: true, staffId: true, startTime: true, status: true, holdId: true, heldUntil: true },
  }).catch(() => []);

  const existingByStaff: Map<string, Map<string, any>> = new Map();
  for (const slot of existingSlots) {
    if (!slot.staffId) continue;
    if (!existingByStaff.has(slot.staffId)) existingByStaff.set(slot.staffId, new Map());
    existingByStaff.get(slot.staffId)!.set(slot.startTime, slot);
  }

  const slots: GeneratedSlot[] = [];
  const now = new Date();
  const isToday = isTodayIST(date);
  const currentMinutesIST = getCurrentMinutesInIST();

  for (const staff of staffMembers) {
    let currentTime = openMinutes;
    while (currentTime + slotIntervalMin <= closeMinutes) {
      const startTimeStr = minutesToTime(currentTime);
      const endTimeStr = minutesToTime(currentTime + slotIntervalMin);

      if (isToday && currentTime <= currentMinutesIST) {
        slots.push({ startTime: startTimeStr, endTime: endTimeStr, durationMin: slotIntervalMin, status: "UNAVAILABLE", staffId: staff.id, staffName: staff.name, serviceDurationMin, canBook: false, holdId: null });
        currentTime += slotIntervalMin;
        continue;
      }

      if (!isStaffAvailable(staff, date, startTimeStr, endTimeStr)) {
        slots.push({ startTime: startTimeStr, endTime: endTimeStr, durationMin: slotIntervalMin, status: "BREAK", staffId: staff.id, staffName: staff.name, serviceDurationMin, canBook: false, holdId: null });
        currentTime += slotIntervalMin;
        continue;
      }

      const existingSlot = existingByStaff.get(staff.id)?.get(startTimeStr);
      if (existingSlot) {
        let actualStatus = existingSlot.status as SlotStatus;
        if (existingSlot.status === "HELD" && existingSlot.heldUntil && existingSlot.heldUntil < now) {
          actualStatus = "AVAILABLE";
        }
        slots.push({ startTime: startTimeStr, endTime: endTimeStr, durationMin: slotIntervalMin, status: actualStatus, staffId: staff.id, staffName: staff.name, serviceDurationMin, canBook: actualStatus === "AVAILABLE", holdId: existingSlot.holdId });
        currentTime += slotIntervalMin;
        continue;
      }

      let canBook = true;
      if (serviceDurationMin && serviceDurationMin > slotIntervalMin) {
        const slotsNeeded = Math.ceil(serviceDurationMin / slotIntervalMin);
        for (let i = 1; i < slotsNeeded; i++) {
          const checkTime = minutesToTime(currentTime + i * slotIntervalMin);
          const checkEnd = minutesToTime(currentTime + (i + 1) * slotIntervalMin);
          if (currentTime + (i + 1) * slotIntervalMin > closeMinutes) { canBook = false; break; }
          if (!isStaffAvailable(staff, date, checkTime, checkEnd)) { canBook = false; break; }
          const existing = existingByStaff.get(staff.id)?.get(checkTime);
          if (existing && existing.status !== "AVAILABLE" &&
              !(existing.status === "HELD" && existing.heldUntil && existing.heldUntil < now)) {
            canBook = false; break;
          }
        }
      }

      slots.push({ startTime: startTimeStr, endTime: endTimeStr, durationMin: slotIntervalMin, status: "AVAILABLE", staffId: staff.id, staffName: staff.name, serviceDurationMin, canBook, holdId: null });
      currentTime += slotIntervalMin;
    }
  }

  slots.sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    return (a.staffName || "").localeCompare(b.staffName || "");
  });

  return slots;
}

export async function verifySlotBookable(
  db: PrismaClient,
  opts: { salonId: string; staffId: string; date: Date; startTime: string; durationMin: number; slotIntervalMin?: number }
): Promise<{ ok: boolean; reason?: string }> {
  const { salonId, staffId, date, startTime, durationMin, slotIntervalMin = 30 } = opts;
  const now = new Date();

  const salon = await db.salon.findFirst({
    where: { id: salonId, isPublished: true, status: "active" },
    select: { id: true, status: true, openingHours: true },
  });
  if (!salon) return { ok: false, reason: "Salon not found or unavailable." };

  const staff = await db.staffMember.findFirst({
    where: { id: staffId, salonId, isPublished: true },
    select: { id: true, workingHours: true, breaks: true, daysOff: true },
  });
  if (!staff) return { ok: false, reason: "Staff member not found or unavailable." };

  const dayHours = getDayHours(salon.openingHours, date);
  if (!dayHours) return { ok: false, reason: "Salon is closed on this day." };

  const startMins = timeToMinutes(startTime);
  const endMins = startMins + durationMin;
  if (startMins < timeToMinutes(dayHours.open) || endMins > timeToMinutes(dayHours.close)) {
    return { ok: false, reason: "Selected time is outside salon operating hours." };
  }

  // Prevent booking past slots on the current day in Asia/Kolkata
  if (isTodayIST(date) && startMins <= getCurrentMinutesInIST()) {
    return { ok: false, reason: "Selected time slot has already passed." };
  }

  const endTimeStr = minutesToTime(endMins);
  if (!isStaffAvailable(staff, date, startTime, endTimeStr)) {
    return { ok: false, reason: "Staff member is not available at this time." };
  }

  const slotsNeeded = Math.ceil(durationMin / slotIntervalMin);
  for (let i = 0; i < slotsNeeded; i++) {
    const checkTime = minutesToTime(startMins + i * slotIntervalMin);
    const existing = await db.availabilitySlot.findFirst({
      where: { salonId, staffId, date, startTime: checkTime },
      select: { id: true, status: true, heldUntil: true },
    });
    if (existing) {
      if (existing.status === "HELD" && existing.heldUntil && existing.heldUntil < now) continue;
      if (existing.status !== "AVAILABLE") return { ok: false, reason: `Slot at ${checkTime} is already ${existing.status}.` };
    }
    const conflictingBooking = await db.booking.findFirst({
      where: { staffId, date, time: checkTime, status: { in: ["pending", "confirmed"] } },
      select: { id: true },
    });
    if (conflictingBooking) return { ok: false, reason: `Slot at ${checkTime} has a conflicting booking.` };
  }

  return { ok: true };
}
