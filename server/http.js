const buckets = new Map();

/**
 * Rate limiter بسيط في الذاكرة. كافٍ لنشر صغير على سيرفر واحد،
 * ومقصود إنه ما يعتمدش على خدمة خارجية.
 */
export function rateLimit({ key, limit, windowMs }) {
  const nowMs = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= nowMs) {
    buckets.set(key, { count: 1, resetAt: nowMs + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - nowMs) / 1000),
    };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfter: 0 };
}

export function clientIp(req) {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export function requireRate(req, res, { namespace, limit, windowMs }) {
  const result = rateLimit({ key: `${namespace}:${clientIp(req)}`, limit, windowMs });
  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfter));
    res.status(429).json({
      error: 'محاولات كثيرة في وقت قصير. جرّب تاني بعد شوية.',
      retryAfter: result.retryAfter,
    });
    return false;
  }
  return true;
}

export function text(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

export function isEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
}

export function toBool(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/** فحص بسيط لبصمة الملف حتى لا نثق بنوع MIME القادم من المتصفح. */
export function sniffMime(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  if (buffer.toString('ascii', 0, 2) === '%!') return 'application/postscript';
  return null;
}

export function safeEqualStrings(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return left.equals(right);
}

export function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}
