const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function optimizeImages() {
  console.log('--- Starting Image Optimization ---');

  // 1. Optimize Vendor Logos (120x120 JPEG quality 82 progressive)
  const vendorDir = path.join(process.cwd(), 'public', 'images', 'vendors');
  if (fs.existsSync(vendorDir)) {
    const files = fs.readdirSync(vendorDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    for (const f of files) {
      const fullPath = path.join(vendorDir, f);
      const inputBuffer = fs.readFileSync(fullPath);
      const oldSize = inputBuffer.length;
      const buffer = await sharp(inputBuffer)
        .resize(120, 120, { fit: 'cover' })
        .jpeg({ quality: 82, progressive: true })
        .toBuffer();
      fs.writeFileSync(fullPath, buffer);
      const newSize = buffer.length;
      console.log(`Vendor Logo ${f}: ${Math.round(oldSize/1024)}KB -> ${Math.round(newSize/1024)}KB`);
    }
  }

  // 2. Optimize Testimonial Candid Photos (600px width JPEG quality 80 progressive)
  const testDir = path.join(process.cwd(), 'public', 'images', 'testimonials');
  if (fs.existsSync(testDir)) {
    const files = fs.readdirSync(testDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    for (const f of files) {
      const fullPath = path.join(testDir, f);
      const inputBuffer = fs.readFileSync(fullPath);
      const oldSize = inputBuffer.length;
      const buffer = await sharp(inputBuffer)
        .resize(600, null, { withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
      fs.writeFileSync(fullPath, buffer);
      const newSize = buffer.length;
      console.log(`Testimonial ${f}: ${Math.round(oldSize/1024)}KB -> ${Math.round(newSize/1024)}KB`);
    }
  }

  // 3. Optimize Samples
  const samplesDir = path.join(process.cwd(), 'public', 'samples');
  if (fs.existsSync(samplesDir)) {
    const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    for (const f of files) {
      const fullPath = path.join(samplesDir, f);
      const inputBuffer = fs.readFileSync(fullPath);
      const oldSize = inputBuffer.length;
      const buffer = await sharp(inputBuffer)
        .resize(750, null, { withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
      fs.writeFileSync(fullPath, buffer);
      const newSize = buffer.length;
      console.log(`Sample ${f}: ${Math.round(oldSize/1024)}KB -> ${Math.round(newSize/1024)}KB`);
    }
  }

  // 4. Optimize Favicons & Brand Icons
  const favicons = [
    { file: 'favicon.png', size: 64 },
    { file: 'favicon.ico', size: 48 },
    { file: 'corner-icon.png', size: 128 },
    { file: 'logo.png', size: 240 },
    { file: 'logo-full.png', size: 280 },
    { file: 'sudut-bingkai-logo.png', size: 280 },
    { file: 'sudutbingkai-logo.png', size: 280 }
  ];

  for (const item of favicons) {
    const fullPath = path.join(process.cwd(), 'public', item.file);
    if (fs.existsSync(fullPath)) {
      const inputBuffer = fs.readFileSync(fullPath);
      const oldSize = inputBuffer.length;
      const buffer = await sharp(inputBuffer)
        .resize(item.size, null, { withoutEnlargement: true })
        .png({ compressionLevel: 9, quality: 85 })
        .toBuffer();
      fs.writeFileSync(fullPath, buffer);
      const newSize = buffer.length;
      console.log(`Icon ${item.file}: ${Math.round(oldSize/1024)}KB -> ${Math.round(newSize/1024)}KB`);
    }
  }

  console.log('--- Image Optimization Complete ---');
}

optimizeImages().catch(console.error);
