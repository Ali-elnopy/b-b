import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const assets = 'public/assets';
const outDir = 'tmp/inspect';
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(assets).filter((f) => /\.(png|jpe?g)$/i.test(f));

const cellW = 420;
const cellH = 340;
const cols = 4;
const rows = Math.ceil(files.length / cols);

const composites = [];
const thumbs = [];

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const buf = await sharp(path.join(assets, file))
    .resize(cellW - 20, cellH - 60, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const meta = await sharp(buf).metadata();
  const x = (i % cols) * cellW + Math.round((cellW - meta.width) / 2);
  const y = Math.floor(i / cols) * cellH + 40;
  composites.push({ input: buf, left: x, top: y });

  const label = Buffer.from(
    `<svg width="${cellW}" height="30"><rect width="100%" height="100%" fill="#111"/><text x="8" y="20" font-family="Arial" font-size="14" fill="#fff">${file}</text></svg>`,
  );
  composites.push({
    input: label,
    left: (i % cols) * cellW,
    top: Math.floor(i / cols) * cellH + 8,
  });

  const stat = fs.statSync(path.join(assets, file));
  const m = await sharp(path.join(assets, file)).metadata();
  thumbs.push({ file, w: m.width, h: m.height, kb: Math.round(stat.size / 1024) });
}

await sharp({
  create: {
    width: cellW * cols,
    height: cellH * rows,
    channels: 3,
    background: '#2b2b2b',
  },
})
  .composite(composites)
  .jpeg({ quality: 82 })
  .toFile(path.join(outDir, 'contact-sheet.jpg'));

const logos = ['logo-teal.png', 'logo-snow.png', 'logo-sheet.png', 'pattern.png'];
for (const file of logos) {
  const m = await sharp(path.join(assets, file)).metadata();
  let trim = null;
  try {
    trim = await sharp(path.join(assets, file)).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
    await sharp(trim.data).resize({ width: 900, withoutEnlargement: true }).png().toFile(path.join(outDir, `trim-${file}`));
  } catch (err) {
    trim = { error: err.message };
  }
  console.log(JSON.stringify({ file, w: m.width, h: m.height, trim: trim?.info ?? trim?.error }));
}

console.log(JSON.stringify(thumbs, null, 2));
