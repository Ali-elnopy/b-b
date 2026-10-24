import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ErrorBlock, Loading, PageHead, PortfolioCard } from '../components/Common.jsx';
import { useSite } from '../context/SiteContext.jsx';

export default function PortfolioPage() {
  const { portfolio, loading, error, reload } = useSite();
  const [active, setActive] = useState('الكل');

  const categories = useMemo(() => {
    const set = new Set(portfolio.map((item) => item.category).filter(Boolean));
    return ['الكل', ...set];
  }, [portfolio]);

  const visible = useMemo(
    () => (active === 'الكل' ? portfolio : portfolio.filter((item) => item.category === active)),
    [active, portfolio],
  );

  const hasDemo = portfolio.some((item) => item.isDemo);

  return (
    <>
      <PageHead
        eyebrow="أعمالنا"
        title="نماذج من إبداعاتنا"
        lead="مجموعة من النماذج والتطبيقات على أصول هوية يوزرسيف — بنحدّثها بأعمال العملاء تدريجيًا."
        crumbs={[{ label: 'أعمالنا' }]}
        actions={
          <Link to="/request" className="btn">
            اطلب تصميم
            <Icon name="arrowLeft" />
          </Link>
        }
      />

      <section className="page-body">
        <div className="container">
          {loading && !portfolio.length ? <Loading /> : null}
          {error && !portfolio.length ? <ErrorBlock message={error} onRetry={reload} /> : null}

          {portfolio.length ? (
            <>
              <div className="filter-bar" role="group" aria-label="تصفية الأعمال">
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
              </div>

              <div className="portfolio-grid">
                {visible.map((item) => (
                  <PortfolioCard key={item.id} item={item} />
                ))}
              </div>

              {hasDemo ? (
                <div className="demo-note" style={{ marginTop: 28 }}>
                  <Icon name="info" />
                  <div>
                    <strong>عن النماذج:</strong> الأعمال المعلّمة بـ «نموذج» هي
                    تطبيقات توضيحية على أصول الهوية، وليست أعمالًا منفذة لعميل
                    معيّن.
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="cta-band" style={{ marginTop: 40 }}>
            <div>
              <h2>عايز شغل يشبه ده؟</h2>
              <p>ابعت فكرتك أو ملفك، وهنراجعها ونقترح عليك الأنسب.</p>
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
