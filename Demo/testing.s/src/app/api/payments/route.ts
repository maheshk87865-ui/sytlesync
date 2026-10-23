import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const method = url.searchParams.get('method') || '';
  const salonId = url.searchParams.get('salonId') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const whereClause: any = {};
  if (status && status !== 'ALL') whereClause.status = status;
  if (method && method !== 'ALL') whereClause.paymentMethod = method;
  if (salonId && salonId !== 'ALL') whereClause.salonId = salonId;

  if (search) {
    whereClause.OR = [
      { transactionNumber: { contains: search } },
      { customer: { name: { contains: search } } },
      { salon: { name: { contains: search } } },
      { providerRef: { contains: search } },
    ];
  }

  const [total, payments, summary] = await Promise.all([
    prisma.payment.count({ where: whereClause }),
    prisma.payment.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        salon: { select: { id: true, name: true, locality: true } },
        booking: { select: { id: true, bookingNumber: true, appointmentDate: true } },
        refunds: true,
      },
    }),
    prisma.payment.aggregate({
      _sum: {
        amount: true,
        commissionAmount: true,
        salonPayoutAmount: true,
      },
      _count: { id: true },
    }),
  ]);

  const refundsProcessed = await prisma.refund.aggregate({
    where: { status: 'PROCESSED' },
    _sum: { amount: true },
  });

  return NextResponse.json({
    payments,
    summary: {
      totalCollected: summary._sum.amount || 0,
      totalCommission: summary._sum.commissionAmount || 0,
      totalSalonPayable: summary._sum.salonPayoutAmount || 0,
      totalRefunds: refundsProcessed._sum.amount || 0,
      netPlatformRevenue: summary._sum.commissionAmount || 0,
    },
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// Refund processing endpoint
export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const body = await req.json();
  const { paymentId, amount, reason } = body;

  if (!paymentId || !amount || !reason) {
    return NextResponse.json(
      { error: 'Payment ID, refund amount, and reason are required.' },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true, refunds: true },
  });

  if (!payment) {
    return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
  }

  if (payment.status === 'REFUNDED') {
    return NextResponse.json(
      { error: 'This payment has already been refunded in full.' },
      { status: 400 }
    );
  }

  const alreadyRefunded = payment.refunds.reduce((sum, r) => sum + r.amount, 0);
  const refundAmount = parseFloat(amount);

  if (alreadyRefunded + refundAmount > payment.amount) {
    return NextResponse.json(
      { error: `Refund amount cannot exceed remaining charge (₹${payment.amount - alreadyRefunded}).` },
      { status: 400 }
    );
  }

  // Create refund record
  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      amount: refundAmount,
      reason,
      status: 'PROCESSED',
      processedByAdminId: user.id,
    },
  });

  // Update payment and booking statuses if full refund
  const isFullRefund = alreadyRefunded + refundAmount >= payment.amount;
  if (isFullRefund) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED' },
    });

    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paymentStatus: 'REFUNDED', bookingStatus: 'CANCELLED' },
    });
  }

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: 'REFUND_PROCESSED',
    entityType: 'Refund',
    entityId: refund.id,
    details: {
      transactionNumber: payment.transactionNumber,
      amount: refundAmount,
      reason,
      isFullRefund,
    },
  });

  return NextResponse.json({ refund, isFullRefund });
}
