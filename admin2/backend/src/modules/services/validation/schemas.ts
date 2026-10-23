// Services (catalog) — Validation schemas
import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(['HAIR', 'BEARD_GROOMING', 'SKIN_BEAUTY', 'NAILS', 'MAKEUP', 'OTHER']),
  description: z.string().max(500).optional(),
  // Money is in paise (₹1 = 100 paise)
  price: z.number().int().min(0),
  durationMin: z.number().int().min(5).max(1440),
  imageUrl: z.string().url().optional(),
  active: z.boolean().optional(),
  staffIds: z.array(z.string()).optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
