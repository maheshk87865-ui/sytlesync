import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, hasPermission, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  if (!hasPermission(user.role, ['SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'Access restricted to Super Administrators.' }, { status: 403 });
  }

  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ admins });
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  if (user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Administrators can provision staff.' }, { status: 403 });
  }

  const body = await req.json();
  const { email, name, role, password } = body;

  if (!email || !name || !role || !password) {
    return NextResponse.json({ error: 'Email, name, role, and password are required.' }, { status: 400 });
  }

  const existing = await prisma.admin.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    return NextResponse.json({ error: 'An admin with this email already exists.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const newAdmin = await prisma.admin.create({
    data: {
      email: email.toLowerCase().trim(),
      name,
      role,
      passwordHash,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: 'ADMIN_USER_PROVISIONED',
    entityType: 'Admin',
    entityId: newAdmin.id,
    details: { email: newAdmin.email, role: newAdmin.role },
  });

  return NextResponse.json({ admin: newAdmin }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  if (user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Administrators can update staff accounts.' }, { status: 403 });
  }

  const body = await req.json();
  const { id, status, role, name, password } = body;

  if (!id) {
    return NextResponse.json({ error: 'Admin ID is required.' }, { status: 400 });
  }

  // Prevent self-deactivation of superadmin
  if (id === user.id && status === 'INACTIVE') {
    return NextResponse.json({ error: 'You cannot deactivate your own active session.' }, { status: 400 });
  }

  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Administrator not found.' }, { status: 404 });
  }

  const updateData: any = {};
  if (status) updateData.status = status;
  if (role) updateData.role = role;
  if (name) updateData.name = name;
  if (password && password.trim()) {
    updateData.passwordHash = await hashPassword(password.trim());
  }

  const updated = await prisma.admin.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: `ADMIN_USER_${status === 'INACTIVE' ? 'DEACTIVATED' : 'UPDATED'}`,
    entityType: 'Admin',
    entityId: id,
    details: { email: existing.email, previousRole: existing.role, newRole: updated.role, newStatus: updated.status },
  });

  return NextResponse.json({ admin: updated });
}
