import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const categoryId = url.searchParams.get('categoryId') || '';
  const gender = url.searchParams.get('gender') || '';

  const whereClause: any = {};
  if (categoryId && categoryId !== 'ALL') {
    whereClause.categoryId = categoryId;
  }
  if (gender && gender !== 'ALL') {
    whereClause.genderTarget = gender;
  }
  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [categories, services] = await Promise.all([
    prisma.serviceCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { services: true } },
      },
    }),
    prisma.globalService.findMany({
      where: whereClause,
      include: {
        category: true,
        _count: { select: { salonServices: true, bookings: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return NextResponse.json({ categories, services });
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const body = await req.json();
  const { name, categoryId, basePrice, durationMin, genderTarget, description } = body;

  if (!name || !categoryId || !basePrice) {
    return NextResponse.json(
      { error: 'Service name, category, and base price are required.' },
      { status: 400 }
    );
  }

  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const service = await prisma.globalService.create({
      data: {
        name,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        categoryId,
        basePrice: parseFloat(basePrice),
        durationMin: parseInt(durationMin || '30', 10),
        genderTarget: genderTarget || 'UNISEX',
        description,
        isActive: true,
      },
    });

    await recordAuditLog({
      adminId: user.id,
      adminEmail: user.email,
      action: 'SERVICE_CATALOG_CREATED',
      entityType: 'GlobalService',
      entityId: service.id,
      details: { name: service.name, basePrice: service.basePrice },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const body = await req.json();
  const { id, name, categoryId, basePrice, durationMin, genderTarget, description, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: 'Service ID is required.' }, { status: 400 });
  }

  const existing = await prisma.globalService.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
  }

  const updated = await prisma.globalService.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(basePrice !== undefined ? { basePrice: parseFloat(basePrice) } : {}),
      ...(durationMin !== undefined ? { durationMin: parseInt(durationMin, 10) } : {}),
      ...(genderTarget ? { genderTarget } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: 'SERVICE_CATALOG_UPDATED',
    entityType: 'GlobalService',
    entityId: id,
    details: { name: updated.name, basePrice: updated.basePrice },
  });

  return NextResponse.json({ service: updated });
}
