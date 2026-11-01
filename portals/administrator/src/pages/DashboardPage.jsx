import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Send,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Cpu,
  ArrowRight,
  Shield,
  Activity,
  FileCheck2,
  Clock,
  UserPlus,
  PlusCircle
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

const platformAnalytics = [
  { month: 'Jan', referrals: 700, transport: 550, admissions: 350 },
  { month: 'Feb', referrals: 920, transport: 750, admissions: 480 },
  { month: 'Mar', referrals: 800, transport: 680, admissions: 420 },
  { month: 'Apr', referrals: 1020, transport: 850, admissions: 520 },
  { month: 'May', referrals: 950, transport: 1050, admissions: 500 },
  { month: 'Jun', referrals: 1150, transport: 950, admissions: 650 },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { users, facilities, referrals, aiSubsystems, auditLogs } = useCareConnectData();

  const activeUsersCount = useMemo(() => users.filter(u => u.status === 'Active').length, [users]);
  const operationalFacilities = useMemo(() => facilities.filter(f => f.operatingStatus === 'Operational' || !f.operatingStatus).length, [facilities]);
  const activeAIServices = useMemo(() => aiSubsystems.filter(s => s.enabled || s.status === 'Active' || s.status === 'Enabled').length, [aiSubsystems]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            System Overview & Platform Surveillance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor and govern the entire CareConnect Ethiopia healthcare ecosystem
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/users')}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Manage Users</span>
          </button>
          <button
            onClick={() => navigate('/facilities')}
            className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-xl font-bold shadow-xs flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Facility</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards matching design specifications */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/users')}
          className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-4 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Users</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{users.length}</p>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">{activeUsersCount} Active</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/facilities')}
          className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-4 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Health Facilities</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{facilities.length}</p>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">{operationalFacilities} Operational</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/referrals')}
          className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-4 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Referrals</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{referrals.length}</p>
            <span className="text-[10px] text-blue-600 font-bold block mt-0.5">Live Synced State</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/ai-management')}
          className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-4 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">System Uptime</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">99.9%</p>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">{activeAIServices}/{aiSubsystems.length} AI Services Online</span>
          </div>
        </div>
      </div>

      {/* Middle: Platform Analytics + AI Performance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platform Analytics Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Platform Analytics Overview</h3>
              <p className="text-xs text-slate-400">Longitudinal referral throughput, transport dispatches, and admissions</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-sky-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> Referrals
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Transport
              </span>
              <span className="flex items-center gap-1.5 text-purple-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /> Admissions
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={platformAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="referrals" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="transport" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="admissions" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Performance Card with Brain Vector graphic */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[#0284c7] dark:text-sky-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 fill-sky-100" />
              <span>AI Performance (AI-17)</span>
            </div>

            <div className="my-6 flex items-center justify-between">
              <div>
                <p className="text-4xl font-black text-slate-900 dark:text-white">94.2%</p>
                <span className="text-xs font-semibold text-slate-500 block mt-0.5">Prediction Accuracy</span>
                <span className="text-xs font-bold text-emerald-600 mt-1 inline-flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" /> +2.1% SLA
                </span>
              </div>

              {/* Glowing Brain Graphic matching screenshot */}
              <div className="w-24 h-24 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-sky-400/20 rounded-full blur-xl animate-pulse" />
                <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-[0_4px_12px_rgba(2,132,199,0.25)]">
                  <path d="M 47 20 C 35 20, 22 28, 20 42 C 18 52, 22 60, 26 66 C 30 72, 36 78, 47 80 Z" fill="#38bdf8" opacity="0.9" />
                  <path d="M 53 20 C 65 20, 78 28, 80 42 C 82 52, 78 60, 74 66 C 70 72, 64 78, 53 80 Z" fill="#0284c7" opacity="0.95" />
                  <path d="M 28 36 Q 38 32, 47 40" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
                  <path d="M 24 50 Q 36 48, 47 56" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
                  <path d="M 72 36 Q 62 32, 53 40" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
                  <path d="M 76 50 Q 64 48, 53 56" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
                </svg>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">NLP v2.1 • Tesseract OCR</span>
            <button
              onClick={() => navigate('/ai-performance')}
              className="text-xs font-bold text-[#0284c7] hover:underline flex items-center gap-1"
            >
              <span>Evaluation Metrics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: Recent Security Audit Trail & Capacity Surveillance Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Audit Trail Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Real-time Platform Audit Log</h3>
            </div>
            <button
              onClick={() => navigate('/audit-logs')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Full Audit Trail &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{log.user}</span>
                    <span className="text-slate-400 text-[11px] ml-2">({log.action})</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">{log.details}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">{log.timestamp?.substring(11, 19)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Capacity Surveillance Widget */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Capacity Surveillance</h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Active multi-facility bed utilization across {facilities.length} network hospitals.
            </p>

            <div className="space-y-2.5 mt-4">
              {facilities.slice(0, 3).map((f) => (
                <div key={f.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                  <div className="truncate max-w-[160px]">
                    <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">{f.name}</span>
                    <span className="text-[10px] text-slate-400">{f.type}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-600 text-xs block">{f.availableBeds} free</span>
                    <span className="text-[10px] text-slate-400">{f.beds} total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/capacity-monitoring')}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Open Capacity Monitor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}