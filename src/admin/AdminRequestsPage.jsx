import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ErrorBlock, Loading, StatusPill } from '../components/Common.jsx';
import { api } from '../lib/api.js';
import { formatDateTime, formatNumber } from '../lib/format.js';
import { STATUSES } from '../../shared/status.js';

export default function AdminRequestsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';

  const [q, setQ] = useState(params.get('q') ?? '');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      api
        .get(`/admin/requests?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q.trim())}`)
        .then((body) => {
          if (alive) setRequests(Array.isArray(body?.requests) ? body.requests : []);
        })
        .catch((caught) => {
          if (alive) setError(caught.message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 220);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [status, q]);

  function changeStatus(next) {
    const nextParams = new URLSearchParams(params);
    if (next === 'all') nextParams.delete('status');
    else nextParams.set('status', next);
    setParams(nextParams, { replace: true });
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>الطلبات</h1>
          <p>راجع الطلبات، افتح التفاصيل، وحدّث الحالة والملاحظات.</p>
        </div>
        <div className="admin-page-head__actions">
          <Link to="/request" className="btn btn--ghost btn--sm" target="_blank" rel="noreferrer">
            <Icon name="external" />
            صفحة الطلب
          </Link>
          <Link to="/admin" className="btn btn--sm">
            نظرة عامة
          </Link>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <div className="inline" style={{ position: 'relative', flex: '1 1 220px' }}>
            <input
              className="input"
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="ابحث برقم الطلب، الاسم، الموبايل، أو الخدمة…"
              aria-label="بحث في الطلبات"
              style={{ paddingInlineStart: 38, maxWidth: 380 }}
            />
            <Icon
              name="search"
              style={{
                position: 'absolute',
                insetInlineStart: 12,
                width: 16,
                height: 16,
                color: 'var(--muted-2)',
              }}
            />
          </div>

          <select
            className="select"
            value={status}
            onChange={(event) => changeStatus(event.target.value)}
            aria-label="تصفية بالحالة"
          >
            <option value="all">كل الحالات</option>
            {STATUSES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>

          <span className="admin-toolbar__spacer" />
          <span className="tiny-muted">
            {loading ? 'بنحدّث…' : `${formatNumber(requests.length)} طلب`}
          </span>
        </div>

        {loading && !requests.length ? <Loading label="بنحمّل الطلبات…" /> : null}
        {error ? <ErrorBlock message={error} /> : null}

        {!error && requests.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>الخدمة</th>
                  <th>الكمية</th>
                  <th>الاستلام</th>
                  <th>الحالة</th>
                  <th>ملفات</th>
                  <th>آخر تحديث</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/admin/requests/${item.id}`} className="admin-ref">
                        {item.ref}
                      </Link>
                      {item.isDemo ? (
                        <span className="badge badge--demo" style={{ marginInlineStart: 6 }}>
                          نموذج
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span className="admin-customer">
                        <strong>{item.customerName}</strong>
                        <span>{item.phone}</span>
                      </span>
                    </td>
                    <td>{item.serviceName}</td>
                    <td>{formatNumber(item.quantity)}</td>
                    <td>{item.method === 'delivery' ? 'توصيل' : 'الفرع'}</td>
                    <td>
                      <StatusPill status={item.status} />
                    </td>
                    <td>{item.attachmentCount ? `${item.attachmentCount}` : '—'}</td>
                    <td className="tiny-muted cell-nowrap">{formatDateTime(item.updatedAt)}</td>
                    <td>
                      <Link to={`/admin/requests/${item.id}`}>فتح</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && !requests.length ? (
          <div className="admin-empty">
            <Icon name="search" />
            مفيش طلبات مطابقة للبحث أو الفلتر الحالي.
          </div>
        ) : null}
      </div>
    </>
  );
}
