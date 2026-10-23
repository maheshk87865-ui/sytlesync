import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    // Perform an actual query to verify live database connectivity
    const adminCount = await prisma.admin.count();
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'Connected',
      engine: 'SQLite (Prisma ORM)',
      latencyMs,
      timestamp: new Date().toISOString(),
      verifiedRecords: adminCount > 0,
    });
  } catch (error: any) {
    console.error('Health check database query failure:', error);
    return NextResponse.json(
      {
        status: 'Disconnected',
        engine: 'SQLite (Prisma ORM)',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
