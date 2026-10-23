import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

function parseDateParts(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month: month - 1, day };
}

function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const salonId = url.searchParams.get('salonId') || '';
  const staffId = url.searchParams.get('staffId') || '';
  const bookingStatus = url.searchParams.get('bookingStatus') || '';
  const date = url.searchParams.get('date') || '2026-10-13';
  const view = url.searchParams.get('view') || 'week'; // day, week, month

  const whereClause: any = {};
  if (salonId && salonId !== 'ALL') whereClause.salonId = salonId;
  if (staffId && staffId !== 'ALL') whereClause.staffId = staffId;
  if (bookingStatus && bookingStatus !== 'ALL') whereClause.bookingStatus = bookingStatus;

  let startDateStr = date;
  let endDateStr = date;
  let weekDays: string[] = [];
  let monthGrid: Array<{
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }> = [];

  const { year, month, day } = parseDateParts(date);
  const targetDate = new Date(year, month, day);
  const todayStr = formatDateString(new Date());

  if (view === 'day') {
    startDateStr = date;
    endDateStr = date;
    whereClause.appointmentDate = date;
  } else if (view === 'week') {
    // Week starts Monday (1) to Sunday (0)
    const dayOfWeek = targetDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(year, month, day + diffToMonday);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      weekDays.push(formatDateString(d));
    }
    startDateStr = weekDays[0];
    endDateStr = weekDays[6];

    whereClause.appointmentDate = {
      gte: startDateStr,
      lte: endDateStr,
    };
  } else if (view === 'month') {
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    // Calculate grid start (Monday on or before the 1st of month)
    const firstDayOfWeek = firstOfMonth.getDay();
    const diffToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    const gridStart = new Date(year, month, 1 + diffToMonday);

    // Calculate grid end (Sunday on or after the last day of month)
    const lastDayOfWeek = lastOfMonth.getDay();
    const diffToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    const gridEnd = new Date(year, month + 1, diffToSunday);

    startDateStr = formatDateString(gridStart);
    endDateStr = formatDateString(gridEnd);

    // Build day items for the grid
    const curr = new Date(gridStart);
    while (curr <= gridEnd) {
      const dateStr = formatDateString(curr);
      monthGrid.push({
        dateStr,
        dayNumber: curr.getDate(),
        isCurrentMonth: curr.getMonth() === month,
        isToday: dateStr === todayStr || dateStr === '2026-10-13',
      });
      curr.setDate(curr.getDate() + 1);
    }

    whereClause.appointmentDate = {
      gte: startDateStr,
      lte: endDateStr,
    };
  }

  // Load blocked slots setting
  let allBlockedSlots: any[] = [];
  try {
    const blockedSetting = await prisma.platformSetting.findUnique({
      where: { key: 'BLOCKED_SLOTS' },
    });
    if (blockedSetting && blockedSetting.value) {
      allBlockedSlots = JSON.parse(blockedSetting.value);
    }
  } catch (e) {
    allBlockedSlots = [];
  }

  // Filter blocked slots
  const filteredBlockedSlots = allBlockedSlots.filter((slot: any) => {
    if (slot.date < startDateStr || slot.date > endDateStr) return false;
    if (salonId && salonId !== 'ALL' && slot.salonId !== salonId) return false;
    if (staffId && staffId !== 'ALL' && slot.staffId && slot.staffId !== staffId) return false;
    return true;
  });

  const [bookings, salons, staff] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        salon: { select: { id: true, name: true, locality: true, city: true, address: true, businessHoursJson: true } },
        service: {
          select: {
            id: true,
            name: true,
            durationMin: true,
            basePrice: true,
            category: { select: { id: true, name: true } },
          },
        },
        staff: { select: { id: true, name: true, role: true, phone: true, isAvailable: true } },
        payment: {
          select: {
            id: true,
            transactionNumber: true,
            amount: true,
            paymentMethod: true,
            status: true,
            salonPayoutAmount: true,
            commissionAmount: true,
          },
        },
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.salon.findMany({
      where: { applicationStatus: 'APPROVED' },
      select: {
        id: true,
        name: true,
        locality: true,
        city: true,
        address: true,
        businessHoursJson: true,
      },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    }),
    prisma.salonStaff.findMany({
      select: { id: true, name: true, salonId: true, role: true, isAvailable: true, phone: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Compute status metrics for the returned period
  const summary = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.bookingStatus === 'CONFIRMED').length,
    completed: bookings.filter((b) => b.bookingStatus === 'COMPLETED').length,
    pending: bookings.filter((b) => b.bookingStatus === 'PENDING').length,
    cancelled: bookings.filter((b) => b.bookingStatus === 'CANCELLED').length,
    noShow: bookings.filter((b) => b.bookingStatus === 'NO_SHOW').length,
    blocked: filteredBlockedSlots.length,
  };

  return NextResponse.json({
    currentDate: date,
    view,
    startDate: startDateStr,
    endDate: endDateStr,
    weekDays,
    monthGrid,
    bookings,
    blockedSlots: filteredBlockedSlots,
    salons,
    staff,
    summary,
  });
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  try {
    const body = await req.json();
    const { action } = body;

    // 1. BLOCK TIME SLOT
    if (action === 'BLOCK_SLOT') {
      const { salonId, staffId, date, startTime, endTime, reason } = body;

      if (!salonId || !date || !startTime || !endTime) {
        return NextResponse.json(
          { error: 'Salon, date, start time, and end time are required.' },
          { status: 400 }
        );
      }

      if (startTime >= endTime) {
        return NextResponse.json(
          { error: 'Start time must be earlier than end time.' },
          { status: 400 }
        );
      }

      // Conflict validation: Check if active booking exists during this time slot
      const overlappingBooking = await prisma.booking.findFirst({
        where: {
          salonId,
          appointmentDate: date,
          bookingStatus: { notIn: ['CANCELLED', 'NO_SHOW'] },
          OR: [
            { startTime: { lt: endTime }, endTime: { gt: startTime } },
          ],
        },
        include: { customer: { select: { name: true } } },
      });

      if (overlappingBooking) {
        return NextResponse.json(
          {
            error: `Conflict: An active appointment (${overlappingBooking.bookingNumber} for ${overlappingBooking.customer?.name || 'Customer'}) is booked from ${overlappingBooking.startTime} to ${overlappingBooking.endTime}.`,
          },
          { status: 409 }
        );
      }

      // Read current blocked slots
      let list: any[] = [];
      const currentSetting = await prisma.platformSetting.findUnique({
        where: { key: 'BLOCKED_SLOTS' },
      });
      if (currentSetting && currentSetting.value) {
        try {
          list = JSON.parse(currentSetting.value);
        } catch {
          list = [];
        }
      }

      // Check if duplicate block already exists
      const alreadyBlocked = list.find(
        (b) =>
          b.salonId === salonId &&
          b.date === date &&
          b.startTime === startTime &&
          b.endTime === endTime
      );
      if (alreadyBlocked) {
        return NextResponse.json(
          { error: 'This time slot is already marked as blocked.' },
          { status: 400 }
        );
      }

      const newBlock = {
        id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        salonId,
        staffId: staffId || null,
        date,
        startTime,
        endTime,
        reason: reason || 'Administrative Slot Block',
        blockedByAdmin: user.email,
        createdAt: new Date().toISOString(),
      };

      list.push(newBlock);

      await prisma.platformSetting.upsert({
        where: { key: 'BLOCKED_SLOTS' },
        update: { value: JSON.stringify(list) },
        create: {
          key: 'BLOCKED_SLOTS',
          value: JSON.stringify(list),
          category: 'CALENDAR',
          description: 'Administrative calendar slot blocks',
        },
      });

      await recordAuditLog({
        adminId: user.id,
        adminEmail: user.email,
        action: 'CALENDAR_SLOT_BLOCKED',
        entityType: 'CalendarSlot',
        entityId: newBlock.id,
        details: { salonId, date, startTime, endTime, reason },
      });

      return NextResponse.json({ success: true, blockedSlot: newBlock });
    }

    // 2. UNBLOCK TIME SLOT
    if (action === 'UNBLOCK_SLOT') {
      const { slotId } = body;
      if (!slotId) {
        return NextResponse.json({ error: 'Slot ID is required.' }, { status: 400 });
      }

      const currentSetting = await prisma.platformSetting.findUnique({
        where: { key: 'BLOCKED_SLOTS' },
      });
      if (!currentSetting || !currentSetting.value) {
        return NextResponse.json({ error: 'Blocked slot not found.' }, { status: 404 });
      }

      let list = JSON.parse(currentSetting.value);
      const filtered = list.filter((b: any) => b.id !== slotId);

      await prisma.platformSetting.update({
        where: { key: 'BLOCKED_SLOTS' },
        data: { value: JSON.stringify(filtered) },
      });

      await recordAuditLog({
        adminId: user.id,
        adminEmail: user.email,
        action: 'CALENDAR_SLOT_UNBLOCKED',
        entityType: 'CalendarSlot',
        entityId: slotId,
        details: { unblockedBy: user.email },
      });

      return NextResponse.json({ success: true, message: 'Slot unblocked successfully.' });
    }

    // 3. UPDATE BOOKING STATUS
    if (action === 'UPDATE_STATUS') {
      const { bookingId, bookingStatus, cancellationReason } = body;
      if (!bookingId || !bookingStatus) {
        return NextResponse.json(
          { error: 'Booking ID and target status are required.' },
          { status: 400 }
        );
      }

      const existing = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
      }

      const updateData: any = { bookingStatus };
      if (bookingStatus === 'CANCELLED') {
        if (!cancellationReason || !cancellationReason.trim()) {
          return NextResponse.json(
            { error: 'Cancellation reason is mandatory for administrative cancellations.' },
            { status: 400 }
          );
        }
        updateData.cancellationReason = cancellationReason;
        updateData.cancelledBy = `ADMIN (${user.email})`;
      }

      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: updateData,
        include: {
          customer: true,
          salon: true,
          service: true,
          staff: true,
          payment: true,
        },
      });

      await recordAuditLog({
        adminId: user.id,
        adminEmail: user.email,
        action: `CALENDAR_BOOKING_${bookingStatus}`,
        entityType: 'Booking',
        entityId: bookingId,
        details: {
          bookingNumber: existing.bookingNumber,
          fromStatus: existing.bookingStatus,
          toStatus: bookingStatus,
          reason: cancellationReason,
        },
      });

      return NextResponse.json({ success: true, booking: updated });
    }

    return NextResponse.json({ error: 'Invalid calendar action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Calendar POST API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
