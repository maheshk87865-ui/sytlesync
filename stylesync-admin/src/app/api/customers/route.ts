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
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const whereClause: any = {};
  if (status && status !== 'ALL') {
    whereClause.status = status;
  }
  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { locality: { contains: search } },
    ];
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where: whereClause }),
    prisma.customer.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: { bookings: true, reviews: true, supportTickets: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    customers,
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
  const { name, email, phone, locality, city } = body;

  if (!name || !email || !phone) {
    return NextResponse.json(
      { error: 'Name, email, and phone number are required.' },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A customer with this email already exists.' },
        { status: 409 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        phone,
        locality: locality || 'Lal Chowk',
        city: city || 'Srinagar',
        status: 'ACTIVE',
      },
    });

    await recordAuditLog({
      adminId: user.id,
      adminEmail: user.email,
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
      details: { name: customer.name, email: customer.email },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
