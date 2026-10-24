import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync('tmp/zain.css', 'utf8');
const blocks = css.split('@font-face').slice(1);
const files = [];

for (const block of blocks) {
  const weight = block.match(/font-weight:\s*(\d+)/)[1];
  const url = block.match(/url\((https:[^)]+)\)/)[1];
  const isArabic = block.includes('U+0600-06FF');
  files.push({ weight, url, script: isArabic ? 'arabic' : 'latin' });
}

fs.mkdirSync('public/fonts', { recursive: true });

for (const f of files) {
  if (!['300', '400', '700', '900'].includes(f.weight)) continue;
  const target = path.join('public/fonts', `zain-${f.weight}-${f.script}.woff2`);
  const res = await fetch(f.url);
  if (!res.ok) throw new Error(`failed ${f.url}`);
  fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  console.log('saved', target, fs.statSync(target).size);
}
