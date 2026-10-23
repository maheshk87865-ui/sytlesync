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
  const priority = url.searchParams.get('priority') || '';
  const category = url.searchParams.get('category') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  const whereClause: any = {};
  if (status && status !== 'ALL') whereClause.status = status;
  if (priority && priority !== 'ALL') whereClause.priority = priority;
  if (category && category !== 'ALL') whereClause.category = category;

  if (search) {
    whereClause.OR = [
      { ticketNumber: { contains: search } },
      { subject: { contains: search } },
      { description: { contains: search } },
      { customer: { name: { contains: search } } },
      { salon: { name: { contains: search } } },
    ];
  }

  const [total, tickets, admins] = await Promise.all([
    prisma.supportTicket.count({ where: whereClause }),
    prisma.supportTicket.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        salon: { select: { id: true, name: true, locality: true } },
        booking: { select: { id: true, bookingNumber: true, price: true } },
        assignedAdmin: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.admin.findMany({
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  return NextResponse.json({
    tickets,
    admins,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// Update ticket status, priority, assignee, internal notes
export async function PUT(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const body = await req.json();
  const { id, status, priority, assignedAdminId, internalNotes, replyMessage, isInternal } = body;

  if (!id) {
    return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
  }

  const existing = await prisma.supportTicket.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Support ticket not found.' }, { status: 404 });
  }

  const updateData: any = {};
  if (status) updateData.status = status;
  if (priority) updateData.priority = priority;
  if (assignedAdminId !== undefined) updateData.assignedAdminId = assignedAdminId;
  if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: updateData,
  });

  // If a reply message was provided, create message entry
  if (replyMessage && replyMessage.trim()) {
    await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderType: 'ADMIN',
        senderName: user.name || 'Admin',
        message: replyMessage.trim(),
        isInternal: isInternal || false,
      },
    });
  }

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: `SUPPORT_TICKET_${status || 'UPDATED'}`,
    entityType: 'SupportTicket',
    entityId: id,
    details: {
      ticketNumber: existing.ticketNumber,
      status: updated.status,
      priority: updated.priority,
      hasReply: !!replyMessage,
    },
  });

  return NextResponse.json({ ticket: updated });
}

// Create new support ticket
export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const body = await req.json();
  const { customerId, salonId, category, priority, subject, description, internalNotes } = body;

  if (!subject || !description) {
    return NextResponse.json(
      { error: 'Subject and description are required.' },
      { status: 400 }
    );
  }

  const count = await prisma.supportTicket.count();
  const ticketNumber = `TCK-${String(count + 1).padStart(4, '0')}`;

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber,
      customerId: customerId || null,
      salonId: salonId || null,
      category: category || 'GENERAL',
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      subject,
      description,
      internalNotes: internalNotes || null,
      assignedAdminId: user.id,
    },
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      senderType: 'ADMIN',
      senderName: user.name,
      message: description,
      isInternal: false,
    },
  });

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: 'SUPPORT_TICKET_CREATED',
    entityType: 'SupportTicket',
    entityId: ticket.id,
    details: { ticketNumber, subject },
  });

  return NextResponse.json({ ticket }, { status: 201 });
}
