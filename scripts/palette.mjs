import sharp from 'sharp';

const { data, info } = await sharp('public/assets/brand-colors.png')
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return '#' + [data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const w = info.width;
const h = info.height;
console.log({ w, h, channels: info.channels });
const picks = [
  ['main teal', 0.1, 0.3],
  ['snow', 0.45, 0.3],
  ['evergreen', 0.8, 0.3],
  ['tint a', 0.03, 0.88],
  ['tint b', 0.12, 0.88],
  ['tint c', 0.22, 0.88],
  ['tint d', 0.03, 0.96],
  ['tint e', 0.12, 0.96],
  ['tint f', 0.22, 0.96],
  ['pink a', 0.38, 0.96],
  ['pink b', 0.48, 0.96],
  ['pink c', 0.58, 0.96],
  ['right a', 0.72, 0.88],
  ['right b', 0.82, 0.88],
  ['right c', 0.92, 0.88],
  ['right d', 0.72, 0.96],
  ['right e', 0.82, 0.96],
  ['right f', 0.92, 0.96],
];
for (const [name, fx, fy] of picks) {
  console.log(name, px(Math.round(w * fx), Math.round(h * fy)));
}

for (const file of ['logo-teal.png', 'logo-snow.png']) {
  const img = sharp(`public/assets/${file}`);
  const m = await img.metadata();
  const { data: d, info: i } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => d[(y * i.width + x) * i.channels + 3];
  const colorAt = (x, y) => {
    const idx = (y * i.width + x) * i.channels;
    return '#' + [d[idx], d[idx + 1], d[idx + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  console.log(file, {
    corner: [alphaAt(0, 0), alphaAt(i.width - 1, 0), alphaAt(0, i.height - 1), alphaAt(i.width - 1, i.height - 1)],
    center: alphaAt(Math.floor(i.width / 2), Math.floor(i.height / 2)),
    centerColor: colorAt(Math.floor(i.width / 2), Math.floor(i.height / 2)),
    channels: m.channels,
    space: m.space,
  });
}
