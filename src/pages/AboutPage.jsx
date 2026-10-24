import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { PageHead, SectionHead } from '../components/Common.jsx';
import { useSite } from '../context/SiteContext.jsx';

const SWATCHES = [
  { name: 'Evergreen', hex: '#06322D', color: 'var(--evergreen)' },
  { name: 'Teal', hex: '#065D59', color: 'var(--teal)' },
  { name: 'Snow', hex: '#F7F0F0', color: 'var(--snow)' },
  { name: 'Blush', hex: '#F0CFCF', color: 'var(--blush)' },
  { name: 'Mint', hex: '#CFEAE7', color: 'var(--mint)' },
  { name: 'Ink', hex: '#0F2A27', color: 'var(--ink)' },
];

const VALUES = [
  {
    icon: 'palette',
    title: 'تصميم قبل الطباعة',
    text: 'بنراجع الملف أو البريف معاك، ونوضّح أي نقطة محتاجة تعديل قبل بدء التنفيذ.',
  },
  {
    icon: 'ruler',
    title: 'تفاصيل مكتوبة',
    text: 'الكمية، المقاسات، الخيارات، وطريقة الاستلام بتتسجل في الطلب — مش شغل حفظ.',
  },
  {
    icon: 'truck',
    title: 'استلام واضح',
    text: 'استلام من الفرع في أسوان أو توصيل بعد تأكيد التفاصيل، وحالة الطلب بتتحدّث أولًا بأول.',
  },
];

export default function AboutPage() {
  const { business, services } = useSite();

  const categoriesCount = useMemo(
    () => new Set(services.map((service) => service.category).filter(Boolean)).size,
    [services],
  );

  return (
    <>
      <PageHead
        eyebrow="من نحن"
        title="يوزرسيف — طباعة وتخصيص في أسوان"
        lead="من فكرة على ورق لفكرة على منتج. بنشتغل على الطباعة والتخصيص بهدف واحد: نتيجة واضحة وتجربة طلب مفهومة."
        crumbs={[{ label: 'من نحن' }]}
        actions={
          <Link to="/request" className="btn">
            ابدأ طلبك
            <Icon name="arrowLeft" />
          </Link>
        }
      />

      <section className="page-body">
        <div className="container">
          <div className="about-story">
            <figure className="about-story__media">
              <img src="/media/hero-press.webp" alt="ماكينة طباعة في ورشة يوزرسيف" />
              <figcaption>ورشة يوزرسيف — أسوان</figcaption>
            </figure>

            <div>
              <h2>بنبدأ من اللي عندك</h2>
              <p>
                سواء عندك تصميم جاهز أو مجرد فكرة، يوزرسيف بتساعدك تحوّلها لمنتج مطبوع:
                ملابس، مجات، شنط، مطبوعات، دفاتر، ستيكرات، كفرات، أو تصميم مخصص.
              </p>
              <p>
                المقر في {business.address}. الكتالوج بيغطي {services.length || 8} خدمة
                ضمن {categoriesCount || 4} أقسام، والحد الأدنى للطلب من قطعة واحدة في كل
                خدمة.
              </p>
              <p>
                الطريقة بسيطة: تبعت الطلب بتفاصيله، النظام بيفحص جاهزية البيانات
                (المقاسات، الملفات، وبيانات التواصل)، فريق يوزرسيف بيراجع، وبعدها بنبدأ
                التنفيذ. وتقدر تتابع كل تحديث برقم الطلب بس.
              </p>

              <blockquote className="about-quote">«{business.tagline}»</blockquote>
            </div>
          </div>

          <div className="about-stats">
            <div>
              <strong>{services.length || 8}</strong>
              <span>خدمة متاحة في الكتالوج</span>
            </div>
            <div>
              <strong>{categoriesCount || 4}</strong>
              <span>أقسام رئيسية</span>
            </div>
            <div>
              <strong>1</strong>
              <span>الحد الأدنى للطلب — قطعة واحدة</span>
            </div>
          </div>

          <div className="brand-board">
            <div className="brand-board__logo">
              <img src="/media/logo-snow.png" alt="شعار يوزرسيف" />
            </div>
            <div className="brand-board__pattern">
              <img src="/media/pattern.webp" alt="" />
              <span>نمط الهوية — يوزرسيف</span>
            </div>
          </div>

          <div style={{ marginTop: 26 }}>
            <p className="eyebrow">ألوان الهوية</p>
            <div className="swatches">
              {SWATCHES.map((swatch) => (
                <div className="swatch" key={swatch.name}>
                  <div className="swatch__color" style={{ background: swatch.color }} />
                  <div className="swatch__info">
                    <strong>{swatch.name}</strong>
                    <code>{swatch.hex}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <SectionHead
            eyebrow="طريقة شغلنا"
            title="وضوح في كل خطوة"
            lead="مش بنبيع منتج وخلاص — بنشتغل على تجربة الطلب نفسها."
          />

          <div className="value-grid">
            {VALUES.map((value) => (
              <article className="value-card" key={value.title}>
                <span className="value-card__icon">
                  <Icon name={value.icon} />
                </span>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>تعالى نبدأ بفكرتك</h2>
              <p>
                ابعت الطلب أونلاين، أو كلّمنا على واتساب لو محتاج تسأل قبل ما تبدأ.
              </p>
            </div>
            <div className="cta-band__actions">
              <Link to="/request" className="btn btn--light">
                ابدأ طلبك
                <Icon name="arrowLeft" />
              </Link>
              <Link to="/contact" className="btn">
                تواصل معنا
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
