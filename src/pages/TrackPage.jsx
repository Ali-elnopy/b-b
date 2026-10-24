import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { PageHead, StatusPill } from '../components/Common.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { formatDate, formatDateTime, formatNumber } from '../lib/format.js';
import { customerStepIndex } from '../../shared/status.js';

const FLOW_STEPS = [
  { key: 'submitted', label: 'تم الإرسال' },
  { key: 'under_review', label: 'قيد المراجعة' },
  { key: 'approved', label: 'تمت المراجعة' },
  { key: 'in_production', label: 'التنفيذ' },
  { key: 'ready', label: 'جاهز للتسليم' },
  { key: 'delivered', label: 'تم التسليم' },
];

const ACTOR_LABEL = {
  customer: 'أنت',
  admin: 'فريق يوزرسيف',
  system: 'النظام',
};

function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TrackPage() {
  const { show } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [ref, setRef] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reply, setReply] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const autoRan = useRef(false);

  async function lookup(event, overrides) {
    event?.preventDefault();
    const nextRef = String(overrides?.ref ?? ref).trim().toUpperCase();

    if (!nextRef) {
      setError('اكتب رقم الطلب.');
      return;
    }

    setLoading(true);
    setError(null);
    setReplyError(null);

    try {
      const body = await api.post('/track', { ref: nextRef });
      setRef(nextRef);
      setResult(body);
      setReply('');
    } catch (caught) {
      setResult(null);
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoRan.current) return;
    const state = location.state;
    if (!state?.ref) return;
    autoRan.current = true;
    lookup(null, { ref: state.ref });
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  async function sendReply(event) {
    event.preventDefault();
    if (!result) return;
    if (reply.trim().length < 5) {
      setReplyError('اكتب رسالة أوضح (5 حروف على الأقل).');
      return;
    }

    setReplyBusy(true);
    setReplyError(null);

    try {
      const body = await api.post(
        `/track/${encodeURIComponent(result.request.ref)}/reply`,
        { message: reply.trim() },
      );
      setResult((current) => ({
        ...current,
        request: body.request ?? current.request,
        timeline: body.timeline ?? current.timeline,
      }));
      setReply('');
      show('تم إرسال رسالتك للفريق.', 'ok');
    } catch (caught) {
      setReplyError(caught.message);
    } finally {
      setReplyBusy(false);
    }
  }

  const request = result?.request;
  const attachments = result?.attachments ?? [];
  const timeline = result?.timeline ?? [];
  const currentStep = request ? customerStepIndex(request.status) : -1;

  return (
    <>
      <PageHead
        eyebrow="متابعة"
        title="تتبع طلبك"
        lead="اكتب رقم الطلب فقط عشان تشوف حالة طلبك وسجل التحديثات."
        crumbs={[{ label: 'تتبع طلبك' }]}
      />

      <section className="page-body">
        <div className="container track-shell">
          <form className="track-card" onSubmit={lookup}>
            <div className="track-form" style={{ gridTemplateColumns: '1fr auto' }}>
              <div className="field">
                <label htmlFor="track-ref">رقم الطلب</label>
                <input
                  id="track-ref"
                  className="input mono"
                  type="text"
                  value={ref}
                  onChange={(event) => setRef(event.target.value)}
                  placeholder="YZ-2026-0001"
                  autoComplete="off"
                  style={{ textAlign: 'left' }}
                />
              </div>

              <button type="submit" className="btn" disabled={loading} style={{ alignSelf: 'end' }}>
                {loading ? 'بنراجع…' : 'اعرض الطلب'}
                <Icon name="search" />
              </button>
            </div>

            {error ? <div className="track-error">{error}</div> : null}

            <p className="tiny-muted" style={{ marginTop: 14 }}>
              تقدر تتابع طلبك برقم الطلب فقط.
            </p>
          </form>

          {request ? (
            <div className="track-result">
              <div className="track-card" style={{ marginTop: 22 }}>
                <div className="track-summary">
                  <div>
                    <div className="track-ref">{request.ref}</div>
                    <h2>{request.serviceName}</h2>
                    <p>
                      {formatNumber(request.quantity)} قطعة · آخر تحديث{' '}
                      {formatDateTime(request.updatedAt)}
                    </p>
                  </div>
                  <StatusPill status={request.status} />
                </div>

                <div className="stepper" aria-label="مراحل الطلب">
                  {FLOW_STEPS.map((item, index) => (
                    <div
                      key={item.key}
                      className={`stepper__item${index < currentStep ? ' is-done' : ''}${
                        index === currentStep ? ' is-active' : ''
                      }`}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>

                <div className="assistant-panel" style={{ marginTop: 18, textAlign: 'right' }}>
                  <div className="assistant-panel__head">
                    <span className="assistant-panel__title">
                      <Icon name="arrowLeft" />
                      الخطوة الجاية
                    </span>
                  </div>
                  <div className="assistant-panel__body">
                    {request.status === 'submitted' ? (
                      <p>وصلنا طلبك وهنبدأ مراجعته قريبًا. مفيش حاجة مطلوبه منك دلوقتي، فقط استنى تحديثاتنا هنا.</p>
                    ) : request.status === 'under_review' ? (
                      <p>الفريق بيراجع التصميم والتفاصيل دلوقتي. لو احتاج حاجة هيوضحها لك هنا أو يطلب ملف/معلومات.</p>
                    ) : request.status === 'needs_info' ? (
                      <p>
                        <strong>مطلوب منك:</strong> رد على الفريق بالرد أو الملف المطلوب في خانة "عندك استفسار أو رد للفريق؟" أسفل الصفحة عشان يرجع الطلب للمراجعة تاني.
                      </p>
                    ) : request.status === 'approved' ? (
                      <p>
                        <strong>تم قبول الطلب للمراجعة فقط، مش تأكيد للسعر أو الدفع.</strong> هنتواصل معاك قريبًا لتأكيد السعر، طريقة الدفع، وموعد الاستلام/التوصيل قبل البدء في التنفيذ.
                      </p>
                    ) : request.status === 'in_production' ? (
                      <p>طلبك داخل مرحلة التنفيذ دلوقتي. هنبلغك أول ما يقترب من الجاهزية.</p>
                    ) : request.status === 'ready' ? (
                      <p>طلبك جاهز. راجع طريقة الاستلام اللي حددتها معاك أو اتصل بنا لتأكيد ميعاد الاستلام.</p>
                    ) : request.status === 'delivered' ? (
                      <p>تم تسليم الطلب. لو في أي استفسار، تقدر تتواصل معنا على واتساب.</p>
                    ) : request.status === 'rejected' ? (
                      <p>
                        اترفض الطلب حسب السبب الموضح. تقدر <Link to="/request" style={{ color: 'var(--teal)', fontWeight: 700 }}>تبدأ طلب جديد</Link> بعد تعديل التصميم/التفاصيل، أو{' '}
                        <Link to="/contact" style={{ color: 'var(--teal)', fontWeight: 700 }}>تتواصل معنا على واتساب</Link> لو عندك استفسار.
                      </p>
                    ) : request.status === 'closed' ? (
                      <p>تم إغلاق الطلب. لو عندك استفسار تقدر تتواصل معنا.</p>
                    ) : (
                      <p>تابع التحديثات في سجل الطلب أسفل الصفحة.</p>
                    )}
                  </div>
                </div>

                {request.decisionNote ? (
                  <div className="track-decision">
                    <strong>رسالة الفريق</strong>
                    <p style={{ whiteSpace: 'pre-line' }}>{request.decisionNote}</p>
                  </div>
                ) : request.status === 'needs_info' ? (
                  <div className="track-decision">
                    <strong>محتاجين توضيح</strong>
                    <p>
                      فيه معلومات ناقصة في الطلب. اكتب ردك في خانة الرسائل تحت، والفريق
                      هيراجع تاني.
                    </p>
                  </div>
                ) : null}

                <div className="track-grid">
                  <div className="track-section">
                    <h3>سجل الطلب</h3>
                    {timeline.length ? (
                      <div className="timeline">
                        {[...timeline].reverse().map((event) => (
                          <div className="timeline__item" key={event.id}>
                            <div className="timeline__date">{formatDateTime(event.createdAt)}</div>
                            <div className="timeline__text">{event.message}</div>
                            <div className="timeline__actor">
                              {ACTOR_LABEL[event.actor] ?? event.actor}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="tiny-muted">مفيش تحديثات مسجلة بعد.</p>
                    )}
                  </div>

                  <div className="track-section">
                    <h3>تفاصيل الطلب</h3>
                    <dl className="track-meta">
                      <div className="track-meta__row">
                        <dt>الخدمة</dt>
                        <dd>{request.serviceName}</dd>
                      </div>
                      <div className="track-meta__row">
                        <dt>الكمية</dt>
                        <dd>{formatNumber(request.quantity)} قطعة</dd>
                      </div>
                      <div className="track-meta__row">
                        <dt>الاستلام</dt>
                        <dd>{request.method === 'delivery' ? 'توصيل' : 'من الفرع'}</dd>
                      </div>
                      {request.method === 'delivery' ? (
                        <div className="track-meta__row">
                          <dt>العنوان</dt>
                          <dd>{[request.area, request.city].filter(Boolean).join(' — ') || '—'}</dd>
                        </div>
                      ) : (
                        <div className="track-meta__row">
                          <dt>المدينة</dt>
                          <dd>{request.city || 'أسوان'}</dd>
                        </div>
                      )}
                      {request.preferredDate ? (
                        <div className="track-meta__row">
                          <dt>التاريخ المطلوب</dt>
                          <dd>{formatDate(request.preferredDate)}</dd>
                        </div>
                      ) : null}
                      <div className="track-meta__row">
                        <dt>تاريخ الإرسال</dt>
                        <dd>{formatDate(request.createdAt)}</dd>
                      </div>
                    </dl>

                    {attachments.length ? (
                      <>
                        <h3 style={{ marginTop: 22 }}>ملفات التصميم</h3>
                        <div className="track-attachments">
                          {attachments.map((attachment) => (
                            <div className="track-attachment" key={attachment.id}>
                              <Icon name="file" />
                              <span>
                                {attachment.name}
                                <span className="tiny-muted" style={{ display: 'block' }}>
                                  {formatFileSize(attachment.size)}
                                </span>
                              </span>
                              <a
                                href={`/api/track/${encodeURIComponent(request.ref)}/attachments/${attachment.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                فتح
                              </a>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}

                    <div className="reply-box">
                      <h4>عندك استفسار أو رد للفريق؟</h4>
                      <form onSubmit={sendReply}>
                        <textarea
                          className="textarea"
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          placeholder="اكتب رسالتك هنا…"
                          maxLength={2000}
                        />
                        {replyError ? (
                          <p className="field__error" style={{ marginTop: 6 }}>
                            {replyError}
                          </p>
                        ) : null}
                        <div className="reply-row">
                          <button type="submit" className="btn btn--sm" disabled={replyBusy}>
                            {replyBusy ? 'بنرسل…' : 'إرسال الرسالة'}
                            <Icon name="arrowLeft" />
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {!request && !loading ? (
            <div className="demo-note" style={{ marginTop: 22 }}>
              <Icon name="info" />
              <div>
                <strong>مش لاقي رقم الطلب؟</strong> رقم الطلب بيظهر بعد إرسال الطلب
                مباشرةً. لو فقدته، تواصل معنا باسمك ورقم الموبايل وهنساعدك.
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
