import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  db,
  now,
  getSettings,
  setSetting,
  nextRequestRef,
  hashToken,
  requestRowToJson,
  serviceRowToJson,
  portfolioRowToJson,
  UPLOAD_DIR,
  ROOT,
} from './db.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  sessionCookie,
  clearCookie,
  requireAdmin,
  readSessionToken,
} from './auth.js';
import { requireRate, text, isEmail, toBool, sniffMime, safeEqualStrings, noStore } from './http.js';
import {
  evaluateRequest,
  ALLOWED_ARTWORK_TYPES,
  MAX_FILE_BYTES,
  MAX_FILES,
  normalizePhone,
  isValidEgyptMobile,
} from '../shared/readiness.js';
import { STATUS_MAP } from '../shared/status.js';

export const api = express.Router();

const DEFAULT_STATUS_MESSAGES = {
  under_review: 'طلبك تحت المراجعة الفنية.',
  needs_info: 'محتاجين معلومات إضافية لإكمال الطلب. راجع التفاصيل وردّ علينا.',
  approved: 'تم قبول طلبك للمراجعة فقط، وليس تأكيدًا للسعر أو الدفع. سنتواصل معك قريبًا لتأكيد السعر وطريقة الدفع والاستلام قبل البدء في التنفيذ.',
  in_production: 'طلبك دخل مرحلة التنفيذ.',
  ready: 'طلبك جاهز للتسليم.',
  delivered: 'تم تسليم الطلب. شكرًا لاختيارك يوزرسيف.',
  rejected: 'تم رفض الطلب. راجع سبب الرفض أو تواصل معنا.',
  closed: 'تم إغلاق الطلب.',
  submitted: 'تم استلام الطلب.',
};

function addEvent(requestId, { type, status = null, message, visibility = 'public', actor = 'system' }) {
  db.prepare(
    `INSERT INTO request_events (request_id, type, status, message, visibility, actor, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(requestId, type, status, message ?? null, visibility, actor, now());
}

function attachmentsFor(requestId) {
  return db
    .prepare(
      'SELECT id, original_name, mime, size, created_at FROM attachments WHERE request_id = ? ORDER BY id',
    )
    .all(requestId)
    .map((row) => ({
      id: row.id,
      name: row.original_name,
      mime: row.mime,
      size: row.size,
      createdAt: row.created_at,
    }));
}

function eventsFor(requestId, { includeInternal = false } = {}) {
  const rows = db
    .prepare('SELECT * FROM request_events WHERE request_id = ? ORDER BY created_at, id')
    .all(requestId);
  return rows
    .filter((row) => includeInternal || row.visibility === 'public')
    .map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      message: row.message,
      visibility: row.visibility,
      actor: row.actor,
      createdAt: row.created_at,
    }));
}

function publicRequest(row) {
  const request = requestRowToJson(row);
  delete request.internalNote;
  return request;
}

function findRequestByRef(ref) {
  return db.prepare('SELECT * FROM requests WHERE ref = ?').get(text(ref, 40).toUpperCase());
}

function verifyTracking(row, code) {
  if (!row) return false;
  const normalized = String(code ?? '').replace(/[\s-]/g, '').toUpperCase();
  if (!normalized) return false;
  return safeEqualStrings(hashToken(normalized), row.tracking_hash);
}

/* ========================================================================== */
/* Health + public content                                                    */
/* ========================================================================== */

api.get('/health', (req, res) => {
  res.json({ ok: true, service: 'yozersaf', time: now() });
});

api.get('/site', (req, res) => {
  const settings = getSettings();
  res.json({
    business: settings.business ?? {},
    content: settings.content ?? {},
  });
});

api.get('/services', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort_order, id')
    .all();
  res.json({ services: rows.map(serviceRowToJson) });
});

api.get('/services/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM services WHERE slug = ? AND active = 1').get(text(req.params.slug, 80));
  if (!row) {
    res.status(404).json({ error: 'الخدمة غير موجودة.' });
    return;
  }
  res.json({ service: serviceRowToJson(row) });
});

api.get('/portfolio', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM portfolio WHERE active = 1 ORDER BY sort_order, id')
    .all();
  res.json({ items: rows.map(portfolioRowToJson) });
});

/* ========================================================================== */
/* Auth                                                                       */
/* ========================================================================== */

api.post('/auth/login', (req, res) => {
  if (!requireRate(req, res, { namespace: 'login', limit: 10, windowMs: 15 * 60_000 })) return;

  const email = text(req.body?.email, 120).toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    res.status(400).json({ error: 'اكتب البريد وكلمة المرور.' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة.' });
    return;
  }

  const { token } = createSession(user.id);
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now(), user.id);
  res.setHeader('Set-Cookie', sessionCookie(token));
  noStore(res);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

api.post('/auth/logout', (req, res) => {
  destroySession(readSessionToken(req));
  res.setHeader('Set-Cookie', clearCookie());
  res.json({ ok: true });
});

api.get('/auth/me', (req, res) => {
  const token = readSessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'غير مسجل الدخول.' });
    return;
  }
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), now());
  if (!row) {
    res.status(401).json({ error: 'الجلسة منتهية.' });
    return;
  }
  noStore(res);
  res.json({ user: row });
});

/* ========================================================================== */
/* Customer requests                                                          */
/* ========================================================================== */

api.post('/requests', (req, res) => {
  if (!requireRate(req, res, { namespace: 'submit', limit: 12, windowMs: 60 * 60_000 })) return;

  const body = req.body ?? {};
  const serviceRow = db
    .prepare('SELECT * FROM services WHERE slug = ? AND active = 1')
    .get(text(body.serviceSlug, 80));

  if (!serviceRow) {
    res.status(400).json({ error: 'اختار خدمة صحيحة من الكتالوج.' });
    return;
  }

  const service = serviceRowToJson(serviceRow);
  const files = Array.isArray(body.artwork?.files) ? body.artwork.files : [];
  const contact = body.contact ?? {};

  const readiness = evaluateRequest({
    service,
    quantity: body.quantity,
    options: body.options ?? {},
    sizes: body.sizes ?? [],
    contact: {
      ...contact,
      budget: body.budget,
    },
    artwork: {
      files: files.map((file) => ({ type: file.type, size: Number(file.size) })),
      later: Boolean(body.artwork?.later),
      notes: body.artwork?.notes,
    },
  });

  if (!readiness.ready) {
    res.status(422).json({
      error: 'الطلب محتاج تعديل قبل الإرسال.',
      readiness,
    });
    return;
  }

  if (body.consent !== true) {
    res.status(422).json({ error: 'لازم توافق على سياسة الخصوصية قبل إرسال الطلب.' });
    return;
  }

  if (files.length > MAX_FILES) {
    res.status(422).json({ error: `الحد الأقصى ${MAX_FILES} ملفات.` });
    return;
  }

  const prepared = [];
  for (const file of files) {
    const declared = String(file.type ?? '');
    const data = String(file.data ?? '');
    if (!ALLOWED_ARTWORK_TYPES.includes(declared)) {
      res.status(422).json({ error: 'نوع ملف غير مدعوم. المسموح: PNG, JPG, WEBP, PDF, AI.' });
      return;
    }
    const buffer = Buffer.from(data, 'base64');
    if (!buffer.length) {
      res.status(422).json({ error: 'ملف فارغ أو غير صالح.' });
      return;
    }
    if (buffer.length > MAX_FILE_BYTES) {
      res.status(422).json({ error: 'أحد الملفات أكبر من 8 ميجا.' });
      return;
    }
    const detected = sniffMime(buffer);
    if (!detected || detected !== declared) {
      res.status(422).json({ error: 'محتوى الملف لا يطابق نوعه. أعد رفع الملف.' });
      return;
    }
    prepared.push({ buffer, mime: declared, name: text(file.name, 180) || 'artwork', detected });
  }

  const phone = normalizePhone(contact.phone);
  const ref = nextRequestRef();
  const trackingCode = Array.from({ length: 8 }, () =>
    'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[crypto.randomInt(0, 31)],
  ).join('');

  const createdAt = now();
  const info = db
    .prepare(
      `INSERT INTO requests (ref, tracking_hash, service_slug, service_name, quantity, options_json,
        sizes_json, budget, customer_name, phone, alt_phone, email, method, city, area,
        preferred_date, artwork_notes, artwork_later, readiness_json, status, is_demo,
        created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 0, ?, ?)`,
    )
    .run(
      ref,
      hashToken(trackingCode),
      service.slug,
      service.name,
      Number(body.quantity),
      JSON.stringify(body.options ?? {}),
      JSON.stringify(Array.isArray(body.sizes) ? body.sizes : []),
      text(body.budget, 60) || null,
      text(contact.name, 120),
      phone,
      contact.altPhone ? normalizePhone(contact.altPhone) : null,
      text(contact.email, 160) || null,
      contact.method === 'delivery' ? 'delivery' : 'pickup',
      text(contact.city, 80) || 'أسوان',
      text(contact.area, 300) || null,
      contact.preferredDate ? text(contact.preferredDate, 10) : null,
      text(body.artwork?.notes, 4000) || null,
      body.artwork?.later ? 1 : 0,
      JSON.stringify(readiness),
      createdAt,
      createdAt,
    );

  const requestId = Number(info.lastInsertRowid);

  for (const file of prepared) {
    const ext =
      { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'application/pdf': '.pdf', 'application/postscript': '.ai' }[
        file.mime
      ] ?? '.bin';
    const storedName = `${crypto.randomBytes(12).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), file.buffer);
    db.prepare(
      `INSERT INTO attachments (request_id, stored_name, original_name, mime, size, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(requestId, storedName, file.name, file.mime, file.buffer.length, createdAt);
  }

  addEvent(requestId, {
    type: 'submitted',
    status: 'submitted',
    message: 'تم استلام طلبك وإنشاء رقم متابعة خاص. هنراجعه ونرد عليك.',
    actor: 'customer',
  });

  const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);

  res.status(201).json({
    ref,
    trackingCode,
    request: publicRequest(row),
    timeline: eventsFor(requestId),
    readiness,
  });
});

/* ========================================================================== */
/* Tracking                                                                   */
/* ========================================================================== */

api.post('/track', (req, res) => {
  if (!requireRate(req, res, { namespace: 'track', limit: 40, windowMs: 10 * 60_000 })) return;

  const row = findRequestByRef(req.body?.ref);
  if (!row) {
    res.status(404).json({
      error: 'مفيش طلب مطابق لرقم الطلب ده.',
    });
    return;
  }

  noStore(res);
  res.json({
    request: publicRequest(row),
    timeline: eventsFor(row.id),
    attachments: attachmentsFor(row.id),
  });
});

api.post('/track/:ref/reply', (req, res) => {
  if (!requireRate(req, res, { namespace: 'reply', limit: 20, windowMs: 60 * 60_000 })) return;

  const row = findRequestByRef(req.params.ref);
  if (!row) {
    res.status(404).json({ error: 'الطلب غير موجود.' });
    return;
  }

  const message = text(req.body?.message, 2000);
  if (message.length < 5) {
    res.status(422).json({ error: 'اكتب رسالة أوضح (5 حروف على الأقل).' });
    return;
  }

  addEvent(row.id, { type: 'customer_reply', message, actor: 'customer' });
  if (row.status === 'needs_info') {
    db.prepare('UPDATE requests SET status = ?, updated_at = ? WHERE id = ?').run('under_review', now(), row.id);
    addEvent(row.id, {
      type: 'status',
      status: 'under_review',
      message: 'تم استلام ردك، والطلب رجع للمراجعة.',
      actor: 'system',
    });
  } else {
    db.prepare('UPDATE requests SET updated_at = ? WHERE id = ?').run(now(), row.id);
  }

  res.json({
    ok: true,
    request: publicRequest(db.prepare('SELECT * FROM requests WHERE id = ?').get(row.id)),
    timeline: eventsFor(row.id),
  });
});

api.get('/track/:ref/attachments/:id', (req, res) => {
  const row = findRequestByRef(req.params.ref);
  if (!row) {
    res.status(404).json({ error: 'الملف غير متاح.' });
    return;
  }
  const attachment = db
    .prepare('SELECT * FROM attachments WHERE id = ? AND request_id = ?')
    .get(Number(req.params.id), row.id);
  if (!attachment) {
    res.status(404).json({ error: 'الملف غير موجود.' });
    return;
  }
  sendAttachment(res, attachment);
});

/* ========================================================================== */
/* Admin: overview + requests                                                 */
/* ========================================================================== */

api.use('/admin', requireAdmin);

api.get('/admin/overview', (req, res) => {
  const counts = Object.fromEntries(
    db.prepare('SELECT status, COUNT(*) AS c FROM requests GROUP BY status').all().map((r) => [r.status, r.c]),
  );
  const total = db.prepare('SELECT COUNT(*) AS c FROM requests').get().c;
  const newCount = counts.submitted ?? 0;
  const active = ['under_review', 'needs_info', 'approved', 'in_production', 'ready'].reduce(
    (sum, key) => sum + (counts[key] ?? 0),
    0,
  );
  const recent = db
    .prepare('SELECT * FROM requests ORDER BY created_at DESC LIMIT 5')
    .all()
    .map((row) => ({
      id: row.id,
      ref: row.ref,
      customerName: row.customer_name,
      serviceName: row.service_name,
      quantity: row.quantity,
      status: row.status,
      isDemo: Boolean(row.is_demo),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

  res.json({ total, newCount, active, counts, recent });
});

api.get('/admin/requests', (req, res) => {
  const status = text(req.query.status, 40);
  const q = text(req.query.q, 120);
  const clauses = [];
  const params = [];

  if (status && status !== 'all') {
    clauses.push('status = ?');
    params.push(status);
  }
  if (q) {
    clauses.push('(ref LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR service_name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM requests ${where} ORDER BY created_at DESC LIMIT 300`)
    .all(...params);

  res.json({
    requests: rows.map((row) => {
      const json = requestRowToJson(row);
      return {
        id: json.id,
        ref: json.ref,
        customerName: json.customerName,
        phone: json.phone,
        serviceName: json.serviceName,
        quantity: json.quantity,
        status: json.status,
        method: json.method,
        isDemo: json.isDemo,
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
        attachmentCount: db
          .prepare('SELECT COUNT(*) AS c FROM attachments WHERE request_id = ?')
          .get(row.id).c,
      };
    }),
  });
});

api.get('/admin/requests/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: 'الطلب غير موجود.' });
    return;
  }
  res.json({
    request: requestRowToJson(row),
    timeline: eventsFor(row.id, { includeInternal: true }),
    attachments: attachmentsFor(row.id),
  });
});

const VALID_STATUSES = Object.keys(STATUS_MAP);

api.patch('/admin/requests/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: 'الطلب غير موجود.' });
    return;
  }

  const body = req.body ?? {};
  const nextStatus = body.status ? text(body.status, 40) : null;
  if (nextStatus && !VALID_STATUSES.includes(nextStatus)) {
    res.status(422).json({ error: 'حالة الطلب غير معروفة.' });
    return;
  }

  const decisionNote =
    body.decisionNote !== undefined ? text(body.decisionNote, 2500) || null : row.decision_note;
  const internalNote =
    body.internalNote !== undefined ? text(body.internalNote, 2500) || null : row.internal_note;
  const message = text(body.message, 2500);
  const notify = body.notifyCustomer !== false;
  const statusChanged = Boolean(nextStatus && nextStatus !== row.status);

  if ((nextStatus === 'rejected' || nextStatus === 'needs_info') && statusChanged && !decisionNote && !message) {
    res.status(422).json({
      error: 'اكتب سبب الرفض أو المعلومات المطلوبة قبل تغيير الحالة.',
    });
    return;
  }

  const decidedAt =
    nextStatus === 'approved' || nextStatus === 'rejected'
      ? now()
      : nextStatus === 'submitted' || nextStatus === 'under_review'
        ? null
        : row.decided_at;

  db.prepare(
    `UPDATE requests SET status = ?, decision_note = ?, internal_note = ?, updated_at = ?, decided_at = ?
     WHERE id = ?`,
  ).run(nextStatus ?? row.status, decisionNote, internalNote, now(), decidedAt, row.id);

  if (statusChanged) {
    addEvent(row.id, {
      type: 'status',
      status: nextStatus,
      message: message || decisionNote || DEFAULT_STATUS_MESSAGES[nextStatus] || 'تم تحديث حالة الطلب.',
      visibility: notify ? 'public' : 'internal',
      actor: 'admin',
    });
  } else if (message) {
    addEvent(row.id, {
      type: 'note',
      status: null,
      message,
      visibility: notify ? 'public' : 'internal',
      actor: 'admin',
    });
  }

  if (body.internalNote !== undefined && internalNote) {
    addEvent(row.id, {
      type: 'note',
      status: null,
      message: `ملاحظة داخلية: ${internalNote}`,
      visibility: 'internal',
      actor: 'admin',
    });
  }

  const updated = db.prepare('SELECT * FROM requests WHERE id = ?').get(row.id);
  res.json({
    request: requestRowToJson(updated),
    timeline: eventsFor(row.id, { includeInternal: true }),
  });
});

api.post('/admin/requests/:id/notes', (req, res) => {
  const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: 'الطلب غير موجود.' });
    return;
  }
  const message = text(req.body?.message, 2500);
  const visibility = req.body?.visibility === 'internal' ? 'internal' : 'public';
  if (message.length < 2) {
    res.status(422).json({ error: 'اكتب نص الملاحظة.' });
    return;
  }
  addEvent(row.id, { type: 'note', message, visibility, actor: 'admin' });
  db.prepare('UPDATE requests SET updated_at = ? WHERE id = ?').run(now(), row.id);
  res.status(201).json({
    timeline: eventsFor(row.id, { includeInternal: true }),
  });
});

api.get('/admin/attachments/:id', (req, res) => {
  const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(Number(req.params.id));
  if (!attachment) {
    res.status(404).json({ error: 'الملف غير موجود.' });
    return;
  }
  sendAttachment(res, attachment);
});

api.get('/admin/audit', (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.*, r.ref FROM request_events e JOIN requests r ON r.id = e.request_id
       ORDER BY e.created_at DESC, e.id DESC LIMIT 100`,
    )
    .all();
  res.json({ events: rows });
});

/* ========================================================================== */
/* Admin: catalogue, portfolio, settings                                      */
/* ========================================================================== */

api.get('/admin/services', (req, res) => {
  const rows = db.prepare('SELECT * FROM services ORDER BY sort_order, id').all();
  res.json({ services: rows.map(serviceRowToJson) });
});

function parseOptions(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return null;
    }
  }
  return [];
}

api.post('/admin/services', (req, res) => {
  const body = req.body ?? {};
  const name = text(body.name, 120);
  if (!name) {
    res.status(422).json({ error: 'اسم الخدمة مطلوب.' });
    return;
  }
  const options = parseOptions(body.options);
  if (options === null) {
    res.status(422).json({ error: 'صيغة الخيارات غير صحيحة (JSON).' });
    return;
  }

  const slug =
    text(body.slug, 80)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '') || `custom-${Date.now().toString(36)}`;
  if (db.prepare('SELECT 1 FROM services WHERE slug = ?').get(slug)) {
    res.status(409).json({ error: 'ده الـ slug مستخدم بالفعل.' });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO services (slug, name, subtitle, category, summary, description, image, image_alt,
        min_quantity, requires_sizes, needs_artwork, brief_required, options_json, guidance_json,
        active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      slug,
      name,
      text(body.subtitle, 160) || null,
      text(body.category, 40) || 'مطبوعات',
      text(body.summary, 400) || null,
      text(body.description, 3000) || null,
      text(body.image, 300) || null,
      text(body.imageAlt, 200) || null,
      Math.max(1, Number(body.minQuantity) || 1),
      toBool(body.requiresSizes) ? 1 : 0,
      toBool(body.needsArtwork) ? 1 : 0,
      toBool(body.briefRequired) ? 1 : 0,
      JSON.stringify(options),
      JSON.stringify(Array.isArray(body.guidance) ? body.guidance : []),
      toBool(body.active ?? true) ? 1 : 0,
      Number(body.sortOrder) || 100,
      now(),
      now(),
    );

  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(Number(info.lastInsertRowid));
  res.status(201).json({ service: serviceRowToJson(row) });
});

api.patch('/admin/services/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: 'الخدمة غير موجودة.' });
    return;
  }
  const body = req.body ?? {};
  const options = body.options !== undefined ? parseOptions(body.options) : JSON.parse(row.options_json);
  if (options === null) {
    res.status(422).json({ error: 'صيغة الخيارات غير صحيحة.' });
    return;
  }

  db.prepare(
    `UPDATE services SET name = ?, subtitle = ?, category = ?, summary = ?, description = ?,
      image = ?, image_alt = ?, min_quantity = ?, requires_sizes = ?, needs_artwork = ?,
      brief_required = ?, options_json = ?, guidance_json = ?, active = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    body.name !== undefined ? text(body.name, 120) : row.name,
    body.subtitle !== undefined ? text(body.subtitle, 160) || null : row.subtitle,
    body.category !== undefined ? text(body.category, 40) : row.category,
    body.summary !== undefined ? text(body.summary, 400) || null : row.summary,
    body.description !== undefined ? text(body.description, 3000) || null : row.description,
    body.image !== undefined ? text(body.image, 300) || null : row.image,
    body.imageAlt !== undefined ? text(body.imageAlt, 200) || null : row.image_alt,
    body.minQuantity !== undefined ? Math.max(1, Number(body.minQuantity) || 1) : row.min_quantity,
    toBool(body.requiresSizes ?? row.requires_sizes) ? 1 : 0,
    toBool(body.needsArtwork ?? row.needs_artwork) ? 1 : 0,
    toBool(body.briefRequired ?? row.brief_required) ? 1 : 0,
    JSON.stringify(options),
    JSON.stringify(
      body.guidance !== undefined ? (Array.isArray(body.guidance) ? body.guidance : []) : JSON.parse(row.guidance_json),
    ),
    toBool(body.active ?? row.active) ? 1 : 0,
    body.sortOrder !== undefined ? Number(body.sortOrder) || 0 : row.sort_order,
    now(),
    row.id,
  );

  res.json({ service: serviceRowToJson(db.prepare('SELECT * FROM services WHERE id = ?').get(row.id)) });
});

api.delete('/admin/services/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: 'الخدمة غير موجودة.' });
    return;
  }
  db.prepare('UPDATE services SET active = 0, updated_at = ? WHERE id = ?').run(now(), row.id);
  res.json({ ok: true });
});

api.get('/admin/portfolio', (req, res) => {
  const rows = db.prepare('SELECT * FROM portfolio ORDER BY sort_order, id').all();
  res.json({ items: rows.map(portfolioRowToJson) });
});

function portfolioPayload(body) {
  return {
    title: text(body.title, 160),
    category: text(body.category, 40) || 'مطبوعات',
    image: text(body.image, 300),
    description: text(body.description, 500) || null,
    isDemo: toBool(body.isDemo) ? 1 : 0,
    active: toBool(body.active ?? true) ? 1 : 0,
    sortOrder: Number(body.sortOrder) || 0,
  };
}

api.post('/admin/portfolio', (req, res) => {
  const data = portfolioPayload(req.body ?? {});
  if (!data.title || !data.image) {
    res.status(422).json({ error: 'العنوان والصورة مطلوبان.' });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO portfolio (title, category, image, description, is_demo, active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(data.title, data.category, data.image, data.description, data.isDemo, data.active, data.sortOrder, now(), now());
  res.status(201).json({
    item: portfolioRowToJson(db.prepare('SELECT * FROM portfolio WHERE id = ?').get(Number(info.lastInsertRowid))),
  });
});

api.patch('/admin/portfolio/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: 'العمل غير موجود.' });
    return;
  }
  const data = portfolioPayload({ ...portfolioRowToJson(row), ...req.body });
  db.prepare(
    `UPDATE portfolio SET title = ?, category = ?, image = ?, description = ?, is_demo = ?,
      active = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
  ).run(data.title, data.category, data.image, data.description, data.isDemo, data.active, data.sortOrder, now(), row.id);
  res.json({ item: portfolioRowToJson(db.prepare('SELECT * FROM portfolio WHERE id = ?').get(row.id)) });
});

api.delete('/admin/portfolio/:id', (req, res) => {
  db.prepare('DELETE FROM portfolio WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

api.get('/admin/settings', (req, res) => {
  res.json({ settings: getSettings(), admin: req.user });
});

api.patch('/admin/settings', (req, res) => {
  const body = req.body ?? {};
  const current = getSettings();

  if (body.business && typeof body.business === 'object') {
    const next = { ...(current.business ?? {}) };
    for (const key of [
      'name', 'descriptor', 'tagline', 'whatsapp', 'phone', 'website', 'instagram', 'facebook',
      'email', 'address', 'hours', 'mapsUrl', 'deliveryNote', 'announcement', 'demoMode', 'launchApproved',
    ]) {
      if (body.business[key] !== undefined) {
        next[key] = typeof body.business[key] === 'boolean' ? body.business[key] : text(body.business[key], 500);
      }
    }
    setSetting('business', next);
  }

  if (body.content && typeof body.content === 'object') {
    const next = { ...(current.content ?? {}) };
    for (const key of ['announcement', 'homepageNote']) {
      if (body.content[key] !== undefined) next[key] = text(body.content[key], 1000);
    }
    setSetting('content', next);
  }

  res.json({ settings: getSettings() });
});

api.post('/admin/password', (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!row || !verifyPassword(String(currentPassword ?? ''), row.password_hash)) {
    res.status(422).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
    return;
  }
  if (String(newPassword ?? '').length < 10) {
    res.status(422).json({ error: 'كلمة المرور الجديدة لازم تكون 10 أحرف على الأقل.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(newPassword)), row.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.id);
  res.setHeader('Set-Cookie', clearCookie());
  res.json({ ok: true, message: 'تم تغيير كلمة المرور. سجّل الدخول من جديد.' });
});

/* ---------------------------------------------------------------- media --- */

api.post('/admin/media', (req, res) => {
  const body = req.body ?? {};
  const declared = String(body.type ?? '');
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(declared)) {
    res.status(422).json({ error: 'مسموح برفع صور PNG أو JPG أو WEBP فقط.' });
    return;
  }
  const buffer = Buffer.from(String(body.data ?? ''), 'base64');
  if (!buffer.length || buffer.length > 6 * 1024 * 1024) {
    res.status(422).json({ error: 'حجم الصورة يجب أن يكون أقل من 6 ميجا.' });
    return;
  }
  if (sniffMime(buffer) !== declared) {
    res.status(422).json({ error: 'محتوى الصورة لا يطابق صيغتها.' });
    return;
  }
  const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[declared];
  const dir = path.join(ROOT, 'public', 'media', 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const stored = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(dir, stored), buffer);
  res.status(201).json({ url: `/media/uploads/${stored}`, size: buffer.length });
});

/* ------------------------------------------------------------- helpers --- */

function sendAttachment(res, attachment) {
  const filePath = path.join(UPLOAD_DIR, path.basename(attachment.stored_name));
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'الملف غير متاح على السيرفر.' });
    return;
  }
  res.setHeader('Content-Type', attachment.mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `inline; filename="attachment-${attachment.id}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(filePath).pipe(res);
}

export function ensureDemoAttachmentDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
