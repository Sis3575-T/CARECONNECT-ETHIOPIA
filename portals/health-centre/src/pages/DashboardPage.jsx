import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Building2,
  Calendar,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { ROLE_LABELS } from '@shared/constants/roles.js';
import { healthCentreService } from '../services/healthCentreService.js';
import { HealthCentreStats } from '../components/dashboard/HealthCentreStats.jsx';
import { RecentReferralsTable } from '../components/dashboard/RecentReferralsTable.jsx';
import { PendingActionsSection } from '../components/dashboard/PendingActionsSection.jsx';
import { DashboardQuickActions } from '../components/dashboard/DashboardQuickActions.jsx';
import { RecentNotificationsWidget } from '../components/dashboard/RecentNotificationsWidget.jsx';

const referralTrendData = [
  { month: 'Jan', sent: 48, completed: 32 },
  { month: 'Feb', sent: 76, completed: 54 },
  { month: 'Mar', sent: 68, completed: 46 },
  { month: 'Apr', sent: 92, completed: 58 },
  { month: 'May', sent: 82, completed: 96 },
  { month: 'Jun', sent: 114, completed: 88 },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrentDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [actions, setActions] = useState({
    rejected: [],
    pendingTriage: [],
    inTransit: [],
    totalActionCount: 0
  });
  const [notifications, setNotifications] = useState([]);

  const clinicianName =
    user?.name ||
    [user?.firstName || user?.first_name, user?.lastName || user?.last_name].filter(Boolean).join(' ') ||
    'Dr. Alemayehu Tekle';

  const facilityName = user?.facilityName || 'Yeka Health Centre';
  const facilityRegion = user?.facilityRegion || 'Woreda 03, Addis Ababa';
  const roleTitle = ROLE_LABELS[user?.role] || user?.roleName || user?.role || 'Health Centre Referral Clinician';

  // Load live operational data
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const facilityId = user?.facilityId;
      const [summaryRes, actionsRes, notificationsRes] = await Promise.all([
        healthCentreService.getDashboardSummary(facilityId),
        healthCentreService.getPendingActions(facilityId),
        healthCentreService.getNotifications(6)
      ]);

      setSummary(summaryRes);
      setActions(actionsRes);
      setNotifications(notificationsRes);
    } catch (err) {
      console.error('[DashboardPage] Failed to fetch dashboard data:', err);
      setError(err.message || 'Error loading dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.facilityId]);

  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);

  // Recommended hospital details for referrals
  const recommendedHospital = {
    name: 'Tikur Anbessa Specialized Hospital',
    type: 'Tertiary Specialized Hospital',
    zone: 'Lideta Sub-City, Addis Ababa',
    ratingScore: 98,
    distanceKm: 4.8,
    travelTime: '18 mins',
    availableBeds: 14,
    icuBeds: 3,
    workloadLevel: 'Moderate Capacity'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Welcome & Operational Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {getGreeting()}, {clinicianName}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>{roleTitle}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{facilityName}</span>
            <span>•</span>
            <span>{facilityRegion}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3 h-3" />
              <span>{formatCurrentDate()}</span>
            </span>
          </p>
        </div>

        {/* Quick Actions Bar */}
        <DashboardQuickActions
          onRefresh={() => loadDashboardData(true)}
          refreshing={refreshing}
        />
      </div>

      {/* 2. Top Operational Statistics (6 Cards) */}
      <HealthCentreStats
        summary={summary}
        loading={loading}
        error={error}
        onRetry={() => loadDashboardData(false)}
      />

      {/* 3. Clinical Action Center (Prioritized Clinician Tasks) */}
      <PendingActionsSection
        actions={actions}
        loading={loading}
      />

      {/* 4. Middle Layout: Main Content (2/3) + Sidebar Widgets (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Volume Trend Chart + Recent Referrals Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Referral Volume Trend */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  Referral Volume Trend (Monthly)
                </h3>
                <p className="text-xs text-slate-400">
                  Electronic referrals sent vs completed admissions
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> Sent
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Completed
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={referralTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '11px',
                      border: 'none'
                    }}
                  />
                  <Area type="monotone" dataKey="sent" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorComp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Outgoing Electronic Referrals Table */}
          <RecentReferralsTable
            referrals={summary?.referrals || []}
            loading={loading}
            totalCount={summary?.totalReferrals || 0}
          />
        </div>

        {/* Right Column (1/3): AI Match Card + Notification Center */}
        <div className="space-y-6">
          {/* AI Recommended Destination Hospital */}
          <div className="bg-gradient-to-br from-sky-50 to-blue-50/40 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl p-5 border border-sky-200/80 dark:border-sky-900/50 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-full bg-sky-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>AI Hospital Match</span>
                </span>
                <span className="font-extrabold text-xs text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-md">
                  {recommendedHospital.ratingScore}% Capacity Match
                </span>
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {recommendedHospital.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {recommendedHospital.type} • {recommendedHospital.zone}
              </p>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Distance & Transit:</span>
                  <span className="font-bold">{recommendedHospital.distanceKm} km (~{recommendedHospital.travelTime})</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Available Beds:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {recommendedHospital.availableBeds} General (ICU: {recommendedHospital.icuBeds})
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Emergency Workload:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{recommendedHospital.workloadLevel}</span>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-sky-100 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Prioritizes 24/7 emergency triage, specialty surgical readiness, and shortest ambulance transit time.
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/hospitals')}
              className="mt-4 w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98 transition-all"
            >
              <span>Explore All Hospital Matches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recent In-App Notifications Widget */}
          <RecentNotificationsWidget
            initialNotifications={notifications}
            loading={loading}
            onNotificationRead={() => {
              if (summary) {
                setSummary((prev) => ({
                  ...prev,
                  unreadNotifications: Math.max(0, (prev.unreadNotifications || 1) - 1)
                }));
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
