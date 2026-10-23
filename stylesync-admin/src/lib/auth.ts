import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'stylesync-superadmin-secure-jwt-key-srinagar-2026'
);

export const COOKIE_NAME = 'stylesync_admin_token';

export type AdminRole = 'SUPER_ADMIN' | 'OPERATIONS_ADMIN' | 'SUPPORT_ADMIN' | 'FINANCE_ADMIN' | 'ANALYST';

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: AdminSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AdminSession | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(req?: NextRequest): Promise<{ user: AdminSession | null; errorResponse?: NextResponse }> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 }),
    };
  }

  const session = await verifyToken(token);
  if (!session) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Session expired or invalid.' }, { status: 401 }),
    };
  }

  // Double check admin status in database
  const admin = await prisma.admin.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, name: true, role: true, status: true },
  });

  if (!admin || admin.status !== 'ACTIVE') {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Account suspended or not found.' }, { status: 403 }),
    };
  }

  return {
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role as AdminRole,
    },
  };
}

export function hasPermission(role: AdminRole, requiredRoles: AdminRole[]): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return requiredRoles.includes(role);
}
