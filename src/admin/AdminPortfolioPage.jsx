import React, { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ErrorBlock, Loading } from '../components/Common.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';

const BLANK = {
  title: '',
  category: 'مطبوعات',
  image: '',
  description: '',
  isDemo: false,
  active: true,
  sortOrder: 100,
};

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

export default function AdminPortfolioPage() {
  const { show } = useToast();
  const [items, setItems] = useState([]);
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
      .get('/admin/portfolio')
      .then((body) => {
        if (alive) setItems(Array.isArray(body?.items) ? body.items : []);
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

  function openEdit(item) {
    setFormError(null);
    setEditing({
      id: item.id,
      title: item.title ?? '',
      category: item.category ?? 'مطبوعات',
      image: item.image ?? '',
      description: item.description ?? '',
      isDemo: Boolean(item.isDemo),
      active: Boolean(item.active),
      sortOrder: item.sortOrder ?? 100,
    });
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

    if (!editing.title.trim() || !editing.image.trim()) {
      setFormError('العنوان والصورة مطلوبان.');
      return;
    }

    const payload = {
      title: editing.title,
      category: editing.category,
      image: editing.image,
      description: editing.description,
      isDemo: editing.isDemo,
      active: editing.active,
      sortOrder: Number(editing.sortOrder) || 0,
    };

    setSaving(true);
    try {
      if (editing.id) {
        await api.patch(`/admin/portfolio/${editing.id}`, payload);
        show('تم تحديث العمل.', 'ok');
      } else {
        await api.post('/admin/portfolio', payload);
        show('تمت إضافة العمل.', 'ok');
      }
      setEditing(null);
      load();
    } catch (caught) {
      setFormError(caught.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item) {
    try {
      await api.patch(`/admin/portfolio/${item.id}`, { active: !item.active });
      show(item.active ? 'تم إخفاء العمل.' : 'تم إظهار العمل.', 'ok');
      load();
    } catch (caught) {
      show(caught.message, 'bad');
    }
  }

  async function remove(item) {
    if (!window.confirm(`حذف «${item.title}» نهائيًا؟ الخطوة دي مش هتترجع.`)) return;
    try {
      await api.del(`/admin/portfolio/${item.id}`);
      show('تم حذف العمل.', 'ok');
      load();
    } catch (caught) {
      show(caught.message, 'bad');
    }
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>معرض الأعمال</h1>
          <p>أضف أعمال جديدة، أو علّم العمل كنموذج توضيحي.</p>
        </div>
        <div className="admin-page-head__actions">
          <button type="button" className="btn btn--sm" onClick={openNew}>
            <Icon name="plus" />
            عمل جديد
          </button>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__head">
          <h2>الأعمال</h2>
          <span className="tiny-muted">{items.length} عمل</span>
        </div>

        {loading ? <Loading label="بنحمّل الأعمال…" /> : null}
        {error ? <ErrorBlock message={error} onRetry={load} /> : null}

        {!loading && !error && items.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الصورة</th>
                  <th>العنوان</th>
                  <th>القسم</th>
                  <th>نموذج</th>
                  <th>الحالة</th>
                  <th>الترتيب</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="thumb-preview" style={{ width: 54, height: 54 }}>
                        <img src={item.image} alt="" loading="lazy" />
                      </span>
                    </td>
                    <td>
                      <strong>{item.title}</strong>
                      {item.description ? (
                        <div className="tiny-muted">{item.description}</div>
                      ) : null}
                    </td>
                    <td>{item.category}</td>
                    <td>{item.isDemo ? <span className="badge badge--demo">نموذج</span> : '—'}</td>
                    <td>
                      {item.active ? (
                        <span className="badge badge--ok">ظاهر</span>
                      ) : (
                        <span className="badge badge--muted">مخفي</span>
                      )}
                    </td>
                    <td>{item.sortOrder}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => openEdit(item)}>
                          تعديل
                        </button>
                        <button type="button" onClick={() => toggle(item)}>
                          {item.active ? 'إخفاء' : 'إظهار'}
                        </button>
                        <button type="button" className="danger" onClick={() => remove(item)}>
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

        {!loading && !error && !items.length ? (
          <div className="admin-empty">
            <Icon name="image" />
            مفيش أعمال مضافة. ابدأ بعمل جديد.
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
          <div className="modal" role="dialog" aria-modal="true" aria-label="بيانات العمل">
            <div className="modal__head">
              <h2>{editing.id ? 'تعديل عمل' : 'عمل جديد'}</h2>
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
                    <label htmlFor="pf-title">العنوان *</label>
                    <input
                      id="pf-title"
                      className="input"
                      value={editing.title}
                      onChange={(event) => update('title', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="pf-category">القسم</label>
                    <input
                      id="pf-category"
                      className="input"
                      value={editing.category}
                      onChange={(event) => update('category', event.target.value)}
                      placeholder="مطبوعات"
                    />
                  </div>

                  <div className="field field--full">
                    <label htmlFor="pf-image">رابط الصورة *</label>
                    <div className="upload-row">
                      <input
                        id="pf-image"
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
                      <span className="thumb-preview" style={{ marginTop: 8, width: 110, height: 82 }}>
                        <img src={editing.image} alt="" />
                      </span>
                    ) : null}
                  </div>

                  <div className="field field--full">
                    <label htmlFor="pf-description">الوصف</label>
                    <textarea
                      id="pf-description"
                      className="textarea"
                      value={editing.description}
                      onChange={(event) => update('description', event.target.value)}
                      maxLength={500}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="pf-sort">ترتيب العرض</label>
                    <input
                      id="pf-sort"
                      className="input"
                      type="number"
                      value={editing.sortOrder}
                      onChange={(event) => update('sortOrder', event.target.value)}
                    />
                  </div>

                  <div className="field field--full">
                    <div className="check-row">
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={editing.isDemo}
                          onChange={(event) => update('isDemo', event.target.checked)}
                        />
                        <span>نموذج توضيحي (مش عمل عميل حقيقي)</span>
                      </label>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={editing.active}
                          onChange={(event) => update('active', event.target.checked)}
                        />
                        <span>ظاهر على الموقع</span>
                      </label>
                    </div>
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
                  {saving ? 'بنحفظ…' : 'حفظ العمل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
