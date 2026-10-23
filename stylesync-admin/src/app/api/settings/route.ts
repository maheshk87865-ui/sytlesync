import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const settings = await prisma.platformSetting.findMany({
    orderBy: { category: 'asc' },
  });

  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  if (!hasPermission(user.role, ['SUPER_ADMIN', 'FINANCE_ADMIN'])) {
    return NextResponse.json({ error: 'Permission denied to modify platform settings.' }, { status: 403 });
  }

  const body = await req.json();
  const { key, value } = body;

  if (!key || value === undefined) {
    return NextResponse.json({ error: 'Setting key and value are required.' }, { status: 400 });
  }

  const existing = await prisma.platformSetting.findUnique({ where: { key } });
  if (!existing) {
    return NextResponse.json({ error: 'Setting key not found.' }, { status: 404 });
  }

  const updated = await prisma.platformSetting.update({
    where: { key },
    data: {
      value: String(value),
      updatedByAdminId: user.id,
    },
  });

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: 'PLATFORM_SETTING_UPDATED',
    entityType: 'PlatformSetting',
    entityId: key,
    details: { key, oldValue: existing.value, newValue: String(value) },
  });

  return NextResponse.json({ setting: updated });
}
