// Test the style-analyze API endpoint with a real photo
const fs = require('fs');
const path = require('path');

(async () => {
  const imgPath = '/home/z/my-project/public/salons/salon-01.jpeg';
  const buffer = fs.readFileSync(imgPath);
  const base64 = buffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  console.log('Image size:', (buffer.length / 1024).toFixed(1), 'KB');
  console.log('Base64 length:', base64.length);
  console.log('Calling /api/style-analyze...');
  
  const start = Date.now();
  try {
    const res = await fetch('http://localhost:3000/api/style-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dataUrl,
        text: 'I want a professional haircut for office',
      }),
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Response in ${elapsed}s:`, res.status, res.statusText);
    
    const data = await res.json();
    if (res.ok) {
      console.log('SUCCESS! Got', data.recommendations?.length || 0, 'recommendations');
      if (data.recommendations && data.recommendations.length > 0) {
        console.log('First recommendation:', JSON.stringify(data.recommendations[0], null, 2));
      }
    } else {
      console.log('ERROR:', data.error || 'unknown');
      if (data.detail) console.log('Detail:', data.detail);
      if (data.raw) console.log('Raw:', data.raw.substring(0, 200));
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Network error in ${elapsed}s:`, err.message);
  }
})();
