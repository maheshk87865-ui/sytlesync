import fs from 'fs';

const file = 'D:/AntiGravity/admin1/backend/src/modules/bookings/index.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  'action: `BOOKING_${status}`,',
  'action: (status === "CANCELLED" ? "BOOKING_CANCELLED" : "BOOKING_CREATED") as any,'
);
fs.writeFileSync(file, code, 'utf8');
console.log('Fixed audit action type successfully!');
