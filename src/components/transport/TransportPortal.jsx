import React, { useState } from 'react';
import Sidebar from '../common/Sidebar';
import TopHeader from '../common/TopHeader';
import StatCard from '../common/StatCard';
import TransportStatusStepper from './TransportStatusStepper';
import InteractiveRouteMap from './InteractiveRouteMap';
import RecentTransportTable from './RecentTransportTable';
import TransportDetailModal from './TransportDetailModal';
import { Car, Truck, CheckCircle } from 'lucide-react';
import { INITIAL_TRANSPORT_REQUESTS } from '../../shared/mockData';

export default function TransportPortal({ isCollageItem = false, onExpandPortal }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [transportRequests, setTransportRequests] = useState(INITIAL_TRANSPORT_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Stats matching screenshot: 12, 8, 15
  const [stats, setStats] = useState({
    pendingRequests: 12,
    inTransit: 8,
    completedToday: 15
  });

  const handleUpdateStatus = (reqId, newStatus) => {
    setTransportRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        return { ...req, status: newStatus };
      }
      return req;
    }));

    if (newStatus === 'Arrived' || newStatus === 'Completed') {
      setStats(prev => ({
        ...prev,
        inTransit: Math.max(0, prev.inTransit - 1),
        completedToday: prev.completedToday + 1
      }));
    }
  };

  const handleOpenDetail = (req) => {
    setSelectedRequest(req);
    setIsDetailModalOpen(true);
  };

  return (
    <div className={`bg-slate-50 flex h-full min-h-[560px] overflow-hidden rounded-xl border border-slate-200/90 shadow-sm ${
      isCollageItem ? 'text-xs' : 'text-sm'
    }`}>
      {/* Sidebar */}
      <Sidebar
        portalType="transport"
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isCollageItem ? false : isSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
        <TopHeader
          userName="Abebe Kebede"
          userSubtitle="Transport"
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          portalTheme="purple"
        />

        <div className="p-4 sm:p-5 space-y-4 flex-1">
          {/* Welcome Title */}
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Welcome, Abebe Kebede!
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Coordinate patient transportation
            </p>
          </div>

          {/* 3 Stat Cards Row matching screenshot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
            <StatCard
              icon={Car}
              iconColor="blue"
              title="Pending Requests"
              value={stats.pendingRequests}
            />
            <StatCard
              icon={Truck}
              iconColor="blue"
              title="In Transit"
              value={stats.inTransit}
            />
            <StatCard
              icon={CheckCircle}
              iconColor="green"
              title="Completed Today"
              value={stats.completedToday}
            />
          </div>

          {/* Middle Section: Transport Status + Route Map */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <TransportStatusStepper />
            <InteractiveRouteMap />
          </div>

          {/* Bottom Section: Recent Transport Requests Table */}
          <RecentTransportTable
            requests={transportRequests.slice(0, 3)}
            onSelectRequest={handleOpenDetail}
            onViewAll={() => {
              if (onExpandPortal) onExpandPortal();
            }}
          />
        </div>
      </div>

      {/* Transport Detail & Coordination Modal */}
      <TransportDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        request={selectedRequest}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
