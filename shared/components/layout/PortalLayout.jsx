import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn.js';
import SharedHeader from './SharedHeader.jsx';
import SharedSidebar from './SharedSidebar.jsx';
import SharedMobileNav from './SharedMobileNav.jsx';
import Breadcrumbs from './Breadcrumbs.jsx';

/**
 * CareConnect Ethiopia - Unified Portal Application Layout
 * Provides responsive shell for Health Centre, Hospital, Transport, and Admin portals.
 */
export function PortalLayout({
  portalId = 'health-centre',
  portalName = 'CareConnect Ethiopia',
  portalSubtitle = 'Portal',
  portalAccent = 'emerald', // emerald, sky, purple, navy
  portalIcon,
  navItems = [],
  facilityName = 'Health Facility',
  facilityRegion = 'Addis Ababa',
  currentUser = {
    firstName: 'Clinician',
    lastName: 'User',
    role: 'Clinical Officer'
  },
  notificationCount = 0,
  onNotificationClick,
  customHeaderRight,
  children
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      localStorage.removeItem('careconnect_access_token');
      localStorage.removeItem('careconnect_user');
      localStorage.removeItem('careconnect_token');
    } catch {
      // ignore
    }
    navigate('/login');
  };

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'am' : 'en'));
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-150">
      {/* Desktop Collapsible Sidebar */}
      <SharedSidebar
        portalName={portalName}
        portalSubtitle={portalSubtitle}
        portalAccent={portalAccent}
        portalIcon={portalIcon}
        navItems={navItems}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        facilityName={facilityName}
        facilityRegion={facilityRegion}
      />

      {/* Slide-out Mobile Navigation */}
      <SharedMobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        portalName={portalName}
        portalSubtitle={portalSubtitle}
        portalAccent={portalAccent}
        portalIcon={portalIcon}
        navItems={navItems}
        facilityName={facilityName}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Universal Top Header */}
        <SharedHeader
          portalTitle={portalName}
          portalSubtitle={portalSubtitle}
          portalColor={portalAccent}
          facilityName={facilityName}
          facilityRegion={facilityRegion}
          user={currentUser}
          notificationCount={notificationCount}
          onNotificationClick={onNotificationClick}
          onLogout={handleLogout}
          onMenuToggle={() => setIsMobileNavOpen(true)}
          language={language}
          onToggleLanguage={toggleLanguage}
        />

        {/* Breadcrumbs & Viewport Main */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl w-full mx-auto">
          <div className="mb-4">
            <Breadcrumbs />
          </div>

          {/* Child content or router Outlet */}
          <div className="animate-in fade-in duration-150">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PortalLayout;
