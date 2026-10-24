import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useSite } from "../context/SiteContext.jsx";
import { telHref, waHref } from "../lib/format";

const NAV = [
  { to: "/", label: "الرئيسية", end: true },
  { to: "/services", label: "خدماتنا" },
  // { to: '/portfolio', label: 'أعمالنا' },
  { to: "/about", label: "من نحن" },
  { to: "/track", label: "تتبع طلبك" },
  { to: "/contact", label: "تواصل معنا" },
];

function Brand({ light = false }) {
  const { business } = useSite();

  return (
    <Link
      to="/"
      className="brand"
      aria-label={`${business.name} — الصفحة الرئيسية`}
    >
      <img
        className="brand__logo"
        src={light ? "/media/logo-snow.png" : "/media/logo-teal.png"}
        alt={business.name}
      />
      <span className="brand__meta">
        <strong className="brand__name">{business.name}</strong>
        <span className="brand__desc">{business.descriptor}</span>
      </span>
    </Link>
  );
}

export default function SiteLayout() {
  const { business, content, services } = useSite();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const announcement = content?.announcement || business.announcement;
  const whatsapp = waHref(business.whatsapp);

  return (
    <div className="site-shell">
      {announcement ? <div className="announce">{announcement}</div> : null}

      <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
        <div className="container header-inner">
          <Brand />

          <nav className="site-nav" aria-label="القائمة الرئيسية">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <Link to="/request" className="btn btn--sm">
              اطلب الآن
              <Icon name="arrowLeft" />
            </Link>
            <button
              type="button"
              className="menu-btn"
              onClick={() => setOpen(true)}
              aria-label="فتح القائمة"
              aria-expanded={open}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div
          className="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="القائمة"
        >
          <div className="mobile-drawer__top">
            <img src="/media/logo-snow.png" alt={business.name} />
            <button
              type="button"
              className="mobile-drawer__close"
              onClick={() => setOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <Icon name="close" />
            </button>
          </div>

          <nav aria-label="قائمة الموبايل">
            {NAV.map((item, index) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
                <span className="mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </NavLink>
            ))}
          </nav>

          <Link
            to="/request"
            className="btn btn--light"
            onClick={() => setOpen(false)}
          >
            ابدأ طلبك
            <Icon name="arrowLeft" />
          </Link>
          {whatsapp ? (
            <a
              className="btn btn--ghost"
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="whatsapp" />
              واتساب
            </a>
          ) : null}

          <div className="mobile-drawer__foot">
            <div>{business.address}</div>
            <div style={{ marginTop: 8 }}>
              <a href={telHref(business.phone) ?? "#"} dir="ltr">
                {business.phone}
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src="/media/logo-snow.png" alt={business.name} />
              <p>
                {business.name} — {business.descriptor} في أسوان.{" "}
                {business.tagline}
              </p>
              <p style={{ marginTop: 10 }}>{business.deliveryNote}</p>
            </div>

            <div className="footer-links">
              <h3 className="footer-title">روابط سريعة</h3>
              {NAV.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
              <Link to="/request">طلب تصميم</Link>
            </div>

            <div className="footer-links">
              <h3 className="footer-title">خدماتنا</h3>
              {services.slice(0, 5).map((service) => (
                <Link key={service.slug} to={`/services/${service.slug}`}>
                  {service.name}
                </Link>
              ))}
              <Link to="/services">كل الخدمات</Link>
            </div>

            <div className="footer-contact">
              <h3 className="footer-title">تواصل معنا</h3>
              <ul>
                <li>
                  <Icon name="mapPin" />
                  <span>{business.address}</span>
                </li>
                <li>
                  <Icon name="phone" />
                  <span dir="ltr">{business.phone}</span>
                </li>
                {business.whatsapp ? (
                  <li>
                    <Icon name="whatsapp" />
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      dir="ltr"
                    >
                      {business.whatsapp}
                    </a>
                  </li>
                ) : null}
                {business.email ? (
                  <li>
                    <Icon name="mail" />
                    <a href={`mailto:${business.email}`}>{business.email}</a>
                  </li>
                ) : null}
                {business.instagram ? (
                  <li>
                    <Icon name="instagram" />
                    <a
                      href={`https://instagram.com/${business.instagram}`}
                      target="_blank"
                      rel="noreferrer"
                      dir="ltr"
                    >
                      @{business.instagram}
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {business.name}. جميع الحقوق محفوظة.
            </span>
            <span className="inline">
              <Link to="/privacy">سياسة الخصوصية</Link>
              <span aria-hidden="true">·</span>
              <Link to="/terms">الشروط والأحكام</Link>
              <span aria-hidden="true">·</span>
              <Link to="/refund">الاسترجاع</Link>
              <span aria-hidden="true">·</span>
              <Link to="/admin">لوحة التحكم</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
