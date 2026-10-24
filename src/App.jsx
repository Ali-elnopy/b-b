import React from "react";
import { Route, Routes } from "react-router-dom";

import SiteLayout from "./components/SiteLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import ServicesPage from "./pages/ServicesPage.jsx";
import ServiceDetailPage from "./pages/ServiceDetailPage.jsx";
import PortfolioPage from "./pages/PortfolioPage.jsx";
import RequestPage from "./pages/RequestPage.jsx";
import TrackPage from "./pages/TrackPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import PolicyPage from "./pages/PolicyPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

import AdminLayout from "./admin/AdminLayout.jsx";
import AdminLoginPage from "./admin/AdminLoginPage.jsx";
import AdminOverview from "./admin/AdminOverview.jsx";
import AdminRequestsPage from "./admin/AdminRequestsPage.jsx";
import AdminRequestDetailPage from "./admin/AdminRequestDetailPage.jsx";
import AdminServicesPage from "./admin/AdminServicesPage.jsx";
import AdminPortfolioPage from "./admin/AdminPortfolioPage.jsx";
import AdminSettingsPage from "./admin/AdminSettingsPage.jsx";
import AdminAuditPage from "./admin/AdminAuditPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:slug" element={<ServiceDetailPage />} />
        {/* <Route path="/portfolio" element={<PortfolioPage />} /> */}
        <Route path="/request" element={<RequestPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PolicyPage kind="privacy" />} />
        <Route path="/terms" element={<PolicyPage kind="terms" />} />
        <Route path="/refund" element={<PolicyPage kind="refund" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="requests/:id" element={<AdminRequestDetailPage />} />
        <Route path="services" element={<AdminServicesPage />} />
        <Route path="portfolio" element={<AdminPortfolioPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="*" element={<AdminOverview />} />
      </Route>
    </Routes>
  );
}
