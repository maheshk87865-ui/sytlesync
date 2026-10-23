import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const reportStatus = url.searchParams.get('reportStatus') || '';
  const moderationStatus = url.searchParams.get('moderationStatus') || '';
  const salonId = url.searchParams.get('salonId') || '';
  const rating = url.searchParams.get('rating') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  const whereClause: any = {};
  if (reportStatus && reportStatus !== 'ALL') whereClause.reportStatus = reportStatus;
  if (moderationStatus && moderationStatus !== 'ALL') whereClause.moderationStatus = moderationStatus;
  if (salonId && salonId !== 'ALL') whereClause.salonId = salonId;
  if (rating && rating !== 'ALL') whereClause.rating = parseInt(rating, 10);

  if (search) {
    whereClause.OR = [
      { comment: { contains: search } },
      { customer: { name: { contains: search } } },
      { salon: { name: { contains: search } } },
    ];
  }

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where: whereClause }),
    prisma.review.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        salon: { select: { id: true, name: true, locality: true } },
        booking: { select: { id: true, bookingNumber: true, appointmentDate: true } },
      },
    }),
  ]);

  return NextResponse.json({
    reviews,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function PUT(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const body = await req.json();
  const { id, moderationStatus, reportStatus, moderationReason } = body;

  if (!id) {
    return NextResponse.json({ error: 'Review ID is required.' }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({
    where: { id },
    include: { salon: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
  }

  const updated = await prisma.review.update({
    where: { id },
    data: {
      ...(moderationStatus ? { moderationStatus } : {}),
      ...(reportStatus ? { reportStatus } : {}),
      ...(moderationReason !== undefined ? { moderationReason } : {}),
      moderatedByAdminId: user.id,
    },
  });

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: `REVIEW_MODERATION_${moderationStatus || 'UPDATED'}`,
    entityType: 'Review',
    entityId: id,
    details: {
      salonName: existing.salon.name,
      rating: existing.rating,
      moderationStatus: updated.moderationStatus,
      reason: moderationReason,
    },
  });

  return NextResponse.json({ review: updated });
}
