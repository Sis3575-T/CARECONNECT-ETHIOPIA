import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HealthCentreLayout from './layouts/HealthCentreLayout';
import { ProtectedRoute, RoleRoute, UnauthorizedPage, NotFoundPage } from '@shared/router/index.js';
import { PORTALS } from '@shared/constants/portals.js';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';

// Core Dashboard & Login Pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Patient Management Workspace Pages
const PatientsPage = lazy(() => import('./pages/PatientsPage'));
const PatientRegisterPage = lazy(() => import('./pages/PatientRegisterPage'));
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage'));
const PatientEditPage = lazy(() => import('./pages/PatientEditPage'));

// Additional Health Centre Portal Pages
const CreateReferralPage = lazy(() => import('./pages/CreateReferralPage'));
const AllReferralsPage = lazy(() => import('./pages/AllReferralsPage'));
const ReferralDetailPage = lazy(() => import('./pages/ReferralDetailPage'));
const AIReviewPage = lazy(() => import('./pages/AIReviewPage'));
const HospitalsPage = lazy(() => import('./pages/HospitalsPage'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function RouteLoadingFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center" role="status" aria-label="Loading page content">
      <div className="flex flex-col items-center space-y-2">
        <Spinner size="lg" className="text-sky-600 dark:text-sky-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading CareConnect workspace...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
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
            
            {/* Patient Management Route Hierarchy */}
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/register" element={<PatientRegisterPage />} />
            <Route path="patients/:patientId" element={<PatientDetailPage />} />
            <Route path="patients/:patientId/edit" element={<PatientEditPage />} />

            {/* Referral Management & Tracking Hierarchy */}
            <Route path="create-referral" element={<CreateReferralPage />} />
            <Route path="referrals/new" element={<Navigate to="/create-referral" replace />} />
            <Route path="referrals" element={<AllReferralsPage />} />
            <Route path="referrals/:referralId" element={<ReferralDetailPage />} />
            <Route path="ai-review" element={<AIReviewPage />} />
            <Route path="hospitals" element={<HospitalsPage />} />
            <Route path="tracking" element={<TrackingPage />} />
            <Route path="tracking/:referralId" element={<ReferralDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage portalName="Health Centre" />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
