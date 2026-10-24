export const STATUSES = [
  { key: 'submitted', label: 'تم الإرسال', tone: 'info', customer: 'استلمنا طلبك' },
  { key: 'under_review', label: 'قيد المراجعة', tone: 'review', customer: 'بنراجع الطلب' },
  { key: 'needs_info', label: 'محتاج معلومات', tone: 'warn', customer: 'محتاجين توضيح' },
  { key: 'approved', label: 'قبول للمراجعة', tone: 'ok', customer: 'قبول للمراجعة' },
  { key: 'in_production', label: 'قيد التنفيذ', tone: 'progress', customer: 'قيد التنفيذ' },
  { key: 'ready', label: 'جاهز للتسليم', tone: 'ok', customer: 'جاهز للتسليم' },
  { key: 'delivered', label: 'تم التسليم', tone: 'done', customer: 'تم التسليم' },
  { key: 'rejected', label: 'مرفوض', tone: 'bad', customer: 'مرفوض' },
  { key: 'closed', label: 'مغلق', tone: 'muted', customer: 'مغلق' },
];

export const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s]));

export const CUSTOMER_STATUS_FLOW = [
  'submitted',
  'under_review',
  'needs_info',
  'approved',
  'in_production',
  'ready',
  'delivered',
];

export const ACTIVE_STATUSES = ['submitted', 'under_review', 'needs_info', 'approved', 'in_production', 'ready'];

export function statusLabel(key) {
  return STATUS_MAP[key]?.label ?? key;
}

export function statusTone(key) {
  return STATUS_MAP[key]?.tone ?? 'muted';
}

/** الخطوة الظاهرة للعميل داخل شريط التقدّم. */
export function customerStepIndex(key) {
  const flow = ['submitted', 'under_review', 'approved', 'in_production', 'ready', 'delivered'];
  if (key === 'needs_info') return 1;
  if (key === 'rejected') return 1;
  if (key === 'closed') return 5;
  const index = flow.indexOf(key);
  return index === -1 ? 0 : index;
}
