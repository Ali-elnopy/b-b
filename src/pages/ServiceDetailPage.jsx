import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ErrorBlock, Loading, PageHead } from '../components/Common.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { api } from '../lib/api';

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const { services } = useSite();
  const cached = useMemo(
    () => services.find((service) => service.slug === slug) ?? null,
    [services, slug],
  );

  const [service, setService] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cached) {
      setService(cached);
      return undefined;
    }

    let alive = true;

    setLoading(true);
    api
      .get(`/services/${encodeURIComponent(slug)}`)
      .then((body) => {
        if (alive) setService(body?.service ?? null);
      })
      .catch((caught) => {
        if (alive) setError(caught?.status === 404 ? 'الخدمة غير موجودة أو غير متاحة حاليًا.' : caught.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [cached, slug]);

  if (loading) {
    return (
      <section className="page-body">
        <div className="container">
          <Loading />
        </div>
      </section>
    );
  }

  if (!service) {
    return (
      <>
        <PageHead
          title="الخدمة غير متاحة"
          lead="يمكن الخدمة اتشالت أو الرابط مش صحيح."
          crumbs={[{ label: 'خدماتنا', to: '/services' }, { label: 'غير متاحة' }]}
        />
        <section className="page-body">
          <div className="container stack">
            <ErrorBlock message={error ?? 'الخدمة غير موجودة.'} />
            <Link to="/services" className="btn btn--ghost" style={{ justifySelf: 'start' }}>
              رجوع للخدمات
            </Link>
          </div>
        </section>
      </>
    );
  }

  const required = (service.options ?? []).filter((option) => option.required);

  return (
    <>
      <PageHead
        eyebrow={service.category}
        title={service.name}
        lead={service.summary}
        crumbs={[{ label: 'خدماتنا', to: '/services' }, { label: service.name }]}
        actions={
          <Link to={`/request?service=${service.slug}`} className="btn">
            اطلب الخدمة
            <Icon name="arrowLeft" />
          </Link>
        }
      />

      <section className="page-body">
        <div className="container detail-grid">
          <div className={`detail-media${service.image ? '' : ' detail-media--brand'}`}>
            <img
              src={service.image || '/media/mark.png'}
              alt={service.imageAlt || service.name}
            />
          </div>

          <div className="detail-body">
            {service.subtitle ? <p className="eyebrow">{service.subtitle}</p> : null}
            <p>{service.description || service.summary}</p>

            <dl className="detail-meta">
              <div>
                <dt>القسم</dt>
                <dd>{service.category}</dd>
              </div>
              <div>
                <dt>الحد الأدنى</dt>
                <dd>{service.minQuantity} قطعة</dd>
              </div>
              <div>
                <dt>المقاسات</dt>
                <dd>{service.requiresSizes ? 'مطلوبة حسب القطعة' : 'مش مطلوبة'}</dd>
              </div>
              <div>
                <dt>ملف التصميم</dt>
                <dd>{service.needsArtwork ? 'مطلوب أو لاحقًا' : 'مش مطلوب — بريف'}</dd>
              </div>
            </dl>

            {service.options?.length ? (
              <>
                <h2>الخيارات المتاحة</h2>
                <ul className="detail-list">
                  {service.options.map((option) => (
                    <li key={option.key}>
                      <strong>{option.label}:</strong>{' '}
                      {option.choices?.length ? option.choices.join(' · ') : 'كتابة حرة'}
                      {option.required ? ' — مطلوب' : ''}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {service.guidance?.length ? (
              <div className="detail-aside">
                <h3>قبل ما تبعت الملف</h3>
                <ul>
                  {service.guidance.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flow-actions" style={{ marginTop: 28 }}>
              <Link to="/services" className="link-arrow">
                <Icon name="arrowRight" />
                كل الخدمات
              </Link>
              <Link to={`/request?service=${service.slug}`} className="btn">
                ابدأ الطلب
                <Icon name="arrowLeft" />
              </Link>
            </div>

            {required.length ? (
              <p className="tiny-muted" style={{ marginTop: 14 }}>
                هتحتاج تحدد: {required.map((option) => option.label).join('، ')}.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
