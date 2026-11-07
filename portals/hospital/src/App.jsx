import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HospitalLayout from './layouts/HospitalLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import IncomingReferralsPage from './pages/IncomingReferralsPage';
import PendingReferralsPage from './pages/PendingReferralsPage';
import AcceptedReferralsPage from './pages/AcceptedReferralsPage';
import RejectedReferralsPage from './pages/RejectedReferralsPage';
import PatientArrivalsPage from './pages/PatientArrivalsPage';
import FacilityServicesPage from './pages/FacilityServicesPage';
import CapacityManagementPage from './pages/CapacityManagementPage';
import FeedbackPage from './pages/FeedbackPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { ProtectedRoute, UnauthorizedPage, NotFoundPage } from '@shared/router/index.js';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HospitalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="incoming" element={<IncomingReferralsPage />} />
          <Route path="pending" element={<PendingReferralsPage />} />
          <Route path="accepted" element={<AcceptedReferralsPage />} />
          <Route path="rejected" element={<RejectedReferralsPage />} />
          <Route path="arrivals" element={<PatientArrivalsPage />} />
          <Route path="services" element={<FacilityServicesPage />} />
          <Route path="capacity" element={<CapacityManagementPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage portalName="Hospital" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
