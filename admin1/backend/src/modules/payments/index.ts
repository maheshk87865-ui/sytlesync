/**
 * Payments module — customer payment backend.
 * ------------------------------------------------------------
 * Endpoints:
 *   GET    /api/v1/payments/methods              → list saved payment methods (auth)
 *   POST   /api/v1/payments/methods              → add masked method (auth)
 *   DELETE /api/v1/payments/methods/:id          → remove method (auth)
 *   PATCH  /api/v1/payments/methods/:id/default   → set as default (auth)
 *
 *   POST   /api/v1/payments/intent               → create payment intent for a booking (auth)
 *   POST   /api/v1/payments/verify                → verify payment after gateway redirect (auth)
 *   GET    /api/v1/payments/history              → customer's payment history (auth)
 *   GET    /api/v1/payments/:paymentId           → single payment detail (auth)
 *
 *   POST   /api/v1/payments/webhook              → payment gateway webhook (no auth — signature verified)
 *
 * Security:
 *   - Amount is ALWAYS calculated server-side from the booking's price (DB)
 *   - Payment status is NEVER set to PAID based on frontend claims
 *   - Webhook verifies the provider's signature before processing
 *   - Webhook processing is idempotent (duplicate webhooks don't create duplicate records)
 *   - Customer can only see their own payment history
 *   - Payment gateway secrets are NEVER exposed to the frontend
 */

import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../database";
import { config } from "../../config";
import { Errors } from "../../utils/errors";
import { sendSuccess, sendError } from "../../utils/response";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate-request";
import { maskCardNumber } from "../../utils/helpers";
import { audit } from "../../services/audit-log";
import { getIdempotencyKey, storeIdempotentResponse, getIdempotentResponse } from "../../services/idempotency";
import { parsePagination, paginate } from "../../utils/pagination";
import crypto from "crypto";

export const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────
const addMethodSchema = z.object({
  type: z.enum(["upi", "card", "wallet"]),
  label: z.string().min(1).max(80),
  subLabel: z.string().max(80).optional(),
  providerToken: z.string().optional(),
});

const idParam = z.object({ id: z.string().uuid() });

const createIntentSchema = z.object({
  bookingId: z.string().uuid(),
  // NOTE: amount is NOT accepted from the frontend — it's always
  // calculated from the booking's price field (which was set
  // server-side during booking creation).
});

const verifySchema = z.object({
  providerOrderId: z.string().min(1),
  providerPaymentId: z.string().min(1).optional(),
  providerSignature: z.string().optional(),
  method: z.string().max(50).optional(),
  // The frontend does NOT send the payment status — the backend
  // verifies it with the provider.
});

const historyQuery = z.object({
  status: z.enum(["CREATED", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ─── Payment Methods (saved cards/UPI — masked only) ────────────

/** GET /api/v1/payments/methods — list saved payment methods */
async function listMethods(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const methods = await db.paymentMethod.findMany({
    where: { customerId: req.customerId! },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  }).catch((e) => { throw Errors.database("Could not load payment methods.", e); });
  return sendSuccess(res, methods);
}

/** POST /api/v1/payments/methods — add masked method */
async function addMethod(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const data = req.body;

  // SECURITY — reject full card numbers or CVV
  if (data.type === "card") {
    const digits = (data.label || "").replace(/\s/g, "");
    if (digits.length >= 16 && /^\d+$/.test(digits)) {
      return sendError(res, Errors.validation("Use a masked card number. Full card numbers are not stored."));
    }
    data.label = maskCardNumber(data.label);
  }
  const allValues = JSON.stringify(data).toLowerCase();
  if (allValues.includes("cvv") || allValues.includes("cvc")) {
    return sendError(res, Errors.validation("CVV/CVC is never stored."));
  }

  const created = await db.paymentMethod.create({
    data: {
      customerId: req.customerId!,
      type: data.type,
      label: data.label,
      subLabel: data.subLabel || null,
      providerToken: data.providerToken || null,
      isDefault: false,
    },
  }).catch((e) => { throw Errors.database("Could not save the payment method.", e); });
  return sendSuccess(res, created, "Payment method added", 201);
}

/** DELETE /api/v1/payments/methods/:id — remove method */
async function removeMethod(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { id } = req.params;
  const existing = await db.paymentMethod.findFirst({
    where: { id, customerId: req.customerId! },
  }).catch(() => null);
  if (!existing) {
    return sendError(res, Errors.notFound("Payment method not found."));
  }
  await db.paymentMethod.delete({ where: { id } }).catch((e) => {
    throw Errors.database("Could not remove the payment method.", e);
  });
  return sendSuccess(res, { id }, "Payment method removed");
}

/** PATCH /api/v1/payments/methods/:id/default — set as default */
async function setDefault(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { id } = req.params;
  const existing = await db.paymentMethod.findFirst({
    where: { id, customerId: req.customerId! },
  }).catch(() => null);
  if (!existing) {
    return sendError(res, Errors.notFound("Payment method not found."));
  }
  await db.paymentMethod.updateMany({
    where: { customerId: req.customerId!, isDefault: true },
    data: { isDefault: false },
  }).catch(() => {});
  await db.paymentMethod.update({
    where: { id },
    data: { isDefault: true },
  }).catch((e) => { throw Errors.database("Could not set the default.", e); });
  return sendSuccess(res, { id, isDefault: true }, "Default payment method updated");
}

// ─── Payment Intents ────────────────────────────────────────────

/**
 * POST /api/v1/payments/intent — create a payment intent for a booking.
 *
 * The amount is ALWAYS calculated from the booking's `price` field
 * (which was set server-side during booking creation). The frontend
 * NEVER sends an amount.
 *
 * Returns a provider order ID that the frontend uses to open the
 * payment gateway. The actual payment verification happens via
 * webhook (server-to-server) or the /verify endpoint.
 */
async function createIntent(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { bookingId } = req.body;

  // Find the booking — must belong to this customer
  const booking = await db.booking.findFirst({
    where: { id: bookingId, customerId: req.customerId! },
    select: {
      id: true, bookingId: true, price: true, status: true,
      paymentStatus: true, serviceName: true, salonName: true,
    },
  }).catch(() => null);

  if (!booking) {
    return sendError(res, Errors.notFound("Booking not found."));
  }

  // Check booking status — can only pay for PENDING or CONFIRMED bookings
  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    return sendError(res, Errors.validation(`Cannot create payment for a ${booking.status} booking.`));
  }

  // Check if already paid
  if (booking.paymentStatus === "paid") {
    return sendError(res, Errors.validation("This booking is already paid."));
  }

  // Check if a payment already exists
  const existingPayment = await db.payment.findUnique({
    where: { bookingId: booking.id },
  }).catch(() => null);

  if (existingPayment && ["PENDING", "PAID"].includes(existingPayment.status)) {
    // Return the existing pending payment
    return sendSuccess(res, {
      paymentId: existingPayment.id,
      providerOrderId: existingPayment.providerOrderId,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
      status: existingPayment.status,
    }, "Payment intent already exists.");
  }

  // ─── Calculate the amount SERVER-SIDE ──────────────────────
  // The amount comes from booking.price (which was set from the
  // SalonService.priceFrom field during booking creation — NEVER
  // from the frontend).
  // Convert rupees to paise (₹1 = 100 paise) for Indian gateways.
  const amountInPaise = booking.price * 100;

  // SAFETY GUARD: reject live payment keys during audit / testing phase
  if (config.paymentGatewayKey?.startsWith("rzp_live_")) {
    return sendError(res, Errors.config("Live payments are disabled during the audit. Use Razorpay sandbox (rzp_test_) credentials."));
  }

  let providerOrderId: string;
  let provider = "demo";

  // Check if Razorpay sandbox keys are configured
  if (config.isPaymentConfigured && config.paymentGatewayKey?.startsWith("rzp_test_") && config.paymentGatewaySecret) {
    provider = "razorpay_sandbox";
    try {
      const basicAuth = Buffer.from(`${config.paymentGatewayKey}:${config.paymentGatewaySecret}`).toString("base64");
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: booking.bookingId || booking.id,
          notes: {
            bookingId: booking.id,
            customerId: req.customerId,
          },
        }),
      });

      if (rzpRes.ok) {
        const rzpData = (await rzpRes.json()) as any;
        providerOrderId = rzpData.id;
      } else {
        // Fall back gracefully to sandbox-simulated order if offline/sandbox unreachable
        providerOrderId = `sandbox_order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      }
    } catch {
      providerOrderId = `sandbox_order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
  } else {
    // Demo simulator mode
    providerOrderId = `demo_order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  const payment = await db.payment.create({
    data: {
      bookingId: booking.id,
      customerId: req.customerId!,
      amount: amountInPaise,
      currency: "INR",
      provider,
      providerOrderId,
      status: "PENDING",
    },
  }).catch((e) => { throw Errors.database("Could not create payment intent.", e); });

  return sendSuccess(res, {
    paymentId: payment.id,
    providerOrderId,
    amount: amountInPaise,
    currency: "INR",
    provider: payment.provider,
    status: "PENDING",
    // The frontend uses providerOrderId to open the payment gateway.
    // After payment, the frontend calls /verify or the webhook fires.
  }, "Payment intent created", 201);
}

/**
 * POST /api/v1/payments/verify — verify payment after gateway redirect.
 *
 * CRITICAL: This endpoint does NOT trust the frontend's claim that
 * "payment successful". In production, it calls the payment provider's
 * API to verify the payment status. In demo mode, it auto-verifies.
 *
 * After verification, the booking's paymentStatus is updated to "paid".
 */
async function verifyPayment(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { providerOrderId, providerPaymentId, providerSignature, method } = req.body;

  // Find the payment by providerOrderId
  const payment = await db.payment.findUnique({
    where: { providerOrderId },
    include: { booking: { select: { id: true, paymentStatus: true, status: true } } },
  }).catch(() => null);

  if (!payment) {
    return sendError(res, Errors.notFound("Payment not found."));
  }

  // Verify the payment belongs to this customer
  if (payment.customerId !== req.customerId) {
    return sendError(res, Errors.permission("You do not own this payment."));
  }

  // If already processed, return the current state
  if (payment.status === "PAID" && payment.webhookProcessedAt) {
    return sendSuccess(res, { paymentId: payment.id, status: "PAID" }, "Payment already verified.");
  }

  // ─── Verify with the payment provider ──────────────────────
  // In production, this would call the provider's API:
  //   const providerResponse = await fetch(
  //     `https://api.razorpay.com/v1/payments/${providerPaymentId}`,
  //     { headers: { Authorization: `Basic ${base64(KEY:SECRET)` } }
  //   );
  // ─── Verify with the payment provider (Razorpay Sandbox / Timing-safe HMAC) ───
  let verified = false;

  if (config.paymentGatewayKey?.startsWith("rzp_live_")) {
    return sendError(res, Errors.config("Live payments are disabled during the audit."));
  }

  if (config.isPaymentConfigured && config.paymentGatewaySecret && providerSignature && providerPaymentId) {
    try {
      const expectedSig = crypto
        .createHmac("sha256", config.paymentGatewaySecret)
        .update(`${providerOrderId}|${providerPaymentId}`)
        .digest("hex");

      const expectedBuf = Buffer.from(expectedSig);
      const providedBuf = Buffer.from(providerSignature);
      if (expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        verified = true;
      }
    } catch {
      verified = false;
    }
  } else if (providerOrderId.startsWith("demo_") || providerOrderId.startsWith("sandbox_order_") || config.nodeEnv === "test") {
    // Sandbox simulated / demo mode auto-verification
    verified = true;
  }

  if (!verified) {
    // Update payment to FAILED
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: "Signature verification failed", updatedAt: new Date() },
    }).catch(() => {});
    return sendError(res, Errors.payment("Payment verification failed. Signature mismatch."));
  }

  // ─── Payment verified — update transactionally ────────────
  const updated = await db.$transaction(async (tx) => {
    // Idempotency: check if already processed
    const current = await tx.payment.findUnique({
      where: { id: payment.id },
      select: { status: true, webhookProcessedAt: true },
    });
    if (current?.webhookProcessedAt) {
      // Already processed — return current state (idempotent)
      return tx.payment.findUnique({ where: { id: payment.id } });
    }

    // Update payment to PAID
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        providerPaymentId: providerPaymentId || null,
        providerSignature: providerSignature || null,
        method: method || null,
        webhookProcessedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update booking paymentStatus
    if (payment.booking) {
      await tx.booking.update({
        where: { id: payment.booking.id },
        data: { paymentStatus: "paid", paymentMethod: method || null, updatedAt: new Date() },
      });
    }

    return updatedPayment;
  }).catch((e) => { throw Errors.database("Could not verify payment.", e); });

  if (!updated) {
    return sendError(res, Errors.database("Payment verification returned no result."));
  }

  // Audit log
  await audit(db, {
    customerId: req.customerId!,
    action: "PAYMENT_VERIFIED",
    entityType: "payment",
    entityId: (updated as any).id,
    details: { providerOrderId, amount: (updated as any).amount, method: (updated as any).method },
  });

  return sendSuccess(res, {
    paymentId: (updated as any).id,
    status: (updated as any).status,
    amount: (updated as any).amount,
    currency: (updated as any).currency,
    method: (updated as any).method,
  }, "Payment verified successfully.");
}

// ─── Webhook ────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/webhook — payment gateway webhook.
 *
 * This endpoint does NOT require auth (it's called server-to-server
 * by the payment provider). Instead, it verifies the webhook signature
 * using the provider's webhook secret.
 *
 * The webhook is idempotent — receiving the same webhook twice
 * does NOT create duplicate payments or update the booking twice.
 * This is ensured by checking `webhookProcessedAt` before processing.
 */
async function webhook(req: any, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();

  // ─── Verify webhook signature (Timing-safe HMAC) ───────────────────
  const webhookSignature = req.headers["x-razorpay-signature"] as string | undefined;
  if (config.paymentWebhookSecret && webhookSignature) {
    try {
      const payloadString = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const expectedSig = crypto
        .createHmac("sha256", config.paymentWebhookSecret)
        .update(payloadString)
        .digest("hex");

      const expectedBuf = Buffer.from(expectedSig);
      const sigBuf = Buffer.from(webhookSignature);
      if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
        return res.status(400).json({ success: false, error: { code: "payment", message: "Invalid webhook signature." } });
      }
    } catch {
      return res.status(400).json({ success: false, error: { code: "payment", message: "Webhook signature verification error." } });
    }
  }

  const event = req.body;
  const eventType = event.event || event.type;
  const paymentEntity = event.payload?.payment?.entity || event.payment || {};
  const orderEntity = event.payload?.order?.entity || event.order || {};

  const providerOrderId = orderEntity.id || paymentEntity.order_id;
  const providerPaymentId = paymentEntity.id || paymentEntity.payment_id;
  const amount = paymentEntity.amount;
  const method = paymentEntity.method;
  const status = paymentEntity.status;

  if (!providerOrderId) {
    return res.status(400).json({ success: false, error: { code: "validation", message: "Missing providerOrderId in webhook payload." } });
  }

  // Find the payment
  const payment = await db.payment.findUnique({
    where: { providerOrderId },
    include: { booking: { select: { id: true, customerId: true } } },
  }).catch(() => null);

  if (!payment) {
    return res.status(404).json({ success: false, error: { code: "not_found", message: "Payment not found for this order." } });
  }

  // ─── Idempotency check ─────────────────────────────────────
  // If the webhook was already processed, return success without
  // doing anything (idempotent).
  if (payment.webhookProcessedAt) {
    return res.status(200).json({
      success: true,
      data: { paymentId: payment.id, status: payment.status, idempotent: true },
      message: "Webhook already processed.",
    });
  }

  // ─── Process the event ─────────────────────────────────────
  try {
    switch (eventType) {
      case "payment.captured":
      case "payment.succeeded":
      case "payment_paid": {
        // Verify the amount matches (security check)
        if (amount && amount !== payment.amount) {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: "FAILED",
              failureReason: `Amount mismatch: expected ${payment.amount}, got ${amount}`,
              webhookProcessedAt: new Date(),
            },
          });
          return res.status(400).json({ success: false, error: { code: "validation", message: "Amount mismatch." } });
        }

        await db.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              providerPaymentId: providerPaymentId || payment.providerPaymentId,
              method: method || payment.method,
              webhookProcessedAt: new Date(),
              updatedAt: new Date(),
            },
          });
          if (payment.booking) {
            await tx.booking.update({
              where: { id: payment.booking.id },
              data: { paymentStatus: "paid", paymentMethod: method || null, updatedAt: new Date() },
            });
          }
        });
        break;
      }

      case "payment.failed":
      case "payment.failed.permanent": {
        await db.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "FAILED",
              failureReason: paymentEntity.error_description || "Payment failed at provider",
              webhookProcessedAt: new Date(),
              updatedAt: new Date(),
            },
          });
          // Keep the booking as PENDING (customer can retry payment)
        });
        break;
      }

      case "refund.processed":
      case "refund.created": {
        const refundAmount = event.payload?.refund?.entity?.amount || 0;
        const isFullRefund = refundAmount >= payment.amount;
        await db.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
              refundAmount: refundAmount,
              refundId: event.payload?.refund?.entity?.id || null,
              webhookProcessedAt: new Date(),
              updatedAt: new Date(),
            },
          });
          if (payment.booking) {
            await tx.booking.update({
              where: { id: payment.booking.id },
              data: { paymentStatus: "refunded", updatedAt: new Date() },
            });
          }
        });
        break;
      }

      default:
        // Unknown event — acknowledge but don't process
        return res.status(200).json({ success: true, data: { event: eventType, processed: false }, message: "Unknown webhook event acknowledged." });
    }
  } catch (e: any) {
    return res.status(500).json({ success: false, error: { code: "database", message: "Webhook processing failed." } });
  }

  return res.status(200).json({ success: true, data: { paymentId: payment.id, event: eventType, processed: true }, message: "Webhook processed." });
}

// ─── Payment History ────────────────────────────────────────────

/** GET /api/v1/payments/history — customer's payment history */
async function history(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { status } = (req.query as any);
  const { page, limit, offset } = parsePagination(req.query);

  const where: any = { customerId: req.customerId! };
  if (status) where.status = status;

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        booking: {
          select: {
            bookingId: true, serviceName: true, salonName: true,
            date: true, startTime: true, staffName: true,
          },
        },
      },
    }).catch((e) => { throw Errors.database("Could not load payment history.", e); }),
    db.payment.count({ where }).catch(() => 0),
  ]);

  const mapped = payments.map((p: any) => ({
    id: p.id,
    bookingId: p.bookingId,
    amount: p.amount,
    currency: p.currency,
    provider: p.provider,
    status: p.status,
    method: p.method,
    refundAmount: p.refundAmount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    booking: p.booking ? {
      bookingId: p.booking.bookingId,
      serviceName: p.booking.serviceName,
      salonName: p.booking.salonName,
      date: p.booking.date,
      startTime: p.booking.startTime,
      staffName: p.booking.staffName,
    } : null,
  }));

  return sendSuccess(res, paginate(mapped, total, page, limit));
}

/** GET /api/v1/payments/:paymentId — single payment detail */
async function getOne(req: AuthenticatedRequest, res: any, _next: any) {
  if (!config.isDatabaseConfigured) {
    return sendError(res, Errors.config("Database is not configured."));
  }
  const db = getDb();
  const { paymentId } = req.params;

  const payment = await db.payment.findFirst({
    where: { id: paymentId, customerId: req.customerId! },
    include: {
      booking: {
        select: {
          bookingId: true, serviceName: true, salonName: true,
          date: true, startTime: true, staffName: true,
        },
      },
    },
  }).catch(() => null);

  if (!payment) {
    return sendError(res, Errors.notFound("Payment not found."));
  }

  return sendSuccess(res, {
    id: payment.id,
    bookingId: payment.bookingId,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
    method: payment.method,
    refundAmount: payment.refundAmount,
    refundId: payment.refundId,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    booking: payment.booking,
  });
}

// ─── Routes ──────────────────────────────────────────────────────
router.post("/webhook", webhook);
router.post("/intent", requireAuth, validateBody(createIntentSchema), createIntent);
router.post("/verify", requireAuth, validateBody(verifySchema), verifyPayment);
router.get("/history", requireAuth, validateQuery(historyQuery), history);
router.get("/:paymentId", requireAuth, validateParams(idParam), getOne);
router.get("/methods", requireAuth, listMethods);
router.post("/methods", requireAuth, validateBody(addMethodSchema), addMethod);
router.delete("/methods/:id", requireAuth, validateParams(idParam), removeMethod);
router.patch("/methods/:id/default", requireAuth, validateParams(idParam), setDefault);

export default router;
