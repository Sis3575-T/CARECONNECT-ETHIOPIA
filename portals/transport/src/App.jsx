import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TransportLayout from './layouts/TransportLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import TransportRequestsPage from './pages/TransportRequestsPage';
import InTransitPage from './pages/InTransitPage';
import MapTrackingPage from './pages/MapTrackingPage';
import TransportResourcesPage from './pages/TransportResourcesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<TransportLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="requests" element={<TransportRequestsPage />} />
          <Route path="in-transit" element={<InTransitPage />} />
          <Route path="map" element={<MapTrackingPage />} />
          <Route path="resources" element={<TransportResourcesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
