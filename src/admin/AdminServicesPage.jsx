import React, { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ErrorBlock, Loading } from '../components/Common.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { CATEGORIES } from '../../shared/services.js';

const BLANK = {
  name: '',
  slug: '',
  subtitle: '',
  category: CATEGORIES[0],
  summary: '',
  description: '',
  image: '',
  imageAlt: '',
  minQuantity: 1,
  sortOrder: 100,
  requiresSizes: false,
  needsArtwork: true,
  briefRequired: false,
  active: true,
  optionsText: '[]',
  guidanceText: '',
};

function toForm(service) {
  return {
    name: service.name ?? '',
    slug: service.slug ?? '',
    subtitle: service.subtitle ?? '',
    category: service.category ?? CATEGORIES[0],
    summary: service.summary ?? '',
    description: service.description ?? '',
    image: service.image ?? '',
    imageAlt: service.imageAlt ?? '',
    minQuantity: service.minQuantity ?? 1,
    sortOrder: service.sortOrder ?? 100,
    requiresSizes: Boolean(service.requiresSizes),
    needsArtwork: Boolean(service.needsArtwork),
    briefRequired: Boolean(service.briefRequired),
    active: Boolean(service.active),
    optionsText: JSON.stringify(service.options ?? [], null, 2),
    guidanceText: (service.guidance ?? []).join('\n'),
  };
}

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('صيغة الملف غير مدعومة.'));
      else resolve(result.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
    reader.readAsDataURL(file);
  });
}

export default function AdminServicesPage() {
  const { show } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [uploading, setUploading] = useState(false);

  function load() {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get('/admin/services')
      .then((body) => {
        if (alive) setServices(Array.isArray(body?.services) ? body.services : []);
      })
      .catch((caught) => {
        if (alive) setError(caught.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }

  useEffect(load, []);

  function update(key, value) {
    setEditing((prev) => ({ ...prev, [key]: value }));
  }

  function openNew() {
    setFormError(null);
    setEditing({ ...BLANK, id: null });
  }

  function openEdit(service) {
    setFormError(null);
    setEditing({ ...toForm(service), id: service.id });
  }

  async function uploadImage(file) {
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const data = await readBase64(file);
      const body = await api.post('/admin/media', { type: file.type, data });
      update('image', body.url);
      show('تم رفع الصورة.', 'ok');
    } catch (caught) {
      setFormError(caught.message);
    } finally {
      setUploading(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    setFormError(null);

    if (!editing.name.trim()) {
      setFormError('اسم الخدمة مطلوب.');
      return;
    }

    let options;
    try {
      options = JSON.parse(editing.optionsText || '[]');
      if (!Array.isArray(options)) throw new Error('لازم تكون مصفوفة.');
    } catch {
      setFormError('صيغة الخيارات لازم تكون JSON صحيح (مصفوفة).');
      return;
    }

    const payload = {
      name: editing.name,
      slug: editing.slug,
      subtitle: editing.subtitle,
      category: editing.category,
      summary: editing.summary,
      description: editing.description,
      image: editing.image,
      imageAlt: editing.imageAlt,
      minQuantity: Number(editing.minQuantity) || 1,
      sortOrder: Number(editing.sortOrder) || 0,
      requiresSizes: editing.requiresSizes,
      needsArtwork: editing.needsArtwork,
      briefRequired: editing.briefRequired,
      active: editing.active,
      options,
      guidance: editing.guidanceText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      if (editing.id) {
        await api.patch(`/admin/services/${editing.id}`, payload);
        show('تم تحديث الخدمة.', 'ok');
      } else {
        await api.post('/admin/services', payload);
        show('تمت إضافة الخدمة.', 'ok');
      }
      setEditing(null);
      load();
    } catch (caught) {
      setFormError(caught.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(service) {
    try {
      await api.patch(`/admin/services/${service.id}`, { active: !service.active });
      show(service.active ? 'تم إيقاف الخدمة.' : 'تم تفعيل الخدمة.', 'ok');
      load();
    } catch (caught) {
      show(caught.message, 'bad');
    }
  }

  async function remove(service) {
    if (!window.confirm(`إيقاف الخدمة «${service.name}»؟ مش هتظهر في الموقع، وتقدر ترجع تفعّلها لاحقًا.`)) {
      return;
    }
    try {
      await api.del(`/admin/services/${service.id}`);
      show('تم إيقاف الخدمة.', 'ok');
      load();
    } catch (caught) {
      show(caught.message, 'bad');
    }
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>الخدمات</h1>
          <p>إدارة كتالوج الخدمات والخيارات والملفات المطلوبة.</p>
        </div>
        <div className="admin-page-head__actions">
          <button type="button" className="btn btn--sm" onClick={openNew}>
            <Icon name="plus" />
            خدمة جديدة
          </button>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__head">
          <h2>الكتالوج</h2>
          <span className="tiny-muted">{services.length} خدمة</span>
        </div>

        {loading ? <Loading label="بنحمّل الخدمات…" /> : null}
        {error ? <ErrorBlock message={error} onRetry={load} /> : null}

        {!loading && !error && services.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الخدمة</th>
                  <th>القسم</th>
                  <th>الحد الأدنى</th>
                  <th>المتطلبات</th>
                  <th>الحالة</th>
                  <th>الترتيب</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <strong>{service.name}</strong>
                      <div className="tiny-muted mono">{service.slug}</div>
                    </td>
                    <td>{service.category}</td>
                    <td>{service.minQuantity}</td>
                    <td>
                      <div className="inline" style={{ gap: 4 }}>
                        {service.requiresSizes ? <span className="badge">مقاسات</span> : null}
                        {service.needsArtwork ? <span className="badge">ملف</span> : null}
                        {service.briefRequired ? <span className="badge">بريف</span> : null}
                      </div>
                    </td>
                    <td>
                      {service.active ? (
                        <span className="badge badge--ok">نشطة</span>
                      ) : (
                        <span className="badge badge--muted">متوقفة</span>
                      )}
                    </td>
                    <td>{service.sortOrder}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => openEdit(service)}>
                          تعديل
                        </button>
                        <button type="button" onClick={() => toggle(service)}>
                          {service.active ? 'إيقاف' : 'تفعيل'}
                        </button>
                        <button type="button" className="danger" onClick={() => remove(service)}>
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && !services.length ? (
          <div className="admin-empty">
            <Icon name="layers" />
            مفيش خدمات. ابدأ بإضافة خدمة جديدة.
          </div>
        ) : null}
      </div>

      {editing ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-label="بيانات الخدمة">
            <div className="modal__head">
              <h2>{editing.id ? 'تعديل خدمة' : 'خدمة جديدة'}</h2>
              <button
                type="button"
                className="modal__close"
                onClick={() => setEditing(null)}
                aria-label="إغلاق"
              >
                <Icon name="close" />
              </button>
            </div>

            <form onSubmit={save}>
              <div className="modal__body">
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="svc-name">الاسم *</label>
                    <input
                      id="svc-name"
                      className="input"
                      value={editing.name}
                      onChange={(event) => update('name', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="svc-slug">Slug</label>
                    <input
                      id="svc-slug"
                      className="input mono"
                      value={editing.slug}
                      onChange={(event) => update('slug', event.target.value)}
                      placeholder="apparel"
                      disabled={Boolean(editing.id)}
                      style={{ textAlign: 'left' }}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="svc-subtitle">العنوان الفرعي</label>
                    <input
                      id="svc-subtitle"
                      className="input"
                      value={editing.subtitle}
                      onChange={(event) => update('subtitle', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="svc-category">القسم</label>
                    <select
                      id="svc-category"
                      className="select"
                      value={editing.category}
                      onChange={(event) => update('category', event.target.value)}
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field field--full">
                    <label htmlFor="svc-summary">ملخص قصير</label>
                    <input
                      id="svc-summary"
                      className="input"
                      value={editing.summary}
                      onChange={(event) => update('summary', event.target.value)}
                      maxLength={400}
                    />
                  </div>

                  <div className="field field--full">
                    <label htmlFor="svc-description">الوصف</label>
                    <textarea
                      id="svc-description"
                      className="textarea"
                      value={editing.description}
                      onChange={(event) => update('description', event.target.value)}
                    />
                  </div>

                  <div className="field field--full">
                    <label htmlFor="svc-image">رابط الصورة</label>
                    <div className="upload-row">
                      <input
                        id="svc-image"
                        className="input"
                        value={editing.image}
                        onChange={(event) => update('image', event.target.value)}
                        placeholder="/media/…"
                        dir="ltr"
                        style={{ textAlign: 'left' }}
                      />
                      <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer' }}>
                        {uploading ? 'بنرفع…' : 'رفع صورة'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          hidden
                          onChange={(event) => uploadImage(event.target.files?.[0])}
                        />
                      </label>
                    </div>
                    {editing.image ? (
                      <span className="thumb-preview" style={{ marginTop: 8 }}>
                        <img src={editing.image} alt="" />
                      </span>
                    ) : null}
                  </div>

                  <div className="field">
                    <label htmlFor="svc-image-alt">نص بديل للصورة</label>
                    <input
                      id="svc-image-alt"
                      className="input"
                      value={editing.imageAlt}
                      onChange={(event) => update('imageAlt', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="svc-min">الحد الأدنى للكمية</label>
                    <input
                      id="svc-min"
                      className="input"
                      type="number"
                      min="1"
                      value={editing.minQuantity}
                      onChange={(event) => update('minQuantity', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="svc-sort">ترتيب العرض</label>
                    <input
                      id="svc-sort"
                      className="input"
                      type="number"
                      value={editing.sortOrder}
                      onChange={(event) => update('sortOrder', event.target.value)}
                    />
                  </div>

                  <div className="field field--full">
                    <span className="field-label">الخصائص</span>
                    <div className="check-row">
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={editing.requiresSizes}
                          onChange={(event) => update('requiresSizes', event.target.checked)}
                        />
                        <span>تحتاج توزيع مقاسات</span>
                      </label>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={editing.needsArtwork}
                          onChange={(event) => update('needsArtwork', event.target.checked)}
                        />
                        <span>تحتاج ملف تصميم</span>
                      </label>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={editing.briefRequired}
                          onChange={(event) => update('briefRequired', event.target.checked)}
                        />
                        <span>تحتاج بريف مكتوب</span>
                      </label>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={editing.active}
                          onChange={(event) => update('active', event.target.checked)}
                        />
                        <span>نشطة على الموقع</span>
                      </label>
                    </div>
                  </div>

                  <div className="field field--full">
                    <label htmlFor="svc-options">الخيارات (JSON)</label>
                    <textarea
                      id="svc-options"
                      className="textarea option-json"
                      value={editing.optionsText}
                      onChange={(event) => update('optionsText', event.target.value)}
                      spellCheck="false"
                    />
                    <span className="field__hint">
                      مصفوفة من العناصر، كل عنصر: key, label, type (select/text),
                      required, choices. مثال موجود في الخدمات الحالية.
                    </span>
                  </div>

                  <div className="field field--full">
                    <label htmlFor="svc-guidance">إرشادات (سطر لكل نصيحة)</label>
                    <textarea
                      id="svc-guidance"
                      className="textarea"
                      value={editing.guidanceText}
                      onChange={(event) => update('guidanceText', event.target.value)}
                    />
                  </div>
                </div>

                {formError ? (
                  <div className="notice notice--bad" style={{ marginTop: 14 }}>
                    <Icon name="alert" />
                    <span>{formError}</span>
                  </div>
                ) : null}
              </div>

              <div className="modal__foot">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn" disabled={saving || uploading}>
                  {saving ? 'بنحفظ…' : 'حفظ الخدمة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
