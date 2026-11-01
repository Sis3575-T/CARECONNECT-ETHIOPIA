import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PortalNavigationHeader from './components/shared/PortalNavigationHeader';
import FourPortalsCollage from './components/collage/FourPortalsCollage';
import HealthCentrePortal from './components/health-centre/HealthCentrePortal';
import HospitalPortal from './components/hospital/HospitalPortal';
import TransportPortal from './components/transport/TransportPortal';
import AdminPortal from './components/admin/AdminPortal';
import StandalonePortBanner from './components/common/StandalonePortBanner';

export default function App() {
  const [language, setLanguage] = useState('en');
  const [currentPort, setCurrentPort] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPort(window.location.port || '');
    }
  }, []);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'am' : 'en'));
  };

  // If running on a dedicated port server, directly mount that standalone portal!
  if (currentPort === '3001') {
    return (
      <div className="min-h-screen bg-[#edf2f7] flex flex-col font-sans">
        <StandalonePortBanner
          currentPort="3001"
          portalName="Health Centre Portal (Dr. Alemayehu)"
          theme="sky"
        />
        <main className="flex-1 flex flex-col p-2 sm:p-4">
          <div className="max-w-7xl mx-auto w-full flex-1">
            <HealthCentrePortal isCollageItem={false} />
          </div>
        </main>
      </div>
    );
  }

  if (currentPort === '3002') {
    return (
      <div className="min-h-screen bg-[#edf2f7] flex flex-col font-sans">
        <StandalonePortBanner
          currentPort="3002"
          portalName="Hospital Portal (Dr. Fitsum - Black Lion Hospital)"
          theme="emerald"
        />
        <main className="flex-1 flex flex-col p-2 sm:p-4">
          <div className="max-w-7xl mx-auto w-full flex-1">
            <HospitalPortal isCollageItem={false} />
          </div>
        </main>
      </div>
    );
  }

  if (currentPort === '3003') {
    return (
      <div className="min-h-screen bg-[#edf2f7] flex flex-col font-sans">
        <StandalonePortBanner
          currentPort="3003"
          portalName="Transport Coordinator Portal (Abebe Kebede)"
          theme="purple"
        />
        <main className="flex-1 flex flex-col p-2 sm:p-4">
          <div className="max-w-7xl mx-auto w-full flex-1">
            <TransportPortal isCollageItem={false} />
          </div>
        </main>
      </div>
    );
  }

  if (currentPort === '3004') {
    return (
      <div className="min-h-screen bg-[#edf2f7] flex flex-col font-sans">
        <StandalonePortBanner
          currentPort="3004"
          portalName="System Administrator Portal (Admin User)"
          theme="admin"
        />
        <main className="flex-1 flex flex-col p-2 sm:p-4">
          <div className="max-w-7xl mx-auto w-full flex-1">
            <AdminPortal isCollageItem={false} />
          </div>
        </main>
      </div>
    );
  }

  // Otherwise (e.g. port 3000 or general dev), render the full router & collage
  return (
    <div className="min-h-screen bg-[#edf2f7] flex flex-col font-sans">
      {/* Universal Top Portal Navigator with Live Route & Port Tracking */}
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

      {/* Footer Info with Active Running Options */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-[1720px] mx-auto">
          <p>
            CareConnect Ethiopia (Version 1.0) • AI Healthcare Referral System
          </p>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-400">Run Individually:</span>
            <a href="http://localhost:3001" className="text-sky-700 hover:underline font-bold">:3001 Health Centre</a>
            <span>•</span>
            <a href="http://localhost:3002" className="text-emerald-700 hover:underline font-bold">:3002 Hospital</a>
            <span>•</span>
            <a href="http://localhost:3003" className="text-violet-700 hover:underline font-bold">:3003 Transport</a>
            <span>•</span>
            <a href="http://localhost:3004" className="text-blue-900 hover:underline font-bold">:3004 Admin</a>
            <span>•</span>
            <a href="http://localhost:3000" className="text-slate-800 hover:underline font-bold">:3000 Collage</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
