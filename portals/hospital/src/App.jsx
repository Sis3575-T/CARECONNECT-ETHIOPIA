import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HospitalLayout from './layouts/HospitalLayout';
import { ProtectedRoute, RoleRoute, UnauthorizedPage, NotFoundPage } from '@shared/router/index.js';
import { PORTALS } from '@shared/constants/portals.js';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';

// Core Dashboard & Login Pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Referral Triage & Inbox Pages
const IncomingReferralsPage = lazy(() => import('./pages/IncomingReferralsPage'));
const ReferralDetailPage = lazy(() => import('./pages/ReferralDetailPage'));
const ReferralReviewPage = lazy(() => import('./pages/ReferralReviewPage'));
const PendingReferralsPage = lazy(() => import('./pages/PendingReferralsPage'));
const AcceptedReferralsPage = lazy(() => import('./pages/AcceptedReferralsPage'));
const RejectedReferralsPage = lazy(() => import('./pages/RejectedReferralsPage'));

// Hospital Operations & Capacity
const PatientArrivalsPage = lazy(() => import('./pages/PatientArrivalsPage'));
const PatientArrivalDetailPage = lazy(() => import('./pages/PatientArrivalDetailPage'));
const FacilityServicesPage = lazy(() => import('./pages/FacilityServicesPage'));
const CapacityManagementPage = lazy(() => import('./pages/CapacityManagementPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function RouteLoadingFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center" role="status" aria-label="Loading hospital workspace">
      <div className="flex flex-col items-center space-y-2">
        <Spinner size="lg" className="text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading Hospital Portal...</span>
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

          {/* Protected Hospital Workspace */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={PORTALS.HOSPITAL.allowedRoles}>
                  <HospitalLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />

            {/* Incoming Referrals Queue & Details */}
            <Route path="incoming" element={<IncomingReferralsPage />} />
            <Route path="referrals" element={<Navigate to="/incoming" replace />} />
            <Route path="referrals/:referralId" element={<ReferralDetailPage />} />
            <Route path="referrals/:referralId/review" element={<ReferralReviewPage />} />
            <Route path="incoming/:referralId" element={<ReferralDetailPage />} />
            <Route path="incoming/:referralId/review" element={<ReferralReviewPage />} />

            {/* Pending Triage & Status Queues */}
            <Route path="pending" element={<PendingReferralsPage />} />
            <Route path="accepted" element={<AcceptedReferralsPage />} />
            <Route path="rejected" element={<RejectedReferralsPage />} />

            {/* Inpatient & Operational Management */}
            <Route path="arrivals" element={<PatientArrivalsPage />} />
            <Route path="arrivals/:referralId" element={<PatientArrivalDetailPage />} />
            <Route path="referrals/:referralId/receiving" element={<PatientArrivalDetailPage />} />
            <Route path="incoming/:referralId/receiving" element={<PatientArrivalDetailPage />} />
            <Route path="services" element={<FacilityServicesPage />} />
            <Route path="capacity" element={<CapacityManagementPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Fallback 404 Route */}
            <Route path="*" element={<NotFoundPage portalName="Hospital" />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
