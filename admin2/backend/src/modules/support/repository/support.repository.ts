// ============================================================
// Support — Repository
// ============================================================

import { prisma } from '../../../database/prisma.js';

export class SupportRepository {
  async list(salonId: string) {
    return prisma.supportTicket.findMany({
      where: { salonId },
      include: { responses: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(salonId: string, id: string) {
    return prisma.supportTicket.findFirst({
      where: { id, salonId },
      include: { responses: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async create(salonId: string, createdBy: string, data: { subject: string; category: string; message: string }) {
    return prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: { salonId, createdBy, subject: data.subject, category: data.category as any, message: data.message, status: 'OPEN' },
      });
      // First response is the salon's initial message
      await tx.ticketResponse.create({
        data: { ticketId: ticket.id, from: 'salon', message: data.message },
      });
      return ticket;
    });
  }

  async respond(salonId: string, ticketId: string, message: string) {
    const existing = await prisma.supportTicket.findFirst({ where: { id: ticketId, salonId } });
    if (!existing) return null;
    return prisma.$transaction(async (tx) => {
      const response = await tx.ticketResponse.create({
        data: { ticketId, from: 'salon', message },
      });
      await tx.supportTicket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
      return response;
    });
  }

  async updateStatus(salonId: string, ticketId: string, status: string) {
    const existing = await prisma.supportTicket.findFirst({ where: { id: ticketId, salonId } });
    if (!existing) return null;
    return prisma.supportTicket.update({ where: { id: ticketId }, data: { status: status as any, updatedAt: new Date() } });
  }
}

export const supportRepository = new SupportRepository();
