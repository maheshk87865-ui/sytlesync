// Crop salon cards from the discover page screenshot for inspection
const fs = require('fs');
const path = require('path');

(async () => {
  const sharp = (await import('sharp')).default;
  const imgPath = '/home/z/my-project/scripts/state-discover-v2.png';
  const outDir = '/home/z/my-project/scripts/crops';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Cards from the eval result
  const cards = [
    { i: 0, name: 'urban-groom', top: 388, left: 24, width: 296, height: 547 },
    { i: 3, name: 'elegance-studio-closed', top: 388, left: 960, width: 296, height: 547 },
    { i: 4, name: 'kashmir-beauty', top: 951, left: 24, width: 296, height: 547 },
  ];

  for (const c of cards) {
    const out = path.join(outDir, `card-${c.name}.png`);
    await sharp(imgPath)
      .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
      .toFile(out);
    console.log('Saved', out);
  }
})();
