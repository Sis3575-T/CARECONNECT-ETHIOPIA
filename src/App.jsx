import React, { useState } from 'react';
import PortalNavigationHeader from './components/shared/PortalNavigationHeader';
import FourPortalsCollage from './components/collage/FourPortalsCollage';
import HealthCentrePortal from './components/health-centre/HealthCentrePortal';
import HospitalPortal from './components/hospital/HospitalPortal';
import TransportPortal from './components/transport/TransportPortal';
import AdminPortal from './components/admin/AdminPortal';
import { PORTAL_TYPES } from './shared/mockData';

export default function App() {
  const [activeView, setActiveView] = useState(PORTAL_TYPES.COLLAGE);
  const [language, setLanguage] = useState('en');

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'am' : 'en'));
  };

  return (
    <div className="min-h-screen bg-[#edf2f7] flex flex-col font-sans">
      {/* Top Universal Portal Navigator */}
      <PortalNavigationHeader
        activeView={activeView}
        onSelectView={setActiveView}
        language={language}
        onToggleLanguage={toggleLanguage}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col p-2 sm:p-4">
        {activeView === PORTAL_TYPES.COLLAGE && (
          <FourPortalsCollage
            onSelectPortal={(portalId) => setActiveView(portalId)}
          />
        )}

        {activeView === PORTAL_TYPES.HEALTH_CENTRE && (
          <div className="max-w-7xl mx-auto w-full flex-1">
            <HealthCentrePortal
              isCollageItem={false}
              onExpandPortal={() => {}}
            />
          </div>
        )}

        {activeView === PORTAL_TYPES.HOSPITAL && (
          <div className="max-w-7xl mx-auto w-full flex-1">
            <HospitalPortal
              isCollageItem={false}
              onExpandPortal={() => {}}
            />
          </div>
        )}

        {activeView === PORTAL_TYPES.TRANSPORT && (
          <div className="max-w-7xl mx-auto w-full flex-1">
            <TransportPortal
              isCollageItem={false}
              onExpandPortal={() => {}}
            />
          </div>
        )}

        {activeView === PORTAL_TYPES.ADMIN && (
          <div className="max-w-7xl mx-auto w-full flex-1">
            <AdminPortal
              isCollageItem={false}
              onExpandPortal={() => {}}
            />
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-500">
        <p>
          CareConnect Ethiopia (Version 1.0) • AI-Powered Smart Healthcare Referral and Patient Coordination System
        </p>
      </footer>
    </div>
  );
}
