import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Bed,
  Check,
  ArrowRight,
  AlertCircle,
  Clock,
  Layers,
  Activity,
  BedDouble
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

const sourceData = [
  { name: 'Health Centres', value: 65, color: '#059669' },
  { name: 'District Hospitals', value: 25, color: '#0284c7' },
  { name: 'Emergency Clinic Transfers', value: 10, color: '#f59e0b' }
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { referrals, facilities } = useCareConnectData();

  const currentHospital = facilities.find(f => f.name.includes('Tikur')) || facilities[0];

  const newReferralsCount = referrals.filter(r => r.status === 'Pending').length;
  const acceptedCount = referrals.filter(r => r.status === 'Accepted' || r.status === 'In Transit').length;
  const rejectedCount = referrals.filter(r => r.status === 'Rejected').length;
  const arrivedCount = referrals.filter(r => r.status === 'Arrived' || r.status === 'Completed').length;

  const recentIncoming = referrals.slice(0, 5);

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-xs">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome, Dr. Fitsum!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">
            Manage incoming triage requests and acute bed allocations for Tikur Anbessa Specialized Hospital
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/pending')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Triage Pending ({newReferralsCount})</span>
          </button>
          <button
            onClick={() => navigate('/capacity')}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <BedDouble className="w-4 h-4 text-emerald-600" />
            <span>Capacity ({currentHospital?.availableBeds || 42} free)</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => navigate('/pending')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-emerald-500 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">New Incoming</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{newReferralsCount}</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/accepted')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-emerald-500 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Accepted Referrals</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{acceptedCount}</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/rejected')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-rose-400 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Declined (FR-22)</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{rejectedCount}</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/arrivals')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-blue-400 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
            <Bed className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Patients Arrived</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{arrivedCount}</p>
          </div>
        </div>
      </div>

      {/* Charts & Triage Priority Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Referral Sources Donut Chart */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Referrals by Source Facility</h3>
            <p className="text-slate-400 mt-0.5">Primary health centres vs regional transfers</p>
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            {sourceData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                </span>
                <span className="font-bold">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Workload & Capacity Gauge */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Hospital Workload & Bed Availability Status</h3>
              <p className="text-slate-400">Live bed telemetry updated from Tikur Anbessa Hospital wards</p>
            </div>
            <button
              onClick={() => navigate('/capacity')}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Update Telemetry →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Approved Beds</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{currentHospital?.beds || 800}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
              <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] uppercase font-bold">General Beds Free</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">{currentHospital?.availableBeds || 42}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60">
              <span className="text-rose-700 dark:text-rose-400 block text-[10px] uppercase font-bold">ICU Free Beds</span>
              <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 block">{currentHospital?.availableIcuBeds || 3}</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60">
              <span className="text-sky-700 dark:text-sky-400 block text-[10px] uppercase font-bold">Oxygen Reserves</span>
              <span className="text-base font-extrabold text-sky-700 dark:text-sky-300 mt-1 block">{currentHospital?.oxygenLevel || '94%'}</span>
            </div>
          </div>

          {/* Pending Triage Action Alert */}
          {newReferralsCount > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span><b>Action Required:</b> {newReferralsCount} incoming referrals require triage acknowledgement within 30 minutes.</span>
              </div>
              <button
                onClick={() => navigate('/pending')}
                className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg shrink-0 cursor-pointer"
              >
                Triage Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Incoming Referrals Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Incoming Referral Triage Feed</h3>
            <p className="text-slate-400">Chronological triage queue from health centres</p>
          </div>
          <button
            onClick={() => navigate('/incoming')}
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Full Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Referral ID</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Origin Facility</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recentIncoming.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.id}</td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{r.patientName}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{r.referringFacility}</td>
                  <td className="py-3 px-3 font-semibold">{r.service}</td>
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
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                      onClick={() => navigate('/incoming')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 cursor-pointer"
                    >
                      Triage
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
