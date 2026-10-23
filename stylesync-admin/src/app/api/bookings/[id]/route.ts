import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      salon: true,
      service: { include: { category: true } },
      staff: true,
      payment: {
        include: { refunds: true },
      },
      review: true,
      supportTickets: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  return NextResponse.json({ booking });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const { id } = await params;
  const body = await req.json();
  const { bookingStatus, cancellationReason, staffId, notes } = body;

  const existing = await prisma.booking.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  const updateData: any = {};
  if (bookingStatus) {
    updateData.bookingStatus = bookingStatus;
    if (bookingStatus === 'CANCELLED') {
      updateData.cancellationReason = cancellationReason || 'Cancelled by administrator.';
      updateData.cancelledBy = `ADMIN (${user.email})`;
    }
  }
  if (staffId !== undefined) updateData.staffId = staffId;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.booking.update({
    where: { id },
    data: updateData,
  });

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: `BOOKING_STATUS_${bookingStatus || 'UPDATED'}`,
    entityType: 'Booking',
    entityId: id,
    details: {
      bookingNumber: existing.bookingNumber,
      fromStatus: existing.bookingStatus,
      toStatus: updated.bookingStatus,
      reason: cancellationReason,
    },
  });

  return NextResponse.json({ booking: updated });
}
