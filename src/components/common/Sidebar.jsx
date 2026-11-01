import React from 'react';
import CareConnectLogo from './CareConnectLogo';
import {
  LayoutDashboard,
  Users,
  Send,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  Inbox,
  Bed,
  MessageSquare,
  Car,
  Navigation,
  CheckCircle,
  Building2,
  Layers,
  Cpu,
  Activity
} from 'lucide-react';

export const PORTAL_MENU_ITEMS = {
  health_centre: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'referrals', label: 'Referrals', icon: Send },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true }
  ],
  hospital: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'incoming', label: 'Incoming Referrals', icon: Inbox },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'admissions', label: 'Admissions', icon: Bed },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true }
  ],
  transport: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'Transport Requests', icon: Car },
    { id: 'in-transit', label: 'In Transit', icon: Navigation },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true }
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'facilities', label: 'Facilities', icon: Building2 },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ai-monitoring', label: 'AI Monitoring', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true }
  ]
};

export default function Sidebar({
  portalType = 'health_centre',
  activeTab = 'dashboard',
  onSelectTab,
  isCollapsed = false,
  onLogout
}) {
  const items = PORTAL_MENU_ITEMS[portalType] || PORTAL_MENU_ITEMS.health_centre;

  // Active pill background color depending on portal type matching the screenshot
  const getActiveStyles = () => {
    switch (portalType) {
      case 'hospital':
        return 'bg-[#059669] text-white shadow-sm font-semibold'; // Emerald green
      case 'transport':
        return 'bg-[#6d28d9] text-white shadow-sm font-semibold'; // Vibrant violet/purple
      case 'admin':
        return 'bg-[#0284c7] text-white shadow-sm font-semibold'; // Deep Ocean Blue
      case 'health_centre':
      default:
        return 'bg-[#0284c7] text-white shadow-sm font-semibold'; // Sky/Blue
    }
  };

  const activeClasses = getActiveStyles();

  return (
    <aside className={`bg-white border-r border-slate-100 flex flex-col h-full transition-all duration-200 select-none ${
      isCollapsed ? 'w-16' : 'w-48 sm:w-52 shrink-0'
    }`}>
      {/* Brand Logo Header */}
      <div className="h-14 flex items-center px-4 border-b border-slate-100">
        {!isCollapsed ? (
          <CareConnectLogo size="sm" />
        ) : (
          <div className="mx-auto">
            <CareConnectLogo size="sm" className="[&>div:last-child]:hidden" />
          </div>
        )}
      </div>

      {/* Navigation Items List */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isLogout = item.isLogout;

          if (isLogout) {
            return (
              <div key={item.id} className="pt-2">
                <button
                  onClick={() => {
                    if (onLogout) onLogout();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors ${
                    isCollapsed ? 'justify-center px-2' : ''
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab && onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? activeClasses
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer System Indicator */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-100 text-[10px] text-slate-400 text-center">
          <span>CareConnect v1.0 • MoH Ethiopia</span>
        </div>
      )}
    </aside>
  );
}
