// Crop salon cards from the discover page v3 screenshot
const fs = require('fs');
const path = require('path');

(async () => {
  const sharp = (await import('sharp')).default;
  const imgPath = '/home/z/my-project/scripts/state-discover-v3.png';
  const outDir = '/home/z/my-project/scripts/crops';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const cards = [
    { i: 0, name: 'urban-groom-v3', top: 388, left: 24, width: 296, height: 547 },
    { i: 3, name: 'elegance-studio-closed-v3', top: 388, left: 960, width: 296, height: 547 },
  ];

  for (const c of cards) {
    const out = path.join(outDir, `${c.name}.png`);
    await sharp(imgPath)
      .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
      .toFile(out);
    console.log('Saved', out);
  }
})();
