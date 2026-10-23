import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const type = url.searchParams.get('type') || '';
  const status = url.searchParams.get('status') || '';

  const whereClause: any = {};
  if (type && type !== 'ALL') whereClause.operationType = type;
  if (status && status !== 'ALL') whereClause.status = status;

  const [logs, totalCount, successCount, failedCount, costAggregate] = await Promise.all([
    prisma.aIOperation.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.aIOperation.count(),
    prisma.aIOperation.count({ where: { status: 'SUCCESS' } }),
    prisma.aIOperation.count({ where: { status: 'FAILED' } }),
    prisma.aIOperation.aggregate({
      _sum: { costEstimateInr: true, tokensUsed: true },
      _avg: { latencyMs: true },
    }),
  ]);

  const flags = await prisma.platformSetting.findMany({
    where: { category: 'AI' },
  });

  return NextResponse.json({
    logs,
    summary: {
      totalOperations: totalCount,
      successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100,
      failedOperations: failedCount,
      averageLatencyMs: Math.round(costAggregate._avg.latencyMs || 450),
      totalTokensConsumed: costAggregate._sum.tokensUsed || 0,
      totalEstimatedCostInr: Math.round((costAggregate._sum.costEstimateInr || 0) * 100) / 100,
      privacyPolicy: 'Customer photos and face mesh embeddings are processed in-memory and purged immediately. No face images are permanently stored.',
    },
    featureFlags: flags,
  });
}
