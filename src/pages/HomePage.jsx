import React from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import {
  Loading,
  PortfolioCard,
  SectionHead,
  ServiceCard,
} from "../components/Common.jsx";
import { useSite } from "../context/SiteContext.jsx";

const PROCESS = [
  {
    num: "01",
    icon: "package",
    title: "اختار المنتج",
    text: "تصفح الخدمات واختار اللي يناسب فكرتك — من قطعة واحدة.",
  },
  {
    num: "02",
    icon: "palette",
    title: "حدد التفاصيل",
    text: "الكمية، المقاسات، الخيارات، وملف التصميم أو بريف الفكرة.",
  },
  {
    num: "03",
    icon: "shield",
    title: "مراجعة وموافقة",
    text: "نراجع الملف والتفاصيل، ونرد عليك قبل بدء التنفيذ.",
  },
  {
    num: "04",
    icon: "truck",
    title: "استلم طلبك",
    text: "استلام من الفرع أو توصيل داخل أسوان بعد تأكيد الموعد.",
  },
];

const VALUES = [
  {
    icon: "eye",
    title: "وضوح من الأول",
    text: "كل طلب له رقم متابعة وكود خاص، وتشوف حالته وخط سيره في أي وقت.",
  },
  {
    icon: "shield",
    title: "مراجعة قبل التنفيذ",
    text: "ملف التصميم والمقاسات بيتشافوا فنيًا قبل الطباعة، عشان النتيجة تطلع صح.",
  },
  {
    icon: "mapPin",
    title: "قريب منك",
    text: "المقر في أسوان، والتواصل مباشر على واتساب أو التليفون مع فريق يوزرسيف.",
  },
];

export default function HomePage() {
  const { services, portfolio, loading, error } = useSite();

  const marqueeItems = services.length
    ? services.map((service) => service.name)
    : ["ملابس مطبوعة", "مجات وهدايا", "شنط قماش", "مطبوعات", "تصاميم مخصصة"];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker">
              <span className="dot">
                <Icon name="spark" style={{ width: 13, height: 13 }} />
              </span>
              أسوان، مصر — طباعة وتخصيص
            </span>

            <h1 className="hero-title">
              <span className="line">نحوّل أفكارك</span>
              <span className="line">
                إلى <span className="accent">واقع مطبوع</span>
              </span>
            </h1>

            <p className="hero-lead">
              من تيشيرت بهوية فريقك لمج هدية أو كارت أعمال — بنطبّق تصميمك بجودة
              واضحة، وبنمشي معاك خطوة بخطوة من الطلب للتسليم.
            </p>

            <div className="hero-actions">
              <Link to="/request" className="btn">
                ابدأ طلبك
                <Icon name="arrowLeft" />
              </Link>
              <Link to="/portfolio" className="btn btn--ghost">
                شوف أعمالنا
              </Link>
            </div>

            <ul className="hero-trust">
              <li>
                <Icon name="checkCircle" />
                متابعة أونلاين لكل طلب
              </li>
              <li>
                <Icon name="checkCircle" />
                مراجعة فنية قبل التنفيذ
              </li>
              <li>
                <Icon name="checkCircle" />
                توصيل داخل أسوان
              </li>
            </ul>
          </div>

          <div className="hero-stage">
            <div className="hero-photo">
              <img src="/media/palestinian-heritage-hero.png" alt="طباعة وتخصيص في يوزرسيف" />
              <div className="hero-photo__caption">
                <div>
                  <strong>من الفكرة للتنفيذ</strong>
                  <br />
                  <span style={{ opacity: 0.75, fontSize: 11.5 }}>
                    ورشة يوزرسيف — أسوان
                  </span>
                </div>
                <span className="badge">يوزرسيف</span>
              </div>
            </div>

            <div className="hero-mark">
              <img src="/media/mark.png" alt="" />
            </div>

            <div className="hero-card hero-card--spec">
              <div className="hero-card__label">الحد الأدنى للطلب</div>
              <div className="hero-card__value">قطعة واحدة</div>
              <div className="hero-card__row">
                <span className="hero-card__dots">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="tiny-muted">من غير حد أدنى مرتفع</span>
              </div>
            </div>

            <div className="hero-card hero-card--status">
              <div className="hero-card__label">متابعة الطلب</div>
              <div className="hero-card__value mono">YZ-2026-0001</div>
              <div className="hero-card__row">
                <span className="badge badge--ok">قيد التنفيذ</span>
                <Icon
                  name="arrowLeft"
                  style={{ width: 15, height: 15, color: "var(--teal)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          <div className="marquee__group">
            {marqueeItems.map((item) => (
              <span key={`a-${item}`}>{item}</span>
            ))}
          </div>
          <div className="marquee__group">
            {marqueeItems.map((item) => (
              <span key={`b-${item}`}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="خدماتنا"
            title="كل اللي تحتاجه في مكان واحد"
            lead="اختار الخدمة وابدأ طلبك في دقائق. الكميات تبدأ من قطعة واحدة، والتفاصيل بتتأكد معاك قبل التنفيذ."
            action={
              <Link to="/services" className="link-arrow">
                كل الخدمات
                <Icon name="arrowLeft" />
              </Link>
            }
          />

          {loading && !services.length ? <Loading /> : null}
          {error && !services.length ? (
            <p className="notice notice--warn">
              <Icon name="alert" />
              {error}
            </p>
          ) : null}

          {services.length ? (
            <div className="service-grid">
              {services.slice(0, 8).map((service) => (
                <ServiceCard key={service.slug} service={service} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section process">
        <div className="container">
          <SectionHead
            eyebrow="كيف نعمل"
            title="أربع خطوات واضحة"
            lead="مش محتاج تكون خبير طباعة. إحنا بنسأل عن اللي محتاجه وبنراجع معاك قبل ما نبدأ."
          />

          <div className="process-grid">
            {PROCESS.map((step) => (
              <div className="process-step" key={step.num}>
                <span className="process-step__num">{step.num}</span>
                <Icon name={step.icon} className="process-step__icon" />
                <h3 className="process-step__title">{step.title}</h3>
                <p className="process-step__text">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container assistant-showcase">
          <div className="assistant-copy">
            <p className="eyebrow">مساعد الجاهزية</p>
            <h2 className="h2">بنراجع طلبك قبل ما ترسله</h2>
            <p className="lead" style={{ marginTop: 14 }}>
              النظام بيشوف المقاسات، الملفات، وبيانات التواصل قبل الإرسال — عشان
              تقلل المراجعات وتوصل للنتيجة أسرع.
            </p>

            <ul className="check-list">
              <li>
                <Icon name="checkCircle" />
                <span>
                  <strong>تطابق المقاسات:</strong> مجموع كميات المقاسات لازم
                  يساوي إجمالي الكمية.
                </span>
              </li>
              <li>
                <Icon name="checkCircle" />
                <span>
                  <strong>ملف مناسب للطباعة:</strong> PNG أو JPG أو WEBP أو
                  PDF/AI بحجم أقل من 8 ميجا.
                </span>
              </li>
              <li>
                <Icon name="checkCircle" />
                <span>
                  <strong>بيانات تواصل صحيحة:</strong> رقم موبايل مصري وعنوان
                  توصيل واضح لو اخترت التوصيل.
                </span>
              </li>
            </ul>
          </div>

          <div className="assistant-demo">
            <div className="assistant-demo__top">
              <div className="assistant-demo__title">
                <span className="spark">
                  <Icon name="spark" />
                </span>
                فحص طلب — ملابس مطبوعة
              </div>
              <span className="score">
                <span className="score__ring" style={{ "--score": 92 }}>
                  <b>92</b>
                </span>
                جاهزية
              </span>
            </div>

            <div className="assistant-demo__rows">
              <div className="demo-row">
                <span>توزيع المقاسات</span>
                <strong>12 / 12</strong>
              </div>
              <div className="demo-row">
                <span>ملف التصميم</span>
                <strong>PNG · جاهز</strong>
              </div>
              <div className="demo-row">
                <span>رقم الموبايل</span>
                <strong>تم التحقق</strong>
              </div>
            </div>

            <div className="assistant-demo__result is-ok">
              <Icon name="checkCircle" />
              <span>
                جاهز للإرسال — مع ملاحظتين بسيطتين: إضافة بريد إلكتروني وتحديد
                تاريخ مطلوب.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* {portfolio.length ? (
        <section className="section section--tight">
          <div className="container">
            <SectionHead
              eyebrow="أعمالنا"
              title="نماذج من شغلنا"
              lead="صور من أصول يوزرسيف ونماذج توضيحية — الأعمال الحقيقية بتتضاف تدريجيًا."
              action={
                <Link to="/portfolio" className="link-arrow">
                  كل الأعمال
                  <Icon name="arrowLeft" />
                </Link>
              }
            />

            <div className="portfolio-grid">
              {portfolio.slice(0, 6).map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null} */}

      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="ليه يوزرسيف"
            title="طباعة واضحة من غير مفاجآت"
            lead="بنشتغل على التفاصيل اللي بتفرق: مراجعة الملف، وضوح الحالة، وقناة تواصل مباشرة."
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
              <h2>جاهز تبدأ مشروعك؟</h2>
              <p>
                ابعت تفاصيل طلبك دلوقتي، وهنراجعها ونرد عليك. لو عندك سؤال قبل
                الطلب، كلّمنا على واتساب.
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
