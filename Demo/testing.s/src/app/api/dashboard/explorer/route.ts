import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const category = (url.searchParams.get('category') || 'BOOKINGS').toUpperCase();
  const state = url.searchParams.get('state') || 'ALL';
  const city = url.searchParams.get('city') || 'ALL';
  const locality = url.searchParams.get('locality') || 'ALL';
  const status = url.searchParams.get('status') || 'ALL';
  const search = (url.searchParams.get('search') || '').trim();
  const dateRange = url.searchParams.get('dateRange') || '30days';
  const customStartDate = url.searchParams.get('startDate') || '';
  const customEndDate = url.searchParams.get('endDate') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get('limit') || '10', 10)));
  const format = url.searchParams.get('format') || 'json';

  // 1. Resolve State-Filtered Cities if State is selected
  let stateFilteredCities: string[] = [];
  if (state && state !== 'ALL') {
    const locs = await prisma.location.findMany({
      where: { state: { equals: state } },
      select: { cityName: true },
      distinct: ['cityName'],
    });
    stateFilteredCities = locs.map((l) => l.cityName);
  }

  // 2. Resolve Date Range
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

  let records: any[] = [];
  let total = 0;
  let columns: { key: string; label: string }[] = [];
  let summaryText = '';

  const isExport = format === 'csv';
  const queryLimit = isExport ? 2000 : limit;
  const querySkip = isExport ? 0 : (page - 1) * limit;

  // 3. Query Category-Specific Data
  switch (category) {
    case 'CUSTOMERS': {
      columns = [
        { key: 'name', label: 'Customer Name' },
        { key: 'email', label: 'Email Address' },
        { key: 'phone', label: 'Phone' },
        { key: 'city', label: 'City' },
        { key: 'locality', label: 'Locality' },
        { key: 'status', label: 'Status' },
        { key: 'bookingCount', label: 'Bookings' },
        { key: 'totalSpent', label: 'Total Spent (₹)' },
      ];

      const where: any = {};
      if (city !== 'ALL') {
        where.city = city;
      } else if (state !== 'ALL' && stateFilteredCities.length > 0) {
        where.city = { in: stateFilteredCities };
      }
      if (locality !== 'ALL') where.locality = locality;
      if (status !== 'ALL') where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { locality: { contains: search } },
          { city: { contains: search } },
        ];
      }

      [total, records] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          skip: querySkip,
          take: queryLimit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      summaryText = `${total} registered customers matching filters.`;
      break;
    }

    case 'SALONS':
    case 'SALON_APPLICATIONS': {
      columns = [
        { key: 'name', label: 'Salon Name' },
        { key: 'ownerName', label: 'Owner' },
        { key: 'ownerPhone', label: 'Contact' },
        { key: 'city', label: 'City' },
        { key: 'locality', label: 'Locality' },
        { key: 'rating', label: 'Rating' },
        { key: 'applicationStatus', label: 'Application Status' },
        { key: 'operationalStatus', label: 'Operational' },
      ];

      const where: any = {};
      if (city !== 'ALL') {
        where.city = city;
      } else if (state !== 'ALL' && stateFilteredCities.length > 0) {
        where.city = { in: stateFilteredCities };
      }
      if (locality !== 'ALL') where.locality = locality;

      if (category === 'SALON_APPLICATIONS') {
        where.applicationStatus = status !== 'ALL' ? status : 'PENDING';
      } else if (status !== 'ALL') {
        where.applicationStatus = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { ownerName: { contains: search } },
          { ownerPhone: { contains: search } },
          { address: { contains: search } },
          { locality: { contains: search } },
          { city: { contains: search } },
        ];
      }

      [total, records] = await Promise.all([
        prisma.salon.count({ where }),
        prisma.salon.findMany({
          where,
          skip: querySkip,
          take: queryLimit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      summaryText = `${total} salons found across selected territory.`;
      break;
    }

    case 'GLOBAL_SERVICES': {
      columns = [
        { key: 'name', label: 'Service Name' },
        { key: 'categoryName', label: 'Category' },
        { key: 'basePrice', label: 'Base Price (₹)' },
        { key: 'durationMin', label: 'Duration (min)' },
        { key: 'genderTarget', label: 'Gender Target' },
        { key: 'isActive', label: 'Active Status' },
      ];

      const where: any = {};
      if (status === 'ACTIVE') where.isActive = true;
      if (status === 'INACTIVE') where.isActive = false;
      if (search) {
        where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
      }

      const [count, list] = await Promise.all([
        prisma.globalService.count({ where }),
        prisma.globalService.findMany({
          where,
          skip: querySkip,
          take: queryLimit,
          include: { category: true },
          orderBy: { name: 'asc' },
        }),
      ]);
      total = count;
      records = list.map((s) => ({
        ...s,
        categoryName: s.category?.name || 'General',
        isActive: s.isActive ? 'ACTIVE' : 'INACTIVE',
      }));
      summaryText = `${total} standardized global services cataloged.`;
      break;
    }

    case 'PAYMENTS':
    case 'GBV':
    case 'COLLECTIONS':
    case 'COMMISSIONS':
    case 'SALON_PAYABLES': {
      columns = [
        { key: 'transactionNumber', label: 'Transaction #' },
        { key: 'salonName', label: 'Salon Partner' },
        { key: 'city', label: 'City' },
        { key: 'customerName', label: 'Customer' },
        { key: 'amount', label: 'Gross Amount (₹)' },
        { key: 'commissionRule', label: 'Commission Rule' },
        { key: 'commissionAmount', label: 'Commission (₹)' },
        { key: 'salonPayoutAmount', label: 'Salon Payout (₹)' },
        { key: 'paymentMethod', label: 'Method' },
        { key: 'status', label: 'Status' },
        { key: 'createdAtFormatted', label: 'Timestamp' },
      ];

      const where: any = {};
      if (dateRange !== 'all') {
        where.createdAt = { gte: startDate, lte: endDate };
      }
      if (city !== 'ALL') {
        where.salon = { city };
      } else if (state !== 'ALL' && stateFilteredCities.length > 0) {
        where.salon = { city: { in: stateFilteredCities } };
      }
      if (locality !== 'ALL') {
        where.salon = { ...(where.salon || {}), locality };
      }

      if (category === 'COLLECTIONS') {
        where.status = 'SUCCESS';
      } else if (status !== 'ALL') {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { transactionNumber: { contains: search } },
          { customer: { name: { contains: search } } },
          { salon: { name: { contains: search } } },
        ];
      }

      const [count, list] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          skip: querySkip,
          take: queryLimit,
          include: {
            salon: { select: { name: true, city: true, locality: true } },
            customer: { select: { name: true, email: true } },
            booking: { select: { bookingNumber: true, commissionRate: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      total = count;
      records = list.map((p) => {
        const rate = p.booking?.commissionRate;
        const ruleLabel =
          rate === 0.07
            ? '7% (New Customer)'
            : rate === 0.02
            ? '2% (Repeat Customer)'
            : rate !== undefined
            ? `${(rate * 100).toFixed(0)}%`
            : '7% (Standard)';

        return {
          ...p,
          salonName: p.salon?.name || 'Unknown Salon',
          city: p.salon?.city || 'Unknown',
          customerName: p.customer?.name || 'Guest',
          commissionRule: ruleLabel,
          createdAtFormatted: new Date(p.createdAt).toLocaleDateString('en-IN'),
        };
      });
      summaryText = `${total} transaction and commission records matching scope.`;
      break;
    }

    case 'REFUNDS': {
      columns = [
        { key: 'id', label: 'Refund ID' },
        { key: 'amount', label: 'Refund Amount (₹)' },
        { key: 'reason', label: 'Reason' },
        { key: 'status', label: 'Status' },
        { key: 'createdAtFormatted', label: 'Processed Date' },
      ];

      const where: any = {};
      if (dateRange !== 'all') {
        where.createdAt = { gte: startDate, lte: endDate };
      }
      if (status !== 'ALL') where.status = status;
      if (search) {
        where.reason = { contains: search };
      }

      const [count, list] = await Promise.all([
        prisma.refund.count({ where }),
        prisma.refund.findMany({
          where,
          skip: querySkip,
          take: queryLimit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      total = count;
      records = list.map((r) => ({
        ...r,
        createdAtFormatted: new Date(r.createdAt).toLocaleDateString('en-IN'),
      }));
      summaryText = `${total} customer refunds processed under policy.`;
      break;
    }

    case 'REVIEWS': {
      columns = [
        { key: 'salonName', label: 'Salon' },
        { key: 'customerName', label: 'Reviewer' },
        { key: 'rating', label: 'Rating' },
        { key: 'comment', label: 'Comment' },
        { key: 'reportStatus', label: 'Report Status' },
        { key: 'moderationStatus', label: 'Moderation' },
        { key: 'createdAtFormatted', label: 'Date' },
      ];

      const where: any = {};
      if (city !== 'ALL') {
        where.salon = { city };
      } else if (state !== 'ALL' && stateFilteredCities.length > 0) {
        where.salon = { city: { in: stateFilteredCities } };
      }
      if (locality !== 'ALL') where.salon = { ...(where.salon || {}), locality };
      if (status === 'REPORTED') where.reportStatus = 'REPORTED';
      else if (status === 'APPROVED') where.moderationStatus = 'APPROVED';
      else if (status === 'UNDER_REVIEW') where.moderationStatus = 'UNDER_REVIEW';

      if (search) {
        where.OR = [
          { comment: { contains: search } },
          { salon: { name: { contains: search } } },
          { customer: { name: { contains: search } } },
        ];
      }

      const [count, list] = await Promise.all([
        prisma.review.count({ where }),
        prisma.review.findMany({
          where,
          skip: querySkip,
          take: queryLimit,
          include: {
            salon: { select: { name: true, city: true } },
            customer: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      total = count;
      records = list.map((r) => ({
        ...r,
        salonName: r.salon?.name || 'Salon',
        customerName: r.customer?.name || 'Customer',
        createdAtFormatted: new Date(r.createdAt).toLocaleDateString('en-IN'),
      }));
      summaryText = `${total} customer reviews and moderation entries.`;
      break;
    }

    case 'SUPPORT_TICKETS': {
      columns = [
        { key: 'ticketNumber', label: 'Ticket #' },
        { key: 'subject', label: 'Subject' },
        { key: 'category', label: 'Category' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'createdAtFormatted', label: 'Created At' },
      ];

      const where: any = {};
      if (city !== 'ALL') {
        where.salon = { city };
      } else if (state !== 'ALL' && stateFilteredCities.length > 0) {
        where.salon = { city: { in: stateFilteredCities } };
      }
      if (status !== 'ALL') where.status = status;
      if (search) {
        where.OR = [
          { ticketNumber: { contains: search } },
          { subject: { contains: search } },
          { description: { contains: search } },
        ];
      }

      const [count, list] = await Promise.all([
        prisma.supportTicket.count({ where }),
        prisma.supportTicket.findMany({
          where,
          skip: querySkip,
          take: queryLimit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      total = count;
      records = list.map((t) => ({
        ...t,
        createdAtFormatted: new Date(t.createdAt).toLocaleDateString('en-IN'),
      }));
      summaryText = `${total} administrative support tickets logged.`;
      break;
    }

    case 'AI_OPERATIONS': {
      columns = [
        { key: 'operationType', label: 'Operation Type' },
        { key: 'modelUsed', label: 'AI Model' },
        { key: 'tokensUsed', label: 'Tokens' },
        { key: 'latencyMs', label: 'Latency (ms)' },
        { key: 'costEstimateInr', label: 'Cost (₹)' },
        { key: 'status', label: 'Status' },
        { key: 'promptSnippet', label: 'Prompt Snippet' },
      ];

      const where: any = {};
      if (status !== 'ALL') where.status = status;
      if (search) {
        where.OR = [{ promptSnippet: { contains: search } }, { modelUsed: { contains: search } }];
      }

      const [count, list] = await Promise.all([
        prisma.aIOperation.count({ where }),
        prisma.aIOperation.findMany({
          where,
          skip: querySkip,
          take: queryLimit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      total = count;
      records = list;
      summaryText = `${total} AI generation and recommendation invocations.`;
      break;
    }

    case 'BOOKINGS':
    case 'CALENDAR':
    default: {
      columns = [
        { key: 'bookingNumber', label: 'Booking #' },
        { key: 'customerName', label: 'Customer' },
        { key: 'salonName', label: 'Salon' },
        { key: 'city', label: 'City' },
        { key: 'locality', label: 'Locality' },
        { key: 'serviceName', label: 'Service' },
        { key: 'appointmentDate', label: 'Appt Date' },
        { key: 'startTime', label: 'Slot' },
        { key: 'price', label: 'Price (₹)' },
        { key: 'bookingStatus', label: 'Booking Status' },
        { key: 'paymentStatus', label: 'Payment' },
      ];

      const where: any = {};
      if (city !== 'ALL') {
        where.salon = { city };
      } else if (state !== 'ALL' && stateFilteredCities.length > 0) {
        where.salon = { city: { in: stateFilteredCities } };
      }
      if (locality !== 'ALL') {
        where.salon = { ...(where.salon || {}), locality };
      }
      if (status !== 'ALL') where.bookingStatus = status;

      if (dateRange !== 'all') {
        where.appointmentDate = { gte: startDateStr, lte: endDateStr };
      }

      if (search) {
        where.OR = [
          { bookingNumber: { contains: search } },
          { customer: { name: { contains: search } } },
          { customer: { phone: { contains: search } } },
          { salon: { name: { contains: search } } },
          { service: { name: { contains: search } } },
        ];
      }

      const [count, list] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.findMany({
          where,
          skip: querySkip,
          take: queryLimit,
          include: {
            customer: { select: { name: true, phone: true } },
            salon: { select: { name: true, city: true, locality: true } },
            service: { select: { name: true } },
          },
          orderBy: { appointmentDate: 'desc' },
        }),
      ]);

      total = count;
      records = list.map((b) => ({
        ...b,
        customerName: b.customer?.name || 'Customer',
        salonName: b.salon?.name || 'Salon Partner',
        city: b.salon?.city || 'Unknown',
        locality: b.salon?.locality || 'Unknown',
        serviceName: b.service?.name || 'General Service',
      }));
      summaryText = `${total} appointments matching territory and timeline.`;
      break;
    }
  }

  // 4. Format as CSV if Requested (With Formula Injection Protection)
  if (isExport) {
    const sanitizeCsvValue = (val: any): string => {
      if (val === undefined || val === null) return '';
      let str = String(val);
      // Neutralize spreadsheet formula injection
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvHeader = columns.map((col) => sanitizeCsvValue(col.label)).join(',');
    const csvRows = records.map((row) =>
      columns.map((col) => sanitizeCsvValue(row[col.key])).join(',')
    );

    const csvContent = [csvHeader, ...csvRows].join('\r\n');
    const filename = `stylesync-${category.toLowerCase()}-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // 5. Return Paginated JSON
  return NextResponse.json({
    category,
    columns,
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summaryText,
    filterScope: {
      category,
      state,
      city,
      locality,
      status,
      dateRange,
      startDate: startDateStr,
      endDate: endDateStr,
      search,
    },
  });
}
