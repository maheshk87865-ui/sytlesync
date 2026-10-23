import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const notifications = await prisma.adminNotification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.adminNotification.count({
    where: { read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

// Mark single or all notifications as read
export async function PUT(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const body = await req.json();
  const { id, markAllAsRead } = body;

  if (markAllAsRead) {
    await prisma.adminNotification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return NextResponse.json({ success: true, message: 'All marked as read.' });
  }

  if (id) {
    await prisma.adminNotification.update({
      where: { id },
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
}
