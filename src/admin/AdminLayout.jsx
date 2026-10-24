import React, { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { initialsOf } from '../lib/format.js';

const NAV = [
  { to: '/admin', label: 'نظرة عامة', icon: 'dashboard', end: true },
  { to: '/admin/requests', label: 'الطلبات', icon: 'inbox' },
  { to: '/admin/services', label: 'الخدمات', icon: 'layers' },
  { to: '/admin/portfolio', label: 'الأعمال', icon: 'image' },
  { to: '/admin/settings', label: 'الإعدادات', icon: 'settings' },
  { to: '/admin/audit', label: 'سجل النشاط', icon: 'activity' },
];

const TITLES = {
  '/admin': 'نظرة عامة',
  '/admin/requests': 'الطلبات',
  '/admin/services': 'الخدمات',
  '/admin/portfolio': 'معرض الأعمال',
  '/admin/settings': 'الإعدادات',
  '/admin/audit': 'سجل النشاط',
};

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    api
      .get('/admin/overview')
      .then((body) => {
        if (alive) setNewCount(Number(body?.newCount) || 0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, location.pathname]);

  if (loading) {
    return (
      <div className="login-panel" style={{ minHeight: '100vh' }}>
        <div className="inline">
          <span className="spinner spinner--dark" />
          بنتحقق من الجلسة…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  const title =
    TITLES[location.pathname] ??
    (location.pathname.startsWith('/admin/requests/') ? 'تفاصيل الطلب' : 'لوحة التحكم');

  async function signOut() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin" dir="rtl">
      <aside className={`admin-sidebar${open ? ' is-open' : ''}`} aria-label="قائمة لوحة التحكم">
        <Link to="/admin" className="admin-brand">
          <img src="/media/logo-snow.png" alt="يوزرسيف" />
          <span className="admin-brand__text">
            <strong>يوزرسيف</strong>
            <span>لوحة التحكم</span>
          </span>
        </Link>

        <p className="admin-label">الإدارة</p>
        <nav className="admin-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.to === '/admin/requests' && newCount > 0 ? (
                <span className="count">{newCount}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__foot">
          <div className="admin-user">
            <span className="admin-user__avatar">{initialsOf(user.name || user.email)}</span>
            <span className="admin-user__meta">
              <strong>{user.name || 'مدير'}</strong>
              <span>{user.email}</span>
            </span>
          </div>

          <div className="admin-sidebar__actions">
            <Link to="/" target="_blank" rel="noreferrer">
              <Icon name="external" />
              زيارة الموقع
            </Link>
            <button type="button" onClick={signOut}>
              <Icon name="logout" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      <div
        className={`admin-overlay${open ? ' is-open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="inline">
            <button
              type="button"
              className="admin-burger"
              onClick={() => setOpen(true)}
              aria-label="فتح القائمة"
            >
              <Icon name="menu" />
            </button>
            <span className="admin-topbar__title">{title}</span>
          </div>

          <div className="admin-topbar__actions">
            <Link to="/admin/requests" className="btn btn--ghost btn--sm">
              <Icon name="inbox" />
              الطلبات
            </Link>
            <Link to="/request" className="btn btn--sm" target="_blank" rel="noreferrer">
              طلب جديد
              <Icon name="arrowLeft" />
            </Link>
          </div>
        </header>

        <main className="admin-content">
          <Outlet context={{ newCount }} />
        </main>
      </div>
    </div>
  );
}
