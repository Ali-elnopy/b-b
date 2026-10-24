import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const FALLBACK_BUSINESS = {
  name: 'يوزرسيف',
  descriptor: 'للطباعة والهدايا',
  tagline: 'خليك مختلف — خليك يوزرسيف',
  whatsapp: '01116891025',
  phone: '01006926440',
  website: 'www.yozersaf.com',
  instagram: 'yuzerseif',
  facebook: '',
  email: '',
  address: 'أسوان — أسفل سلم أطلس، بجانب أرض الجميل',
  hours: '',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=%D9%8A%D9%88%D8%B2%D8%B1%D8%B3%D9%8A%D9%81+%D8%A3%D8%B3%D9%88%D8%A7%D9%86',
  deliveryNote:
    'التوصيل متاح داخل أسوان بعد تأكيد التفاصيل. المناطق خارج أسوان تحتاج مراجعة من الفريق.',
  demoMode: true,
  launchApproved: false,
};

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState({ business: FALLBACK_BUSINESS, content: {} });
  const [services, setServices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    try {
      const [site, servicesBody, portfolioBody] = await Promise.all([
        api.get('/site', { signal }),
        api.get('/services', { signal }),
        api.get('/portfolio', { signal }),
      ]);

      setSettings({
        business: { ...FALLBACK_BUSINESS, ...(site?.business ?? {}) },
        content: site?.content ?? {},
      });
      setServices(Array.isArray(servicesBody?.services) ? servicesBody.services : []);
      setPortfolio(Array.isArray(portfolioBody?.items) ? portfolioBody.items : []);
    } catch (caught) {
      if (caught?.name === 'AbortError') return;
      setError(caught?.message ?? 'تعذر تحميل بيانات الموقع.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const value = useMemo(
    () => ({
      business: settings.business,
      content: settings.content,
      services,
      portfolio,
      loading,
      error,
      reload: load,
    }),
    [settings, services, portfolio, loading, error, load],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) throw new Error('useSite must be used inside SiteProvider');
  return context;
}
