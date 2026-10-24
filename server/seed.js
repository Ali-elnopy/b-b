import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  db,
  now,
  getSetting,
  setSetting,
  nextRequestRef,
  hashToken,
  UPLOAD_DIR,
  ROOT,
} from './db.js';
import { hashPassword } from './auth.js';
import { SERVICES } from '../shared/services.js';
import { evaluateRequest } from '../shared/readiness.js';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const FORCE = process.argv.includes('--force');

export const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@yozersaf.com',
  password: process.env.ADMIN_PASSWORD || 'Yozersaf@2026',
  name: process.env.ADMIN_NAME || 'مالك يوزرسيف',
};

const DEMO_SETTINGS = {
  business: {
    name: 'يوزرسيف',
    descriptor: 'للطباعة والهدايا',
    tagline: 'خليك مختلف — خليك يوزرسيف',
    whatsapp: '01116891025',
    phone: '01006926440',
    website: 'www.yozersaf.com',
    instagram: 'yuzerseif',
    facebook: '',
    email: '',
    address: 'أسوان — أسفل سلم أطلس، بجانب أرض الجميل',
    hours: '',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=%D9%8A%D9%88%D8%B2%D8%B1%D8%B3%D9%8A%D9%81+%D8%A3%D8%B3%D9%88%D8%A7%D9%86',
    deliveryNote: 'التوصيل متاح داخل أسوان بعد تأكيد التفاصيل. المناطق خارج أسوان تحتاج مراجعة من الفريق.',
    demoMode: true,
    launchApproved: false,
  },
  content: {
    announcement: '',
    homepageNote: '',
  },
};

const PORTFOLIO = [
  {
    title: 'تيشيرت بهوية يوزرسيف',
    category: 'ملابس',
    image: '/media/tshirt.webp',
    description: 'نموذج طباعة على تيشيرت أخضر باستخدام أصول الهوية المرفقة.',
    isDemo: 1,
    sortOrder: 1,
  },
  {
    title: 'مج بهوية يوزرسيف',
    category: 'هدايا',
    image: '/media/mug.webp',
    description: 'نموذج تطبيق الهوية على مج سيراميك.',
    isDemo: 1,
    sortOrder: 2,
  },
  {
    title: 'شنطة قماش مطبوعة',
    category: 'هدايا',
    image: '/media/bag.webp',
    description: 'نموذج شنطة قماش بشريطة، من الأصول المرفقة.',
    isDemo: 1,
    sortOrder: 3,
  },
  {
    title: 'دفتر بهوية يوزرسيف',
    category: 'مطبوعات',
    image: '/media/notebook-brand.webp',
    description: 'نموذج دفتر بهوية موحدة على الغلاف.',
    isDemo: 1,
    sortOrder: 4,
  },
  {
    title: 'تقويم مكتبي',
    category: 'مطبوعات',
    image: '/media/calendar.webp',
    description: 'نموذج تقويم مكتبي مطبوع بهوية يوزرسيف.',
    isDemo: 1,
    sortOrder: 5,
  },
  {
    title: 'كروت أعمال وأظرف',
    category: 'مطبوعات',
    image: '/media/business-card.webp',
    description: 'نموذج مطبوعات ورقية موحدة الهوية.',
    isDemo: 1,
    sortOrder: 6,
  },
  {
    title: 'لوحة تطريز',
    category: 'تصاميم',
    image: '/media/portfolio-embroidery.webp',
    description: 'نموذج تصميم من الأصول المرفقة — ليس عملًا لعميل.',
    isDemo: 1,
    sortOrder: 7,
  },
  {
    title: 'تصميم قبة الصخرة',
    category: 'تصاميم',
    image: '/media/portfolio-dome.webp',
    description: 'نموذج تصميم من الأصول المرفقة — ليس عملًا لعميل.',
    isDemo: 1,
    sortOrder: 8,
  },
  {
    title: 'إنتاج طباعة',
    category: 'مطبوعات',
    image: '/media/production.webp',
    description: 'لقطة من أصول الهوية توضح مرحلة الطباعة.',
    isDemo: 1,
    sortOrder: 9,
  },
];

const DEMO_REQUESTS = [
  {
    ref: 'YZ-2026-0001',
    trackingCode: 'DEMO0001',
    serviceSlug: 'apparel',
    quantity: 12,
    options: {
      garment: 'تيشيرت',
      fit: 'رجالي',
      color: 'أخضر يوزرسيف',
      placement: 'أمامي',
      technique: 'طباعة حرارية DTG',
    },
    sizes: [
      { size: 'S', qty: 2 },
      { size: 'M', qty: 4 },
      { size: 'L', qty: 4 },
      { size: 'XL', qty: 2 },
    ],
    customerName: 'طلب تجريبي — فريق يوزرسيف',
    phone: '01116891025',
    email: 'demo@example.com',
    method: 'pickup',
    city: 'أسوان',
    area: '',
    notes: 'طلب تجريبي لعرض خط سير الطلب من الإرسال للتسليم. الكميات موزعة على أربعة مقاسات.',
    status: 'in_production',
    decisionNote: 'تمت مراجعة المقاسات والتصميم، والطلب داخل التنفيذ.',
    events: [
      { type: 'submitted', status: 'submitted', message: 'تم استلام الطلب وتم إنشاء رقم المتابعة.', actor: 'customer', visibility: 'public', daysAgo: 6 },
      { type: 'status', status: 'under_review', message: 'الطلب تحت المراجعة الفنية للتصميم والمقاسات.', actor: 'admin', visibility: 'public', daysAgo: 5 },
      { type: 'status', status: 'approved', message: 'تمت الموافقة على الطلب والتصميم. جاري التجهيز للتنفيذ.', actor: 'admin', visibility: 'public', daysAgo: 4 },
      { type: 'status', status: 'in_production', message: 'الطلب دخل مرحلة التنفيذ.', actor: 'admin', visibility: 'public', daysAgo: 2 },
      { type: 'note', status: null, message: 'تمت مراجعة ملف التصميم — دقة كافية للطباعة.', actor: 'admin', visibility: 'internal', daysAgo: 4 },
    ],
    attachment: '/media/tshirt.webp',
  },
  {
    ref: 'YZ-2026-0002',
    trackingCode: 'DEMO0002',
    serviceSlug: 'mugs',
    quantity: 6,
    options: { mugType: 'سيراميك أبيض', printArea: 'وجه واحد', packaging: 'تغليف هدية' },
    sizes: [],
    customerName: 'طلب تجريبي — عميل',
    phone: '01234567890',
    email: '',
    method: 'delivery',
    city: 'أسوان',
    area: 'منطقة أطلس — عنوان تجريبي',
    notes: 'هدايا لفريق عمل، التصميم هيتحدد لاحقًا.',
    status: 'needs_info',
    decisionNote: 'محتاجين ملف التصميم بدقة أعلى قبل بدء التنفيذ.',
    events: [
      { type: 'submitted', status: 'submitted', message: 'تم استلام الطلب وتم إنشاء رقم المتابعة.', actor: 'customer', visibility: 'public', daysAgo: 3 },
      { type: 'status', status: 'under_review', message: 'بنراجع تفاصيل التصميم والكمية.', actor: 'admin', visibility: 'public', daysAgo: 2 },
      { type: 'status', status: 'needs_info', message: 'محتاجين ملف التصميم بدقة 300 DPI أو ملف PDF بجودة طباعة. ارفع الملف أو رد هنا.', actor: 'admin', visibility: 'public', daysAgo: 1 },
    ],
    attachment: '/media/mug.webp',
  },
  {
    ref: 'YZ-2026-0003',
    trackingCode: 'DEMO0003',
    serviceSlug: 'stationery',
    quantity: 500,
    options: { itemType: 'كروت أعمال', paperSize: 'A6', sides: 'وجهين', paper: '300 جم', finish: 'مطفي' },
    sizes: [],
    customerName: 'طلب تجريبي — نشاط',
    phone: '01500000000',
    email: 'demo2@example.com',
    method: 'pickup',
    city: 'أسوان',
    area: '',
    notes: 'كروت أعمال لشركة تجريبية.',
    status: 'rejected',
    decisionNote: 'نموذج لطلب مرفوض: الملف المرفق غير مناسب للطباعة، وإعادة الإرسال بملف طباعة مطلوبة.',
    events: [
      { type: 'submitted', status: 'submitted', message: 'تم استلام الطلب.', actor: 'customer', visibility: 'public', daysAgo: 2 },
      { type: 'status', status: 'under_review', message: 'بنراجع الملف المرفق.', actor: 'admin', visibility: 'public', daysAgo: 1 },
      { type: 'status', status: 'rejected', message: 'الملف المرفق غير مناسب للطباعة (دقة منخفضة). يمكنك إرسال ملف جديد أو التواصل معنا.', actor: 'admin', visibility: 'public', daysAgo: 1 },
    ],
    attachment: '/media/business-card.webp',
  },
];

function daysAgo(n) {
  return new Date(Date.now() - n * 864e5).toISOString();
}

export function seed({ force = FORCE } = {}) {
  const created = { admin: false, services: 0, portfolio: 0, requests: 0 };

  /* ------------------------------------------------------------- settings */
  for (const [key, value] of Object.entries(DEMO_SETTINGS)) {
    if (getSetting(key) === null) setSetting(key, value);
  }

  /* ---------------------------------------------------------------- admin */
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(DEFAULT_ADMIN.email);
  if (!existingUser) {
    db.prepare(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(DEFAULT_ADMIN.name, DEFAULT_ADMIN.email, hashPassword(DEFAULT_ADMIN.password), 'owner', now());
    created.admin = true;
  } else if (force && process.env.ADMIN_PASSWORD) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      hashPassword(DEFAULT_ADMIN.password),
      existingUser.id,
    );
  }

  /* ------------------------------------------------------------- services */
  const serviceCount = db.prepare('SELECT COUNT(*) AS c FROM services').get().c;
  if (serviceCount === 0 || force) {
    if (force) db.exec('DELETE FROM services');
    const insert = db.prepare(
      `INSERT INTO services (slug, name, subtitle, category, summary, description, image, image_alt,
        min_quantity, requires_sizes, needs_artwork, brief_required, options_json, guidance_json,
        active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    );
    for (const service of SERVICES) {
      insert.run(
        service.slug,
        service.name,
        service.subtitle ?? null,
        service.category,
        service.summary ?? null,
        service.description ?? null,
        service.image ?? null,
        service.imageAlt ?? null,
        service.minQuantity ?? 1,
        service.requiresSizes ? 1 : 0,
        service.needsArtwork ? 1 : 0,
        service.briefRequired ? 1 : 0,
        JSON.stringify(service.options ?? []),
        JSON.stringify(service.guidance ?? []),
        service.sortOrder ?? 0,
        now(),
        now(),
      );
      created.services += 1;
    }
  }

  /* ------------------------------------------------------------ portfolio */
  const portfolioCount = db.prepare('SELECT COUNT(*) AS c FROM portfolio').get().c;
  if (portfolioCount === 0 || force) {
    if (force) db.exec('DELETE FROM portfolio');
    const insert = db.prepare(
      `INSERT INTO portfolio (title, category, image, description, is_demo, active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    );
    for (const item of PORTFOLIO) {
      insert.run(item.title, item.category, item.image, item.description, item.isDemo, item.sortOrder, now(), now());
      created.portfolio += 1;
    }
  }

  /* --------------------------------------------------------- demo requests */
  if (process.env.SEED_DEMO !== 'false') {
    for (const demo of DEMO_REQUESTS) {
      const exists = db.prepare('SELECT id FROM requests WHERE ref = ?').get(demo.ref);
      if (exists) continue;

      const service = SERVICES.find((s) => s.slug === demo.serviceSlug);
      const readiness = evaluateRequest({
        service,
        quantity: demo.quantity,
        options: demo.options,
        sizes: demo.sizes,
        contact: {
          name: demo.customerName,
          phone: demo.phone,
          email: demo.email,
          method: demo.method,
          city: demo.city,
          area: demo.area,
        },
        artwork: { files: demo.attachment ? [{ type: 'image/webp', size: 120000 }] : [], later: !demo.attachment, notes: demo.notes },
      });

      const createdAt = daysAgo(demo.events[0]?.daysAgo ?? 2);
      const info = db.prepare(
        `INSERT INTO requests (ref, tracking_hash, service_slug, service_name, quantity, options_json, sizes_json,
          budget, customer_name, phone, alt_phone, email, method, city, area, preferred_date,
          artwork_notes, artwork_later, readiness_json, status, decision_note, internal_note,
          is_demo, created_at, updated_at, decided_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      ).run(
        demo.ref,
        hashToken(demo.trackingCode),
        demo.serviceSlug,
        service?.name ?? demo.serviceSlug,
        demo.quantity,
        JSON.stringify(demo.options),
        JSON.stringify(demo.sizes),
        null,
        demo.customerName,
        demo.phone,
        null,
        demo.email || null,
        demo.method,
        demo.city,
        demo.area || null,
        null,
        demo.notes,
        demo.attachment ? 0 : 1,
        JSON.stringify(readiness),
        demo.status,
        demo.decisionNote,
        demo.status === 'in_production' ? 'التنفيذ يسير حسب الخطة.' : null,
        createdAt,
        daysAgo(0),
        ['approved', 'in_production'].includes(demo.status) ? daysAgo(4) : daysAgo(1),
      );

      const requestId = Number(info.lastInsertRowid);

      for (const event of demo.events) {
        db.prepare(
          `INSERT INTO request_events (request_id, type, status, message, visibility, actor, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(requestId, event.type, event.status ?? null, event.message, event.visibility, event.actor, daysAgo(event.daysAgo));
      }

      if (demo.attachment) {
        const source = path.join(ROOT, 'public', demo.attachment.replace('/media/', 'media/'));
        if (fs.existsSync(source)) {
          const ext = path.extname(source) || '.webp';
          const storedName = `${crypto.randomBytes(10).toString('hex')}${ext}`;
          fs.copyFileSync(source, path.join(UPLOAD_DIR, storedName));
          db.prepare(
            `INSERT INTO attachments (request_id, stored_name, original_name, mime, size, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(
            requestId,
            storedName,
            `نموذج-تصميم-${demo.ref}${ext}`,
            'image/webp',
            fs.statSync(path.join(UPLOAD_DIR, storedName)).size,
            createdAt,
          );
        }
      }

      created.requests += 1;
    }
  }

  return created;
}

if (isMain) {
  const result = seed({ force: FORCE });
  console.log('تم تجهيز البيانات:', JSON.stringify(result, null, 2));
  console.log(`حساب المالك: ${DEFAULT_ADMIN.email} / ${DEFAULT_ADMIN.password}`);
  console.log('أكواد تتبع الطلبات التجريبية: DEMO0001 / DEMO0002 / DEMO0003');
}
