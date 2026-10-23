import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const applicationStatus = url.searchParams.get('applicationStatus') || '';
  const operationalStatus = url.searchParams.get('operationalStatus') || '';
  const locality = url.searchParams.get('locality') || '';
  const city = url.searchParams.get('city') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const whereClause: any = {};
  if (city && city !== 'ALL') {
    whereClause.city = city;
  }
  if (applicationStatus && applicationStatus !== 'ALL') {
    whereClause.applicationStatus = applicationStatus;
  }
  if (operationalStatus && operationalStatus !== 'ALL') {
    whereClause.operationalStatus = operationalStatus;
  }
  if (locality && locality !== 'ALL') {
    whereClause.locality = locality;
  }
  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { address: { contains: search } },
      { ownerName: { contains: search } },
      { ownerEmail: { contains: search } },
      { locality: { contains: search } },
      { city: { contains: search } },
    ];
  }

  const [total, salons] = await Promise.all([
    prisma.salon.count({ where: whereClause }),
    prisma.salon.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: { staff: true, bookings: true, reviews: true, salonServices: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    salons,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const body = await req.json();
  const { name, ownerName, ownerEmail, ownerPhone, address, locality, city } = body;

  if (!name || !ownerName || !ownerEmail) {
    return NextResponse.json(
      { error: 'Salon name, owner name, and owner email are required.' },
      { status: 400 }
    );
  }

  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const salon = await prisma.salon.create({
      data: {
        name,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || '',
        address: address || 'Srinagar Main Road',
        locality: locality || 'Lal Chowk',
        city: city || 'Srinagar',
        applicationStatus: 'APPROVED',
        operationalStatus: 'OPEN',
        verificationStatus: 'VERIFIED',
      },
    });

    await recordAuditLog({
      adminId: user.id,
      adminEmail: user.email,
      action: 'SALON_CREATED',
      entityType: 'Salon',
      entityId: salon.id,
      details: { name: salon.name, owner: salon.ownerEmail },
    });

    return NextResponse.json({ salon }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
