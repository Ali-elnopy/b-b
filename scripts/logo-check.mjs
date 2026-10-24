import fs from 'node:fs';
import sharp from 'sharp';

const out = 'tmp/inspect';
fs.mkdirSync(out, { recursive: true });

const items = [
  'public/media/logo-teal.png',
  'public/media/logo-snow.png',
  'public/media/mark.png',
  'assets-src/logo-teal.png',
  'assets-src/logo-sheet.png',
];

const cell = 360;
const composites = [];
const canvas = sharp({
  create: { width: cell * items.length, height: cell + 40, channels: 3, background: '#c2185b' },
});

for (let i = 0; i < items.length; i++) {
  const buf = await sharp(items[i])
    .resize(cell - 20, cell - 20, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  composites.push({ input: buf, left: i * cell + 10, top: 40 });
  const label = Buffer.from(
    `<svg width="${cell}" height="30"><rect width="100%" height="100%" fill="#000"/><text x="6" y="20" font-family="Arial" font-size="12" fill="#fff">${items[i].split('/').pop()}</text></svg>`,
  );
  composites.push({ input: label, left: i * cell, top: 4 });
}

await canvas.composite(composites).png().toFile(`${out}/logo-check-2.png`);

// Also report per-file alpha bounding boxes using raw scan.
for (const item of items) {
  const { data, info } = await sharp(item).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(item, { w: info.width, h: info.height, minX, minY, maxX, maxY });
}
