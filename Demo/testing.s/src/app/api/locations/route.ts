import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const city = url.searchParams.get('city') || '';
  const whereClause: any = {};
  if (city && city !== 'ALL') {
    whereClause.cityName = city;
  }

  const locations = await prisma.location.findMany({
    where: whereClause,
    orderBy: [{ cityName: 'asc' }, { localityName: 'asc' }],
  });

  return NextResponse.json({ locations });
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const body = await req.json();
  const { cityName, localityName, state, postalCode } = body;

  if (!localityName) {
    return NextResponse.json({ error: 'Locality name is required.' }, { status: 400 });
  }

  const location = await prisma.location.create({
    data: {
      cityName: cityName || 'Srinagar',
      localityName,
      state: state || 'Jammu and Kashmir',
      postalCode: postalCode || '190001',
      isActive: true,
      salonCount: 0,
    },
  });

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: 'LOCATION_ADDED',
    entityType: 'Location',
    entityId: location.id,
    details: { locality: location.localityName, city: location.cityName },
  });

  return NextResponse.json({ location }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const body = await req.json();
  const { id, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: 'Location ID is required.' }, { status: 400 });
  }

  const updated = await prisma.location.update({
    where: { id },
    data: { isActive },
  });

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: `LOCATION_${isActive ? 'ACTIVATED' : 'DEACTIVATED'}`,
    entityType: 'Location',
    entityId: id,
    details: { locality: updated.localityName, isActive },
  });

  return NextResponse.json({ location: updated });
}
