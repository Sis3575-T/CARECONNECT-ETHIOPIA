import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  FileText,
  Building2,
  GitBranch,
  Sparkles,
  BarChart3,
  Bot,
  Settings,
  Building
} from 'lucide-react';
import { PortalLayout } from '@shared/components/layout/PortalLayout.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { ROLE_LABELS } from '@shared/constants/roles.js';
import { healthCentreService } from '../services/healthCentreService.js';

export default function HealthCentreLayout() {
  const { user } = useAuth();
  const [facilityData, setFacilityData] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/create-referral', label: 'Create Referral', icon: PlusCircle },
    { to: '/referrals', label: 'All Referrals', icon: FileText },
    { to: '/ai-review', label: 'AI OCR Review', icon: Sparkles },
    { to: '/hospitals', label: 'Hospital Matches', icon: Building2 },
    { to: '/tracking', label: 'Referral Tracking', icon: GitBranch },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/ai-assistant', label: 'AI Assistant', icon: Bot },
    { to: '/settings', label: 'Profile & Settings', icon: Settings },
  ];

  // Fetch real facility details and unread notification badge count
  useEffect(() => {
    let isMounted = true;

    async function loadFacilityAndAlerts() {
      if (user?.facilityId && !user?.facilityName) {
        try {
          const fac = await healthCentreService.getFacility(user.facilityId);
          if (isMounted && fac) {
            setFacilityData(fac);
          }
        } catch {
          // Keep resilient fallback
        }
      }

      try {
        const summary = await healthCentreService.getDashboardSummary(user?.facilityId);
        if (isMounted) {
          setUnreadCount(summary.unreadNotifications || 0);
        }
      } catch {
        // Keep resilient fallback
      }
    }

    loadFacilityAndAlerts();
    return () => {
      isMounted = false;
    };
  }, [user?.facilityId, user?.facilityName]);

  const currentUser = {
    firstName: user?.firstName || user?.first_name || (user?.name ? user.name.split(' ')[0] : 'Clinician'),
    lastName: user?.lastName || user?.last_name || (user?.name ? user.name.split(' ').slice(1).join(' ') : 'Officer'),
    role: ROLE_LABELS[user?.role] || user?.roleName || user?.role || 'Health Centre Referral Clinician',
    email: user?.email || 'clinician@health.et'
  };

  const facilityName = user?.facilityName || facilityData?.name || 'Yeka Health Centre';
  const facilityRegion =
    user?.facilityRegion ||
    (facilityData?.woreda && facilityData?.region ? `${facilityData.woreda}, ${facilityData.region}` : facilityData?.region) ||
    'Woreda 03, Addis Ababa';

  return (
    <PortalLayout
      portalId="health-centre"
      portalName="CareConnect Ethiopia"
      portalSubtitle="Health Centre Portal"
      portalAccent="sky"
      portalIcon={Building}
      navItems={navItems}
      facilityName={facilityName}
      facilityRegion={facilityRegion}
      currentUser={currentUser}
      notificationCount={unreadCount}
    />
  );
}
