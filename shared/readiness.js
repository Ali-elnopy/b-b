/**
 * مساعد جاهزية الطلب — منطق مشترك بين الواجهة والسيرفر.
 *
 * الهدف: كشف المعلومات الناقصة أو غير المتسقة قبل الإرسال. القاعدة
 * الأساسية: مجموع كميات المقاسات لازم يساوي إجمالي الكمية المطلوبة.
 *
 * لا يعتمد على أي مكتبة، ويُستخدم كما هو في المتصفح وفي Node.
 */

export const ALLOWED_ARTWORK_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/postscript',
];

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_FILES = 4;

export const SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export function normalizeDigits(value = '') {
  return String(value)
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

export function normalizePhone(raw = '') {
  let value = normalizeDigits(raw).replace(/[\s\-().]/g, '');
  if (value.startsWith('+20')) value = '0' + value.slice(3);
  else if (value.startsWith('0020')) value = '0' + value.slice(4);
  else if (value.startsWith('20') && value.length === 12) value = '0' + value.slice(2);
  return value;
}

export function isValidEgyptMobile(raw = '') {
  return /^01[0125]\d{8}$/.test(normalizePhone(raw));
}

export function isValidEmail(raw = '') {
  if (!raw) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(raw).trim());
}

export function toInt(value) {
  const n = Number(normalizeDigits(String(value ?? '')).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function isPastDate(value) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date < today;
}

function trimText(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

/**
 * @param {object} input
 * @param {object} input.service  خدمة من الكتالوج
 * @param {number|string} input.quantity
 * @param {Record<string,string>} input.options
 * @param {Array<{size:string, qty:number|string}>} input.sizes
 * @param {object} input.contact
 * @param {object} input.artwork
 */
export function evaluateRequest(input = {}) {
  const service = input.service;
  const quantity = toInt(input.quantity);
  const options = input.options ?? {};
  const sizes = Array.isArray(input.sizes) ? input.sizes : [];
  const contact = input.contact ?? {};
  const artwork = input.artwork ?? {};
  const files = Array.isArray(artwork.files) ? artwork.files : [];

  const checks = [];
  const add = (check) => checks.push(check);

  const fail = (id, group, label, message) =>
    add({ id, group, label, status: 'fail', message });
  const warn = (id, group, label, message) =>
    add({ id, group, label, status: 'warn', message });
  const pass = (id, group, label, message = '') =>
    add({ id, group, label, status: 'pass', message });

  /* ---------------------------------------------------------------- المنتج */
  if (!service) {
    fail('service', 'product', 'اختيار المنتج', 'اختر المنتج اللي عايز تطلبه الأول.');
  } else {
    pass('service', 'product', 'اختيار المنتج', service.name);

    if (quantity < 1) {
      fail('quantity', 'product', 'الكمية', 'اكتب كمية صحيحة أكبر من صفر.');
    } else if (service.minQuantity && quantity < service.minQuantity) {
      fail(
        'quantity',
        'product',
        'الكمية',
        `أقل كمية لهذا المنتج هي ${service.minQuantity}.`,
      );
    } else {
      pass('quantity', 'product', 'الكمية', `${quantity} قطعة`);
    }

    const requiredOptions = (service.options ?? []).filter((o) => o.required);
    const missing = requiredOptions.filter((o) => !trimText(options[o.key]));
    if (missing.length) {
      fail(
        'options',
        'details',
        'خيارات المنتج',
        `ناقص: ${missing.map((o) => o.label).join('، ')}.`,
      );
    } else {
      pass('options', 'details', 'خيارات المنتج', 'كل الخيارات المطلوبة متوفرة.');
    }

    /* ------------------------------------------------ المقاسات = الكمية */
    if (service.requiresSizes) {
      const total = sizes.reduce((sum, row) => sum + toInt(row.qty), 0);
      const used = sizes.filter((row) => toInt(row.qty) > 0);

      if (quantity > 0 && total === quantity && used.length > 0) {
        pass(
          'sizes',
          'details',
          'تطابق المقاسات',
          'مجموع المقاسات مطابق لإجمالي الكمية.',
        );
        if (used.length === 1 && quantity > 1) {
          warn(
            'sizes-single',
            'details',
            'كل الكمية مقاس واحد',
            'لو ده مقصود، تمام. لو لأ، راجع توزيع المقاسات.',
          );
        }
      } else if (total === 0) {
        fail(
          'sizes',
          'details',
          'تطابق المقاسات',
          'حدد كمية لكل مقاس. مجموع المقاسات لازم يساوي إجمالي الكمية.',
        );
      } else {
        const diff = quantity - total;
        fail(
          'sizes',
          'details',
          'تطابق المقاسات',
          `مجموع المقاسات ${total} قطعة، وإجمالي الكمية ${quantity}. ${
            diff > 0 ? `ناقص ${diff}` : `زيادة ${Math.abs(diff)}`
          } قطعة.`,
        );
      }
    }

    /* ---------------------------------------------------- الملفات والتصميم */
    if (service.needsArtwork) {
      const badFile = files.find(
        (file) =>
          !ALLOWED_ARTWORK_TYPES.includes(file.type) ||
          Number(file.size) > MAX_FILE_BYTES,
      );

      if (badFile) {
        fail(
          'artwork-type',
          'artwork',
          'ملف التصميم',
          'الملف لازم يكون PNG أو JPG أو WEBP أو PDF/AI وبحجم أقل من 8 ميجا.',
        );
      } else if (files.length > 0) {
        pass('artwork', 'artwork', 'ملف التصميم', `تم إرفاق ${files.length} ملف.`);
      } else if (artwork.later) {
        warn(
          'artwork-later',
          'artwork',
          'ملف التصميم',
          'مؤكد إنك هترسل التصميم لاحقًا. الطلب هيتسجل، لكن التنفيذ مش هيبدأ قبل وصول الملف.',
        );
      } else {
        fail(
          'artwork-missing',
          'artwork',
          'ملف التصميم',
          'ارفع ملف التصميم، أو فعّل خيار "هبعت التصميم لاحقًا".',
        );
      }

      if (files.length > MAX_FILES) {
        fail('artwork-count', 'artwork', 'عدد الملفات', `الحد الأقصى ${MAX_FILES} ملفات.`);
      }

      const placement = String(options.placement ?? options.printSides ?? '');
      if (/وجهين|خلفي/.test(placement) && files.length === 1) {
        warn(
          'artwork-sides',
          'artwork',
          'ملف للوجهين',
          'اخترت طباعة على أكثر من وجه — تأكد إن الملف يشمل التصميمين أو ابعت ملفًا لكل وجه.',
        );
      }
    }

    if (service.briefRequired) {
      const notes = trimText(artwork.notes);
      if (notes.length < 20) {
        fail(
          'brief',
          'artwork',
          'بريف التصميم',
          'اكتب وصفًا للفكرة (20 حرفًا على الأقل): النشاط، الجمهور، والستايل.',
        );
      } else {
        pass('brief', 'artwork', 'بريف التصميم', 'البريف مكتوب.');
      }
    }
  }

  /* -------------------------------------------------------------- التواصل */
  const name = trimText(contact.name);
  if (name.length < 3) {
    fail('name', 'contact', 'الاسم', 'اكتب اسمك (3 حروف على الأقل).');
  } else {
    pass('name', 'contact', 'الاسم', name);
  }

  const phone = normalizePhone(contact.phone);
  if (!phone) {
    fail('phone', 'contact', 'رقم الموبايل', 'اكتب رقم موبايل للتواصل.');
  } else if (!isValidEgyptMobile(phone)) {
    fail(
      'phone',
      'contact',
      'رقم الموبايل',
      'الرقم مش صحيح. اكتب رقم مصري 11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015.',
    );
  } else {
    pass('phone', 'contact', 'رقم الموبايل', 'رقم صحيح.');
  }

  if (contact.email && !isValidEmail(contact.email)) {
    fail('email', 'contact', 'البريد الإلكتروني', 'صيغة البريد الإلكتروني غير صحيحة.');
  } else if (contact.email) {
    pass('email', 'contact', 'البريد الإلكتروني', '');
  } else {
    warn(
      'email-missing',
      'contact',
      'البريد الإلكتروني',
      'إضافة بريد إلكتروني تساعدنا نبعت لك نسخة من عرض السعر.',
    );
  }

  const method = contact.method;
  if (method !== 'pickup' && method !== 'delivery') {
    fail('method', 'contact', 'طريقة الاستلام', 'اختار الاستلام من الفرع أو التوصيل.');
  } else if (method === 'delivery') {
    const area = trimText(contact.area);
    if (area.length < 3) {
      fail('area', 'contact', 'منطقة التوصيل', 'اكتب المنطقة أو العنوان بالتفصيل للتوصيل.');
    } else {
      pass('area', 'contact', 'منطقة التوصيل', area);
    }
    warn(
      'delivery-coverage',
      'contact',
      'نطاق التوصيل',
      'التوصيل خارج أسوان يحتاج تأكيد من الفريق قبل اعتماد الطلب.',
    );
  } else {
    pass('method', 'contact', 'طريقة الاستلام', 'الاستلام من الفرع.');
  }

  if (contact.preferredDate) {
    if (isPastDate(contact.preferredDate)) {
      fail(
        'date',
        'contact',
        'التاريخ المطلوب',
        'التاريخ المطلوب في الماضي. اختار تاريخًا اليوم أو لاحقًا.',
      );
    } else {
      pass('date', 'contact', 'التاريخ المطلوب', '');
    }
  } else {
    warn(
      'date-missing',
      'contact',
      'التاريخ المطلوب',
      'مفيش تاريخ محدد — ده يساعدنا نرتب الأولويات، لكن مش إلزامي.',
    );
  }

  if (contact.budget) {
    if (toInt(contact.budget) <= 0) {
      warn('budget', 'contact', 'الميزانية', 'الميزانية لازم تكون رقمًا أكبر من صفر، أو سيبها فاضية.');
    }
  }

  if (quantity > 200) {
    warn(
      'large-order',
      'product',
      'كمية كبيرة',
      'الكميات الكبيرة تحتاج مراجعة وقت التنفيذ مع الفريق قبل التأكيد.',
    );
  }

  /* ---------------------------------------------------------------- النتيجة */
  const blockers = checks.filter((c) => c.status === 'fail');
  const warnings = checks.filter((c) => c.status === 'warn');
  const requiredDone = checks.filter(
    (c) => c.status === 'pass' && c.id !== 'email-missing',
  ).length;

  const score = Math.max(
    0,
    Math.min(100, 100 - blockers.length * 18 - warnings.length * 4),
  );

  return {
    ready: blockers.length === 0,
    score: blockers.length === 0 && warnings.length === 0 ? 100 : score,
    blockers,
    warnings,
    checks,
    summary:
      blockers.length > 0
        ? `${blockers.length} نقطة تحتاج تعديل قبل الإرسال`
        : warnings.length > 0
          ? 'جاهز للإرسال — مع ملاحظات بسيطة'
          : 'كل حاجة جاهزة',
    requiredDone,
  };
}

export function validateArtworkFile(file) {
  if (!file) return 'الملف غير موجود.';
  if (!ALLOWED_ARTWORK_TYPES.includes(file.type)) {
    return 'نوع الملف غير مدعوم. استخدم PNG أو JPG أو WEBP أو PDF/AI.';
  }
  if (Number(file.size) > MAX_FILE_BYTES) {
    return 'حجم الملف أكبر من 8 ميجا.';
  }
  return null;
}
