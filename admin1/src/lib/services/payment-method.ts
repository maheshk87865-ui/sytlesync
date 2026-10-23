/**
 * Payment Method Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/payments/methods for
 * the customer's saved (masked) payment methods.
 *
 * The backend enforces:
 *   - Only masked labels are stored (no real card numbers / CVV / UPI PIN)
 *   - Customer isolation (uses JWT customerId)
 *   - is_default transactional update (unset all, set one)
 *   - provider_token is the only reference to a vaulted payment provider
 */

import { api } from "@/lib/backend/client";
import type { PaymentMethodRecord } from "@/lib/types";

export interface AddPaymentMethodInput {
  customer_id: string;        // ignored by backend (uses JWT customerId)
  type: "upi" | "card" | "wallet";
  label: string;              // masked, e.g. "•••• 4821" or "mahesh@upi"
  sub_label: string | null;
  provider_token: string | null;
}

// ─── Backend response shape ────────────────────────────────────
interface BackendPaymentMethod {
  id: string;
  customerId?: string;
  type: string;
  label: string;
  subLabel?: string | null;
  subtitle?: string | null;
  isDefault?: boolean;
  providerToken?: string | null;
  createdAt?: string;
}

/** Get the customer's saved payment methods. */
export async function getPaymentMethods(_customer_id: string): Promise<PaymentMethodRecord[]> {
  const result = await api.get<BackendPaymentMethod[] | { methods: BackendPaymentMethod[] }>(
    "/payments/methods"
  );
  const rows = Array.isArray(result) ? result : (result?.methods || []);
  return rows.map(mapToPaymentMethod);
}

/** Add a new masked payment method (no real card data). */
export async function addPaymentMethod(input: AddPaymentMethodInput): Promise<PaymentMethodRecord> {
  const result = await api.post<BackendPaymentMethod>("/payments/methods", {
    type: input.type,
    label: input.label,
    subLabel: input.sub_label,
    providerToken: input.provider_token,
  });
  return mapToPaymentMethod(result);
}

/** Remove a payment method. */
export async function removePaymentMethod(_customer_id: string, paymentMethodId: string): Promise<void> {
  await api.del(`/payments/methods/${paymentMethodId}`);
}

/** Set a payment method as the default. */
export async function setDefaultPaymentMethod(_customer_id: string, paymentMethodId: string): Promise<void> {
  await api.patch(`/payments/methods/${paymentMethodId}/default`, {});
}

/** Create a payment intent for a booking (server-side amount). */
export async function createPaymentIntent(bookingId: string, paymentMethodId?: string): Promise<{
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  providerOrderId?: string;
}> {
  return await api.post("/payments/intent", {
    bookingId,
    paymentMethodId,
  });
}

/** Verify a payment (after the customer completes the gateway flow). */
export async function verifyPayment(paymentId: string, providerPaymentId?: string): Promise<{
  paymentId: string;
  status: string;
  bookingStatus: string;
}> {
  return await api.post("/payments/verify", {
    paymentId,
    providerPaymentId,
  });
}

/** Get the customer's payment history. */
export async function getPaymentHistory(_customer_id: string): Promise<any[]> {
  const result = await api.get<any[] | { payments: any[] }>("/payments/history");
  return Array.isArray(result) ? result : (result?.payments || []);
}

// ─── Mapper ────────────────────────────────────────────────────
function mapToPaymentMethod(m: BackendPaymentMethod): PaymentMethodRecord {
  return {
    id: m.id,
    customer_id: m.customerId || "",
    type: (m.type || "upi") as "upi" | "card" | "wallet",
    label: m.label,
    sub_label: m.subLabel ?? m.subtitle ?? null,
    is_default: !!m.isDefault,
    provider_token: m.providerToken ?? null,
    created_at: m.createdAt || "",
  };
}
