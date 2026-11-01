import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import RolesPermissionsPage from './pages/RolesPermissionsPage';
import FacilitiesPage from './pages/FacilitiesPage';
import CapacityMonitoringPage from './pages/CapacityMonitoringPage';
import ReferralMonitoringPage from './pages/ReferralMonitoringPage';
import AIManagementPage from './pages/AIManagementPage';
import AIPerformancePage from './pages/AIPerformancePage';
import AnalyticsPage from './pages/AnalyticsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="roles" element={<RolesPermissionsPage />} />
          <Route path="facilities" element={<FacilitiesPage />} />
          <Route path="capacity-monitoring" element={<CapacityMonitoringPage />} />
          <Route path="referrals" element={<ReferralMonitoringPage />} />
          <Route path="ai-management" element={<AIManagementPage />} />
          <Route path="ai-performance" element={<AIPerformancePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
