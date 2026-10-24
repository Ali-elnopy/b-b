import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ErrorBlock, Loading } from '../components/Common.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';

const BUSINESS_FIELDS = [
  { key: 'name', label: 'اسم النشاط' },
  { key: 'descriptor', label: 'الوصف المختصر' },
  { key: 'tagline', label: 'الشعار النصي' },
  { key: 'whatsapp', label: 'رقم واتساب', dir: 'ltr' },
  { key: 'phone', label: 'رقم التليفون', dir: 'ltr' },
  { key: 'website', label: 'الموقع', dir: 'ltr' },
  { key: 'instagram', label: 'إنستجرام (اسم المستخدم)', dir: 'ltr' },
  { key: 'facebook', label: 'فيسبوك (رابط أو اسم)', dir: 'ltr' },
  { key: 'email', label: 'البريد الإلكتروني', dir: 'ltr' },
];

export default function AdminSettingsPage() {
  const { user, logout } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [content, setContent] = useState({ announcement: '', homepageNote: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  function load() {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get('/admin/settings')
      .then((body) => {
        if (!alive) return;
        setBusiness({ ...(body.settings?.business ?? {}) });
        setContent({
          announcement: body.settings?.content?.announcement ?? '',
          homepageNote: body.settings?.content?.homepageNote ?? '',
        });
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

  function update(key, value) {
    setBusiness((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const body = await api.patch('/admin/settings', { business, content });
      setBusiness({ ...(body.settings?.business ?? business) });
      setContent({
        announcement: body.settings?.content?.announcement ?? '',
        homepageNote: body.settings?.content?.homepageNote ?? '',
      });
      show('تم حفظ الإعدادات.', 'ok');
    } catch (caught) {
      setFormError(caught.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordError(null);

    if (passwords.next.length < 10) {
      setPasswordError('كلمة المرور الجديدة لازم تكون 10 أحرف على الأقل.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('تأكيد كلمة المرور مش مطابق.');
      return;
    }

    setPasswordBusy(true);
    try {
      const body = await api.post('/admin/password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      show(body.message ?? 'تم تغيير كلمة المرور.', 'ok');
      setPasswords({ current: '', next: '', confirm: '' });
      await logout().catch(() => {});
      navigate('/admin/login', { replace: true });
    } catch (caught) {
      setPasswordError(caught.message);
    } finally {
      setPasswordBusy(false);
    }
  }

  if (loading) return <Loading label="بنحمّل الإعدادات…" />;
  if (error || !business) return <ErrorBlock message={error ?? 'تعذر تحميل الإعدادات.'} onRetry={load} />;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>الإعدادات</h1>
          <p>بيانات النشاط اللي بتظهر في الموقع، وإعدادات حسابك.</p>
        </div>
      </div>

      <div className="settings-grid">
        <form className="admin-panel" onSubmit={save}>
          <div className="admin-panel__head">
            <h2>بيانات النشاط</h2>
          </div>
          <div className="admin-panel__body">
            <div className="form-grid">
              {BUSINESS_FIELDS.map((field) => (
                <div className="field" key={field.key}>
                  <label htmlFor={`biz-${field.key}`}>{field.label}</label>
                  <input
                    id={`biz-${field.key}`}
                    className="input"
                    type="text"
                    value={business[field.key] ?? ''}
                    onChange={(event) => update(field.key, event.target.value)}
                    dir={field.dir ?? 'rtl'}
                    style={field.dir === 'ltr' ? { textAlign: 'left' } : undefined}
                  />
                </div>
              ))}

              <div className="field field--full">
                <label htmlFor="biz-address">العنوان</label>
                <input
                  id="biz-address"
                  className="input"
                  type="text"
                  value={business.address ?? ''}
                  onChange={(event) => update('address', event.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="biz-hours">ساعات العمل</label>
                <input
                  id="biz-hours"
                  className="input"
                  type="text"
                  value={business.hours ?? ''}
                  onChange={(event) => update('hours', event.target.value)}
                  placeholder="اختياري"
                />
              </div>

              <div className="field">
                <label htmlFor="biz-maps">رابط الخريطة</label>
                <input
                  id="biz-maps"
                  className="input"
                  type="url"
                  value={business.mapsUrl ?? ''}
                  onChange={(event) => update('mapsUrl', event.target.value)}
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
              </div>

              <div className="field field--full">
                <label htmlFor="biz-delivery">ملاحظة التوصيل</label>
                <textarea
                  id="biz-delivery"
                  className="textarea"
                  value={business.deliveryNote ?? ''}
                  onChange={(event) => update('deliveryNote', event.target.value)}
                />
              </div>
            </div>

            <div className="check-row" style={{ marginTop: 18 }}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={Boolean(business.demoMode)}
                  onChange={(event) => update('demoMode', event.target.checked)}
                />
                <span>وضع العرض التجريبي</span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={Boolean(business.launchApproved)}
                  onChange={(event) => update('launchApproved', event.target.checked)}
                />
                <span>تم اعتماد الإطلاق</span>
              </label>
            </div>

            {formError ? (
              <div className="notice notice--bad" style={{ marginTop: 16 }}>
                <Icon name="alert" />
                <span>{formError}</span>
              </div>
            ) : null}

            <div className="btn-row" style={{ marginTop: 20 }}>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'بنحفظ…' : 'حفظ الإعدادات'}
                <Icon name="check" />
              </button>
            </div>
          </div>
        </form>

        <div className="detail-col">
          <form className="admin-panel" onSubmit={save}>
            <div className="admin-panel__head">
              <h2>محتوى الموقع</h2>
            </div>
            <div className="admin-panel__body">
              <div className="field">
                <label htmlFor="content-announcement">شريط الإعلان</label>
                <input
                  id="content-announcement"
                  className="input"
                  type="text"
                  value={content.announcement}
                  onChange={(event) =>
                    setContent((prev) => ({ ...prev, announcement: event.target.value }))
                  }
                  placeholder="سيبه فاضي لإخفاء الشريط"
                />
                <span className="field__hint">بيظهر أعلى الموقع. سيبه فاضي لإخفائه.</span>
              </div>

              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor="content-home">ملاحظة الصفحة الرئيسية</label>
                <textarea
                  id="content-home"
                  className="textarea"
                  value={content.homepageNote}
                  onChange={(event) =>
                    setContent((prev) => ({ ...prev, homepageNote: event.target.value }))
                  }
                  placeholder="اختياري"
                />
              </div>

              <div className="btn-row" style={{ marginTop: 18 }}>
                <button type="submit" className="btn btn--ghost" disabled={saving}>
                  حفظ المحتوى
                </button>
              </div>
            </div>
          </form>

          <div className="admin-panel">
            <div className="admin-panel__head">
              <h2>الحساب</h2>
            </div>
            <div className="admin-panel__body">
              <dl className="spec-list">
                <div className="spec-row">
                  <dt>الاسم</dt>
                  <dd>{user?.name ?? '—'}</dd>
                </div>
                <div className="spec-row">
                  <dt>البريد</dt>
                  <dd>{user?.email ?? '—'}</dd>
                </div>
                <div className="spec-row">
                  <dt>الدور</dt>
                  <dd>{user?.role ?? '—'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <form className="admin-panel" onSubmit={changePassword}>
            <div className="admin-panel__head">
              <h2>تغيير كلمة المرور</h2>
            </div>
            <div className="admin-panel__body">
              <div className="field">
                <label htmlFor="pw-current">كلمة المرور الحالية</label>
                <input
                  id="pw-current"
                  className="input"
                  type="password"
                  value={passwords.current}
                  onChange={(event) =>
                    setPasswords((prev) => ({ ...prev, current: event.target.value }))
                  }
                  autoComplete="current-password"
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
              </div>

              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="pw-new">كلمة المرور الجديدة</label>
                <input
                  id="pw-new"
                  className="input"
                  type="password"
                  value={passwords.next}
                  onChange={(event) =>
                    setPasswords((prev) => ({ ...prev, next: event.target.value }))
                  }
                  autoComplete="new-password"
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
                <span className="field__hint">10 أحرف على الأقل.</span>
              </div>

              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="pw-confirm">تأكيد كلمة المرور</label>
                <input
                  id="pw-confirm"
                  className="input"
                  type="password"
                  value={passwords.confirm}
                  onChange={(event) =>
                    setPasswords((prev) => ({ ...prev, confirm: event.target.value }))
                  }
                  autoComplete="new-password"
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
              </div>

              {passwordError ? (
                <div className="notice notice--bad" style={{ marginTop: 14 }}>
                  <Icon name="alert" />
                  <span>{passwordError}</span>
                </div>
              ) : null}

              <button
                type="submit"
                className="btn btn--ghost btn--block"
                style={{ marginTop: 16 }}
                disabled={passwordBusy}
              >
                <Icon name="lock" />
                {passwordBusy ? 'بنغيّر…' : 'تغيير كلمة المرور'}
              </button>
              <p className="tiny-muted" style={{ marginTop: 10 }}>
                بعد التغيير هتتسجّل الخروج من كل الأجهزة.
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
