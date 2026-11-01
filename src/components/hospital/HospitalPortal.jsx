import React, { useState } from 'react';
import Sidebar from '../common/Sidebar';
import TopHeader from '../common/TopHeader';
import StatCard from '../common/StatCard';
import ReferralsBySourceDonut from './ReferralsBySourceDonut';
import HospitalRecentReferrals from './HospitalRecentReferrals';
import HospitalTriageModal from './HospitalTriageModal';
import { Inbox, CheckCircle2, XCircle, Bed, Check } from 'lucide-react';
import { INITIAL_HOSPITAL_REFERRALS } from '../../shared/mockData';

export default function HospitalPortal({ isCollageItem = false, onExpandPortal }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [referrals, setReferrals] = useState(INITIAL_HOSPITAL_REFERRALS);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);

  // Stats matching screenshot: 36, 28, 4, 24
  const [stats, setStats] = useState({
    newReferrals: 36,
    accepted: 28,
    rejected: 4,
    arrivedPatients: 24
  });

  const handleUpdateStatus = (refId, newStatus, reason = '') => {
    setReferrals(prev => prev.map(r => {
      if (r.id === refId) {
        return { ...r, status: newStatus, rejectReason: reason };
      }
      return r;
    }));

    if (newStatus === 'Accepted') {
      setStats(prev => ({
        ...prev,
        newReferrals: Math.max(0, prev.newReferrals - 1),
        accepted: prev.accepted + 1
      }));
    } else if (newStatus === 'Rejected') {
      setStats(prev => ({
        ...prev,
        newReferrals: Math.max(0, prev.newReferrals - 1),
        rejected: prev.rejected + 1
      }));
    }
  };

  const handleOpenTriage = (ref) => {
    setSelectedReferral(ref);
    setIsTriageModalOpen(true);
  };

  return (
    <div className={`bg-slate-50 flex h-full min-h-[560px] overflow-hidden rounded-xl border border-slate-200/90 shadow-sm ${
      isCollageItem ? 'text-xs' : 'text-sm'
    }`}>
      {/* Sidebar */}
      <Sidebar
        portalType="hospital"
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isCollageItem ? false : isSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
        <TopHeader
          userName="Dr. Fitsum"
          userSubtitle="Black Lion Hospital"
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          portalTheme="emerald"
          notificationCount={3}
        />

        <div className="p-4 sm:p-5 space-y-4 flex-1">
          {/* Welcome Title */}
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Welcome, Dr. Fitsum!
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Manage incoming referrals and patient admissions
            </p>
          </div>

          {/* 4 Stat Cards Row matching screenshot */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            <StatCard
              icon={Inbox}
              iconColor="blue"
              title="New Referrals"
              value={stats.newReferrals}
            />
            <StatCard
              icon={CheckCircle2}
              iconColor="green"
              title="Accepted"
              value={stats.accepted}
            />
            <StatCard
              icon={XCircle}
              iconColor="red"
              title="Rejected"
              value={stats.rejected}
            />
            <StatCard
              icon={Bed}
              iconColor="blue"
              title="Arrived Patients"
              value={stats.arrivedPatients}
            />
          </div>

          {/* Middle Section: Referrals by Source + Recent Referrals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <ReferralsBySourceDonut />
            <HospitalRecentReferrals
              referrals={referrals.slice(0, 3)}
              onSelectReferral={handleOpenTriage}
              onViewAll={() => {
                if (onExpandPortal) onExpandPortal();
              }}
            />
          </div>

          {/* Bottom Action Alert Banner matching screenshot */}
          <div
            onClick={() => handleOpenTriage(referrals[0])}
            className="cursor-pointer bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#15803d] border border-[#86efac]/80 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors shadow-sm group"
          >
            <div className="w-6 h-6 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xs sm:text-[13px] font-bold tracking-tight">
              3 new referrals require your action
            </span>
            <span className="ml-auto text-xs font-semibold underline underline-offset-2 opacity-80 group-hover:opacity-100">
              Review Now &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Hospital Triage Modal */}
      <HospitalTriageModal
        isOpen={isTriageModalOpen}
        onClose={() => setIsTriageModalOpen(false)}
        referral={selectedReferral}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
