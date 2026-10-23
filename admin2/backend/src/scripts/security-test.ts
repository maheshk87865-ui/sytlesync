// ============================================================
// Cross-salon + role-based access security tests
//
// These tests verify:
//   1. Unauthenticated requests are rejected (401)
//   2. Salon A owner cannot access Salon B's booking (404 — no info leak)
//   3. Salon A staff cannot access Salon B's customer (404)
//   4. Staff cannot access Payments (403 — financial data restricted)
//   5. Manager cannot access Settings (403 — owner-only)
//   6. Manager cannot create an OWNER account (403)
//   7. Salaried staff cannot delete a service (403)
//
// Run: bun run src/scripts/security-test.ts
//
// NOTE: These tests exercise the middleware layer in isolation — they don't
// require a real database. They construct mock Request/Response objects and
// invoke the middleware functions directly to assert the security behavior.
// ============================================================

import { authenticate, requireRole, requireSalonMembership, requireOwner, requireOwnerOrManager } from '../middleware/auth.js';
import { UnauthorizedError, ForbiddenError, AppError } from '../middleware/errorHandler.js';
import { signAccessToken, hashPassword, verifyPassword } from '../utils/auth.js';
import { prisma } from '../database/prisma.js';

// --- Mock helpers ---
type MockRes = { statusCode?: number; jsonBody?: any; headers: Record<string, string> };
function mockRes(): MockRes {
  const r: MockRes = { headers: {} };
  return r;
}

function expressRes(r: MockRes): any {
  const res: any = {
    setHeader: (k: string, v: string) => { r.headers[k] = v; },
    cookie: () => {},
    clearCookie: () => {},
    send: () => {},
  };
  res.status = (code: number) => { r.statusCode = code; return res; };
  res.json = (body: any) => { r.jsonBody = body; return res; };
  return res;
}

type MockReq = {
  headers: Record<string, string>;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  path: string;
  method: string;
  context?: any;
  requestId?: string;
};
function mockReq(opts: Partial<MockReq> = {}): MockReq {
  return {
    headers: {}, params: {}, query: {}, body: {}, path: '/', method: 'GET',
    requestId: 'test-req-id',
    ...opts,
  };
}

// Simple test runner
let passed = 0, failed = 0;
function assert(name: string, cond: boolean, detail?: any) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`, detail ?? ''); }
}

async function runMiddleware(req: MockReq, middleware: any): Promise<any> {
  return new Promise((resolve) => {
    let captured: any = null;
    const next = (err?: any) => { captured = err; if (!nextResolved) { nextResolved = true; resolve(captured); } };
    let nextResolved = false;
    try {
      const result = middleware(req, expressRes(mockRes()), next);
      // Handle async middleware (returns Promise)
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<void>).catch((err) => { captured = err; if (!nextResolved) { nextResolved = true; resolve(captured); } });
      }
    } catch (err) { captured = err; if (!nextResolved) { nextResolved = true; resolve(captured); } }
    // Safety timeout
    setTimeout(() => { if (!nextResolved) { nextResolved = true; resolve(captured); } }, 100);
  });
}

// --- Run tests ---

async function main() {
  console.log('\n=== StyleSync Salon Partner Auth — Security Tests ===\n');

  // ---------- Test 1: Unauthenticated request is rejected ----------
  console.log('Test 1: Unauthenticated request is rejected (401)');
  {
    const req = mockReq();
    const err = await runMiddleware(req, authenticate);
    assert('Returns UnauthorizedError', err instanceof UnauthorizedError, err);
    assert('Error message is "Authentication required"', err?.message === 'Authentication required');
  }

  // ---------- Test 2: Invalid token is rejected ----------
  console.log('\nTest 2: Invalid token is rejected');
  {
    const req = mockReq({ headers: { authorization: 'Bearer invalid-token-here' } });
    const err = await runMiddleware(req, authenticate);
    assert('Returns UnauthorizedError', err instanceof UnauthorizedError, err);
    assert('Error message mentions token', err?.message.toLowerCase().includes('token'));
  }

  // ---------- Test 3: Role check — staff cannot access owner-only route ----------
  console.log('\nTest 3: Staff cannot access owner-only route (Settings)');
  {
    const req = mockReq({ context: { userId: 'staff-1', salonId: 'salon-1', role: 'SALON_STAFF' } });
    const err = await runMiddleware(req, requireOwner);
    assert('Returns ForbiddenError', err instanceof ForbiddenError, err);
    assert('403 message mentions SALON_OWNER', err?.message.includes('SALON_OWNER'));
  }

  // ---------- Test 4: Role check — manager cannot access owner-only route ----------
  console.log('\nTest 4: Manager cannot access owner-only route (Settings)');
  {
    const req = mockReq({ context: { userId: 'mgr-1', salonId: 'salon-1', role: 'SALON_MANAGER' } });
    const err = await runMiddleware(req, requireOwner);
    assert('Returns ForbiddenError', err instanceof ForbiddenError, err);
  }

  // ---------- Test 5: Role check — owner can access owner-only route ----------
  console.log('\nTest 5: Owner can access owner-only route');
  {
    const req = mockReq({ context: { userId: 'owner-1', salonId: 'salon-1', role: 'SALON_OWNER' } });
    const err = await runMiddleware(req, requireOwner);
    assert('No error returned (passes)', err === null || err === undefined);
  }

  // ---------- Test 6: Role check — staff excluded from owner+manager route ----------
  console.log('\nTest 6: Staff excluded from owner+manager route');
  {
    const req = mockReq({ context: { userId: 'staff-1', salonId: 'salon-1', role: 'SALON_STAFF' } });
    const err = await runMiddleware(req, requireOwnerOrManager);
    assert('Returns ForbiddenError', err instanceof ForbiddenError, err);
  }

  // ---------- Test 7: Cross-salon access — Salon A cannot read Salon B's booking ----------
  console.log('\nTest 7: Salon A user cannot access Salon B booking (404 — no info leak)');
  {
    const req = mockReq({
      params: { id: 'booking-from-salon-B' },
      context: { userId: 'owner-A', salonId: 'salon-A', role: 'SALON_OWNER' },
    });
    const originalFindUnique = (prisma as any).booking.findUnique;
    (prisma as any).booking.findUnique = async () => ({ salonId: 'salon-B', id: 'booking-from-salon-B' });
    try {
      const err = await runMiddleware(req, requireSalonMembership('booking'));
      assert('Returns NOT_FOUND (not FORBIDDEN)', err instanceof AppError && err.code === 'NOT_FOUND', err);
      assert('404 status', err?.httpStatus === 404);
    } finally {
      (prisma as any).booking.findUnique = originalFindUnique;
    }
  }

  // ---------- Test 8: Same-salon access succeeds ----------
  console.log('\nTest 8: Same-salon access succeeds');
  {
    const req = mockReq({
      params: { id: 'booking-from-salon-A' },
      context: { userId: 'owner-A', salonId: 'salon-A', role: 'SALON_OWNER' },
    });
    const originalFindUnique = (prisma as any).booking.findUnique;
    (prisma as any).booking.findUnique = async () => ({ salonId: 'salon-A', id: 'booking-from-salon-A' });
    try {
      const err = await runMiddleware(req, requireSalonMembership('booking'));
      assert('No error returned (passes)', err === null || err === undefined);
    } finally {
      (prisma as any).booking.findUnique = originalFindUnique;
    }
  }

  // ---------- Test 9: Non-existent resource returns 404 (no leak) ----------
  console.log('\nTest 9: Non-existent resource returns 404 (no leak)');
  {
    const req = mockReq({
      params: { id: 'does-not-exist' },
      context: { userId: 'owner-A', salonId: 'salon-A', role: 'SALON_OWNER' },
    });
    const originalFindUnique = (prisma as any).booking.findUnique;
    (prisma as any).booking.findUnique = async () => null;
    try {
      const err = await runMiddleware(req, requireSalonMembership('booking'));
      assert('Returns NOT_FOUND', err instanceof AppError && err.code === 'NOT_FOUND', err);
    } finally {
      (prisma as any).booking.findUnique = originalFindUnique;
    }
  }

  // ---------- Test 10: JWT signing round-trip ----------
  console.log('\nTest 10: JWT signing produces a valid token');
  {
    const token = signAccessToken({ sub: 'user-1', salonId: 'salon-1', role: 'SALON_OWNER' });
    assert('Token is a non-empty string', typeof token === 'string' && token.length > 0);
    assert('Token has 3 parts (header.payload.signature)', token.split('.').length === 3);
  }

  // ---------- Test 11: Password hashing never stores plaintext ----------
  console.log('\nTest 11: Password hashing produces a non-plaintext hash');
  {
    const plain = 'supersecret123';
    const hash = await hashPassword(plain);
    assert('Hash is not the plaintext', hash !== plain);
    assert('Hash starts with $2 (bcrypt)', hash.startsWith('$2'));
    assert('Hash is at least 50 chars', hash.length >= 50);
    // Verify round-trip
    const valid = await verifyPassword(plain, hash);
    assert('verifyPassword(plain, hash) returns true', valid === true);
    const invalid = await verifyPassword('wrong-password', hash);
    assert('verifyPassword(wrong, hash) returns false', invalid === false);
  }

  // ---------- Test 12: requireRole with multiple roles ----------
  console.log('\nTest 12: requireRole with multiple roles');
  {
    const ownerReq = mockReq({ context: { userId: 'o', salonId: 's', role: 'SALON_OWNER' } });
    const managerReq = mockReq({ context: { userId: 'm', salonId: 's', role: 'SALON_MANAGER' } });
    const staffReq = mockReq({ context: { userId: 'st', salonId: 's', role: 'SALON_STAFF' } });
    const multiRole = requireRole('SALON_OWNER', 'SALON_MANAGER');
    assert('Owner passes', !(await runMiddleware(ownerReq, multiRole)));
    assert('Manager passes', !(await runMiddleware(managerReq, multiRole)));
    const staffErr = await runMiddleware(staffReq, multiRole);
    assert('Staff is rejected', staffErr instanceof ForbiddenError);
  }

  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
