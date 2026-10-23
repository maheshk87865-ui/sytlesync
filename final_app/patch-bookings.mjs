import fs from 'fs';

const file = 'D:/AntiGravity/admin1/backend/src/modules/bookings/index.ts';
let code = fs.readFileSync(file, 'utf8');

const salonBookingRoutes = `
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
    action: \`BOOKING_\${status}\`,
    entityType: "booking",
    entityId: existing.id,
    details: { updatedBy: req.role || "SALON_PARTNER", previousStatus: existing.status, newStatus: status },
  });

  return sendSuccess(res, bookingResponse(updated), \`Booking status updated to \${status}\`);
}
`;

const routeHook = 'router.post("/:bookingId/rebook", requireAuth, validateParams(bookingIdParam), rebook);';
const newRoutes = `router.post("/:bookingId/rebook", requireAuth, validateParams(bookingIdParam), rebook);
router.get("/salon/:salonId", requireAuth, validateParams(z.object({ salonId: z.string().uuid() })), validateQuery(salonListQuery), listForSalon);
router.patch("/:bookingId/status", requireAuth, validateParams(bookingIdParam), validateBody(statusUpdateSchema), updateSalonBookingStatus);`;

code = code.replace(routeHook, salonBookingRoutes + '\n' + newRoutes);
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully patched admin1 bookings with salon endpoints!');
