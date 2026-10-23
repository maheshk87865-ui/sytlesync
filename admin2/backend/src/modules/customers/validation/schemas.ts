// ============================================================
// Customers — Validation schemas (Zod)
// ============================================================

import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(4).max(20),
  email: z.string().email().optional(),
  imageUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
  favoriteServiceIds: z.array(z.string()).optional(),
  preferredStaffIds: z.array(z.string()).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// --- List filters (query params) ---
export const customerListFilterSchema = z.object({
  search: z.string().max(120).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  serviceId: z.string().optional(),
  staffId: z.string().optional(),
  status: z.enum(['PENDING', 'UPCOMING', 'COMPLETED', 'CANCELLED']).optional(),
  sortBy: z.enum(['name', 'recent', 'spent', 'bookings']).default('name'),
}).partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerListFilterInput = z.infer<typeof customerListFilterSchema>;
