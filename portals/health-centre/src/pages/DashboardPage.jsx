import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Send,
  Clock,
  CheckCircle2,
  PlusCircle,
  Search,
  Building2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Eye,
  Activity
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

const referralTrendData = [
  { month: 'Jan', sent: 48, completed: 32 },
  { month: 'Feb', sent: 76, completed: 54 },
  { month: 'Mar', sent: 68, completed: 46 },
  { month: 'Apr', sent: 92, completed: 58 },
  { month: 'May', sent: 82, completed: 96 },
  { month: 'Jun', sent: 114, completed: 88 },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { referrals, patients, facilities } = useCareConnectData();

  const totalPatients = patients.length;
  const totalReferrals = referrals.length;
  const pendingCount = referrals.filter(r => r.status === 'Pending').length;
  const completedCount = referrals.filter(r => r.status === 'Completed' || r.status === 'Arrived').length;
  const completionRate = totalReferrals > 0 ? Math.round(((completedCount + referrals.filter(r => r.status === 'Accepted').length) / totalReferrals) * 100) : 92;

  // Best recommended hospital
  const recommendedHospital = facilities.find(f => f.type.includes('Hospital')) || facilities[0];
  const recentReferrals = referrals.slice(0, 5);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome, Dr. Alemayehu!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage referrals and live AI clinical recommendations for Yeka Health Centre
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/create-referral')}
            className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Referral</span>
          </button>
          <button
            onClick={() => navigate('/patients')}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Patients ({totalPatients})</span>
          </button>
          <button
            onClick={() => navigate('/hospitals')}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Find Hospitals</span>
          </button>
        </div>
      </div>

      {/* 4 Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => navigate('/patients')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-sky-400 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Patients</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalPatients}</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/referrals')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-sky-400 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Referrals Sent</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalReferrals}</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/referrals')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Referrals</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Acceptance Rate</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Middle Section: Recharts Referral Trend + AI Recommendation Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Referral Trend Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Referral Volume Trend (Monthly)</h3>
              <p className="text-xs text-slate-400">Sent vs Completed electronic referrals</p>
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

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={referralTrendData}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="sent" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorComp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Top Hospital Recommendation Card */}
        {recommendedHospital && (
          <div className="bg-gradient-to-br from-sky-50 to-blue-50/40 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl p-5 border border-sky-200/80 dark:border-sky-900/50 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-full bg-sky-600 text-white text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>AI Optimal Match</span>
                </span>
                <span className="font-extrabold text-sm text-sky-700 dark:text-sky-300">
                  {recommendedHospital.ratingScore}% Score
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
                  <span>Distance:</span>
                  <span className="font-bold">{recommendedHospital.distanceKmFromCenter} km (approx 20 mins)</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Available Beds:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{recommendedHospital.availableBeds} Free (ICU: {recommendedHospital.availableIcuBeds || 3})</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Reported Workload:</span>
                  <span className="font-bold">{recommendedHospital.workloadLevel}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Last Reported:</span>
                  <span className="font-bold text-slate-500">{recommendedHospital.lastCapacityUpdate}</span>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-sky-100 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Matches tertiary cardiology and 24/7 cardiac catheterization criteria with lowest transfer delay.
              </div>
            </div>

            <button
              onClick={() => navigate('/hospitals')}
              className="mt-4 w-full py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98 transition-all"
            >
              <span>Explore All Recommendations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Recent Referrals Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Recent Electronic Referrals</h3>
            <p className="text-xs text-slate-400">Live stream of outgoing patient transfers from Yeka Health Centre</p>
          </div>
          <button
            onClick={() => navigate('/referrals')}
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({totalReferrals})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Referral ID</th>
                <th className="py-2.5 px-3">Patient Name</th>
                <th className="py-2.5 px-3">Receiving Hospital</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Urgency</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recentReferrals.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                  <td className="py-3 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">{r.id}</td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{r.patientName}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{r.receivingFacility}</td>
                  <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-200">{r.service}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.urgency === 'Emergency' ? 'bg-rose-100 text-rose-700' :
                      r.urgency === 'Urgent' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {r.urgency}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'In Transit' ? 'bg-violet-100 text-violet-700' :
                      r.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => navigate('/tracking')}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-100 cursor-pointer"
                    >
                      Track
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
