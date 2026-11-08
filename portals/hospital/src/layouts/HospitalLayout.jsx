import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
  Bed,
  Layers,
  BedDouble,
  Activity,
  LogOut,
  MessageSquare,
  BarChart3,
  Settings,
  Building2
} from 'lucide-react';
import { PortalLayout } from '@shared/components/layout/PortalLayout.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { ROLE_LABELS } from '@shared/constants/roles.js';
import { hospitalService } from '../services/hospitalService.js';

export default function HospitalLayout() {
  const { user } = useAuth();
  const [facilityData, setFacilityData] = useState(null);
  const [counts, setCounts] = useState({
    incoming: 0,
    pending: 0,
    unreadNotifications: 0
  });

  // Fetch real hospital facility details and active referral counts
  useEffect(() => {
    let isMounted = true;

    async function loadHospitalContext() {
      // 1. Fetch Facility Profile if facilityId is present
      if (user?.facilityId) {
        try {
          const fac = await hospitalService.getHospitalProfile(user.facilityId);
          if (isMounted && fac) {
            setFacilityData(fac);
          }
        } catch {
          // Keep resilient fallback
        }
      }

      // 2. Fetch live metrics for navigation badges
      try {
        const summary = await hospitalService.getDashboardSummary();
        if (isMounted && summary) {
          setCounts({
            incoming: summary.totalIncoming || 0,
            pending: summary.pendingTriageCount || 0,
            unreadNotifications: summary.unreadNotifications || 0
          });
        }
      } catch {
        // Keep resilient fallback
      }
    }

    loadHospitalContext();
    return () => {
      isMounted = false;
    };
  }, [user?.facilityId]);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/incoming', label: 'Incoming Referrals', icon: Inbox, badge: counts.incoming > 0 ? counts.incoming : null },
    { to: '/pending', label: 'Pending Triage', icon: Clock, badge: counts.pending > 0 ? counts.pending : null },
    { to: '/accepted', label: 'Accepted Cases', icon: CheckCircle },
    { to: '/rejected', label: 'Rejected Cases', icon: XCircle },
    { to: '/arrivals', label: 'Patient Arrivals', icon: Bed },
    { to: '/admissions', label: 'Inpatient Admissions', icon: Activity },
    { to: '/discharges', label: 'Discharge & Transfer', icon: LogOut },
    { to: '/services', label: 'Facility Services', icon: Layers },
    { to: '/capacity', label: 'Capacity Management', icon: BedDouble },
    { to: '/feedback', label: 'Clinical Feedback', icon: MessageSquare },
    { to: '/reports', label: 'Hospital Reports', icon: BarChart3 },
    { to: '/settings', label: 'Profile & Settings', icon: Settings },
  ];

  const currentUser = {
    firstName: user?.firstName || user?.first_name || (user?.name ? user.name.split(' ')[0] : 'Dr.'),
    lastName: user?.lastName || user?.last_name || (user?.name ? user.name.split(' ').slice(1).join(' ') : 'Specialist'),
    role: ROLE_LABELS[user?.role] || user?.roleName || user?.role || 'Hospital Triage Clinician',
    email: user?.email || 'specialist@hospital.et'
  };

  const hospitalFacilityName = facilityData?.name || user?.facilityName || user?.facility_name || 'Specialized Referral Hospital';
  const hospitalRegion = facilityData?.region
    ? `${facilityData?.zone || facilityData?.woreda || ''} ${facilityData.region}`.trim()
    : (user?.facilityRegion || 'National Health System');

  return (
    <PortalLayout
      portalId="hospital"
      portalName="CareConnect Ethiopia"
      portalSubtitle="Hospital Portal"
      portalAccent="emerald"
      portalIcon={Building2}
      navItems={navItems}
      facilityName={hospitalFacilityName}
      facilityRegion={hospitalRegion}
      currentUser={currentUser}
      notificationCount={counts.unreadNotifications}
    />
  );
}
