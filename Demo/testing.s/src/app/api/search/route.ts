import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';

  if (!q || q.length < 2) {
    return NextResponse.json({
      customers: [],
      salons: [],
      bookings: [],
      services: [],
      tickets: [],
    });
  }

  const [customers, salons, bookings, services, tickets] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true, status: true },
      take: 5,
    }),
    prisma.salon.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { locality: { contains: q } },
          { ownerName: { contains: q } },
        ],
      },
      select: { id: true, name: true, locality: true, applicationStatus: true },
      take: 5,
    }),
    prisma.booking.findMany({
      where: {
        OR: [
          { bookingNumber: { contains: q } },
          { customer: { name: { contains: q } } },
          { salon: { name: { contains: q } } },
        ],
      },
      select: {
        id: true,
        bookingNumber: true,
        appointmentDate: true,
        bookingStatus: true,
        customer: { select: { name: true } },
        salon: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.globalService.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: { id: true, name: true, basePrice: true, category: { select: { name: true } } },
      take: 5,
    }),
    prisma.supportTicket.findMany({
      where: {
        OR: [
          { ticketNumber: { contains: q } },
          { subject: { contains: q } },
        ],
      },
      select: { id: true, ticketNumber: true, subject: true, status: true, priority: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    query: q,
    customers,
    salons,
    bookings,
    services,
    tickets,
  });
}
