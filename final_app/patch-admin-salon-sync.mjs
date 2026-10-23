import fs from 'fs';

const file = 'D:/AntiGravity/stylesync-admin/src/app/api/salons/[id]/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Add sync function and call it after salon update
const syncHelper = `
async function syncToAuthoritativeBackend(salonId: string, status: string, isOpen: boolean) {
  try {
    await fetch(\`http://localhost:4000/api/v1/salons/\${salonId}/status\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status === 'APPROVED' ? 'active' : 'suspended', isOpen }),
    });
  } catch {
    // best-effort synchronization
  }
}
`;

code = syncHelper + '\n' + code;

const afterUpdateHook = `const updated = await prisma.salon.update({
    where: { id },
    data: updateData,
  });`;

const syncCall = `const updated = await prisma.salon.update({
    where: { id },
    data: updateData,
  });
  syncToAuthoritativeBackend(id, updated.applicationStatus, updated.operationalStatus === 'OPEN').catch(() => {});`;

code = code.replace(afterUpdateHook, syncCall);
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully patched stylesync-admin salons/[id] with backend sync!');
