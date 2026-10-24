import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ErrorBlock, Loading, StatusPill } from '../components/Common.jsx';
import { api } from '../lib/api.js';
import { formatDateTime, formatNumber } from '../lib/format.js';
import { STATUSES } from '../../shared/status.js';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get('/admin/overview')
      .then((body) => {
        if (alive) setData(body);
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

  const counts = data?.counts ?? {};

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>نظرة عامة</h1>
          <p>آخر حالة للطلبات والكتالوج في مكان واحد.</p>
        </div>
        <div className="admin-page-head__actions">
          <Link to="/admin/requests" className="btn btn--ghost btn--sm">
            كل الطلبات
            <Icon name="arrowLeft" />
          </Link>
          <Link to="/admin/services" className="btn btn--sm">
            إدارة الخدمات
          </Link>
        </div>
      </div>

      {loading ? <Loading label="بنحمّل الأرقام…" /> : null}
      {error ? <ErrorBlock message={error} onRetry={load} /> : null}

      {data ? (
        <>
          <div className="kpi-grid">
            <div className="kpi kpi--accent">
              <div className="kpi__label">
                <Icon name="inbox" />
                إجمالي الطلبات
              </div>
              <div className="kpi__value">{formatNumber(data.total)}</div>
              <div className="kpi__hint">كل الطلبات المسجلة</div>
            </div>

            <div className="kpi">
              <div className="kpi__label">
                <Icon name="spark" />
                طلبات جديدة
              </div>
              <div className="kpi__value">{formatNumber(data.newCount)}</div>
              <div className="kpi__hint">مستنية المراجعة</div>
            </div>

            <div className="kpi">
              <div className="kpi__label">
                <Icon name="activity" />
                طلبات نشطة
              </div>
              <div className="kpi__value">{formatNumber(data.active)}</div>
              <div className="kpi__hint">من المراجعة حتى التسليم</div>
            </div>

            <div className="kpi">
              <div className="kpi__label">
                <Icon name="truck" />
                تم التسليم
              </div>
              <div className="kpi__value">{formatNumber(counts.delivered ?? 0)}</div>
              <div className="kpi__hint">طلبات مكتملة</div>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel__head">
              <h2>أحدث الطلبات</h2>
              <Link to="/admin/requests" className="link-arrow" style={{ fontSize: 12 }}>
                عرض الكل
                <Icon name="arrowLeft" />
              </Link>
            </div>

            {data.recent?.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>رقم الطلب</th>
                      <th>العميل</th>
                      <th>الخدمة</th>
                      <th>الكمية</th>
                      <th>الحالة</th>
                      <th>التاريخ</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="admin-ref">{item.ref}</span>
                          {item.isDemo ? (
                            <span className="badge badge--demo" style={{ marginInlineStart: 6 }}>
                              نموذج
                            </span>
                          ) : null}
                        </td>
                        <td>{item.customerName}</td>
                        <td>{item.serviceName}</td>
                        <td>{formatNumber(item.quantity)}</td>
                        <td>
                          <StatusPill status={item.status} />
                        </td>
                        <td className="tiny-muted cell-nowrap">{formatDateTime(item.createdAt)}</td>
                        <td>
                          <Link to={`/admin/requests/${item.id}`}>تفاصيل</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty">
                <Icon name="inbox" />
                مفيش طلبات مسجلة بعد.
              </div>
            )}
          </div>

          <div className="admin-panel">
            <div className="admin-panel__head">
              <h2>توزيع الحالات</h2>
            </div>
            <div className="admin-panel__body">
              <div className="inline" style={{ gap: 8 }}>
                {STATUSES.map((status) => (
                  <Link
                    key={status.key}
                    to={`/admin/requests?status=${status.key}`}
                    className="chip"
                    style={{ background: 'var(--snow)' }}
                  >
                    {status.label}
                    <strong style={{ marginInlineStart: 6 }}>
                      {formatNumber(counts[status.key] ?? 0)}
                    </strong>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
