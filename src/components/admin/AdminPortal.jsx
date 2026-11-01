import React, { useState } from 'react';
import Sidebar from '../common/Sidebar';
import TopHeader from '../common/TopHeader';
import StatCard from '../common/StatCard';
import PlatformAnalyticsChart from './PlatformAnalyticsChart';
import AIPerformanceCard from './AIPerformanceCard';
import AIModelMetricsModal from './AIModelMetricsModal';
import { Users, Building2, Send, CheckCircle2 } from 'lucide-react';
import { INITIAL_ADMIN_STATS } from '../../shared/mockData';

export default function AdminPortal({ isCollageItem = false, onExpandPortal }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAiMetricsOpen, setIsAiMetricsOpen] = useState(false);

  // Stats matching screenshot: 1,245 | 89 | 12,430 | 99.9%
  const stats = {
    totalUsers: '1,245',
    healthFacilities: '89',
    totalReferrals: '12,430',
    systemUptime: '99.9%'
  };

  return (
    <div className={`bg-slate-50 flex h-full min-h-[560px] overflow-hidden rounded-xl border border-slate-200/90 shadow-sm ${
      isCollageItem ? 'text-xs' : 'text-sm'
    }`}>
      {/* Sidebar */}
      <Sidebar
        portalType="admin"
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isCollageItem ? false : isSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
        <TopHeader
          userName="Admin User"
          userSubtitle="System Admin"
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          portalTheme="admin"
        />

        <div className="p-4 sm:p-5 space-y-4 flex-1">
          {/* Welcome Title */}
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
              System Overview
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Monitor and manage the entire CareConnect Ethiopia platform
            </p>
          </div>

          {/* 4 Stat Cards Row matching screenshot */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            <StatCard
              icon={Users}
              iconColor="blue"
              title="Total Users"
              value={stats.totalUsers}
            />
            <StatCard
              icon={Building2}
              iconColor="blue"
              title="Health Facilities"
              value={stats.healthFacilities}
            />
            <StatCard
              icon={Send}
              iconColor="blue"
              title="Total Referrals"
              value={stats.totalReferrals}
            />
            <StatCard
              icon={CheckCircle2}
              iconColor="green"
              title="System Uptime"
              value={stats.systemUptime}
            />
          </div>

          {/* Middle Section: Platform Analytics + AI Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <PlatformAnalyticsChart />
            <AIPerformanceCard
              onOpenDetails={() => setIsAiMetricsOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* AI Model Metrics Modal */}
      <AIModelMetricsModal
        isOpen={isAiMetricsOpen}
        onClose={() => setIsAiMetricsOpen(false)}
      />
    </div>
  );
}
