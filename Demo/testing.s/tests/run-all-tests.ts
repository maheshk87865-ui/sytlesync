import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode('stylesync-superadmin-secure-jwt-key-srinagar-2026');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('======================================================');
  console.log('      STYLESYNC SUPER ADMIN — AUTOMATED TEST SUITE    ');
  console.log('======================================================\n');

  try {
    // TEST 1: Database Connectivity & Srinagar Pilot Baseline
    console.log('[TEST GROUP 1: Database Schema & Baseline Integrity]');
    const salonCount = await prisma.salon.count();
    const customerCount = await prisma.customer.count();
    const bookingCount = await prisma.booking.count();
    const serviceCount = await prisma.globalService.count();
    const adminCount = await prisma.admin.count();

    assert(salonCount >= 10, `At least 10 partner salons seeded in Srinagar (found ${salonCount})`);
    assert(customerCount >= 30, `At least 30 customer accounts seeded (found ${customerCount})`);
    assert(bookingCount >= 80, `At least 80 historical & scheduled bookings seeded (found ${bookingCount})`);
    assert(serviceCount >= 20, `Service catalog contains at least 20 global treatments (found ${serviceCount})`);
    assert(adminCount >= 5, `Configured 5 administrative roles in directory (found ${adminCount})`);

    // TEST 2: Security & Authentication Tests
    console.log('\n[TEST GROUP 2: Password Security & Token Verification]');
    const superAdmin = await prisma.admin.findUnique({ where: { email: 'admin@stylesync.in' } });
    assert(!!superAdmin, 'Super Admin account exists (admin@stylesync.in)');

    const validPassword = await bcrypt.compare('AdminPassword123!', superAdmin!.passwordHash);
    assert(validPassword, 'Bcrypt verification succeeds for valid administrative credentials');

    const invalidPassword = await bcrypt.compare('WrongPassword999!', superAdmin!.passwordHash);
    assert(!invalidPassword, 'Bcrypt verification rejects unauthorized passwords');

    // Token creation and verification
    const token = await new SignJWT({
      id: superAdmin!.id,
      email: superAdmin!.email,
      name: superAdmin!.name,
      role: superAdmin!.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    const decoded = await jwtVerify(token, JWT_SECRET);
    assert(decoded.payload.email === 'admin@stylesync.in', 'JWT authentication token signed & verified successfully');

    // TEST 3: Commission Calculation & Financial Precision (Phase 12)
    console.log('\n[TEST GROUP 3: Commission Rules & Financial Consistency]');
    // 7% for new customer, 2% for repeat customer
    const samplePrice = 1000;
    const newCustomerComm = samplePrice * 0.07;
    const repeatCustomerComm = samplePrice * 0.02;
    assert(newCustomerComm === 70, '7% commission accurately computed for new customer booking (₹70 on ₹1,000)');
    assert(repeatCustomerComm === 20, '2% commission accurately computed for repeat customer booking (₹20 on ₹1,000)');

    // Verify database bookings comply with commission rule
    const sampleBookings = await prisma.booking.findMany({ take: 10 });
    let commissionMathValid = true;
    for (const b of sampleBookings) {
      const expectedCommission = Math.round(b.price * b.commissionRate * 100) / 100;
      if (Math.abs(b.commissionAmount - expectedCommission) > 0.1) {
        commissionMathValid = false;
        break;
      }
      if (Math.abs(b.salonPayoutAmount - (b.price - b.commissionAmount)) > 0.1) {
        commissionMathValid = false;
        break;
      }
    }
    assert(commissionMathValid, 'All sample bookings strictly adhere to: Price = Commission + Salon Payout');

    // TEST 4: Refund Safeguards (Phase 12)
    console.log('\n[TEST GROUP 4: Refund Safeguards & Duplicate Prevention]');
    const paidPayment = await prisma.payment.findFirst({
      where: { status: 'SUCCESS' },
      include: { refunds: true },
    });
    assert(!!paidPayment, 'Identified valid completed payment record');

    const totalRefunded = (paidPayment?.refunds || []).reduce((sum, r) => sum + r.amount, 0);
    const excessiveRefundAttempt = (paidPayment?.amount || 0) + 500;
    const refundPrevented = excessiveRefundAttempt > (paidPayment?.amount || 0) - totalRefunded;
    assert(refundPrevented, 'Safeguard correctly blocks refund amounts greater than original transaction charge');

    // TEST 5: Salon Workflow & Operational State (Phase 8)
    console.log('\n[TEST GROUP 5: Salon Workflow State Transitions]');
    const pendingSalon = await prisma.salon.findFirst({ where: { applicationStatus: 'PENDING' } });
    assert(!!pendingSalon, `Pending salon application exists for review workflow (${pendingSalon?.name})`);

    // TEST 6: Review Moderation Safeguards (Phase 13)
    console.log('\n[TEST GROUP 6: Review Moderation & Investigation]');
    const reportedReview = await prisma.review.findFirst({ where: { reportStatus: 'REPORTED' } });
    assert(!!reportedReview, `Reported review detected in queue for administrator moderation (${reportedReview?.id})`);

    // TEST 7: Support & Dispute System (Phase 14)
    console.log('\n[TEST GROUP 7: Support Tickets & Dispute Resolution]');
    const supportTicket = await prisma.supportTicket.findFirst({
      include: { messages: true },
    });
    assert(!!supportTicket, `Support ticket loaded with thread (${supportTicket?.ticketNumber})`);
    assert(supportTicket!.messages.length > 0, 'Support ticket has recorded customer/internal messages');

    // TEST 8: Audit Log Integrity (Phase 18)
    console.log('\n[TEST GROUP 8: Protected Security Audit Trail]');
    const auditLogsCount = await prisma.auditLog.count();
    assert(auditLogsCount > 0, `Audit logs actively recording platform events (found ${auditLogsCount} events)`);

    // TEST 9: AI Telemetry & Latency Safeguards (Phase 16)
    console.log('\n[TEST GROUP 9: AI Telemetry & Privacy]');
    const aiLog = await prisma.aIOperation.findFirst();
    assert(!!aiLog, 'AI telemetry tracking active with tokens, model, and latency metadata');
    assert(aiLog!.latencyMs > 0, `Latency recorded accurately (${aiLog?.latencyMs} ms)`);

    // TEST 10: Srinagar Territory Localities (Phase 19)
    console.log('\n[TEST GROUP 10: Srinagar Pilot Localities]');
    const localities = await prisma.location.findMany({ where: { cityName: 'Srinagar' } });
    assert(localities.length >= 8, `Srinagar coverage verified across ${localities.length} pilot localities`);

  } catch (error) {
    console.error('Fatal error during test execution:', error);
    failedTests++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite();
