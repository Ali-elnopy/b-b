import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { Loading } from '../components/Common.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import {
  ALLOWED_ARTWORK_TYPES,
  MAX_FILES,
  MAX_FILE_BYTES,
  SIZE_LABELS,
  evaluateRequest,
  validateArtworkFile,
} from '../../shared/readiness.js';

const STEPS = [
  { key: 'product', label: 'المنتج', hint: 'اختار الخدمة' },
  { key: 'details', label: 'التفاصيل', hint: 'الكمية والخيارات' },
  { key: 'artwork', label: 'التصميم', hint: 'الملفات والبريف' },
  { key: 'contact', label: 'بيانات التواصل', hint: 'الاسم والاستلام' },
  { key: 'review', label: 'المراجعة', hint: 'راجع وابعت' },
];

const STEP_GROUPS = {
  1: ['product', 'details'],
  2: ['artwork'],
  3: ['contact'],
};

const EMPTY_CONTACT = {
  name: '',
  phone: '',
  altPhone: '',
  email: '',
  method: 'pickup',
  city: 'أسوان',
  area: '',
  preferredDate: '',
};

function normalizeFileType(file) {
  if (ALLOWED_ARTWORK_TYPES.includes(file.type)) return file.type;
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  const byExt = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    pdf: 'application/pdf',
    ai: 'application/postscript',
  };
  return byExt[ext] ?? file.type;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('تعذر قراءة الملف. جرّب تختاره تاني.'));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function fieldClass(show, failed) {
  return show && failed ? 'input is-invalid' : 'input';
}

export default function RequestPage() {
  const { services, loading } = useSite();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const presetSlug = new URLSearchParams(location.search).get('service') ?? '';

  const [step, setStep] = useState(0);
  const [serviceSlug, setServiceSlug] = useState(presetSlug);
  const [quantity, setQuantity] = useState('1');
  const [options, setOptions] = useState({});
  const [otherMode, setOtherMode] = useState({});
  const [sizes, setSizes] = useState({});
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [later, setLater] = useState(false);
  const [notes, setNotes] = useState('');
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [budget, setBudget] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);
  const [touched, setTouched] = useState(false);

  const fileInputRef = useRef(null);
  const topRef = useRef(null);
  const presetApplied = useRef(false);

  const service = useMemo(
    () => services.find((item) => item.slug === serviceSlug) ?? null,
    [services, serviceSlug],
  );

  /* اختيار الخدمة من الرابط أو من الكتالوج */
  useEffect(() => {
    if (presetApplied.current || !presetSlug || !services.length) return;
    const found = services.find((item) => item.slug === presetSlug);
    if (!found) return;
    presetApplied.current = true;
    setServiceSlug(found.slug);
    setQuantity(String(found.minQuantity || 1));
    setStep(1);
  }, [presetSlug, services]);

  const sizeRows = useMemo(
    () => SIZE_LABELS.map((size) => ({ size, qty: sizes[size] ?? '' })),
    [sizes],
  );

  const sizeTotal = useMemo(
    () => sizeRows.reduce((sum, row) => sum + (Number(row.qty) || 0), 0),
    [sizeRows],
  );

  const readiness = useMemo(
    () =>
      evaluateRequest({
        service,
        quantity,
        options,
        sizes: sizeRows,
        contact: { ...contact, budget },
        artwork: {
          files: files.map((file) => ({ type: file.type, size: file.size })),
          later,
          notes,
        },
      }),
    [service, quantity, options, sizeRows, contact, budget, files, later, notes],
  );

  const checkById = useMemo(
    () => Object.fromEntries(readiness.checks.map((check) => [check.id, check])),
    [readiness.checks],
  );

  const stepBlockers = useMemo(() => {
    const groups = STEP_GROUPS[step] ?? [];
    return readiness.checks.filter(
      (check) => check.status === 'fail' && groups.includes(check.group),
    );
  }, [readiness.checks, step]);

  const invalid = (id) =>
    touched && checkById[id]?.status === 'fail' ? checkById[id] : null;

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pickService(nextService) {
    if (nextService.slug === serviceSlug) return;
    setServiceSlug(nextService.slug);
    setQuantity(String(nextService.minQuantity || 1));
    setOptions({});
    setOtherMode({});
    setSizes({});
  }

  function setOption(option, value) {
    if (value === '__other__') {
      setOtherMode((prev) => ({ ...prev, [option.key]: true }));
      setOptions((prev) => ({ ...prev, [option.key]: '' }));
      return;
    }
    setOtherMode((prev) => ({ ...prev, [option.key]: false }));
    setOptions((prev) => ({ ...prev, [option.key]: value }));
  }

  function setSize(size, value) {
    const clean = String(value).replace(/[^\d]/g, '').slice(0, 5);
    setSizes((prev) => ({ ...prev, [size]: clean }));
  }

  function bumpQuantity(delta) {
    const min = service?.minQuantity || 1;
    const next = Math.max(min, Math.min(9999, (Number(quantity) || 0) + delta));
    setQuantity(String(next));
  }

  async function addFiles(list) {
    setFileError(null);
    const incoming = Array.from(list ?? []);
    if (!incoming.length) return;

    if (service?.briefRequired) {
      setFileError('خدمة التصميم بتعتمد على البريف المكتوب مش على ملف جاهز.');
      return;
    }

    let accepted = [...files];

    for (const file of incoming) {
      if (accepted.length >= MAX_FILES) {
        setFileError(`الحد الأقصى ${MAX_FILES} ملفات لكل طلب.`);
        break;
      }

      const type = normalizeFileType(file);
      const problem = validateArtworkFile({ type, size: file.size });
      if (problem) {
        setFileError(`${file.name}: ${problem}`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`${file.name}: الحجم أكبر من ${formatSize(MAX_FILE_BYTES)}.`);
        continue;
      }

      try {
        const dataUrl = await readAsDataUrl(file);
        const comma = dataUrl.indexOf(',');
        if (comma < 0) throw new Error('صيغة الملف غير مدعومة.');

        accepted = [
          ...accepted,
          {
            id: `${Date.now()}-${file.name}-${accepted.length}`,
            name: file.name,
            type,
            size: file.size,
            data: dataUrl.slice(comma + 1),
            preview: type.startsWith('image/') ? dataUrl : null,
          },
        ];
      } catch (error) {
        setFileError(error.message);
      }
    }

    setFiles(accepted);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(id) {
    setFiles((prev) => prev.filter((file) => file.id !== id));
    setFileError(null);
  }

  async function copyValue(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      show(`${label} اتنسخ.`, 'ok');
    } catch {
      show('المتصفح مش سامح بالنسخ التلقائي. انسخ القيمة يدويًا.', 'warn');
    }
  }

  function goNext() {
    setTouched(true);
    if (stepBlockers.length) {
      show(stepBlockers[0].message, 'warn');
      return;
    }
    setTouched(false);
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
    scrollTop();
  }

  function goBack() {
    setTouched(false);
    setStep((current) => Math.max(0, current - 1));
    scrollTop();
  }

  async function submit(event) {
    event.preventDefault();
    setTouched(true);
    setSubmitError(null);

    if (!readiness.ready) {
      show(readiness.blockers[0]?.message ?? 'راجع بيانات الطلب الأول.', 'warn');
      setStep(4);
      scrollTop();
      return;
    }
    if (!consent) {
      show('لازم توافق على سياسة الخصوصية قبل الإرسال.', 'warn');
      return;
    }

    setSubmitting(true);

    try {
      const body = await api.post('/requests', {
        serviceSlug,
        quantity: Number(quantity),
        options,
        sizes: service?.requiresSizes
          ? sizeRows.filter((row) => Number(row.qty) > 0)
          : [],
        budget: budget || '',
        contact: {
          ...contact,
          area: contact.method === 'delivery' ? contact.area : '',
        },
        artwork: {
          files: files.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
            data: file.data,
          })),
          later: Boolean(later),
          notes,
        },
        consent: true,
      });

      setResult(body);
      show('تم إرسال الطلب. احفظ رقم المتابعة.', 'ok');
      scrollTop();
    } catch (error) {
      setSubmitError(
        error?.payload?.readiness?.blockers?.[0]?.message ?? error.message,
      );
      show('مش قادرين نرسل الطلب. راجع البيانات.', 'bad');
    } finally {
      setSubmitting(false);
    }
  }

  function startAnother() {
    setResult(null);
    setStep(0);
    setServiceSlug('');
    setQuantity('1');
    setOptions({});
    setOtherMode({});
    setSizes({});
    setFiles([]);
    setNotes('');
    setLater(false);
    setContact(EMPTY_CONTACT);
    setBudget('');
    setConsent(false);
    setTouched(false);
    scrollTop();
  }

  /* ------------------------------------------------------------- النجاح */
  if (result) {
    return (
      <main className="flow-page">
        <div className="container" ref={topRef}>
          <div className="success-card">
            <span className="success-card__mark">
              <Icon name="checkCircle" />
            </span>
            <h1>وصلنا طلبك</h1>
            <p>
              سجّلنا طلب <strong>{result.request?.serviceName}</strong> بنجاح. الطلب هيتراجع
              من فريق يوزرسيف قبل البدء في التنفيذ.
            </p>

            <div className="code-box">
              <div>
                <span>رقم الطلب</span>
                <strong>{result.ref}</strong>
                <button type="button" onClick={() => copyValue(result.ref, 'رقم الطلب')}>
                  نسخ رقم الطلب
                </button>
              </div>
            </div>

            <div className="success-note">
              <Icon name="shield" />
              <span>
                احفظ رقم الطلب فقط، تقدر تتابع طلبك منه مباشرةً من صفحة "تتبع طلبك".
              </span>
            </div>

            <div className="assistant-panel" style={{ marginTop: 22, textAlign: 'right' }}>
              <div className="assistant-panel__head">
                <span className="assistant-panel__title">
                  <Icon name="arrowLeft" />
                  إيه اللي هيحصل بعد كده؟
                </span>
              </div>
              <div className="assistant-panel__body">
                <div className="assistant-checks">
                  <div className="assistant-check is-pass">
                    <Icon name="checkCircle" />
                    <span>
                      <strong>١. وصلنا طلبك</strong> — تم استلامه وحفظه بنجاح.
                    </span>
                  </div>
                  <div className="assistant-check is-warn">
                    <Icon name="alert" />
                    <span>
                      <strong>٢. المراجعة</strong> — فريق يوزرسيف هيراجع التصميم والتفاصيل ويحدد متطلبات أو تأكيد.
                    </span>
                  </div>
                  <div className="assistant-check is-pass">
                    <Icon name="checkCircle" />
                    <span>
                      <strong>٣. المتابعة</strong> — تقدر تتابع الحالة من صفحة "تتبع طلبك" وترد لو طلب الفريق توضيح.
                    </span>
                  </div>
                </div>
                <p className="tiny-muted" style={{ marginTop: 12 }}>
                  الأسعار هتحدد بعد المراجعة، والتاريخ المطلوب طلب مش وعد بالتسليم.
                </p>
              </div>
            </div>

            <div className="success-actions">
              <button
                type="button"
                className="btn"
                onClick={() =>
                  navigate('/track', {
                    state: { ref: result.ref },
                  })
                }
              >
                تابع طلبك الآن
                <Icon name="arrowLeft" />
              </button>
              <Link to="/services" className="btn btn--ghost">
                كل الخدمات
              </Link>
              <button type="button" className="btn btn--ghost" onClick={startAnother}>
                طلب جديد
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------- المعالج */
  return (
    <main className="flow-page">
      <div className="container flow-shell" ref={topRef}>
        <aside className="flow-rail">
          <p className="flow-rail__title">خطوات الطلب</p>
          <div className="flow-steps">
            {STEPS.map((item, index) => (
              <div
                key={item.key}
                className={`flow-step${index === step ? ' is-active' : ''}${
                  index < step ? ' is-done' : ''
                }`}
              >
                <span className="flow-step__dot">
                  {index < step ? <Icon name="check" style={{ width: 12, height: 12 }} /> : index + 1}
                </span>
                <span className="flow-step__label">
                  {item.label}
                  <span className="flow-step__hint">{item.hint}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="flow-rail__help">
            عندك سؤال قبل الطلب؟{' '}
            <Link to="/track">تابع طلب قديم</Link> أو{' '}
            <Link to="/contact">كلّمنا على واتساب</Link>.
          </div>
        </aside>

        <div className="flow-panel">
          <div className="flow-progress" aria-hidden="true">
            {STEPS.map((item, index) => (
              <span
                key={item.key}
                className={index === step ? 'is-active' : index < step ? 'is-done' : undefined}
              />
            ))}
          </div>

          <form className="flow-card" onSubmit={submit} noValidate>
            <div className="flow-head">
              <div>
                <h1>{step === 4 ? 'راجع طلبك وابعته' : STEPS[step].label}</h1>
                <p>
                  {step === 0
                    ? 'اختار الخدمة اللي تناسب فكرتك. تقدر تبدأ من قطعة واحدة.'
                    : step === 1
                      ? 'حدد الكمية والخيارات. مجموع المقاسات لازم يساوي إجمالي الكمية.'
                      : step === 2
                        ? 'ارفع ملف التصميم الجاهز، أو اكتب البريف وسيب الباقي علينا.'
                        : step === 3
                          ? 'بياناتك بتستخدمها للتواصل وتأكيد الطلب فقط.'
                          : 'كل البيانات اللي فوق هتتبعت للفريق للمراجعة قبل التنفيذ.'}
                </p>
              </div>
              <span className="flow-head__count">
                خطوة {step + 1} من {STEPS.length}
              </span>
            </div>

            {step === 0 ? (
              <StepProduct
                services={services}
                loading={loading}
                selected={serviceSlug}
                onPick={pickService}
              />
            ) : null}

            {step === 1 && service ? (
              <StepDetails
                service={service}
                quantity={quantity}
                setQuantity={setQuantity}
                bumpQuantity={bumpQuantity}
                options={options}
                otherMode={otherMode}
                setOption={setOption}
                sizes={sizes}
                setSize={setSize}
                sizeRows={sizeRows}
                sizeTotal={sizeTotal}
                invalid={invalid}
                touched={touched}
              />
            ) : null}

            {step === 2 && service ? (
              <StepArtwork
                service={service}
                files={files}
                addFiles={addFiles}
                removeFile={removeFile}
                fileError={fileError}
                dragging={dragging}
                setDragging={setDragging}
                fileInputRef={fileInputRef}
                later={later}
                setLater={setLater}
                notes={notes}
                setNotes={setNotes}
                invalid={invalid}
              />
            ) : null}

            {step === 3 ? (
              <StepContact
                contact={contact}
                setContact={setContact}
                budget={budget}
                setBudget={setBudget}
                consent={consent}
                setConsent={setConsent}
                invalid={invalid}
                touched={touched}
              />
            ) : null}

            {step === 4 && service ? (
              <StepReview
                service={service}
                quantity={quantity}
                options={options}
                sizeRows={sizeRows}
                contact={contact}
                budget={budget}
                files={files}
                later={later}
                notes={notes}
                readiness={readiness}
                consent={consent}
                setConsent={setConsent}
                setStep={setStep}
                touched={touched}
              />
            ) : null}

            {stepBlockers.length && touched ? (
              <div className="notice notice--bad" style={{ marginTop: 20 }} role="alert">
                <Icon name="alert" />
                <div>
                  {stepBlockers.map((blocker) => (
                    <div key={blocker.id}>{blocker.message}</div>
                  ))}
                </div>
              </div>
            ) : null}

            {submitError ? (
              <div className="notice notice--bad" style={{ marginTop: 20 }} role="alert">
                <Icon name="alert" />
                <span>{submitError}</span>
              </div>
            ) : null}

            <div className="flow-actions">
              {step > 0 ? (
                <button type="button" className="btn btn--ghost" onClick={goBack}>
                  <Icon name="arrowRight" />
                  السابق
                </button>
              ) : (
                <span className="flow-actions__note">
                  الخطوة الأولى من {STEPS.length}
                </span>
              )}

              <div className="flow-actions__right">
                {step < STEPS.length - 1 ? (
                  <button type="button" className="btn" onClick={goNext}>
                    التالي
                    <Icon name="arrowLeft" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn"
                    disabled={submitting || !readiness.ready}
                    title={!readiness.ready ? 'فيه بيانات ناقصة في الطلب' : undefined}
                  >
                    {submitting ? 'بنرسل الطلب…' : 'إرسال الطلب'}
                    <Icon name="arrowLeft" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

/* ============================================================ الخطوة 1 */
function StepProduct({ services, loading, selected, onPick }) {
  if (loading && !services.length) return <Loading label="بنحمّل الخدمات…" />;

  if (!services.length) {
    return (
      <div className="notice notice--warn">
        <Icon name="alert" />
        <span>الكتالوج مش متاح حاليًا. جرّب تحدّث الصفحة أو تواصل معنا.</span>
      </div>
    );
  }

  return (
    <div className="pick-grid">
      {services.map((service) => (
        <button
          key={service.slug}
          type="button"
          className={`pick-card${selected === service.slug ? ' is-selected' : ''}`}
          onClick={() => onPick(service)}
          aria-pressed={selected === service.slug}
        >
          <span className={`pick-card__media${service.image ? '' : ' pick-card__media--brand'}`}>
            <img src={service.image || '/media/mark.png'} alt="" loading="lazy" />
          </span>
          <span className="pick-card__body">
            <span className="pick-card__name">{service.name}</span>
            <span className="pick-card__meta">
              {service.category} · الحد الأدنى {service.minQuantity} قطعة
            </span>
          </span>
          <span className="pick-card__check">
            <Icon name="check" style={{ width: 11, height: 11 }} />
          </span>
        </button>
      ))}
    </div>
  );
}

/* ============================================================ الخطوة 2 */
function StepDetails({
  service,
  quantity,
  setQuantity,
  bumpQuantity,
  options,
  otherMode,
  setOption,
  sizes,
  setSize,
  sizeRows,
  sizeTotal,
  invalid,
  touched,
}) {
  const target = Number(quantity) || 0;
  const diff = target - sizeTotal;
  const sizeState =
    target > 0 && sizeTotal === target
      ? ' is-ok'
      : sizeTotal > 0
        ? ' is-bad'
        : '';

  return (
    <>
      <div className="field">
        <label htmlFor="quantity">الكمية المطلوبة</label>
        <div className="qty-control">
          <button type="button" onClick={() => bumpQuantity(-1)} aria-label="تقليل الكمية">
            <Icon name="minus" />
          </button>
          <input
            id="quantity"
            type="text"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value.replace(/[^\d]/g, '').slice(0, 5))}
            onBlur={() => {
              if (!Number(quantity)) setQuantity(String(service.minQuantity || 1));
            }}
            aria-describedby="quantity-hint"
          />
          <button type="button" onClick={() => bumpQuantity(1)} aria-label="زيادة الكمية">
            <Icon name="plus" />
          </button>
        </div>
        <span className="field__hint" id="quantity-hint">
          أقل كمية لهذه الخدمة {service.minQuantity} قطعة.
          {Number(quantity) > 200 ? ' الكميات الكبيرة بنراجعها مع الفريق قبل التأكيد.' : ''}
        </span>
        {invalid('quantity') ? <span className="field__error">اكتب كمية صحيحة.</span> : null}
      </div>

      {service.options?.length ? (
        <div className="detail-options" style={{ marginTop: 20 }}>
          {service.options.map((option) => {
            const isOther = Boolean(otherMode[option.key]);
            const value = options[option.key] ?? '';
            const wide = option.type === 'text' || isOther;

            return (
              <div
                className={`field${wide || option.type === 'text' ? ' field--full' : ''}`}
                key={option.key}
              >
                <label htmlFor={`opt-${option.key}`}>
                  {option.label}
                  {option.required ? ' *' : ' (اختياري)'}
                </label>

                {option.type === 'select' ? (
                  <>
                    <select
                      id={`opt-${option.key}`}
                      className="select"
                      value={isOther ? '__other__' : value}
                      onChange={(event) => setOption(option, event.target.value)}
                    >
                      <option value="">اختار…</option>
                      {(option.choices ?? []).map((choice) => (
                        <option value={choice} key={choice}>
                          {choice}
                        </option>
                      ))}
                      {option.allowOther ? <option value="__other__">أخرى — اكتبها</option> : null}
                    </select>
                    {isOther ? (
                      <input
                        className="input"
                        type="text"
                        style={{ marginTop: 8 }}
                        value={value}
                        onChange={(event) => setOption(option, event.target.value)}
                        placeholder="اكتب الاختيار اللي يناسبك"
                        aria-label={`${option.label} — أخرى`}
                      />
                    ) : null}
                  </>
                ) : (
                  <input
                    id={`opt-${option.key}`}
                    className="input"
                    type="text"
                    value={value}
                    onChange={(event) => setOption(option, event.target.value)}
                    placeholder="اكتب التفاصيل"
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {invalid('options') && touched ? (
        <div className="notice notice--bad" style={{ marginTop: 14 }}>
          <Icon name="alert" />
          <span>{invalid('options').message}</span>
        </div>
      ) : null}

      {service.requiresSizes ? (
        <div className="size-block">
          <div className="size-block__head">
            <span className="size-block__title">توزيع المقاسات</span>
            <span className="tiny-muted">
              الإجمالي المطلوب: <strong>{target || 0}</strong> قطعة
            </span>
          </div>

          <div className="size-grid">
            {sizeRows.map((row) => (
              <label className="size-field" key={row.size}>
                <span>{row.size}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={row.qty}
                  onChange={(event) => setSize(row.size, event.target.value)}
                  aria-label={`كمية مقاس ${row.size}`}
                  placeholder="0"
                />
              </label>
            ))}
          </div>

          <div className={`size-summary${sizeState}`}>
            <Icon name={sizeState === ' is-ok' ? 'checkCircle' : 'alert'} />
            <span>
              مجموع المقاسات: {sizeTotal} قطعة
              {sizeState === ' is-ok'
                ? ' — مطابق للكمية.'
                : target > 0 && sizeTotal !== target
                  ? diff > 0
                    ? ` — ناقص ${diff} قطعة.`
                    : ` — زيادة ${Math.abs(diff)} قطعة.`
                  : ' — لسه مفيش توزيع.'}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ============================================================ الخطوة 3 */
function StepArtwork({
  service,
  files,
  addFiles,
  removeFile,
  fileError,
  dragging,
  setDragging,
  fileInputRef,
  later,
  setLater,
  notes,
  setNotes,
  invalid,
}) {
  const needsBrief = Boolean(service.briefRequired);

  return (
    <>
      {needsBrief ? (
        <>
          <div className="notice notice--warn" style={{ marginBottom: 16 }}>
            <Icon name="spark" />
            <span>
              خدمة التصميم بتعتمد على بريف مكتوب. اكتب فكرتك بالتفصيل وهنراجعها ونقترح
              الاتجاه المناسب.
            </span>
          </div>
          <div className="field">
            <label htmlFor="brief">بريف التصميم *</label>
            <textarea
              id="brief"
              className="textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="اكتب عن النشاط، الجمهور المستهدف، الستايل اللي بتحبه، والألوان أو العناصر اللي لازم تكون موجودة…"
              style={{ minHeight: 170 }}
            />
            <span className="field__hint">
              20 حرفًا على الأقل. كل تفصيلة بتساعدنا نطلع نتيجة أقرب لفكرتك من أول مرة.
            </span>
            {invalid('brief') ? (
              <span className="field__error">{invalid('brief')?.message}</span>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div
            className={`dropzone${dragging ? ' is-drag' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <span className="dropzone__icon">
              <Icon name="upload" />
            </span>
            <strong>اسحب ملف التصميم هنا أو اضغط للاختيار</strong>
            <span>
              PNG · JPG · WEBP · PDF · AI — حتى {MAX_FILES} ملفات، وبحد أقصى{' '}
              {formatSize(MAX_FILE_BYTES)} للملف
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf,.ai,image/png,image/jpeg,image/webp,application/pdf,application/postscript"
              multiple
              onChange={(event) => addFiles(event.target.files)}
              aria-label="ملفات التصميم"
            />
          </div>

          {fileError ? (
            <div className="notice notice--bad" style={{ marginTop: 12 }} role="alert">
              <Icon name="alert" />
              <span>{fileError}</span>
            </div>
          ) : null}

          {files.length ? (
            <div className="file-list">
              {files.map((file) => (
                <div className="file-row" key={file.id}>
                  <span className="file-row__thumb">
                    {file.preview ? (
                      <img src={file.preview} alt="" />
                    ) : (
                      <Icon name="file" />
                    )}
                  </span>
                  <span className="file-row__body">
                    <span className="file-row__name">{file.name}</span>
                    <span className="file-row__meta">
                      {file.type.split('/').pop().toUpperCase()} · {formatSize(file.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="file-row__remove"
                    onClick={() => removeFile(file.id)}
                    aria-label={`حذف ${file.name}`}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <label className="check" style={{ marginTop: 16 }}>
            <input
              type="checkbox"
              checked={later}
              onChange={(event) => setLater(event.target.checked)}
            />
            <span>
              هبعت التصميم لاحقًا — أعرف إن التنفيذ مش هيبدأ قبل وصول الملف.
            </span>
          </label>

          <div className="field" style={{ marginTop: 20 }}>
            <label htmlFor="artwork-notes">ملاحظات على التصميم (اختياري)</label>
            <textarea
              id="artwork-notes"
              className="textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="أي تفاصيل عن الألوان، مكان الطباعة، أو ملفات مرجعية بتحبها…"
            />
          </div>

          {invalid('artwork') || invalid('artwork-type') || invalid('artwork-count') ? (
            <div className="notice notice--bad" style={{ marginTop: 14 }}>
              <Icon name="alert" />
              <span>
                {invalid('artwork')?.message ||
                  invalid('artwork-type')?.message ||
                  invalid('artwork-count')?.message}
              </span>
            </div>
          ) : null}
        </>
      )}

      {!needsBrief && service.guidance?.length ? (
        <div className="upload-guidance">
          <strong>نصايح قبل رفع الملف:</strong>
          <ul style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            {service.guidance.map((line) => (
              <li key={line}>— {line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {needsBrief ? (
        <div className="upload-guidance">
          <strong>إيه اللي بنحتاجه في البريف؟</strong>
          <ul style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <li>— اسم النشاط أو المشروع، ومجال العمل.</li>
            <li>— الجمهور المستهدف، والانطباع اللي عايز توصله.</li>
            <li>— الستايل والألوان اللي بتحبها، وأي عناصر لازم تظهر.</li>
            <li>— أماكن الاستخدام: سوشيال، مطبوعات، لافتة، أو غيرها.</li>
          </ul>
        </div>
      ) : null}
    </>
  );
}

/* ============================================================ الخطوة 4 */
function StepContact({ contact, setContact, budget, setBudget, consent, setConsent, invalid }) {
  const update = (key, value) => setContact((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <div className="contact-grid">
        <div className="field">
          <label htmlFor="name">الاسم *</label>
          <input
            id="name"
            className={fieldClass(true, invalid('name'))}
            type="text"
            value={contact.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="اسمك الكامل"
            autoComplete="name"
          />
          {invalid('name') ? <span className="field__error">{invalid('name')?.message}</span> : null}
        </div>

        <div className="field">
          <label htmlFor="phone">رقم الموبايل *</label>
          <input
            id="phone"
            className={fieldClass(true, invalid('phone'))}
            type="tel"
            inputMode="tel"
            value={contact.phone}
            onChange={(event) => update('phone', event.target.value)}
            placeholder="01xxxxxxxxx"
            autoComplete="tel"
            dir="ltr"
            style={{ textAlign: 'left' }}
          />
          {invalid('phone') ? (
            <span className="field__error">{invalid('phone')?.message}</span>
          ) : (
            <span className="field__hint">رقم مصري 11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015.</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="altPhone">رقم بديل (اختياري)</label>
          <input
            id="altPhone"
            className="input"
            type="tel"
            inputMode="tel"
            value={contact.altPhone}
            onChange={(event) => update('altPhone', event.target.value)}
            placeholder="رقم تاني للتواصل"
            dir="ltr"
            style={{ textAlign: 'left' }}
          />
        </div>

        <div className="field">
          <label htmlFor="email">البريد الإلكتروني (اختياري)</label>
          <input
            id="email"
            className={fieldClass(true, invalid('email'))}
            type="email"
            value={contact.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            dir="ltr"
            style={{ textAlign: 'left' }}
          />
          {invalid('email') ? (
            <span className="field__error">{invalid('email')?.message}</span>
          ) : (
            <span className="field__hint">لو أضفته، بنبعت نسخة من عرض السعر عليه.</span>
          )}
        </div>

        <div className="field field--full">
          <span className="field-label">طريقة الاستلام *</span>
          <div className="radio-row">
            <label className="radio-card">
              <input
                type="radio"
                name="method"
                value="pickup"
                checked={contact.method === 'pickup'}
                onChange={() => update('method', 'pickup')}
              />
              <span>
                <strong>استلام من الفرع</strong>
                <span>من مقر يوزرسيف في أسوان بعد تأكيد الموعد.</span>
              </span>
            </label>
            <label className="radio-card">
              <input
                type="radio"
                name="method"
                value="delivery"
                checked={contact.method === 'delivery'}
                onChange={() => update('method', 'delivery')}
              />
              <span>
                <strong>توصيل</strong>
                <span>داخل أسوان بعد تأكيد التفاصيل. المناطق خارج أسوان تحتاج مراجعة.</span>
              </span>
            </label>
          </div>
        </div>

        <div className="field">
          <label htmlFor="city">المدينة</label>
          <input
            id="city"
            className="input"
            type="text"
            value={contact.city}
            onChange={(event) => update('city', event.target.value)}
            placeholder="أسوان"
          />
        </div>

        <div className="field">
          <label htmlFor="preferredDate">التاريخ المطلوب (اختياري)</label>
          <input
            id="preferredDate"
            className={fieldClass(true, invalid('date'))}
            type="date"
            value={contact.preferredDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => update('preferredDate', event.target.value)}
          />
          {invalid('date') ? <span className="field__error">{invalid('date')?.message}</span> : null}
        </div>

        {contact.method === 'delivery' ? (
          <div className="field field--full">
            <label htmlFor="area">منطقة / عنوان التوصيل *</label>
            <input
              id="area"
              className={fieldClass(true, invalid('area'))}
              type="text"
              value={contact.area}
              onChange={(event) => update('area', event.target.value)}
              placeholder="المنطقة، الشارع، وأقرب علامة مميزة"
            />
            {invalid('area') ? (
              <span className="field__error">{invalid('area')?.message}</span>
            ) : (
              <span className="field__hint">
                التوصيل متاح داخل أسوان بعد تأكيد التفاصيل مع الفريق.
              </span>
            )}
          </div>
        ) : null}

        <div className="field field--full">
          <label htmlFor="budget">ميزانية تقديرية (اختياري)</label>
          <input
            id="budget"
            className="input"
            type="text"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            placeholder="مثال: 2000 جنيه — أو سيبها فاضية"
          />
          <span className="field__hint">
            لو عندك سقف ميزانية، اكتبه وهنقترح الأنسب في حدود المتاح.
          </span>
        </div>

        <div className="field field--full">
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              أوافق على <Link to="/privacy" className="link-arrow">سياسة الخصوصية</Link> وعلى
              استخدام بياناتي للتواصل بخصوص الطلب. *
            </span>
          </label>
        </div>
      </div>
    </>
  );
}

/* ============================================================ الخطوة 5 */
function StepReview({
  service,
  quantity,
  options,
  sizeRows,
  contact,
  budget,
  files,
  later,
  notes,
  readiness,
  consent,
  setConsent,
  setStep,
}) {
  const usedSizes = sizeRows.filter((row) => Number(row.qty) > 0);
  const optionRows = (service.options ?? [])
    .filter((option) => options[option.key])
    .map((option) => ({ label: option.label, value: options[option.key] }));

  return (
    <>
      <div className="review-grid">
        <div>
          <div className="review-block">
            <div className="review-block__head">
              <span>المنتج والكمية</span>
              <button type="button" className="review-block__edit" onClick={() => setStep(0)}>
                تعديل
              </button>
            </div>
            <div className="review-block__body">
              <dl className="review-rows">
                <div className="review-row">
                  <dt>الخدمة</dt>
                  <dd>{service.name}</dd>
                </div>
                <div className="review-row">
                  <dt>الكمية</dt>
                  <dd>{quantity} قطعة</dd>
                </div>
                {optionRows.map((row) => (
                  <div className="review-row" key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
                {usedSizes.length ? (
                  <div className="review-row">
                    <dt>المقاسات</dt>
                    <dd>{usedSizes.map((row) => `${row.size}: ${row.qty}`).join(' · ')}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <div className="review-block">
            <div className="review-block__head">
              <span>التصميم</span>
              <button type="button" className="review-block__edit" onClick={() => setStep(2)}>
                تعديل
              </button>
            </div>
            <div className="review-block__body">
              {files.length ? (
                <ul className="review-files">
                  {files.map((file) => (
                    <li key={file.id}>
                      <Icon name="file" />
                      <span>
                        {file.name} — {formatSize(file.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tiny-muted">
                  {service.briefRequired
                    ? 'بريف التصميم مكتوب — الفريق هيراجعه ويقترح الاتجاه.'
                    : later
                      ? 'التصميم هيتبعت لاحقًا. التنفيذ مش هيبدأ قبل وصوله.'
                      : 'مفيش ملف مرفق.'}
                </p>
              )}
              {notes ? (
                <p className="tiny-muted" style={{ marginTop: 10, whiteSpace: 'pre-line' }}>
                  <strong>ملاحظات:</strong> {notes}
                </p>
              ) : null}
            </div>
          </div>

          <div className="review-block">
            <div className="review-block__head">
              <span>التواصل والاستلام</span>
              <button type="button" className="review-block__edit" onClick={() => setStep(3)}>
                تعديل
              </button>
            </div>
            <div className="review-block__body">
              <dl className="review-rows">
                <div className="review-row">
                  <dt>الاسم</dt>
                  <dd>{contact.name || '—'}</dd>
                </div>
                <div className="review-row">
                  <dt>الموبايل</dt>
                  <dd className="mono">{contact.phone || '—'}</dd>
                </div>
                {contact.email ? (
                  <div className="review-row">
                    <dt>البريد</dt>
                    <dd>{contact.email}</dd>
                  </div>
                ) : null}
                <div className="review-row">
                  <dt>الطريقة</dt>
                  <dd>{contact.method === 'delivery' ? 'توصيل' : 'استلام من الفرع'}</dd>
                </div>
                <div className="review-row">
                  <dt>المدينة</dt>
                  <dd>{contact.city || 'أسوان'}</dd>
                </div>
                {contact.method === 'delivery' ? (
                  <div className="review-row">
                    <dt>العنوان</dt>
                    <dd>{contact.area || '—'}</dd>
                  </div>
                ) : null}
                {contact.preferredDate ? (
                  <div className="review-row">
                    <dt>التاريخ المطلوب</dt>
                    <dd>{contact.preferredDate}</dd>
                  </div>
                ) : null}
                {budget ? (
                  <div className="review-row">
                    <dt>الميزانية</dt>
                    <dd>{budget}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <label className="check" style={{ marginTop: 6 }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              أوافق على <Link to="/privacy" className="link-arrow">سياسة الخصوصية</Link> وعلى
              مراجعة الطلب والتواصل بخصوصه.
            </span>
          </label>
        </div>

        <aside className="assistant-panel">
          <div className="assistant-panel__head">
            <span className="assistant-panel__title">
              <Icon name="spark" />
              مساعد الجاهزية
            </span>
            <span className="assistant-panel__score">{readiness.score}%</span>
          </div>

          <div className="assistant-panel__body">
            <div className={`assistant-status ${readiness.ready ? 'is-ready' : 'is-blocked'}`}>
              <Icon name={readiness.ready ? 'checkCircle' : 'alert'} />
              <span>{readiness.summary}</span>
            </div>

            <div className="assistant-checks">
              {readiness.checks.map((check) => (
                <div className={`assistant-check is-${check.status}`} key={check.id}>
                  <Icon
                    name={
                      check.status === 'pass'
                        ? 'checkCircle'
                        : check.status === 'warn'
                          ? 'alert'
                          : 'alert'
                    }
                  />
                  <span>
                    <strong>{check.label}:</strong> {check.message || 'تمام'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="assistant-panel__foot">
            الفحص ده مساعد بس — الفريق بيراجع الطلب فنيًا قبل التنفيذ، وأي تعديل
            هيتم التواصل بخصوصه.
          </div>
        </aside>
      </div>

      {!readiness.ready ? (
        <div className="notice notice--bad" style={{ marginTop: 18 }}>
          <Icon name="alert" />
          <span>
            فيه {readiness.blockers.length} نقطة محتاجة تعديل قبل الإرسال. استخدم أزرار
            «تعديل» فوق.
          </span>
        </div>
      ) : null}

      {!consent ? (
        <p className="tiny-muted" style={{ marginTop: 12 }}>
          فعّل الموافقة على سياسة الخصوصية عشان تقدر ترسل الطلب.
        </p>
      ) : null}
    </>
  );
}
