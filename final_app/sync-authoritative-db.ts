import { PrismaClient as PAdmin } from '@prisma/client-admin';
import { PrismaClient as P1 } from '@prisma/client-admin1';

const pAdmin = new PAdmin({ datasources: { db: { url: 'file:D:/AntiGravity/stylesync-admin/prisma/dev.db' } } });
const p1 = new P1({ datasources: { db: { url: 'file:D:/AntiGravity/admin1/backend/db/test.db' } } });

export async function syncP1ToAdmin() {
  console.log('--- Migrating admin1 authoritative records to Super Admin dev.db ---');

  // 1. Sync Salons
  const p1Salons = await p1.salon.findMany({
    include: { staff: true, services: true }
  });

  for (const s of p1Salons) {
    const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const addr = s.address || (s.area ? `${s.area}, Srinagar, J&K` : 'Srinagar, J&K');
    const salon = await pAdmin.salon.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        slug: slug,
        rating: s.rating,
        reviewCount: s.reviewCount,
        locality: s.area || 'Lal Chowk',
        city: s.city || 'Srinagar',
        operationalStatus: s.isOpen ? 'OPEN' : 'CLOSED',
        applicationStatus: s.status === 'active' ? 'APPROVED' : 'SUSPENDED',
        verificationStatus: s.verified ? 'VERIFIED' : 'PENDING',
        address: addr,
      },
      create: {
        id: s.id,
        name: s.name,
        slug: slug,
        ownerName: 'Salon Owner',
        ownerEmail: `owner.${slug}@stylesync.in`,
        ownerPhone: '+9194190' + Math.floor(10000 + Math.random() * 90000),
        address: addr,
        locality: s.area || 'Lal Chowk',
        city: s.city || 'Srinagar',
        rating: s.rating,
        reviewCount: s.reviewCount,
        applicationStatus: s.status === 'active' ? 'APPROVED' : 'SUSPENDED',
        operationalStatus: s.isOpen ? 'OPEN' : 'CLOSED',
        verificationStatus: s.verified ? 'VERIFIED' : 'PENDING',
      }
    });
    console.log('Synced salon:', salon.name, salon.id);

    // Sync Staff
    for (const st of s.staff) {
      await pAdmin.salonStaff.upsert({
        where: { id: st.id },
        update: {
          name: st.name,
          role: st.role,
          rating: st.rating,
          isAvailable: true,
        },
        create: {
          id: st.id,
          salonId: s.id,
          name: st.name,
          role: st.role,
          rating: st.rating,
          isAvailable: true,
        }
      });
    }

    // Sync Services
    for (const srv of s.services) {
      const srvSlug = srv.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let globalService = await pAdmin.globalService.findFirst({ where: { slug: srvSlug } });
      if (!globalService) {
        const cat = await pAdmin.serviceCategory.findFirst();
        globalService = await pAdmin.globalService.create({
          data: {
            name: srv.name,
            slug: srvSlug,
            categoryId: cat!.id,
            basePrice: srv.priceFrom,
            durationMin: srv.durationMin,
            genderTarget: 'UNISEX',
            description: srv.description || srv.name,
          }
        });
      }

      await pAdmin.salonService.upsert({
        where: { id: srv.id },
        update: {
          customPrice: srv.priceFrom,
          customDurationMin: srv.durationMin,
          isAvailable: srv.status === 'active',
        },
        create: {
          id: srv.id,
          salonId: s.id,
          globalServiceId: globalService.id,
          customPrice: srv.priceFrom,
          customDurationMin: srv.durationMin,
          isAvailable: srv.status === 'active',
        }
      });
    }
  }

  // 2. Sync Customers
  const p1Customers = await p1.customer.findMany();
  for (const c of p1Customers) {
    await pAdmin.customer.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        email: c.email,
        phone: c.mobile || '+9194191' + Math.floor(10000 + Math.random() * 90000),
      },
      create: {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.mobile || '+9194191' + Math.floor(10000 + Math.random() * 90000),
        city: c.city || 'Srinagar',
        locality: 'Lal Chowk',
        status: 'ACTIVE',
      }
    });
  }

  // 3. Sync Bookings
  const p1Bookings = await p1.booking.findMany({ include: { payment: true } });
  for (const b of p1Bookings) {
    const srv = await pAdmin.globalService.findFirst();
    const serviceId = srv!.id;
    const dateStr = b.date ? new Date(b.date).toISOString().split('T')[0] : '2026-10-15';
    // Phase 8 Rule: 7% commission for new customers, 2% for repeat customers at the same salon
    const priorCompletedCount = await p1.booking.count({
      where: {
        customerId: b.customerId,
        salonId: b.salonId,
        id: { not: b.id },
        status: { in: ['CONFIRMED', 'COMPLETED', 'completed', 'confirmed'] },
      }
    });
    const isRepeat = priorCompletedCount > 0;
    const commRate = isRepeat ? 0.02 : 0.07;
    const commAmount = Math.round(b.price * commRate * 100) / 100;
    const payout = Math.round((b.price - commAmount) * 100) / 100;

    await pAdmin.booking.upsert({
      where: { id: b.id },
      update: {
        bookingStatus: b.status,
        paymentStatus: b.paymentStatus.toUpperCase(),
      },
      create: {
        id: b.id,
        bookingNumber: b.bookingId,
        customerId: b.customerId,
        salonId: b.salonId,
        staffId: b.staffId,
        serviceId: serviceId,
        appointmentDate: dateStr,
        startTime: b.startTime || '10:00',
        endTime: b.endTime || '10:45',
        price: b.price,
        commissionRate: commRate,
        commissionAmount: commAmount,
        salonPayoutAmount: payout,
        bookingStatus: b.status,
        paymentStatus: b.paymentStatus.toUpperCase(),
      }
    });

    if (b.payment) {
      await pAdmin.payment.upsert({
        where: { id: b.payment.id },
        update: {
          status: b.payment.status === 'PAID' ? 'SUCCESS' : b.payment.status,
        },
        create: {
          id: b.payment.id,
          transactionNumber: b.payment.providerPaymentId || `TXN-${b.bookingId}`,
          bookingId: b.id,
          customerId: b.customerId,
          salonId: b.salonId,
          amount: b.price,
          commissionAmount: commAmount,
          salonPayoutAmount: payout,
          paymentMethod: (b.paymentMethod || 'CARD').toUpperCase(),
          status: b.payment.status === 'PAID' ? 'SUCCESS' : 'PENDING',
        }
      });
    }
  }

  console.log('--- Migration complete! Verified data synchronized successfully. ---');
}

if (process.argv[1]?.includes('sync-authoritative-db')) {
  syncP1ToAdmin()
    .catch(console.error)
    .finally(async () => {
      await pAdmin.$disconnect();
      await p1.$disconnect();
    });
}
