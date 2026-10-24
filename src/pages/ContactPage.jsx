import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { PageHead } from '../components/Common.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { telHref, waHref } from '../lib/format.js';

const TOPICS = [
  'سؤال قبل الطلب',
  'متابعة طلب حالي',
  'تعديل على طلب',
  'تصميم مخصص',
  'شكوى أو ملاحظة',
];

const FAQ = [
  {
    q: 'إزاي أعرف سعر الطلب؟',
    a: 'الأسعار بتتحدد في عرض السعر بعد مراجعة نوع المنتج والكمية والخيارات وتفاصيل التصميم. ابعت الطلب وهنرد عليك بعرض واضح قبل التنفيذ.',
  },
  {
    q: 'أقل كمية ممكن أطلبها قد إيه؟',
    a: 'الحد الأدنى قطعة واحدة في الخدمات المنشورة حاليًا. بعض الخدمات ممكن تحتاج كمية أكبر حسب التفاصيل، والفريق بيأكد ده معاك قبل البدء.',
  },
  {
    q: 'إيه الملفات المقبولة للتصميم؟',
    a: 'PNG أو JPG أو WEBP أو PDF أو AI، وبحد أقصى 4 ملفات للطلب وحجم أقل من 8 ميجا للملف. يفضل PNG بخلفية شفافة أو PDF بدقة مناسبة للطباعة.',
  },
  {
    q: 'ينفع أبعت التصميم بعد ما أطلب؟',
    a: 'أيوه، فيه خيار «هبعت التصميم لاحقًا». الطلب هيتسجل، لكن التنفيذ مش هيبدأ قبل وصول الملف ومراجعته.',
  },
  {
    q: 'إزاي أتابع طلبي؟',
    a: 'بعد إرسال الطلب بيظهر رقم الطلب وكود متابعة لمرة واحدة. استخدمهم في صفحة «تتبع طلبك» عشان تشوف الحالة وسجل التحديثات. لو فقدت الكود، تواصل معنا برقم الطلب.',
  },
  {
    q: 'التوصيل متاح فين؟',
    a: 'التوصيل متاح داخل أسوان بعد تأكيد التفاصيل. المناطق خارج أسوان بتحتاج مراجعة من الفريق قبل اعتماد الطلب.',
  },
  {
    q: 'بتشتغلوا على تصميم من الصفر؟',
    a: 'أيوه، فيه خدمة «تصاميم مخصصة» بتعتمد على بريف مكتوب: النشاط، الجمهور، الستايل، وأماكن الاستخدام. اكتب البريف في الطلب والفريق هيراجعه.',
  },
];

export default function ContactPage() {
  const { business } = useSite();
  const { show } = useToast();

  const [form, setForm] = useState({ name: '', phone: '', topic: TOPICS[0], message: '' });
  const [error, setError] = useState(null);

  const whatsapp = waHref(business.whatsapp);
  const phone = telHref(business.phone);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    setError(null);

    if (form.name.trim().length < 2) {
      setError('اكتب اسمك الأول على الأقل.');
      return;
    }
    if (form.message.trim().length < 10) {
      setError('اكتب رسالة أوضح (10 حروف على الأقل).');
      return;
    }

    const lines = [
      'مرحبًا يوزرسيف،',
      `أنا ${form.name.trim()}`,
      form.phone.trim() ? `رقم التواصل: ${form.phone.trim()}` : null,
      `الموضوع: ${form.topic}`,
      '',
      form.message.trim(),
    ].filter((line) => line !== null);

    const href = waHref(business.whatsapp, lines.join('\n'));
    if (!href) {
      setError('رقم واتساب غير متاح حاليًا. جرّب التليفون.');
      return;
    }

    window.open(href, '_blank', 'noopener');
    show('فتحنا واتساب في تاب جديد — ابعت الرسالة من هناك.', 'ok');
  }

  return (
    <>
      <PageHead
        eyebrow="تواصل"
        title="كلّمنا"
        lead="عندك سؤال قبل الطلب أو محتاج مساعدة في طلب حالي؟ اختار الطريقة الأنسب لك."
        crumbs={[{ label: 'تواصل معنا' }]}
      />

      <section className="page-body">
        <div className="container">
          <div className="contact-layout">
            <div className="contact-cards">
              {whatsapp ? (
                <a className="contact-card" href={whatsapp} target="_blank" rel="noreferrer">
                  <span className="contact-card__icon">
                    <Icon name="whatsapp" />
                  </span>
                  <span>
                    <h3>واتساب — الأسرع</h3>
                    <p dir="ltr">{business.whatsapp}</p>
                    <small>ابعت تفاصيل طلبك أو سؤالك مباشرة.</small>
                  </span>
                </a>
              ) : null}

              {phone ? (
                <a className="contact-card" href={phone}>
                  <span className="contact-card__icon">
                    <Icon name="phone" />
                  </span>
                  <span>
                    <h3>تليفون</h3>
                    <p dir="ltr">{business.phone}</p>
                    <small>لو محتاج تتكلم مع حد من الفريق.</small>
                  </span>
                </a>
              ) : null}

              <a
                className="contact-card"
                href={business.mapsUrl || '#'}
                target="_blank"
                rel="noreferrer"
              >
                <span className="contact-card__icon">
                  <Icon name="mapPin" />
                </span>
                <span>
                  <h3>المقر</h3>
                  <p>{business.address}</p>
                  <small>افتح الموقع على الخريطة.</small>
                </span>
              </a>

              {business.instagram ? (
                <a
                  className="contact-card"
                  href={`https://instagram.com/${business.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="contact-card__icon">
                    <Icon name="instagram" />
                  </span>
                  <span>
                    <h3>إنستجرام</h3>
                    <p dir="ltr">@{business.instagram}</p>
                    <small>شوف آخر الأعمال والتحديثات.</small>
                  </span>
                </a>
              ) : null}

              {business.email ? (
                <a className="contact-card" href={`mailto:${business.email}`}>
                  <span className="contact-card__icon">
                    <Icon name="mail" />
                  </span>
                  <span>
                    <h3>البريد الإلكتروني</h3>
                    <p>{business.email}</p>
                  </span>
                </a>
              ) : null}

              <div className="demo-note" style={{ marginTop: 6 }}>
                <Icon name="info" />
                <div>
                  للطلبات الجديدة، استخدم{' '}
                  <Link to="/request" style={{ color: 'var(--teal)', fontWeight: 700 }}>
                    صفحة الطلب
                  </Link>{' '}
                  عشان بياناتك تتسجل برقم متابعة وتقدر تتابعها.
                </div>
              </div>
            </div>

            <form className="contact-form" onSubmit={submit} noValidate>
              <h2 style={{ fontSize: 22, marginBottom: 6 }}>ابعت رسالة واتساب</h2>
              <p className="tiny-muted" style={{ marginBottom: 18 }}>
                النموذج بيفتح واتساب برسالة جاهزة فيها بياناتك — مفيش رسائل بتتبعت
                تلقائيًا من الموقع.
              </p>

              <div className="field">
                <label htmlFor="contact-name">الاسم *</label>
                <input
                  id="contact-name"
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder="اسمك"
                  autoComplete="name"
                />
              </div>

              <div className="field">
                <label htmlFor="contact-phone">رقم الموبايل (اختياري)</label>
                <input
                  id="contact-phone"
                  className="input"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value)}
                  placeholder="01xxxxxxxxx"
                  autoComplete="tel"
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
              </div>

              <div className="field">
                <label htmlFor="contact-topic">الموضوع</label>
                <select
                  id="contact-topic"
                  className="select"
                  value={form.topic}
                  onChange={(event) => update('topic', event.target.value)}
                >
                  {TOPICS.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="contact-message">الرسالة *</label>
                <textarea
                  id="contact-message"
                  className="textarea"
                  value={form.message}
                  onChange={(event) => update('message', event.target.value)}
                  placeholder="اكتب تفاصيل سؤالك أو طلبك…"
                  maxLength={1500}
                />
              </div>

              {error ? (
                <div className="notice notice--bad" style={{ marginBottom: 14 }}>
                  <Icon name="alert" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button type="submit" className="btn btn--block">
                <Icon name="whatsapp" />
                فتح واتساب برسالة جاهزة
              </button>

              <p className="tiny-muted" style={{ marginTop: 12 }}>
                بالمتابعة أنت موافق على{' '}
                <Link to="/privacy" style={{ color: 'var(--teal)', fontWeight: 700 }}>
                  سياسة الخصوصية
                </Link>
                .
              </p>
            </form>
          </div>

          <div className="faq">
            <h2 className="h2" style={{ margin: '34px 0 8px' }}>
              أسئلة متكررة
            </h2>
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
