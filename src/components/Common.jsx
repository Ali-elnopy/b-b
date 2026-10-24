import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { statusLabel, statusTone } from '../../shared/status.js';

export function Breadcrumb({ items = [] }) {
  return (
    <nav className="breadcrumb" aria-label="مسار الصفحة">
      <Link to="/">الرئيسية</Link>
      {items.map((item) => (
        <React.Fragment key={item.label}>
          <span aria-hidden="true">/</span>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function PageHead({ eyebrow, title, lead, crumbs, actions }) {
  return (
    <section className="page-head">
      <div className="container page-head__inner">
        <div>
          {crumbs ? <Breadcrumb items={crumbs} /> : null}
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {lead ? <p className="lead">{lead}</p> : null}
        </div>
        {actions ? <div className="inline">{actions}</div> : null}
      </div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, lead, action }) {
  return (
    <div className="section-head">
      <div className="section-head__text">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="h2">{title}</h2>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Loading({ label = 'بنحمّل البيانات…' }) {
  return (
    <div className="loading-block">
      <span className="spinner spinner--dark" />
      {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }) {
  return (
    <div className="notice notice--bad" role="alert">
      <Icon name="alert" />
      <div>
        <div>{message}</div>
        {onRetry ? (
          <button type="button" className="link-arrow" onClick={onRetry} style={{ marginTop: 8 }}>
            جرّب تاني
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  return (
    <span className="status-pill" data-tone={statusTone(status)}>
      {statusLabel(status)}
    </span>
  );
}

function ServiceMedia({ service, className = 'service-card__media' }) {
  const brand = !service.image;

  return (
    <div className={`${className}${brand ? ' service-card__media--brand' : ''}`}>
      <img src={brand ? '/media/mark.png' : service.image} alt={service.imageAlt || service.name} loading="lazy" />
      <span className="service-card__tag">{service.category}</span>
    </div>
  );
}

export function ServiceCard({ service }) {
  return (
    <Link to={`/services/${service.slug}`} className="service-card">
      <ServiceMedia service={service} />
      <div className="service-card__body">
        <h3 className="service-card__title">{service.name}</h3>
        {service.subtitle ? <span className="service-card__sub">{service.subtitle}</span> : null}
        <p className="service-card__text">{service.summary || service.description}</p>
        <div className="service-card__foot">
          <span>ابدأ من قطعة واحدة</span>
          <span className="service-card__arrow">
            <Icon name="arrowLeft" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PortfolioCard({ item }) {
  return (
    <figure className="portfolio-card">
      <img src={item.image} alt={item.title} loading="lazy" />
      <figcaption className="portfolio-card__body">
        <div>
          <div className="portfolio-card__title">{item.title}</div>
          <span className="portfolio-card__cat">{item.category}</span>
        </div>
        {item.isDemo ? <span className="badge badge--demo">نموذج</span> : null}
      </figcaption>
    </figure>
  );
}
