import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ErrorBlock, Loading, StatusPill } from '../components/Common.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { formatDate, formatDateTime, formatNumber, telHref, waHref } from '../lib/format.js';
import { STATUSES, statusLabel } from '../../shared/status.js';
import { SERVICES } from '../../shared/services.js';

function sizeText(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminRequestDetailPage() {
  const { id } = useParams();
  const { show } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('submitted');
  const [decisionNote, setDecisionNote] = useState('');
  const [message, setMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const [noteText, setNoteText] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('public');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState(null);

  function load() {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get(`/admin/requests/${id}`)
      .then((body) => {
        if (!alive) return;
        setData(body);
        setStatus(body.request?.status ?? 'submitted');
        setDecisionNote(body.request?.decisionNote ?? '');
        setInternalNote(body.request?.internalNote ?? '');
      })
      .catch((caught) => {
        if (alive) setError(caught.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }

  useEffect(load, [id]);

  async function saveDecision(overrideStatus) {
    if (!data?.request) return;
    const nextStatus = overrideStatus ?? status;
    setFormError(null);

    if (
      (nextStatus === 'rejected' || nextStatus === 'needs_info') &&
      nextStatus !== data.request.status &&
      !decisionNote.trim() &&
      !message.trim()
    ) {
      setFormError('اكتب سبب الرفض أو المعلومات المطلوبة قبل تغيير الحالة.');
      return;
    }

    setBusy(true);

    try {
      const body = await api.patch(`/admin/requests/${data.request.id}`, {
        status: nextStatus,
        decisionNote,
        message,
        internalNote,
        notifyCustomer: notify,
      });
      setData((current) => ({
        ...current,
        request: body.request ?? current.request,
        timeline: body.timeline ?? current.timeline,
      }));
      setStatus(body.request?.status ?? nextStatus);
      setDecisionNote(body.request?.decisionNote ?? decisionNote);
      setInternalNote(body.request?.internalNote ?? internalNote);
      setMessage('');
      show('تم تحديث الطلب.', 'ok');
    } catch (caught) {
      setFormError(caught.message);
      show('مش قادرين نحدّث الطلب.', 'bad');
    } finally {
      setBusy(false);
    }
  }

  async function addNote(event) {
    event.preventDefault();
    if (!data?.request) return;
    setNoteError(null);

    if (noteText.trim().length < 2) {
      setNoteError('اكتب نص الملاحظة.');
      return;
    }

    setNoteBusy(true);
    try {
      const body = await api.post(`/admin/requests/${data.request.id}/notes`, {
        message: noteText.trim(),
        visibility: noteVisibility,
      });
      setData((current) => ({ ...current, timeline: body.timeline ?? current.timeline }));
      setNoteText('');
      show(noteVisibility === 'internal' ? 'تمت إضافة ملاحظة داخلية.' : 'تمت إضافة ملاحظة للعميل.', 'ok');
    } catch (caught) {
      setNoteError(caught.message);
    } finally {
      setNoteBusy(false);
    }
  }

  if (loading) {
    return <Loading label="بنحمّل الطلب…" />;
  }

  if (error || !data?.request) {
    return (
      <>
        <Link to="/admin/requests" className="admin-back">
          <Icon name="arrowRight" />
          رجوع للطلبات
        </Link>
        <ErrorBlock message={error ?? 'الطلب غير موجود.'} onRetry={load} />
      </>
    );
  }

  const request = data.request;
  const timeline = data.timeline ?? [];
  const attachments = data.attachments ?? [];
  const catalog = SERVICES.find((service) => service.slug === request.serviceSlug);
  const optionRows = Object.entries(request.options ?? {});
  const sizes = Array.isArray(request.sizes) ? request.sizes : [];
  const readiness = request.readiness ?? {};

  const whatsapp = waHref(
    request.phone,
    `مرحبًا ${request.customerName}، بخصوص طلبك ${request.ref} (${request.serviceName}).`,
  );
  const phone = telHref(request.phone);

  return (
    <>
      <Link to="/admin/requests" className="admin-back">
        <Icon name="arrowRight" />
        رجوع للطلبات
      </Link>

      <div className="admin-page-head">
        <div>
          <div className="inline" style={{ gap: 8 }}>
            <span className="admin-ref">{request.ref}</span>
            <StatusPill status={request.status} />
            {request.isDemo ? <span className="badge badge--demo">نموذج</span> : null}
          </div>
          <h1 style={{ marginTop: 6 }}>{request.serviceName}</h1>
          <p>
            {request.customerName} · {formatNumber(request.quantity)} قطعة ·{' '}
            {formatDateTime(request.createdAt)}
          </p>
        </div>

        <div className="admin-page-head__actions">
          {whatsapp ? (
            <a className="btn btn--sm" href={whatsapp} target="_blank" rel="noreferrer">
              <Icon name="whatsapp" />
              واتساب
            </a>
          ) : null}
          {phone ? (
            <a className="btn btn--ghost btn--sm" href={phone} dir="ltr">
              <Icon name="phone" />
              اتصال
            </a>
          ) : null}
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-col">
          <div className="admin-panel">
            <div className="admin-panel__head">
              <h2>بيانات الطلب</h2>
              {request.status === 'needs_info' || request.status === 'rejected' ? (
                <span className="badge badge--warn">بانتظار رد العميل</span>
              ) : null}
            </div>
            <div className="admin-panel__body">
              <dl className="spec-list">
                <div className="spec-row">
                  <dt>الخدمة</dt>
                  <dd>{request.serviceName}</dd>
                </div>
                <div className="spec-row">
                  <dt>الكمية</dt>
                  <dd>{formatNumber(request.quantity)} قطعة</dd>
                </div>
                <div className="spec-row">
                  <dt>طريقة الاستلام</dt>
                  <dd>{request.method === 'delivery' ? 'توصيل' : 'استلام من الفرع'}</dd>
                </div>
                <div className="spec-row">
                  <dt>المدينة</dt>
                  <dd>{request.city || '—'}</dd>
                </div>
                {request.method === 'delivery' ? (
                  <div className="spec-row">
                    <dt>العنوان</dt>
                    <dd>{request.area || '—'}</dd>
                  </div>
                ) : null}
                <div className="spec-row">
                  <dt>التاريخ المطلوب</dt>
                  <dd>{request.preferredDate ? formatDate(request.preferredDate) : 'غير محدد'}</dd>
                </div>
                <div className="spec-row">
                  <dt>الميزانية</dt>
                  <dd>{request.budget || 'غير محددة'}</dd>
                </div>
                <div className="spec-row">
                  <dt>الموبايل</dt>
                  <dd className="mono">{request.phone}</dd>
                </div>
                {request.altPhone ? (
                  <div className="spec-row">
                    <dt>رقم بديل</dt>
                    <dd className="mono">{request.altPhone}</dd>
                  </div>
                ) : null}
                {request.email ? (
                  <div className="spec-row">
                    <dt>البريد</dt>
                    <dd>{request.email}</dd>
                  </div>
                ) : null}
                <div className="spec-row">
                  <dt>آخر تحديث</dt>
                  <dd>{formatDateTime(request.updatedAt)}</dd>
                </div>
              </dl>

              {optionRows.length ? (
                <>
                  <h3 style={{ fontSize: 13, margin: '20px 0 8px' }}>الخيارات</h3>
                  <dl className="spec-list">
                    {optionRows.map(([key, value]) => {
                      const label =
                        catalog?.options?.find((option) => option.key === key)?.label ?? key;
                      return (
                        <div className="spec-row" key={key}>
                          <dt>{label}</dt>
                          <dd>{String(value) || '—'}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </>
              ) : null}

              {sizes.length ? (
                <>
                  <h3 style={{ fontSize: 13, margin: '20px 0 8px' }}>توزيع المقاسات</h3>
                  <table className="size-table">
                    <thead>
                      <tr>
                        <th>المقاس</th>
                        <th>الكمية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizes.map((row) => (
                        <tr key={row.size}>
                          <td>{row.size}</td>
                          <td>{formatNumber(row.qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>الإجمالي</td>
                        <td>
                          {formatNumber(
                            sizes.reduce((sum, row) => sum + (Number(row.qty) || 0), 0),
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              ) : null}

              {request.artworkNotes ? (
                <>
                  <h3 style={{ fontSize: 13, margin: '20px 0 8px' }}>ملاحظات التصميم</h3>
                  <p className="tiny-muted" style={{ whiteSpace: 'pre-line', fontSize: 12.5 }}>
                    {request.artworkNotes}
                  </p>
                </>
              ) : null}

              {request.artworkLater ? (
                <div className="notice notice--warn" style={{ marginTop: 16 }}>
                  <Icon name="clock" />
                  <span>العميل اختار إرسال التصميم لاحقًا — التنفيذ مش هيبدأ قبل وصوله.</span>
                </div>
              ) : null}
            </div>
          </div>

          {readiness.checks?.length ? (
            <div className="admin-panel">
              <div className="admin-panel__head">
                <h2>فحص الجاهزية</h2>
                <span className="tiny-muted">
                  {readiness.score ?? 0}% · {readiness.summary ?? ''}
                </span>
              </div>
              <div className="admin-panel__body">
                <div className="assistant-checks">
                  {readiness.checks.map((check) => (
                    <div className={`assistant-check is-${check.status}`} key={check.id}>
                      <Icon name={check.status === 'pass' ? 'checkCircle' : 'alert'} />
                      <span>
                        <strong>{check.label}:</strong> {check.message || 'تمام'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="admin-panel">
            <div className="admin-panel__head">
              <h2>ملفات التصميم</h2>
              <span className="tiny-muted">{attachments.length} ملف</span>
            </div>
            <div className="admin-panel__body">
              {attachments.length ? (
                <div className="attachment-grid">
                  {attachments.map((attachment) => {
                    const href = `/api/admin/attachments/${attachment.id}`;
                    const isImage = String(attachment.mime).startsWith('image/');
                    return (
                      <div className="attachment-card" key={attachment.id}>
                        <a
                          className="attachment-card__preview"
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          title={attachment.name}
                        >
                          {isImage ? (
                            <img src={href} alt={attachment.name} loading="lazy" />
                          ) : (
                            <Icon name="file" />
                          )}
                        </a>
                        <div className="attachment-card__meta">
                          <strong title={attachment.name}>{attachment.name}</strong>
                          <span>
                            {sizeText(attachment.size)} ·{' '}
                            <a href={href} target="_blank" rel="noreferrer">
                              فتح
                            </a>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="tiny-muted">مفيش ملفات مرفقة بالطلب.</p>
              )}
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel__head">
              <h2>سجل الطلب</h2>
              <span className="tiny-muted">{timeline.length} تحديث</span>
            </div>
            <div className="admin-panel__body">
              <div className="admin-timeline">
                {[...timeline].reverse().map((event) => (
                  <div
                    className={`admin-timeline__item${
                      event.visibility === 'internal' ? ' is-internal' : ''
                    }`}
                    key={event.id}
                  >
                    <div className="admin-timeline__date">{formatDateTime(event.createdAt)}</div>
                    <div className="admin-timeline__text">{event.message}</div>
                    <div className="admin-timeline__meta">
                      <span>{event.actor === 'admin' ? 'الفريق' : event.actor === 'customer' ? 'العميل' : 'النظام'}</span>
                      {event.status ? <span>· {statusLabel(event.status)}</span> : null}
                      {event.visibility === 'internal' ? (
                        <span className="badge badge--warn">داخلي</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="detail-col">
          <div className="admin-panel">
            <div className="admin-panel__head">
              <h2>تحديث الحالة</h2>
              <StatusPill status={request.status} />
            </div>
            <div className="admin-panel__body">
              <form
                className="decision-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveDecision();
                }}
              >
                <div className="field">
                  <label htmlFor="decision-status">الحالة الجديدة</label>
                  <select
                    id="decision-status"
                    className="select"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {STATUSES.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="decision-note">رسالة القرار (بتظهر للعميل)</label>
                  <textarea
                    id="decision-note"
                    className="textarea"
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="مطلوبة عند الرفض أو طلب معلومات إضافية…"
                  />
                </div>

                <div className="field">
                  <label htmlFor="decision-message">تحديث إضافي في السجل (اختياري)</label>
                  <textarea
                    id="decision-message"
                    className="textarea"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="رسالة توضيحية للعميل…"
                  />
                </div>

                <div className="field">
                  <label htmlFor="internal-note">ملاحظة داخلية (لا تظهر للعميل)</label>
                  <textarea
                    id="internal-note"
                    className="textarea"
                    value={internalNote}
                    onChange={(event) => setInternalNote(event.target.value)}
                    placeholder="ملاحظات للفريق فقط…"
                  />
                </div>

                <label className="check">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(event) => setNotify(event.target.checked)}
                  />
                  <span>إظهار الرسالة في سجل العميل</span>
                </label>

                <div className="quick-actions">
                  {['under_review', 'approved', 'in_production', 'ready', 'delivered'].map(
                    (key) => (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        key={key}
                        onClick={() => setStatus(key)}
                      >
                        {statusLabel(key)}
                      </button>
                    ),
                  )}
                </div>

                <p className="decision-hint">
                  الاختيار السريع بيملى الحالة فقط — راجع الرسالة ثم اضغط «تحديث
                  الطلب». تغيير الحالة لرفض أو طلب معلومات لازم يكون معه سبب.
                </p>

                {formError ? (
                  <div className="notice notice--bad">
                    <Icon name="alert" />
                    <span>{formError}</span>
                  </div>
                ) : null}

                <button type="submit" className="btn btn--block" disabled={busy}>
                  {busy ? 'بنحدّث…' : 'تحديث الطلب'}
                  <Icon name="check" />
                </button>
              </form>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel__head">
              <h2>بيانات العميل</h2>
            </div>
            <div className="admin-panel__body">
              <dl className="spec-list">
                <div className="spec-row">
                  <dt>الاسم</dt>
                  <dd>{request.customerName}</dd>
                </div>
                <div className="spec-row">
                  <dt>الموبايل</dt>
                  <dd className="mono">{request.phone}</dd>
                </div>
                <div className="spec-row">
                  <dt>المدينة</dt>
                  <dd>{request.city || '—'}</dd>
                </div>
                <div className="spec-row">
                  <dt>الاستلام</dt>
                  <dd>{request.method === 'delivery' ? 'توصيل' : 'من الفرع'}</dd>
                </div>
              </dl>

              <div className="btn-row" style={{ marginTop: 14 }}>
                {whatsapp ? (
                  <a className="btn btn--sm" href={whatsapp} target="_blank" rel="noreferrer">
                    <Icon name="whatsapp" />
                    واتساب
                  </a>
                ) : null}
                {phone ? (
                  <a className="btn btn--ghost btn--sm" href={phone}>
                    <Icon name="phone" />
                    اتصال
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel__head">
              <h2>إضافة ملاحظة</h2>
            </div>
            <div className="admin-panel__body">
              <form className="decision-form" onSubmit={addNote}>
                <div className="field">
                  <label htmlFor="note-visibility">ظهور الملاحظة</label>
                  <select
                    id="note-visibility"
                    className="select"
                    value={noteVisibility}
                    onChange={(event) => setNoteVisibility(event.target.value)}
                  >
                    <option value="public">تظهر للعميل</option>
                    <option value="internal">داخلية فقط</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="note-text">الملاحظة</label>
                  <textarea
                    id="note-text"
                    className="textarea"
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="اكتب الملاحظة…"
                  />
                </div>

                {noteError ? (
                  <div className="notice notice--bad">
                    <Icon name="alert" />
                    <span>{noteError}</span>
                  </div>
                ) : null}

                <button type="submit" className="btn btn--ghost btn--block" disabled={noteBusy}>
                  {noteBusy ? 'بنضيف…' : 'إضافة الملاحظة'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
