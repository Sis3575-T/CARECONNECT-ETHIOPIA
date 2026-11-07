import React from 'react';
import {
  LayoutDashboard,
  Car,
  Truck,
  Navigation,
  Map,
  BarChart3,
  Settings
} from 'lucide-react';
import { PortalLayout } from '@shared/components/layout/PortalLayout.jsx';

export default function TransportLayout() {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/requests', label: 'Transport Requests', icon: Car },
    { to: '/in-transit', label: 'In Transit Transfers', icon: Navigation },
    { to: '/map', label: 'Live Map & Tracking', icon: Map },
    { to: '/resources', label: 'Ambulance Fleet', icon: Truck },
    { to: '/reports', label: 'Transport Reports', icon: BarChart3 },
    { to: '/settings', label: 'Profile & Settings', icon: Settings },
  ];

  const currentUser = {
    firstName: 'Abebe',
    lastName: 'Kebede',
    role: 'Transport Coordinator',
    email: 'abebe.kebede@transport.et'
  };

  return (
    <PortalLayout
      portalId="transport"
      portalName="CareConnect Ethiopia"
      portalSubtitle="Transport Coordinator Portal"
      portalAccent="purple"
      portalIcon={Truck}
      navItems={navItems}
      facilityName="Central Emergency Dispatch Command"
      facilityRegion="Addis Ababa Fleet Hub"
      currentUser={currentUser}
      notificationCount={1}
    />
  );
}
