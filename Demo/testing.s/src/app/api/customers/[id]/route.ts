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
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      bookings: {
        include: {
          salon: { select: { id: true, name: true, locality: true } },
          service: { select: { id: true, name: true } },
          staff: { select: { id: true, name: true } },
          payment: true,
        },
        orderBy: { appointmentDate: 'desc' },
      },
      reviews: {
        include: {
          salon: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      supportTickets: {
        orderBy: { createdAt: 'desc' },
      },
      payments: {
        include: {
          refunds: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  }

  return NextResponse.json({ customer });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const { id } = await params;
  const body = await req.json();
  const { status, name, phone, locality, city } = body;

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
      ...(locality ? { locality } : {}),
      ...(city ? { city } : {}),
    },
  });

  // Log action
  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: status && status !== existing.status ? `CUSTOMER_STATUS_${status}` : 'CUSTOMER_UPDATED',
    entityType: 'Customer',
    entityId: id,
    details: { previous: existing, updated },
  });

  return NextResponse.json({ customer: updated });
}
