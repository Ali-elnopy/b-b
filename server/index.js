import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './api.js';
import { seed, DEFAULT_ADMIN } from './seed.js';
import { ROOT } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 4100);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = new Set(
  (
    process.env.CLIENT_ORIGIN ||
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'
  )
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProd) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
  }

  // Same-origin protection for state-changing requests (CSRF hardening).
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin) {
      let host = '';
      try {
        host = new URL(origin).host;
      } catch {
        host = '';
      }
      if (host !== req.headers.host && !allowedOrigins.has(origin)) {
        res.status(403).json({ error: 'مصدر الطلب غير مسموح.' });
        return;
      }
    }
  }

  next();
});

app.use(express.json({ limit: '30mb' }));

app.use('/api', api);

app.use(
  express.static(path.join(ROOT, 'public'), {
    maxAge: isProd ? '7d' : 0,
    etag: true,
  }),
);

const dist = path.join(ROOT, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: isProd ? '1h' : 0, index: false }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/media') || req.path.startsWith('/fonts')) {
      return next();
    }
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ error: 'حجم البيانات أكبر من المسموح. أقل عدد/حجم للملفات.' });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'صيغة JSON غير صحيحة.' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'حصل خطأ غير متوقع. جرّب تاني.' });
});

export function startServer(port = PORT) {
  const created = seed();
  const server = app.listen(port, () => {
    console.log(`\n  يوزرسيف API — http://127.0.0.1:${port}`);
    console.log(`  البيئة: ${isProd ? 'production' : 'development'}`);
    if (created.admin) {
      console.log(`  تم إنشاء حساب المالك: ${DEFAULT_ADMIN.email} / ${DEFAULT_ADMIN.password}`);
      console.log('  غيّر كلمة المرور بعد أول تسجيل دخول.');
    }
    console.log('');
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = startServer();
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`المنفذ ${PORT} مشغول. غيّر PORT أو أوقف العملية القديمة.`);
      process.exit(1);
    }
    throw error;
  });
}

export { app, here };
