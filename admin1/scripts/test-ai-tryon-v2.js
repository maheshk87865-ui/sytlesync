// Test the new style-tryon endpoint
const fs = require('fs');

(async () => {
  const imgPath = '/home/z/my-project/public/salons/salon-01.jpeg';
  const buffer = fs.readFileSync(imgPath);
  const base64 = buffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  console.log('Calling /api/style-tryon...');
  
  const start = Date.now();
  try {
    const res = await fetch('http://localhost:3000/api/style-tryon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dataUrl,
        styleDescription: 'Professional taper cut with neat side part',
        serviceType: 'Haircut',
      }),
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Response in ${elapsed}s:`, res.status);
    
    const data = await res.json();
    if (res.ok) {
      console.log('SUCCESS!');
      console.log('  imageUrl:', data.imageUrl);
      console.log('  source:', data.source);
      console.log('  label:', data.label);
      console.log('  aiMode:', data.aiMode);
    } else {
      console.log('ERROR:', data.error);
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Network error in ${elapsed}s:`, err.message);
  }
})();
