import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_FILE_BYTES,
  evaluateRequest,
  isValidEgyptMobile,
  normalizeDigits,
  normalizePhone,
  toInt,
  validateArtworkFile,
} from '../shared/readiness.js';
import { customerStepIndex, statusLabel } from '../shared/status.js';

const SERVICE = {
  name: 'ملابس مطبوعة',
  minQuantity: 1,
  requiresSizes: true,
  needsArtwork: true,
  briefRequired: false,
  options: [
    { key: 'garment', label: 'نوع القطعة', required: true },
    { key: 'placement', label: 'مكان الطباعة', required: false },
  ],
};

function makeInput(overrides = {}) {
  return {
    service: SERVICE,
    quantity: '10',
    options: { garment: 'تيشيرت' },
    sizes: [
      { size: 'M', qty: 4 },
      { size: 'L', qty: 6 },
    ],
    contact: {
      name: 'محمد عبد الصمد',
      phone: '01006926440',
      email: 'mohamed@example.com',
      method: 'pickup',
      city: 'أسوان',
    },
    artwork: {
      files: [{ type: 'image/png', size: 2048 }],
      later: false,
      notes: '',
    },
    ...overrides,
  };
}

test('normalizes Arabic-Indic digits and Egyptian phone numbers', () => {
  assert.equal(normalizeDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789');
  assert.equal(toInt('١٢'), 12);
  assert.equal(normalizePhone('+20 100 692 6440'), '01006926440');
  assert.equal(normalizePhone('00201006926440'), '01006926440');
  assert.equal(normalizePhone('201006926440'), '01006926440');
  assert.equal(isValidEgyptMobile('0100 692 6440'), true);
  assert.equal(isValidEgyptMobile('02006926440'), false);
  assert.equal(isValidEgyptMobile('0100692644'), false);
});

test('a complete request is ready', () => {
  const result = evaluateRequest(makeInput());
  assert.equal(result.ready, true);
  assert.equal(result.blockers.length, 0);
  assert.ok(result.checks.some((check) => check.id === 'sizes' && check.status === 'pass'));
  assert.ok(result.checks.some((check) => check.id === 'artwork' && check.status === 'pass'));
});

test('size total must match the requested quantity', () => {
  const result = evaluateRequest(
    makeInput({
      sizes: [
        { size: 'M', qty: 4 },
        { size: 'L', qty: 5 },
      ],
    }),
  );
  assert.equal(result.ready, false);
  const sizes = result.blockers.find((check) => check.id === 'sizes');
  assert.ok(sizes);
  assert.match(sizes.message, /ناقص 1/);
});

test('missing required options block the request', () => {
  const result = evaluateRequest(makeInput({ options: {} }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((check) => check.id === 'options'));
});

test('artwork is required unless the customer sends it later', () => {
  const missing = evaluateRequest(makeInput({ artwork: { files: [], later: false } }));
  assert.equal(missing.ready, false);
  assert.ok(missing.blockers.some((check) => check.id === 'artwork-missing'));

  const later = evaluateRequest(makeInput({ artwork: { files: [], later: true } }));
  assert.equal(later.ready, true);
  assert.ok(later.warnings.some((check) => check.id === 'artwork-later'));
});

test('unsupported artwork types and oversized files are rejected', () => {
  const badType = evaluateRequest(
    makeInput({ artwork: { files: [{ type: 'image/gif', size: 2048 }], later: false } }),
  );
  assert.equal(badType.ready, false);
  assert.ok(badType.blockers.some((check) => check.id === 'artwork-type'));

  const tooBig = evaluateRequest(
    makeInput({
      artwork: { files: [{ type: 'image/png', size: MAX_FILE_BYTES + 1 }], later: false },
    }),
  );
  assert.equal(tooBig.ready, false);
  assert.ok(tooBig.blockers.some((check) => check.id === 'artwork-type'));
});

test('delivery requires an address', () => {
  const withoutArea = evaluateRequest(
    makeInput({ contact: { ...makeInput().contact, method: 'delivery', area: '' } }),
  );
  assert.equal(withoutArea.ready, false);
  assert.ok(withoutArea.blockers.some((check) => check.id === 'area'));

  const withArea = evaluateRequest(
    makeInput({
      contact: { ...makeInput().contact, method: 'delivery', area: 'شارع أبطال التحرير' },
    }),
  );
  assert.equal(withArea.ready, true);
  assert.ok(withArea.warnings.some((check) => check.id === 'delivery-coverage'));
});

test('short or invalid contact details block the request', () => {
  const badPhone = evaluateRequest(
    makeInput({ contact: { ...makeInput().contact, phone: '12345' } }),
  );
  assert.equal(badPhone.ready, false);
  assert.ok(badPhone.blockers.some((check) => check.id === 'phone'));

  const badName = evaluateRequest(makeInput({ contact: { ...makeInput().contact, name: 'م' } }));
  assert.equal(badName.ready, false);
  assert.ok(badName.blockers.some((check) => check.id === 'name'));

  const badEmail = evaluateRequest(
    makeInput({ contact: { ...makeInput().contact, email: 'not-an-email' } }),
  );
  assert.equal(badEmail.ready, false);
  assert.ok(badEmail.blockers.some((check) => check.id === 'email'));
});

test('design briefs need at least 20 characters', () => {
  const design = { ...SERVICE, needsArtwork: false, requiresSizes: false, briefRequired: true };
  const short = evaluateRequest(
    makeInput({
      service: design,
      sizes: [],
      artwork: { files: [], later: false, notes: 'لوجو بسيط' },
    }),
  );
  assert.equal(short.ready, false);
  assert.ok(short.blockers.some((check) => check.id === 'brief'));

  const complete = evaluateRequest(
    makeInput({
      service: design,
      sizes: [],
      artwork: {
        files: [],
        later: false,
        notes: 'لوجو لمقهى في أسوان، جمهور شباب، ألوان دافئة وستايل بسيط.',
      },
    }),
  );
  assert.equal(complete.ready, true);
});

test('validateArtworkFile returns a message only for invalid files', () => {
  assert.equal(validateArtworkFile({ type: 'image/png', size: 1024 }), null);
  assert.match(validateArtworkFile({ type: 'image/gif', size: 1024 }), /غير مدعوم/);
  assert.match(validateArtworkFile({ type: 'image/png', size: MAX_FILE_BYTES + 1 }), /8 ميجا/);
  assert.match(validateArtworkFile(null), /غير موجود/);
});

test('status helpers map unknown values safely', () => {
  assert.equal(statusLabel('needs_info'), 'محتاج معلومات');
  assert.equal(statusLabel('unknown'), 'unknown');
  assert.equal(customerStepIndex('needs_info'), 1);
  assert.equal(customerStepIndex('delivered'), 5);
  assert.equal(customerStepIndex('unknown'), 0);
});
