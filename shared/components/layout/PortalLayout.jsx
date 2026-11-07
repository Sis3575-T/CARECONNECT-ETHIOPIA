import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn.js';
import SharedHeader from './SharedHeader.jsx';
import SharedSidebar from './SharedSidebar.jsx';
import SharedMobileNav from './SharedMobileNav.jsx';
import Breadcrumbs from './Breadcrumbs.jsx';
import SkipToContent from './SkipToContent.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Alert } from '../feedback/Alert.jsx';

/**
 * CareConnect Ethiopia - Unified Portal Application Layout
 * Features full WCAG 2.1 AA accessibility (landmarks, skip link, mobile drawer focus).
 */
export function PortalLayout({
  portalId = 'health-centre',
  portalName = 'CareConnect Ethiopia',
  portalSubtitle = 'Portal',
  portalAccent = 'emerald',
  portalIcon,
  navItems = [],
  facilityName = 'Health Facility',
  facilityRegion = 'Addis Ababa',
  currentUser,
  notificationCount = 0,
  onNotificationClick,
  customHeaderRight,
  children
}) {
  const { user: authUser, logout: authLogout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const navigate = useNavigate();

  const activeUser = currentUser || authUser || {
    firstName: 'Clinician',
    lastName: 'User',
    role: 'Clinical Officer'
  };

  const handleLogout = async () => {
    await authLogout();
    navigate('/login');
  };

  useEffect(() => {
    function handleSessionExpired() {
      setSessionExpiredNotice(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
    window.addEventListener('careconnect:session_expired', handleSessionExpired);
    return () => window.removeEventListener('careconnect:session_expired', handleSessionExpired);
  }, [navigate]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'am' : 'en'));
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-150">
      {/* Keyboard Accessibility Skip Link */}
      <SkipToContent targetId="main-content" />

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
          user={activeUser}
          notificationCount={notificationCount}
          onNotificationClick={onNotificationClick}
          onLogout={handleLogout}
          onMenuToggle={() => setIsMobileNavOpen(true)}
          language={language}
          onToggleLanguage={toggleLanguage}
        />

        {sessionExpiredNotice && (
          <div className="px-4 sm:px-6 pt-3">
            <Alert
              variant="warning"
              title="Session Expired"
              description="Your healthcare session has ended for clinical data privacy. Redirecting to sign in..."
            />
          </div>
        )}

        {/* Breadcrumbs & Viewport Main */}
        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl w-full mx-auto focus:outline-none"
        >
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
