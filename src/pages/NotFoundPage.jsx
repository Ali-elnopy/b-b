import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function NotFoundPage() {
  return (
    <main className="notfound">
      <div>
        <div className="notfound__code">404</div>
        <h1>الصفحة مش موجودة</h1>
        <p>يمكن الرابط قديم أو فيه خطأ. جرّب من الأول أو اختار من الروابط تحت.</p>
        <div className="success-actions">
          <Link to="/" className="btn">
            الصفحة الرئيسية
            <Icon name="arrowLeft" />
          </Link>
          <Link to="/services" className="btn btn--ghost">
            كل الخدمات
          </Link>
          <Link to="/track" className="btn btn--ghost">
            تتبع طلبك
          </Link>
        </div>
      </div>
    </main>
  );
}
