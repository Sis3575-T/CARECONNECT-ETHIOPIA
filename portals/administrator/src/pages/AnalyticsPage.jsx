import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Building2,
  GitBranch,
  Clock,
  CheckCircle2,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

const monthlyPlatformTrends = [
  { month: 'Jan', referrals: 700, transport: 550, completed: 510 },
  { month: 'Feb', referrals: 920, transport: 750, completed: 710 },
  { month: 'Mar', referrals: 800, transport: 680, completed: 640 },
  { month: 'Apr', referrals: 1020, transport: 850, completed: 810 },
  { month: 'May', referrals: 950, transport: 1050, completed: 920 },
  { month: 'Jun', referrals: 1150, transport: 950, completed: 1010 },
];

export default function AnalyticsPage() {
  const { referrals, facilities, transports } = useCareConnectData();

  // Region breakdown
  const regionalData = useMemo(() => {
    const counts = {};
    referrals.forEach(r => {
      // Find facility region or fallback
      const fac = facilities.find(f => f.name === r.referringFacility || f.name === r.receivingFacility);
      const reg = fac?.region || 'Addis Ababa';
      counts[reg] = (counts[reg] || 0) + 1;
    });

    // Ensure all standard regions represented
    const defaultRegions = ['Addis Ababa', 'Oromia', 'Central Ethiopia', 'South Ethiopia', 'Amhara', 'Sidama'];
    return defaultRegions.map(reg => ({
      region: reg,
      referrals: counts[reg] || (reg === 'Addis Ababa' ? 6420 : reg === 'Oromia' ? 2840 : reg === 'Central Ethiopia' ? 1530 : 980)
    }));
  }, [referrals, facilities]);

  // Service breakdown
  const serviceData = useMemo(() => {
    const counts = {};
    referrals.forEach(r => {
      const s = r.service || 'General Surgery';
      counts[s] = (counts[s] || 0) + 1;
    });

    return Object.keys(counts).map(service => ({
      service,
      count: counts[service]
    }));
  }, [referrals]);

  const handleExportCSV = () => {
    const headers = ['Region', 'Referrals'];
    const rows = regionalData.map(d => [`"${d.region}"`, d.referrals]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careconnect_analytics_summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Platform Analytics & Regional Trends (Section 9.I)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Cross-regional patient referral volume, service demand, and inter-facility coordination metrics
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Analytics CSV</span>
        </button>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Cumulative Referrals</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">12,430</p>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">↑ +14% month-over-month</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Mean Triage Response</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">14.8 min</p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Hospital specialist review</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Bed Allocation Success</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">92.4%</p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Matched receiving capacity</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Ambulance On-Time Rate</span>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">88.5%</p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Arrival within projected ETA</span>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Regional Volume Bar Chart */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Referral Volume by Ethiopian Region</h3>
            <p className="text-slate-400 text-xs">Patient referral intake originating across regional jurisdictions</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="referrals" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6-Month Trajectory Line Chart */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Ecosystem Activity Trajectory</h3>
              <p className="text-slate-400 text-xs">6-month longitudinal trends: Referrals, EMS dispatches, and hospital admissions</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyPlatformTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="referrals" name="Referrals" stroke="#1e3a8a" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="transport" name="EMS Dispatches" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}