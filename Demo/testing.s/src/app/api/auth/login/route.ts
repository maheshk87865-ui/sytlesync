import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid administrative credentials.' },
        { status: 401 }
      );
    }

    if (admin.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This administrative account has been deactivated.' },
        { status: 403 }
      );
    }

    const isMatch = await verifyPassword(password, admin.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid administrative credentials.' },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Record audit log
    await recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ADMIN_LOGIN',
      entityType: 'Admin',
      entityId: admin.id,
      details: { role: admin.role, ip: req.headers.get('x-forwarded-for') || '127.0.0.1' },
    });

    const token = await createToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role as any,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}
