
async function syncToAuthoritativeBackend(salonId: string, status: string, isOpen: boolean) {
  try {
    await fetch(`http://localhost:4000/api/v1/salons/${salonId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status === 'APPROVED' ? 'active' : 'suspended', isOpen }),
    });
  } catch {
    // best-effort synchronization
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const { id } = await params;
  const salon = await prisma.salon.findUnique({
    where: { id },
    include: {
      staff: true,
      salonServices: {
        include: {
          globalService: {
            include: { category: true },
          },
        },
      },
      bookings: {
        take: 20,
        orderBy: { appointmentDate: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true } },
          staff: { select: { id: true, name: true } },
        },
      },
      reviews: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
        },
      },
      supportTickets: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!salon) {
    return NextResponse.json({ error: 'Salon not found.' }, { status: 404 });
  }

  // Calculate financial summary for this salon
  const financialSummary = await prisma.payment.aggregate({
    where: { salonId: id, status: 'SUCCESS' },
    _sum: {
      amount: true,
      commissionAmount: true,
      salonPayoutAmount: true,
    },
  });

  return NextResponse.json({
    salon,
    financials: {
      grossSales: financialSummary._sum.amount || 0,
      totalCommissionPaid: financialSummary._sum.commissionAmount || 0,
      netPayoutEarned: financialSummary._sum.salonPayoutAmount || 0,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) return errorResponse;

  const { id } = await params;
  const body = await req.json();
  const { applicationStatus, operationalStatus, verificationStatus, rejectionReason, name, address, locality, city } = body;

  const existing = await prisma.salon.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Salon not found.' }, { status: 404 });
  }

  const updateData: any = {};
  if (applicationStatus) {
    updateData.applicationStatus = applicationStatus;
    if (applicationStatus === 'APPROVED') {
      updateData.verificationStatus = 'VERIFIED';
      updateData.rejectionReason = null;
    } else if (applicationStatus === 'REJECTED') {
      updateData.verificationStatus = 'REJECTED';
      updateData.operationalStatus = 'CLOSED';
      if (rejectionReason) updateData.rejectionReason = rejectionReason;
    } else if (applicationStatus === 'SUSPENDED') {
      updateData.operationalStatus = 'CLOSED';
    }
  }

  if (operationalStatus) updateData.operationalStatus = operationalStatus;
  if (verificationStatus) updateData.verificationStatus = verificationStatus;
  if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
  if (name) updateData.name = name;
  if (address) updateData.address = address;
  if (locality) updateData.locality = locality;
  if (city) updateData.city = city;

  const updated = await prisma.salon.update({
    where: { id },
    data: updateData,
  });
  syncToAuthoritativeBackend(id, updated.applicationStatus, updated.operationalStatus === 'OPEN').catch(() => {});

  // Create audit log
  let actionName = 'SALON_UPDATED';
  if (applicationStatus && applicationStatus !== existing.applicationStatus) {
    actionName = `SALON_${applicationStatus}`;
  } else if (operationalStatus && operationalStatus !== existing.operationalStatus) {
    actionName = `SALON_OPERATIONAL_${operationalStatus}`;
  }

  await recordAuditLog({
    adminId: user.id,
    adminEmail: user.email,
    action: actionName,
    entityType: 'Salon',
    entityId: id,
    details: {
      salonName: updated.name,
      previous: {
        applicationStatus: existing.applicationStatus,
        operationalStatus: existing.operationalStatus,
      },
      updated: {
        applicationStatus: updated.applicationStatus,
        operationalStatus: updated.operationalStatus,
        rejectionReason: updated.rejectionReason,
      },
    },
  });

  return NextResponse.json({ salon: updated });
}
