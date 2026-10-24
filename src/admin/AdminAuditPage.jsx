import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ErrorBlock, Loading } from '../components/Common.jsx';
import { api } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { statusLabel } from '../../shared/status.js';

const TYPE_LABEL = {
  submitted: 'إرسال',
  status: 'حالة',
  note: 'ملاحظة',
  customer_reply: 'رد عميل',
  decision: 'قرار',
};

export default function AdminAuditPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  function load() {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get('/admin/audit')
      .then((body) => {
        if (alive) setEvents(Array.isArray(body?.events) ? body.events : []);
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

  useEffect(load, []);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) =>
      [event.ref, event.message, event.actor, event.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [events, q]);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>سجل النشاط</h1>
          <p>آخر 100 تحديث على الطلبات — بما فيها الملاحظات الداخلية.</p>
        </div>
        <div className="admin-page-head__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={load}>
            تحديث
            <Icon name="activity" />
          </button>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <input
            className="input"
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="ابحث في السجل…"
            aria-label="بحث في السجل"
          />
          <span className="admin-toolbar__spacer" />
          <span className="tiny-muted">{visible.length} تحديث</span>
        </div>

        {loading ? <Loading label="بنحمّل السجل…" /> : null}
        {error ? <ErrorBlock message={error} onRetry={load} /> : null}

        {!loading && !error && visible.length ? (
          <div className="admin-panel__body">
            <div className="admin-audit">
              {visible.map((event) => (
                <div className="admin-audit__row" key={event.id}>
                  <span className="tiny-muted">{formatDateTime(event.created_at)}</span>
                  <span>
                    {event.message}
                    <span className="admin-timeline__meta">
                      <Link to={`/admin/requests/${event.request_id}`} className="mono">
                        {event.ref}
                      </Link>
                      <span>· {TYPE_LABEL[event.type] ?? event.type}</span>
                      {event.status ? <span>· {statusLabel(event.status)}</span> : null}
                      {event.visibility === 'internal' ? (
                        <span className="badge badge--warn">داخلي</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="tiny-muted">
                    {event.actor === 'admin' ? 'الفريق' : event.actor === 'customer' ? 'العميل' : 'النظام'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && !error && !visible.length ? (
          <div className="admin-empty">
            <Icon name="activity" />
            مفيش تحديثات مطابقة.
          </div>
        ) : null}
      </div>
    </>
  );
}
