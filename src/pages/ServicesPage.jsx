import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ErrorBlock, Loading, PageHead, ServiceCard } from '../components/Common.jsx';
import { useSite } from '../context/SiteContext.jsx';

export default function ServicesPage() {
  const { services, loading, error, reload } = useSite();
  const [active, setActive] = useState('الكل');

  const categories = useMemo(() => {
    const set = new Set(services.map((service) => service.category).filter(Boolean));
    return ['الكل', ...set];
  }, [services]);

  const visible = useMemo(
    () => (active === 'الكل' ? services : services.filter((service) => service.category === active)),
    [active, services],
  );

  return (
    <>
      <PageHead
        eyebrow="الكتالوج"
        title="خدمات الطباعة والتخصيص"
        lead="اختار المنتج اللي يناسبك. كل خدمة لها خياراتها وملفاتها المطلوبة، وتقدر تبدأ من قطعة واحدة."
        crumbs={[{ label: 'خدماتنا' }]}
        actions={
          <Link to="/request" className="btn">
            ابدأ طلب
            <Icon name="arrowLeft" />
          </Link>
        }
      />

      <section className="page-body">
        <div className="container">
          {loading && !services.length ? <Loading /> : null}
          {error && !services.length ? <ErrorBlock message={error} onRetry={reload} /> : null}

          {services.length ? (
            <>
              <div className="filter-bar" role="group" aria-label="تصفية الخدمات">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`chip${active === category ? ' is-active' : ''}`}
                    onClick={() => setActive(category)}
                  >
                    {category}
                  </button>
                ))}
                <span className="tiny-muted" style={{ marginInlineStart: 'auto', alignSelf: 'center' }}>
                  {visible.length} خدمة
                </span>
              </div>

              {visible.length ? (
                <div className="service-grid">
                  {visible.map((service) => (
                    <ServiceCard key={service.slug} service={service} />
                  ))}
                </div>
              ) : (
                <div className="demo-note">
                  <Icon name="info" />
                  <span>مفيش خدمات في القسم ده حاليًا.</span>
                </div>
              )}
            </>
          ) : null}

          <div className="demo-note" style={{ marginTop: 28 }}>
            <Icon name="info" />
            <div>
              <strong>ملاحظة عن الأسعار:</strong> الأسعار بتتحدد في عرض السعر بعد
              مراجعة التفاصيل والكمية. ابعت طلبك وهنرد عليك بالتفاصيل.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
