import React from 'react';
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

export default function HealthCentreLayout() {
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

  const currentUser = {
    firstName: 'Dr. Alemayehu',
    lastName: 'Tekle',
    role: 'Health Centre Referral Clinician',
    email: 'alemayehu.tekle@health.et'
  };

  return (
    <PortalLayout
      portalId="health-centre"
      portalName="CareConnect Ethiopia"
      portalSubtitle="Health Centre Portal"
      portalAccent="sky"
      portalIcon={Building}
      navItems={navItems}
      facilityName="Yeka Health Centre"
      facilityRegion="Woreda 03, Addis Ababa"
      currentUser={currentUser}
      notificationCount={2}
    />
  );
}
