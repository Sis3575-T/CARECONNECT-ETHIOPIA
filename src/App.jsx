import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PortalNavigationHeader from './components/shared/PortalNavigationHeader';
import FourPortalsCollage from './components/collage/FourPortalsCollage';
import HealthCentrePortal from './components/health-centre/HealthCentrePortal';
import HospitalPortal from './components/hospital/HospitalPortal';
import TransportPortal from './components/transport/TransportPortal';
import AdminPortal from './components/admin/AdminPortal';

export default function App() {
  const [language, setLanguage] = useState('en');

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'am' : 'en'));
  };

  return (
    <div className="min-h-screen bg-[#edf2f7] flex flex-col font-sans">
      {/* Universal Top Portal Navigator with Live Route URL tracking */}
      <PortalNavigationHeader
        language={language}
        onToggleLanguage={toggleLanguage}
      />

      {/* Main Routed Area */}
      <main className="flex-1 flex flex-col p-2 sm:p-4">
        <Routes>
          {/* Default 4-Portal Collage Overview */}
          <Route path="/" element={<FourPortalsCollage />} />
          <Route path="/collage" element={<FourPortalsCollage />} />

          {/* 1. Health Centre Portal (Dr. Alemayehu) */}
          <Route
            path="/health-centre"
            element={
              <div className="max-w-7xl mx-auto w-full flex-1">
                <HealthCentrePortal isCollageItem={false} />
              </div>
            }
          />
          <Route path="/health-center" element={<Navigate to="/health-centre" replace />} />

          {/* 2. Hospital Portal (Dr. Fitsum - Black Lion Hospital) */}
          <Route
            path="/hospital"
            element={
              <div className="max-w-7xl mx-auto w-full flex-1">
                <HospitalPortal isCollageItem={false} />
              </div>
            }
          />

          {/* 3. Transport Coordinator Portal (Abebe Kebede) */}
          <Route
            path="/transport"
            element={
              <div className="max-w-7xl mx-auto w-full flex-1">
                <TransportPortal isCollageItem={false} />
              </div>
            }
          />
          <Route path="/transport-coordinator" element={<Navigate to="/transport" replace />} />

          {/* 4. System Administrator Portal (Admin User) */}
          <Route
            path="/admin"
            element={
              <div className="max-w-7xl mx-auto w-full flex-1">
                <AdminPortal isCollageItem={false} />
              </div>
            }
          />
          <Route path="/system-admin" element={<Navigate to="/admin" replace />} />

          {/* Fallback to Collage View */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer Info with Active Route URLs */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <p>CareConnect Ethiopia (Version 1.0) • Dedicated Portal URLs:</p>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
            <span className="text-sky-700 font-bold">/health-centre</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">/hospital</span>
            <span>•</span>
            <span className="text-violet-700 font-bold">/transport</span>
            <span>•</span>
            <span className="text-blue-900 font-bold">/admin</span>
            <span>•</span>
            <span className="text-slate-800 font-bold">/collage</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
