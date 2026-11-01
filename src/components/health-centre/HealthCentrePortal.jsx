import React, { useState } from 'react';
import Sidebar from '../common/Sidebar';
import TopHeader from '../common/TopHeader';
import StatCard from '../common/StatCard';
import ReferralTrendChart from './ReferralTrendChart';
import AIRecommendationCard from './AIRecommendationCard';
import RecentReferralsTable from './RecentReferralsTable';
import AIRecommendationDetailsModal from './AIRecommendationDetailsModal';
import CreateReferralModal from './CreateReferralModal';
import AIAssistantDrawer from './AIAssistantDrawer';
import { Users, Send, Clock, CheckCircle, Plus } from 'lucide-react';
import { INITIAL_HEALTH_CENTRE_REFERRALS } from '../../shared/mockData';

export default function HealthCentrePortal({ isCollageItem = false, onExpandPortal }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [referrals, setReferrals] = useState(INITIAL_HEALTH_CENTRE_REFERRALS);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);

  // Stats matching screenshot: 248, 72, 18, 92%
  const [stats, setStats] = useState({
    totalPatients: 248,
    referralsSent: 72,
    pendingReferrals: 18,
    completionRate: '92%'
  });

  const handleCreateReferral = (newRef) => {
    setReferrals(prev => [newRef, ...prev]);
    setStats(prev => ({
      ...prev,
      referralsSent: prev.referralsSent + 1,
      pendingReferrals: prev.pendingReferrals + 1
    }));
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'ai-assistant') {
      setIsAiAssistantOpen(true);
    }
  };

  return (
    <div className={`bg-slate-50 flex h-full min-h-[560px] overflow-hidden rounded-xl border border-slate-200/90 shadow-sm ${
      isCollageItem ? 'text-xs' : 'text-sm'
    }`}>
      {/* Left Sidebar */}
      <Sidebar
        portalType="health_centre"
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        isCollapsed={isCollageItem ? false : isSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
        {/* Top Header */}
        <TopHeader
          userName="Dr. Alemayehu"
          userSubtitle="Health Centre"
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          portalTheme="sky"
        />

        {/* Dashboard Content Container */}
        <div className="p-4 sm:p-5 space-y-4 flex-1">
          {/* Welcome Title & Subtitle */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Welcome, Dr. Alemayehu!
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Manage referrals and get AI recommendations
              </p>
            </div>

            {/* Quick Action Button */}
            {!isCollageItem && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Referral</span>
              </button>
            )}
          </div>

          {/* 4 Stat Cards Row matching screenshot */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            <StatCard
              icon={Users}
              iconColor="blue"
              title="Total Patients"
              value={stats.totalPatients}
            />
            <StatCard
              icon={Send}
              iconColor="blue"
              title="Referrals Sent"
              value={stats.referralsSent}
            />
            <StatCard
              icon={Clock}
              iconColor="yellow"
              title="Pending Referrals"
              value={stats.pendingReferrals}
            />
            <StatCard
              icon={CheckCircle}
              iconColor="green"
              title="Completion Rate"
              value={stats.completionRate}
            />
          </div>

          {/* Middle Section: Referral Trend + AI Recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <ReferralTrendChart />
            <AIRecommendationCard
              onViewDetails={() => setIsAiModalOpen(true)}
            />
          </div>

          {/* Bottom Section: Recent Referrals Table */}
          <RecentReferralsTable
            referrals={referrals.slice(0, 3)}
            onSelectReferral={(ref) => setSelectedReferral(ref)}
            onViewAll={() => {
              if (onExpandPortal) onExpandPortal();
            }}
          />
        </div>
      </div>

      {/* Modals & Drawers */}
      <AIRecommendationDetailsModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSelectHospital={() => {
          setIsAiModalOpen(false);
          setIsCreateModalOpen(true);
        }}
      />

      <CreateReferralModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmitReferral={handleCreateReferral}
      />

      <AIAssistantDrawer
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
      />

      {/* Selected Referral Quick View Modal */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{selectedReferral.patientName}</h4>
                <p className="text-xs text-slate-500">{selectedReferral.id} • {selectedReferral.service}</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                {selectedReferral.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedReferral.clinicalSummary}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedReferral(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
