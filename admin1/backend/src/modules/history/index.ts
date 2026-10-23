/**
 * Customer History module — aggregated customer activity.
 * ------------------------------------------------------------
 * Endpoints (all require auth):
 *   GET /api/v1/history                    → full history summary
 *   GET /api/v1/history/salons             → previously visited salons
 *   GET /api/v1/history/services           → previously booked services
 *   GET /api/v1/history/staff              → previously booked staff
 *   GET /api/v1/history/stats              → booking stats (totals)
 *
 * All data is scoped to the authenticated customer's customerId
 * (from the JWT). Customer A can NEVER see Customer B's history.
 */

import { Router } from "express";
import { getDb } from "../../database";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";

export const router = Router();

/** GET /api/v1/history — full summary (salons + services + staff + stats) */
async function fullHistory(req: AuthenticatedRequest, res: any, _next: any) {
  const db = getDb();
  const customerId = req.customerId!;

  // Get all bookings for this customer
  const bookings = await db.booking.findMany({
    where: { customerId },
    orderBy: { date: "desc" },
    select: {
      id: true, bookingId: true, salonId: true, salonName: true,
      serviceId: true, serviceName: true, staffId: true, staffName: true,
      date: true, startTime: true, endTime: true, duration: true,
      price: true, status: true, paymentStatus: true, createdAt: true,
    },
  }).catch((e) => { throw Errors.database("Could not load history.", e); });

  // Unique salons visited
  const salonMap = new Map<string, { salonId: string; salonName: string; visitCount: number; lastVisit: Date }>();
  const serviceMap = new Map<string, { serviceId: string; serviceName: string; bookingCount: number }>();
  const staffMap = new Map<string, { staffId: string; staffName: string; bookingCount: number }>();

  let totalBookings = bookings.length;
  let completedBookings = 0;
  let cancelledBookings = 0;
  let upcomingBookings = 0;
  let totalSpent = 0;

  for (const b of bookings) {
    // Salon aggregation
    if (!salonMap.has(b.salonId)) {
      salonMap.set(b.salonId, { salonId: b.salonId, salonName: b.salonName, visitCount: 0, lastVisit: b.date });
    }
    const salon = salonMap.get(b.salonId)!;
    salon.visitCount++;
    if (b.date > salon.lastVisit) salon.lastVisit = b.date;

    // Service aggregation
    if (b.serviceId && !serviceMap.has(b.serviceId)) {
      serviceMap.set(b.serviceId, { serviceId: b.serviceId, serviceName: b.serviceName, bookingCount: 0 });
    }
    if (b.serviceId) serviceMap.get(b.serviceId)!.bookingCount++;

    // Staff aggregation
    if (b.staffId && b.staffName) {
      if (!staffMap.has(b.staffId)) {
        staffMap.set(b.staffId, { staffId: b.staffId, staffName: b.staffName, bookingCount: 0 });
      }
      staffMap.get(b.staffId)!.bookingCount++;
    }

    // Stats
    switch (b.status) {
      case "COMPLETED": completedBookings++; totalSpent += b.price; break;
      case "CANCELLED": cancelledBookings++; break;
      case "CONFIRMED":
      case "PENDING":
        if (b.date >= new Date()) upcomingBookings++;
        break;
    }
  }

  // Recent services (last 5)
  const recentServices = bookings
    .filter((b: any) => b.status === "COMPLETED")
    .slice(0, 5)
    .map((b: any) => ({
      bookingId: b.bookingId, serviceName: b.serviceName, salonName: b.salonName,
      date: b.date, price: b.price,
    }));

  return sendSuccess(res, {
    stats: {
      totalBookings,
      completedBookings,
      cancelledBookings,
      upcomingBookings,
      totalSpent,
    },
    salons: Array.from(salonMap.values()).sort((a, b) => b.visitCount - a.visitCount),
    services: Array.from(serviceMap.values()).sort((a, b) => b.bookingCount - a.bookingCount),
    staff: Array.from(staffMap.values()).sort((a, b) => b.bookingCount - a.bookingCount),
    recentServices,
    recentBookings: bookings.slice(0, 10),
  });
}

/** GET /api/v1/history/salons — previously visited salons */
async function salons(req: AuthenticatedRequest, res: any, _next: any) {
  const db = getDb();
  const customerId = req.customerId!;

  const bookings = await db.booking.findMany({
    where: { customerId, status: { in: ["COMPLETED", "CONFIRMED"] } },
    select: { salonId: true, salonName: true, date: true, status: true },
    orderBy: { date: "desc" },
  }).catch((e) => { throw Errors.database("Could not load salon history.", e); });

  const salonMap = new Map<string, { salonId: string; salonName: string; visitCount: number; lastVisit: any; lastStatus: string }>();
  for (const b of bookings) {
    if (!salonMap.has(b.salonId)) {
      salonMap.set(b.salonId, { salonId: b.salonId, salonName: b.salonName, visitCount: 0, lastVisit: b.date, lastStatus: b.status });
    }
    const salon = salonMap.get(b.salonId)!;
    salon.visitCount++;
    if (b.date > salon.lastVisit) {
      salon.lastVisit = b.date;
      salon.lastStatus = b.status;
    }
  }

  return sendSuccess(res, Array.from(salonMap.values()).sort((a, b) => b.lastVisit > a.lastVisit ? 1 : -1));
}

/** GET /api/v1/history/services — previously booked services */
async function services(req: AuthenticatedRequest, res: any, _next: any) {
  const db = getDb();
  const customerId = req.customerId!;

  const bookings = await db.booking.findMany({
    where: { customerId },
    select: { serviceId: true, serviceName: true, date: true, price: true, status: true },
    orderBy: { date: "desc" },
  }).catch((e) => { throw Errors.database("Could not load service history.", e); });

  const serviceMap = new Map<string, { serviceId: string; serviceName: string; bookingCount: number; lastPrice: number; lastDate: any }>();
  for (const b of bookings) {
    if (!b.serviceId) continue;
    if (!serviceMap.has(b.serviceId)) {
      serviceMap.set(b.serviceId, { serviceId: b.serviceId, serviceName: b.serviceName, bookingCount: 0, lastPrice: b.price, lastDate: b.date });
    }
    const svc = serviceMap.get(b.serviceId)!;
    svc.bookingCount++;
    if (b.date > svc.lastDate) {
      svc.lastPrice = b.price;
      svc.lastDate = b.date;
    }
  }

  return sendSuccess(res, Array.from(serviceMap.values()).sort((a, b) => b.bookingCount - a.bookingCount));
}

/** GET /api/v1/history/staff — previously booked staff */
async function staff(req: AuthenticatedRequest, res: any, _next: any) {
  const db = getDb();
  const customerId = req.customerId!;

  const bookings = await db.booking.findMany({
    where: { customerId },
    select: { staffId: true, staffName: true, date: true, serviceName: true },
    orderBy: { date: "desc" },
  }).catch((e) => { throw Errors.database("Could not load staff history.", e); });

  const staffMap = new Map<string, { staffId: string; staffName: string; bookingCount: number; lastService: string; lastDate: any }>();
  for (const b of bookings) {
    if (!b.staffId || !b.staffName) continue;
    if (!staffMap.has(b.staffId)) {
      staffMap.set(b.staffId, { staffId: b.staffId, staffName: b.staffName, bookingCount: 0, lastService: b.serviceName, lastDate: b.date });
    }
    const s = staffMap.get(b.staffId)!;
    s.bookingCount++;
    if (b.date > s.lastDate) {
      s.lastService = b.serviceName;
      s.lastDate = b.date;
    }
  }

  return sendSuccess(res, Array.from(staffMap.values()).sort((a, b) => b.bookingCount - a.bookingCount));
}

/** GET /api/v1/history/stats — booking stats */
async function stats(req: AuthenticatedRequest, res: any, _next: any) {
  const db = getDb();
  const customerId = req.customerId!;

  const bookings = await db.booking.findMany({
    where: { customerId },
    select: { status: true, price: true, date: true },
  }).catch((e) => { throw Errors.database("Could not load stats.", e); });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statsData = {
    totalBookings: bookings.length,
    completedBookings: bookings.filter((b: any) => b.status === "COMPLETED").length,
    cancelledBookings: bookings.filter((b: any) => b.status === "CANCELLED").length,
    upcomingBookings: bookings.filter((b: any) =>
      ["PENDING", "CONFIRMED"].includes(b.status) && b.date >= today
    ).length,
    totalSpent: bookings
      .filter((b: any) => b.status === "COMPLETED")
      .reduce((sum: number, b: any) => sum + b.price, 0),
    favoriteServices: [] as { serviceName: string; count: number }[],
  };

  // Compute favorite services (most booked)
  const svcMap = new Map<string, number>();
  for (const b of bookings) {
    const key = (b as any).serviceName || "Unknown";
    svcMap.set(key, (svcMap.get(key) || 0) + 1);
  }
  statsData.favoriteServices = Array.from(svcMap.entries())
    .map(([serviceName, count]) => ({ serviceName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return sendSuccess(res, statsData);
}

router.get("/", requireAuth, fullHistory);
router.get("/salons", requireAuth, salons);
router.get("/services", requireAuth, services);
router.get("/staff", requireAuth, staff);
router.get("/stats", requireAuth, stats);

export default router;
