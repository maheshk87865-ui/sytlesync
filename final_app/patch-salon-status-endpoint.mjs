import fs from 'fs';

const file = 'D:/AntiGravity/admin1/backend/src/modules/salons/index.ts';
let code = fs.readFileSync(file, 'utf8');

const updateStatusHandler = `
async function updateStatus(req: AuthenticatedRequest, res: any) {
  if (!guardDb(res)) return;
  const { id } = req.params as any;
  const { status, isOpen } = req.body;
  const db = getDb();

  const updateData: any = {};
  if (status !== undefined) updateData.status = status;
  if (isOpen !== undefined) updateData.isOpen = isOpen;

  const updated = await db.salon.update({
    where: { id },
    data: updateData,
  });

  return sendSuccess(res, updated, "Salon status updated successfully");
}
`;

const routeHook = 'router.get("/:id", optionalAuth, validateParams(idParamSchema), getOne);';
const newRoutes = `router.get("/:id", optionalAuth, validateParams(idParamSchema), getOne);
router.patch("/:id/status", updateStatus);`;

code = code.replace(routeHook, updateStatusHandler + '\n' + newRoutes);
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully patched admin1 salons with status update endpoint!');
