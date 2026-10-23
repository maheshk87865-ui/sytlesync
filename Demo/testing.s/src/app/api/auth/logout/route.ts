import { NextResponse } from 'next/server';
import { COOKIE_NAME, getSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST() {
  const session = await getSession();
  if (session) {
    await recordAuditLog({
      adminId: session.id,
      adminEmail: session.email,
      action: 'ADMIN_LOGOUT',
      entityType: 'Admin',
      entityId: session.id,
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
