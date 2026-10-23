import fs from 'fs';

const file = 'D:/AntiGravity/admin1/backend/src/modules/services/index.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Update imports
code = code.replace(
  'import { validateParams, validateQuery } from "../../middleware/validate-request";',
  'import { validateParams, validateQuery, validateBody } from "../../middleware/validate-request";\nimport { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";'
);

// 2. Add mutation schemas and handlers before routes
const mutationCode = `
const createSalonServiceSchema = z.object({
  salonId: z.string().uuid(),
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(80),
  price: z.coerce.number().int().min(0),
  duration: z.coerce.number().int().min(5),
  description: z.string().max(1000).optional(),
});

const updateSalonServiceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(80).optional(),
  price: z.coerce.number().int().min(0).optional(),
  duration: z.coerce.number().int().min(5).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "inactive", "seasonal"]).optional(),
});

async function createSalonService(req: AuthenticatedRequest, res: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const data = req.body;
  const created = await db.salonService.create({
    data: {
      salonId: data.salonId,
      name: data.name,
      category: data.category,
      priceFrom: data.price,
      durationMin: data.duration,
      durationLabel: \`\${data.duration} min\`,
      description: data.description || null,
      status: "active",
      isPublished: true,
    }
  });
  return sendSuccess(res, created, "Service created successfully", 201);
}

async function updateSalonService(req: AuthenticatedRequest, res: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { id } = req.params;
  const data = req.body;
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.price !== undefined) updateData.priceFrom = data.price;
  if (data.duration !== undefined) {
    updateData.durationMin = data.duration;
    updateData.durationLabel = \`\${data.duration} min\`;
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;

  const updated = await db.salonService.update({
    where: { id },
    data: updateData,
  });
  return sendSuccess(res, updated, "Service updated successfully");
}

async function deleteSalonService(req: AuthenticatedRequest, res: any) {
  if (!guardDb(res)) return;
  const db = getDb();
  const { id } = req.params;
  const bookingCount = await db.booking.count({ where: { serviceId: id } });
  if (bookingCount > 0) {
    const updated = await db.salonService.update({
      where: { id },
      data: { status: "inactive", isPublished: false },
    });
    return sendSuccess(res, updated, "Service deactivated because historical bookings exist.");
  }
  await db.salonService.delete({ where: { id } });
  return sendSuccess(res, { id }, "Service deleted successfully");
}
`;

const routeHook = 'router.get("/", validateQuery(listQuerySchema), list);';
const newRoutes = `router.get("/", validateQuery(listQuerySchema), list);
router.post("/salon", requireAuth, validateBody(createSalonServiceSchema), createSalonService);
router.patch("/salon/:id", requireAuth, validateParams(idParamSchema), validateBody(updateSalonServiceSchema), updateSalonService);
router.delete("/salon/:id", requireAuth, validateParams(idParamSchema), deleteSalonService);`;

code = code.replace(routeHook, mutationCode + '\n' + newRoutes);
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully updated services module with CRUD endpoints!');
