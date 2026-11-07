import React from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  Building2,
  Activity,
  GitBranch,
  Cpu,
  Sparkles,
  BarChart3,
  FileCheck2,
  Settings,
  ShieldAlert
} from 'lucide-react';
import { PortalLayout } from '@shared/components/layout/PortalLayout.jsx';

export default function AdminLayout() {
  const navItems = [
    { to: '/', label: 'System Overview', icon: LayoutDashboard },
    { to: '/users', label: 'User Management', icon: Users },
    { to: '/roles', label: 'Roles & Permissions', icon: Shield },
    { to: '/facilities', label: 'Health Facilities', icon: Building2 },
    { to: '/capacity-monitoring', label: 'Capacity Monitoring', icon: Activity },
    { to: '/referrals', label: 'Referral Monitoring', icon: GitBranch },
    { to: '/ai-management', label: 'AI Subsystems', icon: Cpu },
    { to: '/ai-performance', label: 'AI Performance', icon: Sparkles },
    { to: '/analytics', label: 'Platform Analytics', icon: BarChart3 },
    { to: '/audit-logs', label: 'Audit Logs', icon: FileCheck2 },
    { to: '/settings', label: 'System Settings', icon: Settings },
  ];

  const currentUser = {
    firstName: 'National',
    lastName: 'Administrator',
    role: 'SYSTEM_ADMINISTRATOR',
    email: 'admin@health.gov.et'
  };

  return (
    <PortalLayout
      portalId="administrator"
      portalName="CareConnect Ethiopia"
      portalSubtitle="System Administrator Portal"
      portalAccent="navy"
      portalIcon={Shield}
      navItems={navItems}
      facilityName="Ministry of Health Headquarters"
      facilityRegion="Federal Democratic Republic of Ethiopia"
      currentUser={currentUser}
      notificationCount={4}
    />
  );
}
