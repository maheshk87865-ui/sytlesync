import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const range = url.searchParams.get('range') || '30days';
  const exportFormat = url.searchParams.get('export');

  // Customer metrics
  const totalCustomers = await prisma.customer.count();
  const repeatCustomers = await prisma.customer.count({
    where: { bookingCount: { gt: 1 } },
  });
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  // Booking metrics
  const totalBookings = await prisma.booking.count();
  const cancelledBookings = await prisma.booking.count({ where: { bookingStatus: 'CANCELLED' } });
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;

  // Financial aggregates
  const finSummary = await prisma.payment.aggregate({
    where: { status: 'SUCCESS' },
    _sum: { amount: true, commissionAmount: true, salonPayoutAmount: true },
  });
  const refundsProcessed = await prisma.refund.aggregate({
    where: { status: 'PROCESSED' },
    _sum: { amount: true },
  });

  const grossBookingValue = finSummary._sum.amount || 0;
  const platformCommission = finSummary._sum.commissionAmount || 0;
  const salonPayable = finSummary._sum.salonPayoutAmount || 0;
  const refundsTotal = refundsProcessed._sum.amount || 0;

  // Salon performance rankings
  const topSalons = await prisma.salon.findMany({
    where: { applicationStatus: 'APPROVED' },
    select: {
      id: true,
      name: true,
      locality: true,
      rating: true,
      reviewCount: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { rating: 'desc' },
    take: 6,
  });

  // Services breakdown
  const popularServicesData = await prisma.booking.groupBy({
    by: ['serviceId'],
    _count: { id: true },
    _sum: { price: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  });

  const topServices = await Promise.all(
    popularServicesData.map(async (item) => {
      const s = await prisma.globalService.findUnique({
        where: { id: item.serviceId },
        select: { name: true, basePrice: true },
      });
      return {
        name: s?.name || 'Service',
        bookings: item._count.id,
        revenue: item._sum.price || 0,
      };
    })
  );

  // If CSV export requested:
  if (exportFormat === 'csv') {
    await recordAuditLog({
      adminId: user.id,
      adminEmail: user.email,
      action: 'ANALYTICS_CSV_EXPORT',
      entityType: 'Report',
      entityId: `ANALYTICS_${range.toUpperCase()}`,
      details: { range },
    });

    const csvRows = [
      'Metric,Value',
      `Total Registered Customers,${totalCustomers}`,
      `Repeat Customer Rate,${repeatRate}%`,
      `Total Bookings Processed,${totalBookings}`,
      `Cancellation Rate,${cancellationRate}%`,
      `Gross Booking Value (INR),₹${grossBookingValue}`,
      `Platform Commission Earned (INR),₹${platformCommission}`,
      `Salon Payouts (INR),₹${salonPayable}`,
      `Processed Refunds (INR),₹${refundsTotal}`,
    ];

    return new Response(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="stylesync-report-${range}.csv"`,
      },
    });
  }

  return NextResponse.json({
    summary: {
      totalCustomers,
      repeatRate,
      totalBookings,
      cancellationRate,
      grossBookingValue,
      platformCommission,
      salonPayable,
      refundsTotal,
      netRevenue: platformCommission,
    },
    topSalons,
    topServices,
  });
}
