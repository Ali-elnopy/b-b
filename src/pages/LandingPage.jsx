import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './landing.css';

export default function LandingPage() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (v) => Math.min(1, Math.max(0, v));

    let halftoneRaf = null;
    const halftone = () => {
      const c = document.querySelector('.lp-screen');
      if (!c) return;
      const ctx = c.getContext('2d');
      const host = c.parentElement;
      if (!host) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const S = 26;
      const m = { x: -999, y: -999 };
      let w, h;

      const size = () => {
        const r = host.getBoundingClientRect();
        w = r.width;
        h = r.height;
        c.width = w * dpr;
        c.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (reduce) draw(0);
      };

      const draw = (t) => {
        ctx.clearRect(0, 0, w, h);
        for (let j = 0; j * S < h + S; j += 1) {
          for (let i = 0; i * S < w + S; i += 1) {
            const x = i * S + (j % 2) * S / 2;
            const y = j * S;
            const near = Math.max(0, 1 - Math.hypot(x - m.x, y - m.y) / 220);
            const wave = Math.sin(x * 0.011 + y * 0.008 + t * 0.0006) * 0.5 + 0.5;
            const r = S * (0.07 + 0.24 * wave * (y / h) + 0.5 * near);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 6.283);
            ctx.fillStyle = `rgba(255,255,255,${0.1 + 0.55 * near})`;
            ctx.fill();
          }
        }
        if (!reduce) halftoneRaf = requestAnimationFrame(draw);
      };

      const onMove = (e) => {
        const r = c.getBoundingClientRect();
        m.x = e.clientX - r.left;
        m.y = e.clientY - r.top;
      };
      const onLeave = () => {
        m.x = -999;
        m.y = -999;
      };

      host.addEventListener('pointermove', onMove);
      host.addEventListener('pointerleave', onLeave);
      window.addEventListener('resize', size);
      size();
      if (!reduce) halftoneRaf = requestAnimationFrame(draw);

      return () => {
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerleave', onLeave);
        window.removeEventListener('resize', size);
        if (halftoneRaf) cancelAnimationFrame(halftoneRaf);
      };
    };

    let pressRaf = null;
    const press = () => {
      const el = document.querySelector('.lp-press');
      if (!el) return;

      const update = () => {
        const r = el.getBoundingClientRect();
        const p = reduce ? 1 : clamp(-r.top / (r.height - window.innerHeight));
        el.style.setProperty('--plate', String(clamp(p / 0.25) - clamp((p - 0.45) / 0.2)));
        el.style.setProperty('--ink', String(clamp((p - 0.3) / 0.15)));
        el.dataset.step = String(Math.min(3, Math.floor(p * 4)));
        if (!reduce) pressRaf = requestAnimationFrame(update);
      };

      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
      return () => {
        window.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
        if (pressRaf) cancelAnimationFrame(pressRaf);
      };
    };

    const cleanupHalftone = halftone();
    const cleanupPress = press();
    return () => {
      cleanupHalftone?.();
      cleanupPress?.();
    };
  }, []);

  return (
    <div className="lp-root">
      <header className="lp-hero">
        <canvas className="lp-screen" aria-hidden="true"></canvas>
        <nav className="lp-top">
          <span className="lp-tiny">يوزرسيف</span>
          <a href="#services">خدماتنا</a>
          <a href="#request" className="lp-pill">ابدأ طلبك</a>
        </nav>
        <div className="lp-stage">
          <h1 className="lp-mark" aria-label="يوزرسيف">
            <span className="lp-g lp-g1" aria-hidden="true">
              يوزرسيف
            </span>
            <span className="lp-g lp-g2" aria-hidden="true">
              يوزرسيف
            </span>
            <span className="lp-m">يوزرسيف</span>
          </h1>
          <p className="lp-tag">خليك مختلف .. خليك يوزرسيف</p>
        </div>
        <div className="lp-ctas">
          <a className="lp-btn lp-btn--solid" href="#request">
            ابدأ طلبك
          </a>
          <a className="lp-btn" href="https://wa.me/201116891025" target="_blank" rel="noreferrer">
            كلمنا على واتساب
          </a>
        </div>
      </header>

      <section className="lp-press" id="request">
        <div className="lp-sticky">
          <div className="lp-copy">
            <h2>من الفكرة للطباعة، في طلب واحد.</h2>
            <ol>
              <li>
                <b>1</b>
                <div>
                  <strong>اختار منتجك</strong>
                  <p>تيشيرت، هودي، كاب، ماج أو كفر موبايل.</p>
                </div>
              </li>
              <li>
                <b>2</b>
                <div>
                  <strong>حدّد التفاصيل</strong>
                  <p>الكمية واللون والمقاسات ومكان الطباعة.</p>
                </div>
              </li>
              <li>
                <b>3</b>
                <div>
                  <strong>ارفع تصميمك</strong>
                  <p>ارفع الملف، أو قولنا فكرتك ونساعدك فيها.</p>
                </div>
              </li>
              <li>
                <b>4</b>
                <div>
                  <strong>تابع طلبك</strong>
                  <p>هتشوف القرار والخطوة الجاية برقم طلبك.</p>
                </div>
              </li>
            </ol>
            <Link className="lp-btn lp-btn--solid" to="/home">
              ابدأ طلبك دلوقتي
            </Link>
          </div>
          <svg viewBox="0 0 300 320" className="lp-tee" role="img" aria-label="تيشيرت أسود تنزل عليه مكبس حراري فتظهر الطباعة">
            <path d="M95 20 L60 40 L10 95 L45 125 L75 100 L75 300 L225 300 L225 100 L255 125 L290 95 L240 40 L205 20 Q150 58 95 20Z" fill="#000" stroke="#ffffff33" stroke-width="2" />
            <text className="lp-ink" x="150" y="168" text-anchor="middle" font-size="38">
              خليك مختلف
            </text>
            <g className="lp-plate">
              <rect x="82" y="104" width="136" height="104" rx="8" />
              <rect x="94" y="116" width="112" height="80" rx="4" className="lp-plate-face" />
            </g>
          </svg>
        </div>
      </section>

      <section className="lp-services" id="services">
        <h2>بنطبع إيه؟</h2>
        <ul>
          <li>
            <Link to="/home">تيشيرتات</Link>
          </li>
          <li>
            <Link to="/home">هوديز وسويتشيرتات</Link>
          </li>
          <li>
            <Link to="/home">كابات</Link>
          </li>
          <li>
            <Link to="/home">ستيكرز ولابلز</Link>
          </li>
          <li>
            <Link to="/home">ماجات وهدايا ترويجية</Link>
          </li>
          <li>
            <Link to="/home">كفرات موبايل</Link>
          </li>
          <li>
            <Link to="/home">تصميمات خاصة</Link>
          </li>
        </ul>
        <small>القائمة من صفحة يوزرسيف الرسمية، والكتالوج النهائي يتأكد مع صاحب النشاط.</small>
      </section>

      <footer className="lp-foot">
        <p>يوزرسيف، طباعة وتخصيص في أسوان</p>
        <a href="https://wa.me/201116891025" target="_blank" rel="noreferrer">
          واتساب 01116891025
        </a>
      </footer>
    </div>
  );
}
