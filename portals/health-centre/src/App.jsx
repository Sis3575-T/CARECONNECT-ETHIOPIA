import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HealthCentreLayout from './layouts/HealthCentreLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PatientsPage from './pages/PatientsPage';
import CreateReferralPage from './pages/CreateReferralPage';
import AllReferralsPage from './pages/AllReferralsPage';
import AIReviewPage from './pages/AIReviewPage';
import HospitalsPage from './pages/HospitalsPage';
import TrackingPage from './pages/TrackingPage';
import ReportsPage from './pages/ReportsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import SettingsPage from './pages/SettingsPage';
import { ProtectedRoute, RoleRoute, UnauthorizedPage, NotFoundPage } from '@shared/router/index.js';
import { PORTALS } from '@shared/constants/portals.js';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Route */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Access Denied Route */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Protected Health Centre Workspace */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={PORTALS.HEALTH_CENTRE.allowedRoles}>
                <HealthCentreLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="create-referral" element={<CreateReferralPage />} />
          <Route path="referrals" element={<AllReferralsPage />} />
          <Route path="ai-review" element={<AIReviewPage />} />
          <Route path="hospitals" element={<HospitalsPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="ai-assistant" element={<AIAssistantPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage portalName="Health Centre" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
