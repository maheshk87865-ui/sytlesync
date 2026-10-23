import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const salonId = url.searchParams.get('salonId') || '';
  const customerId = url.searchParams.get('customerId') || '';
  const serviceId = url.searchParams.get('serviceId') || '';
  const bookingStatus = url.searchParams.get('bookingStatus') || '';
  const paymentStatus = url.searchParams.get('paymentStatus') || '';
  const city = url.searchParams.get('city') || '';
  const dateFrom = url.searchParams.get('dateFrom') || '';
  const dateTo = url.searchParams.get('dateTo') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const whereClause: any = {};
  if (salonId && salonId !== 'ALL') whereClause.salonId = salonId;
  if (city && city !== 'ALL') whereClause.salon = { city };
  if (customerId && customerId !== 'ALL') whereClause.customerId = customerId;
  if (serviceId && serviceId !== 'ALL') whereClause.serviceId = serviceId;
  if (bookingStatus && bookingStatus !== 'ALL') whereClause.bookingStatus = bookingStatus;
  if (paymentStatus && paymentStatus !== 'ALL') whereClause.paymentStatus = paymentStatus;
  if (dateFrom && dateTo) {
    whereClause.appointmentDate = { gte: dateFrom, lte: dateTo };
  } else if (dateFrom) {
    whereClause.appointmentDate = { gte: dateFrom };
  } else if (dateTo) {
    whereClause.appointmentDate = { lte: dateTo };
  }

  if (search) {
    whereClause.OR = [
      { bookingNumber: { contains: search } },
      { customer: { name: { contains: search } } },
      { salon: { name: { contains: search } } },
      { salon: { city: { contains: search } } },
      { salon: { locality: { contains: search } } },
      { service: { name: { contains: search } } },
    ];
  }

  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where: whereClause }),
    prisma.booking.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        salon: { select: { id: true, name: true, locality: true, city: true } },
        service: { select: { id: true, name: true, durationMin: true } },
        staff: { select: { id: true, name: true, role: true } },
        payment: true,
      },
    }),
  ]);

  return NextResponse.json({
    bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
