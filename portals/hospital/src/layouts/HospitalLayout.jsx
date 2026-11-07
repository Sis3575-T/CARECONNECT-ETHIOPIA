import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
  Bed,
  Layers,
  BedDouble,
  MessageSquare,
  BarChart3,
  Settings,
  Building2
} from 'lucide-react';
import { PortalLayout } from '@shared/components/layout/PortalLayout.jsx';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function HospitalLayout() {
  const { referrals, facilities } = useCareConnectData();
  const currentHospital = facilities?.find(f => f.name?.includes('Tikur')) || facilities?.[0] || { name: 'Tikur Anbessa Hospital' };
  const pendingCount = (referrals || []).filter(r => r.status === 'Pending').length;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/incoming', label: 'Incoming Referrals', icon: Inbox, badge: referrals?.length || 0 },
    { to: '/pending', label: 'Pending Triage', icon: Clock, badge: pendingCount > 0 ? pendingCount : null },
    { to: '/accepted', label: 'Accepted Cases', icon: CheckCircle },
    { to: '/rejected', label: 'Rejected (FR-22)', icon: XCircle },
    { to: '/arrivals', label: 'Patient Admissions', icon: Bed },
    { to: '/services', label: 'Facility Services', icon: Layers },
    { to: '/capacity', label: 'Capacity Management', icon: BedDouble },
    { to: '/feedback', label: 'Clinical Feedback', icon: MessageSquare },
    { to: '/reports', label: 'Hospital Reports', icon: BarChart3 },
    { to: '/settings', label: 'Profile & Settings', icon: Settings },
  ];

  const currentUser = {
    firstName: 'Dr. Fitsum',
    lastName: 'Alemu',
    role: 'Hospital Triage Clinician',
    email: 'fitsum.alemu@hospital.et'
  };

  return (
    <PortalLayout
      portalId="hospital"
      portalName="CareConnect Ethiopia"
      portalSubtitle="Hospital Portal"
      portalAccent="emerald"
      portalIcon={Building2}
      navItems={navItems}
      facilityName={currentHospital.name || 'Tikur Anbessa Specialized Hospital'}
      facilityRegion="Lideta Sub-City, Addis Ababa"
      currentUser={currentUser}
      notificationCount={pendingCount || 3}
    />
  );
}
