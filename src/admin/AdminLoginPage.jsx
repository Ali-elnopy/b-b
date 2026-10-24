import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [loading, user, from, navigate]);

  async function submit(event) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('اكتب البريد وكلمة المرور.');
      return;
    }

    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate(from, { replace: true });
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell" dir="rtl">
      <div className="login-visual">
        <div className="login-visual__logo">
          <img src="/media/logo-snow.png" alt="يوزرسيف" />
        </div>

        <div className="login-visual__copy">
          <h1>لوحة تحكم يوزرسيف</h1>
          <p>
            إدارة الطلبات، مراجعة الملفات، تحديث حالة كل طلب، ومتابعة الكتالوج
            والأعمال من مكان واحد.
          </p>
        </div>

        <div className="login-visual__foot">
          يوزرسيف — للطباعة والهدايا · أسوان
        </div>
      </div>

      <div className="login-panel">
        <div className="login-box">
          <div className="login-box__logo">
            <img src="/media/logo-teal.png" alt="يوزرسيف" />
          </div>

          <h1>تسجيل الدخول</h1>
          <p>ادخل ببيانات حساب فريق يوزرسيف.</p>

          {error ? <div className="login-error">{error}</div> : null}

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="admin-email">البريد الإلكتروني</label>
              <input
                id="admin-email"
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@yozersaf.com"
                autoComplete="username"
                dir="ltr"
                style={{ textAlign: 'left' }}
                autoFocus
              />
            </div>

            <div className="field">
              <label htmlFor="admin-password">كلمة المرور</label>
              <input
                id="admin-password"
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                dir="ltr"
                style={{ textAlign: 'left' }}
              />
            </div>

            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'بنتحقق…' : 'دخول'}
              <Icon name="arrowLeft" />
            </button>
          </form>

          <div className="login-hint">
            <strong>ملاحظة:</strong> الدخول مخصص لفريق يوزرسيف. لو مش عندك بيانات
            الدخول، تواصل مع مالك الموقع. الجلسة بتنتهي تلقائيًا بعد فترة، وتقدر
            تسجّل الخروج من الشريط الجانبي.
          </div>

          <Link to="/" className="login-back">
            العودة للموقع
          </Link>
        </div>
      </div>
    </div>
  );
}
