import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') || 'ALL_LOCATIONS';
  const country = url.searchParams.get('country') || 'All Countries';
  const state = url.searchParams.get('state') || 'ALL';
  const city = url.searchParams.get('city') || 'ALL';
  const locality = url.searchParams.get('locality') || 'ALL';
  const dateRange = url.searchParams.get('dateRange') || url.searchParams.get('range') || '30days';
  const customStartDate = url.searchParams.get('startDate') || '';
  const customEndDate = url.searchParams.get('endDate') || '';

  // 1. Resolve Date Filter Boundaries
  const now = new Date();
  let startDate: Date = new Date();
  let endDate: Date = new Date();

  if (dateRange === 'today') {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (dateRange === 'yesterday') {
    startDate.setDate(now.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(now.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else if (dateRange === '7days') {
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else if (dateRange === '30days') {
    startDate.setDate(now.getDate() - 30);
  } else if (dateRange === '90days') {
    startDate.setDate(now.getDate() - 90);
  } else if (dateRange === 'thismonth') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (dateRange === 'lastmonth') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (dateRange === 'thisyear') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else if (dateRange === 'custom') {
    let sStr = customStartDate;
    let eStr = customEndDate;
    if (sStr && eStr && sStr > eStr) {
      const tmp = sStr;
      sStr = eStr;
      eStr = tmp;
    }
    if (sStr) {
      startDate = new Date(sStr + 'T00:00:00');
    }
    if (eStr) {
      endDate = new Date(eStr + 'T23:59:59.999');
    }
  } else {
    // All time
    startDate = new Date(2020, 0, 1);
  }

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startDateStr = formatLocalDate(startDate);
  const endDateStr = formatLocalDate(endDate);

  // 2. Fetch all configured location records for building dependent dropdown hierarchies
  const allConfiguredLocations = await prisma.location.findMany({
    orderBy: [{ cityName: 'asc' }, { localityName: 'asc' }],
  });

  // Extract cities belonging to a state if state filter is applied
  let stateFilteredCities: string[] = [];
  if (state && state !== 'ALL') {
    stateFilteredCities = Array.from(
      new Set(
        allConfiguredLocations
          .filter((loc) => loc.state.toLowerCase() === state.toLowerCase())
          .map((loc) => loc.cityName)
      )
    );
  }

  // 3. Build Location Filtering Clauses
  const salonWhere: any = {};
  const customerWhere: any = {};
  const bookingWhere: any = {};
  const paymentWhere: any = {};

  if (scope === 'UNASSIGNED') {
    salonWhere.OR = [{ city: '' }, { locality: '' }];
    customerWhere.OR = [{ city: '' }, { locality: '' }];
    bookingWhere.salon = { OR: [{ city: '' }, { locality: '' }] };
  } else if (scope !== 'ALL_LOCATIONS') {
    if (locality && locality !== 'ALL') {
      salonWhere.locality = locality;
      customerWhere.locality = locality;
      bookingWhere.salon = { ...(bookingWhere.salon || {}), locality };
      paymentWhere.salon = { ...(paymentWhere.salon || {}), locality };
    }
    if (city && city !== 'ALL') {
      salonWhere.city = city;
      customerWhere.city = city;
      bookingWhere.salon = { ...(bookingWhere.salon || {}), city };
      paymentWhere.salon = { ...(paymentWhere.salon || {}), city };
    } else if (state && state !== 'ALL' && stateFilteredCities.length > 0) {
      salonWhere.city = { in: stateFilteredCities };
      customerWhere.city = { in: stateFilteredCities };
      bookingWhere.salon = { ...(bookingWhere.salon || {}), city: { in: stateFilteredCities } };
      paymentWhere.salon = { ...(paymentWhere.salon || {}), city: { in: stateFilteredCities } };
    }
  }

  // 4. Booking Date Range Clause
  if (dateRange !== 'all') {
    bookingWhere.appointmentDate = { gte: startDateStr, lte: endDateStr };
    paymentWhere.createdAt = { gte: startDate, lte: endDate };
  }

  // 5. Aggregate Customer Metrics
  const [totalCustomers, activeCustomers, suspendedCustomers, newCustomersPeriod, returningCustomers] =
    await Promise.all([
      prisma.customer.count({ where: customerWhere }),
      prisma.customer.count({ where: { ...customerWhere, status: 'ACTIVE' } }),
      prisma.customer.count({ where: { ...customerWhere, status: 'SUSPENDED' } }),
      prisma.customer.count({
        where: {
          ...customerWhere,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.customer.count({
        where: {
          ...customerWhere,
          bookingCount: { gt: 1 },
        },
      }),
    ]);

  // 6. Aggregate Salon Metrics
  const [
    totalSalons,
    approvedSalons,
    pendingSalons,
    rejectedSalons,
    suspendedSalons,
    operationallyOpenSalons,
  ] = await Promise.all([
    prisma.salon.count({ where: salonWhere }),
    prisma.salon.count({ where: { ...salonWhere, applicationStatus: 'APPROVED' } }),
    prisma.salon.count({ where: { ...salonWhere, applicationStatus: 'PENDING' } }),
    prisma.salon.count({ where: { ...salonWhere, applicationStatus: 'REJECTED' } }),
    prisma.salon.count({ where: { ...salonWhere, applicationStatus: 'SUSPENDED' } }),
    prisma.salon.count({
      where: { ...salonWhere, applicationStatus: 'APPROVED', operationalStatus: 'OPEN' },
    }),
  ]);

  // 7. Aggregate Booking Metrics
  const todayStr = now.toISOString().split('T')[0];
  const [
    totalBookings,
    todayBookings,
    upcomingBookings,
    pendingBookings,
    completedBookings,
    cancelledBookings,
    noShowBookings,
  ] = await Promise.all([
    prisma.booking.count({ where: bookingWhere }),
    prisma.booking.count({
      where: {
        ...bookingWhere,
        appointmentDate: todayStr,
      },
    }),
    prisma.booking.count({
      where: {
        ...bookingWhere,
        appointmentDate: { gte: todayStr },
        bookingStatus: { in: ['CONFIRMED', 'PENDING'] },
      },
    }),
    prisma.booking.count({ where: { ...bookingWhere, bookingStatus: 'PENDING' } }),
    prisma.booking.count({ where: { ...bookingWhere, bookingStatus: 'COMPLETED' } }),
    prisma.booking.count({ where: { ...bookingWhere, bookingStatus: 'CANCELLED' } }),
    prisma.booking.count({ where: { ...bookingWhere, bookingStatus: 'NO_SHOW' } }),
  ]);

  // 8. Financial Reconciliations & Calculations (Strict StyleSync Revenue Model)
  // - 7% commission on eligible new customer bookings
  // - 2% commission on eligible repeat customer bookings
  // - Gross Booking Value = sum of price of all bookings (excluding cancelled)
  // - Amount Collected = sum of successful payment records
  // - Platform Commission = sum of commissionAmount on completed/paid bookings
  // - Salon Payable = sum of salonPayoutAmount on collected transactions
  const [
    grossBookingAggregate,
    collectedPaymentsAggregate,
    pendingPaymentsAggregate,
    failedPaymentsCount,
    refundsAggregate,
  ] = await Promise.all([
    prisma.booking.aggregate({
      where: { ...bookingWhere, bookingStatus: { not: 'CANCELLED' } },
      _sum: { price: true, commissionAmount: true, salonPayoutAmount: true },
    }),
    prisma.payment.aggregate({
      where: { ...paymentWhere, status: 'SUCCESS' },
      _sum: { amount: true, commissionAmount: true, salonPayoutAmount: true },
    }),
    prisma.payment.aggregate({
      where: { ...paymentWhere, status: 'PENDING' },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: { ...paymentWhere, status: 'FAILED' },
    }),
    prisma.refund.aggregate({
      where: {
        status: 'PROCESSED',
        ...(dateRange !== 'all' ? { createdAt: { gte: startDate, lte: endDate } } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  const grossBookingValue = grossBookingAggregate._sum.price || 0;
  const paymentsCollected = collectedPaymentsAggregate._sum.amount || 0;
  const pendingPayments = pendingPaymentsAggregate._sum.amount || 0;
  const platformCommission = collectedPaymentsAggregate._sum.commissionAmount || 0;
  const salonPayable = collectedPaymentsAggregate._sum.salonPayoutAmount || 0;
  const refundsTotal = refundsAggregate._sum.amount || 0;

  // 9. Operational & Telemetry Metrics
  const ticketWhere: any = {};
  const reviewWhere: any = {};
  if (salonWhere.city) {
    ticketWhere.salon = { city: salonWhere.city };
    reviewWhere.salon = { city: salonWhere.city };
  }

  const [openSupportTickets, reportedReviews, unreadNotifications, aiOperationsCount, aiTokensUsed] =
    await Promise.all([
      prisma.supportTicket.count({
        where: {
          ...ticketWhere,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          ...(dateRange !== 'all' ? { createdAt: { gte: startDate, lte: endDate } } : {}),
        },
      }),
      prisma.review.count({
        where: {
          ...reviewWhere,
          reportStatus: 'REPORTED',
          ...(dateRange !== 'all' ? { createdAt: { gte: startDate, lte: endDate } } : {}),
        },
      }),
      prisma.adminNotification.count({ where: { read: false } }),
      prisma.aIOperation.count({
        where: dateRange !== 'all' ? { createdAt: { gte: startDate, lte: endDate } } : {},
      }),
      prisma.aIOperation.aggregate({
        where: dateRange !== 'all' ? { createdAt: { gte: startDate, lte: endDate } } : {},
        _sum: { tokensUsed: true },
      }),
    ]);

  // 10. Chart Trajectory: Daily Trends (within selected scope)
  const chartDays: { date: string; label: string; bookings: number; revenue: number; commission: number }[] = [];
  const daysToShow = dateRange === '7days' ? 7 : (dateRange === 'today' || dateRange === 'yesterday' ? 1 : 14);

  for (let d = daysToShow - 1; d >= 0; d--) {
    const target = new Date();
    target.setDate(now.getDate() - d);
    const dayStr = target.toISOString().split('T')[0];
    const dayName = target.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });

    const dayBookings = await prisma.booking.findMany({
      where: {
        ...bookingWhere,
        appointmentDate: dayStr,
      },
      select: { price: true, commissionAmount: true, bookingStatus: true },
    });

    const bCount = dayBookings.length;
    const rev = dayBookings.reduce((sum, b) => (b.bookingStatus !== 'CANCELLED' ? sum + b.price : sum), 0);
    const comm = dayBookings.reduce((sum, b) => (b.bookingStatus !== 'CANCELLED' ? sum + b.commissionAmount : sum), 0);

    chartDays.push({
      date: dayStr,
      label: dayName,
      bookings: bCount,
      revenue: Math.round(rev),
      commission: Math.round(comm),
    });
  }

  // 11. Top Services in Scope
  const popularServicesData = await prisma.booking.groupBy({
    by: ['serviceId'],
    where: bookingWhere,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });

  const popularServices = await Promise.all(
    popularServicesData.map(async (item) => {
      const s = await prisma.globalService.findUnique({
        where: { id: item.serviceId },
        select: { name: true, basePrice: true },
      });
      return {
        name: s?.name || 'Service',
        count: item._count.id,
        price: s?.basePrice || 0,
      };
    })
  );

  // 12. City Distribution (for pie/breakdown)
  const cityDistribution = await prisma.salon.groupBy({
    by: ['city'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  // Build Location Hierarchy for Dependent Dropdowns
  const locationHierarchy: Record<string, { states: Record<string, { cities: Record<string, string[]> }> }> = {
    India: { states: {} },
  };

  allConfiguredLocations.forEach((loc) => {
    const c = 'India';
    const s = loc.state || 'General';
    const ci = loc.cityName || 'General';
    const l = loc.localityName;

    if (!locationHierarchy[c].states[s]) {
      locationHierarchy[c].states[s] = { cities: {} };
    }
    if (!locationHierarchy[c].states[s].cities[ci]) {
      locationHierarchy[c].states[s].cities[ci] = [];
    }
    if (!locationHierarchy[c].states[s].cities[ci].includes(l)) {
      locationHierarchy[c].states[s].cities[ci].push(l);
    }
  });

  return NextResponse.json({
    filterScope: {
      scope,
      country,
      state,
      city,
      locality,
      dateRange,
      startDate: startDateStr,
      endDate: endDateStr,
    },
    locationHierarchy,
    metrics: {
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        suspended: suspendedCustomers,
        newThisPeriod: newCustomersPeriod,
        returning: returningCustomers,
      },
      salons: {
        total: totalSalons,
        approved: approvedSalons,
        pending: pendingSalons,
        rejected: rejectedSalons,
        suspended: suspendedSalons,
        operationallyOpen: operationallyOpenSalons,
      },
      bookings: {
        total: totalBookings,
        today: todayBookings,
        upcoming: upcomingBookings,
        pending: pendingBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        noShow: noShowBookings,
      },
      finance: {
        grossBookingValue,
        paymentsCollected,
        pendingPayments,
        failedPaymentsCount,
        platformCommission,
        salonPayable,
        refundsTotal,
        netPlatformRevenue: platformCommission,
      },
      operational: {
        openSupportTickets,
        reportedReviews,
        unreadNotifications,
        aiOperationsCount,
        aiTokensUsed: aiTokensUsed._sum.tokensUsed || 0,
      },
    },
    charts: {
      dailyTrends: chartDays,
      popularServices,
      statusDistribution: [
        { name: 'Completed', value: completedBookings, color: '#0F766E' },
        { name: 'Confirmed', value: upcomingBookings, color: '#0284C7' },
        { name: 'Pending', value: pendingBookings, color: '#F59E0B' },
        { name: 'Cancelled', value: cancelledBookings, color: '#EF4444' },
        { name: 'No-Show', value: noShowBookings, color: '#6B7280' },
      ],
      cityDistribution: cityDistribution.map((cd) => ({
        city: cd.city,
        salonCount: cd._count.id,
      })),
    },
    timestamp: new Date().toISOString(),
  });
}
