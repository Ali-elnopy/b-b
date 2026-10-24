import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const srcDir = 'assets-src';
const outDir = 'public/media';
fs.mkdirSync(outDir, { recursive: true });

const plans = [
  { file: 'press-hero.png', out: 'hero-press.webp', width: 1500, crop: 'attention' },
  { file: 'press-proof.png', out: 'press-proof.webp', width: 1400, crop: 'attention' },
  { file: 'tshirt.png', out: 'tshirt.webp', width: 1400, crop: 'attention' },
  { file: 'tshirt.png', out: 'tshirt-square.webp', width: 900, aspect: 1, crop: 'attention' },
  { file: 'mug.png', out: 'mug.webp', width: 1400, crop: 'attention' },
  { file: 'mug.png', out: 'mug-square.webp', width: 900, aspect: 1, crop: 'attention' },
  { file: 'bag.png', out: 'bag.webp', width: 1400, crop: 'attention' },
  { file: 'bag.png', out: 'bag-square.webp', width: 900, aspect: 1, crop: 'attention' },
  { file: 'notebook-closed.png', out: 'notebook-closed.webp', width: 1400, crop: 'attention' },
  { file: 'notebook-closed.png', out: 'notebook-closed-square.webp', width: 900, aspect: 1, crop: 'attention' },
  { file: 'notebook-open.png', out: 'notebook-open.webp', width: 1400, crop: 'attention' },
  { file: 'notebook-brand.png', out: 'notebook-brand.webp', width: 1400, crop: 'attention' },
  { file: 'calendar.png', out: 'calendar.webp', width: 1400, crop: 'attention' },
  { file: 'calendar.png', out: 'calendar-square.webp', width: 900, aspect: 1, crop: 'attention' },
  { file: 'envelope.png', out: 'envelope.webp', width: 1400, crop: 'attention' },
  { file: 'business-card.png', out: 'business-card.webp', width: 1400, crop: 'attention' },
  { file: 'flyer.png', out: 'production.webp', width: 1600, crop: 'attention' },
  { file: 'pattern.png', out: 'pattern.webp', width: 1200, crop: 'attention' },
  { file: 'portrait-embroidery.png', out: 'portfolio-embroidery.webp', width: 1200, crop: 'attention' },
  { file: 'dome.png', out: 'portfolio-dome.webp', width: 1200, crop: 'attention' },
  { file: 'photo-premium.jpeg', out: 'aswan-shop.webp', width: 1600, crop: 'attention' },
  { file: 'asset-2.jpeg', out: 'feather.webp', width: 900, crop: 'attention' },
  { file: 'asset-3.jpeg', out: 'pattern-square.webp', width: 1000, aspect: 1, crop: 'attention' },
  { file: 'brand-colors.png', out: 'palette-strip.webp', width: 1600, crop: 'attention' },
  { file: 'business-card.png', out: 'business-card-square.webp', width: 900, aspect: 1, crop: 'attention' },
];

for (const plan of plans) {
  const input = path.join(srcDir, plan.file);
  let img = sharp(input, { failOn: 'none' }).rotate();
  if (plan.aspect) {
    img = img.resize({
      width: plan.width,
      height: plan.width,
      fit: 'cover',
      position: plan.crop ?? 'centre',
    });
  } else {
    img = img.resize({ width: plan.width, withoutEnlargement: true });
  }
  const target = path.join(outDir, plan.out);
  await img.webp({ quality: 80, effort: 5 }).toFile(target);
  console.log(plan.out, Math.round(fs.statSync(target).size / 1024) + 'kb');
}

// Logos keep alpha; trim transparent padding around the artwork.
for (const [file, out, width] of [
  ['logo-teal.png', 'logo-teal.png', 900],
  ['logo-snow.png', 'logo-snow.png', 900],
]) {
  const buf = await sharp(path.join(srcDir, file))
    .trim({ threshold: 8 })
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(outDir, out), buf);
  console.log(out, Math.round(buf.length / 1024) + 'kb');
}

// Feather-only favicon mark, cropped from the top of the logo.
const logoMeta = await sharp(path.join(outDir, 'logo-teal.png')).metadata();
const markSize = Math.min(logoMeta.width, Math.round(logoMeta.height * 0.52));
const mark = await sharp(path.join(outDir, 'logo-teal.png'))
  .extract({ left: 0, top: 0, width: markSize, height: markSize })
  .resize({ width: 512, height: 512, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
fs.writeFileSync('public/media/mark.png', mark);
console.log('mark.png', Math.round(mark.length / 1024) + 'kb');
