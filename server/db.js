import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const here = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(here, '..');
export const DATA_DIR = process.env.YOZ_DATA_DIR || path.join(ROOT, 'server', 'data');
export const UPLOAD_DIR = process.env.YOZ_UPLOAD_DIR || path.join(ROOT, 'server', 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const dbFile = process.env.YOZ_DB_PATH || path.join(DATA_DIR, 'yozersaf.db');

export const db = new DatabaseSync(dbFile);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subtitle TEXT,
  category TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  image TEXT,
  image_alt TEXT,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  requires_sizes INTEGER NOT NULL DEFAULT 0,
  needs_artwork INTEGER NOT NULL DEFAULT 1,
  brief_required INTEGER NOT NULL DEFAULT 0,
  options_json TEXT NOT NULL DEFAULT '[]',
  guidance_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  image TEXT NOT NULL,
  description TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  tracking_hash TEXT NOT NULL,
  service_slug TEXT,
  service_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  options_json TEXT NOT NULL DEFAULT '{}',
  sizes_json TEXT NOT NULL DEFAULT '[]',
  budget TEXT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  alt_phone TEXT,
  email TEXT,
  method TEXT,
  city TEXT,
  area TEXT,
  preferred_date TEXT,
  artwork_notes TEXT,
  artwork_later INTEGER NOT NULL DEFAULT 0,
  readiness_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted',
  decision_note TEXT,
  internal_note TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS request_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT,
  message TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  actor TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_events_request ON request_events(request_id);
CREATE INDEX IF NOT EXISTS idx_attachments_request ON attachments(request_id);
`);

export const now = () => new Date().toISOString();

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, JSON.stringify(value));
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      out[row.key] = row.value;
    }
  }
  return out;
}

export function nextRequestRef() {
  const year = new Date().getFullYear();
  for (let i = 1; i < 10000; i += 1) {
    const ref = `YZ-${year}-${String(i).padStart(4, '0')}`;
    const exists = db.prepare('SELECT 1 FROM requests WHERE ref = ?').get(ref);
    if (!exists) return ref;
  }
  throw new Error('تعذر إنشاء رقم طلب جديد.');
}

export function requestRowToJson(row) {
  if (!row) return null;
  return {
    id: row.id,
    ref: row.ref,
    serviceSlug: row.service_slug,
    serviceName: row.service_name,
    quantity: row.quantity,
    options: JSON.parse(row.options_json || '{}'),
    sizes: JSON.parse(row.sizes_json || '[]'),
    budget: row.budget,
    customerName: row.customer_name,
    phone: row.phone,
    altPhone: row.alt_phone,
    email: row.email,
    method: row.method,
    city: row.city,
    area: row.area,
    preferredDate: row.preferred_date,
    artworkNotes: row.artwork_notes,
    artworkLater: Boolean(row.artwork_later),
    readiness: JSON.parse(row.readiness_json || '{}'),
    status: row.status,
    decisionNote: row.decision_note,
    internalNote: row.internal_note,
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decidedAt: row.decided_at,
  };
}

export function serviceRowToJson(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    category: row.category,
    summary: row.summary,
    description: row.description,
    image: row.image,
    imageAlt: row.image_alt,
    minQuantity: row.min_quantity,
    requiresSizes: Boolean(row.requires_sizes),
    needsArtwork: Boolean(row.needs_artwork),
    briefRequired: Boolean(row.brief_required),
    options: JSON.parse(row.options_json || '[]'),
    guidance: JSON.parse(row.guidance_json || '[]'),
    active: Boolean(row.active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function portfolioRowToJson(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    image: row.image,
    description: row.description,
    isDemo: Boolean(row.is_demo),
    active: Boolean(row.active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
