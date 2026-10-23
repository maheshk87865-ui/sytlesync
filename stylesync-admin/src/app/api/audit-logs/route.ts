import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const entityType = url.searchParams.get('entityType') || '';
  const action = url.searchParams.get('action') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);

  const whereClause: any = {};
  if (entityType && entityType !== 'ALL') whereClause.entityType = entityType;
  if (action && action !== 'ALL') whereClause.action = { contains: action };

  if (search) {
    whereClause.OR = [
      { adminEmail: { contains: search } },
      { action: { contains: search } },
      { entityType: { contains: search } },
      { detailsJson: { contains: search } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where: whereClause }),
    prisma.auditLog.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { id: true, name: true, role: true } },
      },
    }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
