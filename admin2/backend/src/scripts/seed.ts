// ============================================================
// Database seed script — creates demo salon, owner, services, staff,
// customers, and bookings with realistic data.
//
// Run: bun run src/scripts/seed.ts
//
// Prerequisites:
//   1. DATABASE_URL is set in .env (pointing to a live PostgreSQL)
//   2. Migrations have been applied: bun run db:migrate
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // --- 1. Create salon ---
  const salon = await prisma.salon.upsert({
    where: { id: 'salon-seed-1' },
    update: {},
    create: {
      id: 'salon-seed-1',
      name: 'Premium Roots',
      description: 'A premium salon in Srinagar offering hair, beauty, and grooming services.',
      about: 'Premium Roots is Srinagar\'s destination for modern hair, beauty, and grooming services.',
      address: '12 Residency Road, Lal Chowk',
      area: 'Lal Chowk',
      city: 'Srinagar',
      latitude: 34.0735,
      longitude: 74.8088,
      phone: '+91 94190 12345',
      email: 'hello@premiumroots.in',
      timezone: 'Asia/Kolkata',
      status: 'OPEN',
      businessHours: {
        monday:    { open: '09:00', close: '20:00', closed: false },
        tuesday:   { open: '09:00', close: '20:00', closed: false },
        wednesday: { open: '09:00', close: '20:00', closed: false },
        thursday:  { open: '09:00', close: '20:00', closed: false },
        friday:    { open: '09:00', close: '20:00', closed: false },
        saturday:  { open: '09:00', close: '20:00', closed: false },
        sunday:    { closed: true },
      },
    },
  });
  console.log(`  ✓ Salon: ${salon.name}`);

  // --- 2. Create owner user ---
  const passwordHash = await bcrypt.hash('password123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@premiumroots.in' },
    update: {},
    create: {
      salonId: salon.id,
      name: 'Ria Mahajan',
      email: 'owner@premiumroots.in',
      passwordHash,
      role: 'SALON_OWNER',
      status: 'ACTIVE',
      phone: '+91 94190 11111',
    },
  });
  console.log(`  ✓ Owner: ${owner.name} (${owner.email})`);

  // --- 3. Create services ---
  const services = await Promise.all([
    prisma.salonService.upsert({
      where: { id: 'svc-seed-1' },
      update: {},
      create: {
        id: 'svc-seed-1', salonId: salon.id, name: 'Haircut & Style', category: 'HAIR',
        description: 'Professional haircut and styling.', price: 50000, durationMin: 45, active: true,
      },
    }),
    prisma.salonService.upsert({
      where: { id: 'svc-seed-2' },
      update: {},
      create: {
        id: 'svc-seed-2', salonId: salon.id, name: 'Hair Spa Treatment', category: 'HAIR',
        description: 'Deep conditioning spa treatment.', price: 120000, durationMin: 60, active: true,
      },
    }),
    prisma.salonService.upsert({
      where: { id: 'svc-seed-3' },
      update: {},
      create: {
        id: 'svc-seed-3', salonId: salon.id, name: 'Balayage', category: 'HAIR',
        description: 'Premium balayage coloring.', price: 450000, durationMin: 180, active: true,
      },
    }),
    prisma.salonService.upsert({
      where: { id: 'svc-seed-4' },
      update: {},
      create: {
        id: 'svc-seed-4', salonId: salon.id, name: 'Beard Grooming', category: 'BEARD_GROOMING',
        description: 'Professional beard shaping.', price: 40000, durationMin: 30, active: true,
      },
    }),
    prisma.salonService.upsert({
      where: { id: 'svc-seed-5' },
      update: {},
      create: {
        id: 'svc-seed-5', salonId: salon.id, name: 'Facial', category: 'SKIN_BEAUTY',
        description: 'Premium facial treatment.', price: 150000, durationMin: 60, active: true,
      },
    }),
  ]);
  console.log(`  ✓ Services: ${services.length} created`);

  // --- 4. Create staff ---
  const staff = await Promise.all([
    prisma.staff.upsert({
      where: { id: 'staff-seed-1' },
      update: {},
      create: {
        id: 'staff-seed-1', salonId: salon.id, name: 'Ria Mahajan', role: 'OWNER',
        profileImage: 'https://ui-avatars.com/api/?name=Ria+Mahajan&background=0F766E&color=fff',
        experienceYears: 12, phone: '+91 94190 11111', email: 'ria@premiumroots.in', status: 'ACTIVE',
        userId: owner.id,
      },
    }),
    prisma.staff.upsert({
      where: { id: 'staff-seed-2' },
      update: {},
      create: {
        id: 'staff-seed-2', salonId: salon.id, name: 'Aisha Khan', role: 'MANAGER',
        profileImage: 'https://ui-avatars.com/api/?name=Aisha+Khan&background=0F766E&color=fff',
        experienceYears: 8, phone: '+91 94190 22222', status: 'ACTIVE',
      },
    }),
    prisma.staff.upsert({
      where: { id: 'staff-seed-3' },
      update: {},
      create: {
        id: 'staff-seed-3', salonId: salon.id, name: 'Tariq Bhat', role: 'STAFF',
        profileImage: 'https://ui-avatars.com/api/?name=Tariq+Bhat&background=0F766E&color=fff',
        experienceYears: 5, phone: '+91 94190 33333', status: 'ACTIVE',
      },
    }),
  ]);
  console.log(`  ✓ Staff: ${staff.length} created`);

  // --- 5. Assign services to staff ---
  await prisma.staffService.createMany({
    data: [
      { staffId: 'staff-seed-1', serviceId: 'svc-seed-1' },
      { staffId: 'staff-seed-1', serviceId: 'svc-seed-2' },
      { staffId: 'staff-seed-1', serviceId: 'svc-seed-3' },
      { staffId: 'staff-seed-2', serviceId: 'svc-seed-2' },
      { staffId: 'staff-seed-2', serviceId: 'svc-seed-5' },
      { staffId: 'staff-seed-3', serviceId: 'svc-seed-1' },
      { staffId: 'staff-seed-3', serviceId: 'svc-seed-4' },
    ],
    skipDuplicates: true,
  });
  console.log(`  ✓ Staff-service assignments created`);

  // --- 6. Create staff schedules ---
  const days = [0, 1, 2, 3, 4, 5, 6];
  for (const s of staff) {
    for (const dayOfWeek of days) {
      const isSunday = dayOfWeek === 0;
      const isRia = s.id === 'staff-seed-1';
      await prisma.staffSchedule.upsert({
        where: { staffId_dayOfWeek: { staffId: s.id, dayOfWeek } },
        update: {},
        create: {
          salonId: salon.id,
          staffId: s.id,
          dayOfWeek,
          startTime: isSunday ? null : '09:00',
          endTime: isSunday ? null : '18:00',
          isWorking: !isSunday && !(isRia && dayOfWeek === 3), // Ria off Thursday
        },
      });
    }
  }
  console.log(`  ✓ Staff schedules created`);

  // --- 7. Create customers ---
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { salonId_phone: { salonId: salon.id, phone: '+91 94190 55101' } },
      update: {},
      create: { salonId: salon.id, name: 'Imtiyaz Ahmed', phone: '+91 94190 55101', email: 'imtiyaz@example.com' },
    }),
    prisma.customer.upsert({
      where: { salonId_phone: { salonId: salon.id, phone: '+91 94190 55102' } },
      update: {},
      create: { salonId: salon.id, name: 'Rahul Verma', phone: '+91 94190 55102', email: 'rahul@example.com' },
    }),
    prisma.customer.upsert({
      where: { salonId_phone: { salonId: salon.id, phone: '+91 94190 55103' } },
      update: {},
      create: { salonId: salon.id, name: 'Priya Nair', phone: '+91 94190 55103', email: 'priya@example.com' },
    }),
    prisma.customer.upsert({
      where: { salonId_phone: { salonId: salon.id, phone: '+91 94190 55104' } },
      update: {},
      create: { salonId: salon.id, name: 'Sana Khan', phone: '+91 94190 55104', email: 'sana@example.com' },
    }),
  ]);
  console.log(`  ✓ Customers: ${customers.length} created`);

  // --- 8. Create today's bookings ---
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayDate = new Date(todayStr + 'T00:00:00Z');

  const todaysBookings = [
    { customer: customers[0], service: services[2], staff: staff[0], startTime: '09:00', endTime: '12:00', status: 'COMPLETED', pricePaise: 450000 },
    { customer: customers[1], service: services[0], staff: staff[0], startTime: '09:30', endTime: '10:15', status: 'COMPLETED', pricePaise: 50000 },
    { customer: customers[3], service: services[0], staff: staff[0], startTime: '10:00', endTime: '10:45', status: 'CANCELLED', pricePaise: 50000 },
    { customer: customers[2], service: services[1], staff: staff[1], startTime: '11:00', endTime: '12:00', status: 'COMPLETED', pricePaise: 120000 },
    { customer: customers[3], service: services[4], staff: staff[1], startTime: '14:00', endTime: '15:00', status: 'PENDING', pricePaise: 150000 },
  ];

  for (const b of todaysBookings) {
    const booking = await prisma.booking.create({
      data: {
        salonId: salon.id,
        customerId: b.customer.id,
        serviceId: b.service.id,
        staffId: b.staff.id,
        date: todayDate,
        startTime: b.startTime,
        endTime: b.endTime,
        durationMin: b.service.durationMin,
        pricePaise: b.pricePaise,
        customerName: b.customer.name,
        customerPhone: b.customer.phone,
        serviceName: b.service.name,
        staffName: b.staff.name,
        status: b.status as any,
        paymentStatus: b.status === 'COMPLETED' ? 'PAID' : 'PENDING',
        completedAt: b.status === 'COMPLETED' ? new Date() : null,
        cancelledAt: b.status === 'CANCELLED' ? new Date() : null,
      },
    });

    // Create payment for each booking
    await prisma.payment.create({
      data: {
        salonId: salon.id,
        bookingId: booking.id,
        customerId: b.customer.id,
        customerName: b.customer.name,
        serviceName: b.service.name,
        staffName: b.staff.name,
        amountPaise: b.pricePaise,
        currency: 'INR',
        method: 'CASH',
        status: b.status === 'COMPLETED' ? 'PAID' : 'PENDING',
        date: todayDate,
        ...(b.status === 'COMPLETED' ? { transactionId: `TXN${Date.now().toString().slice(-6)}` } : {}),
      },
    });

    // Update customer stats for completed bookings
    if (b.status === 'COMPLETED') {
      await prisma.customer.update({
        where: { id: b.customer.id },
        data: {
          totalBookings: { increment: 1 },
          completedBookings: { increment: 1 },
          totalSpentPaise: { increment: b.pricePaise },
          lastVisitAt: todayDate,
        },
      });
    } else if (b.status === 'CANCELLED') {
      await prisma.customer.update({
        where: { id: b.customer.id },
        data: { totalBookings: { increment: 1 }, cancelledBookings: { increment: 1 } },
      });
    } else {
      await prisma.customer.update({
        where: { id: b.customer.id },
        data: { totalBookings: { increment: 1 } },
      });
    }

    // Update salon service totalBookings
    await prisma.salonService.update({
      where: { id: b.service.id },
      data: { totalBookings: { increment: 1 } },
    });
  }
  console.log(`  ✓ Today's bookings: ${todaysBookings.length} created (with payments)`);

  // --- 9. Create notifications ---
  await prisma.notification.createMany({
    data: [
      { salonId: salon.id, type: 'NEW_BOOKING', title: 'New booking received', message: 'Sana Khan booked Facial for today at 2:00 PM.', read: false, createdAt: new Date(Date.now() - 30 * 60 * 1000) },
      { salonId: salon.id, type: 'UPCOMING_APPOINTMENT', title: 'Upcoming appointment', message: 'Priya Nair - Hair Spa at 11:00 AM.', read: false, createdAt: new Date(Date.now() - 60 * 60 * 1000) },
      { salonId: salon.id, type: 'PAYMENT_RECEIVED', title: 'Payment received', message: '₹4,500 received from Imtiyaz Ahmed for Balayage.', read: true, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    ],
  });
  console.log(`  ✓ Notifications: 3 created`);

  // --- 10. Update salon review summary ---
  await prisma.salon.update({
    where: { id: salon.id },
    data: { rating: 4.6, totalReviews: 47 },
  });

  console.log('\n✅ Seed completed successfully!\n');
  console.log('Login credentials:');
  console.log('  Email:    owner@premiumroots.in');
  console.log('  Password: password123');
  console.log('');
  console.log('API base URL: http://localhost:4000/api/v1');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
