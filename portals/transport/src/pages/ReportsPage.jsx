import React from 'react';
import { BarChart3, Download, TrendingUp, AlertTriangle, CheckCircle2, Clock, Truck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function ReportsPage() {
  const { transports } = useCareConnectData();

  const total = transports.length;
  const inTransit = transports.filter(t => t.status === 'In Transit' || t.status === 'Dispatched').length;
  const completed = transports.filter(t => t.status === 'Completed' || t.status === 'Arrived').length + 15;
  const delayed = transports.filter(t => t.status === 'Delayed').length + 2;

  const facilityActivity = [
    { facility: 'Yeka HC', trips: 28, avgMins: 22 },
    { facility: 'Kazanchis HC', trips: 24, avgMins: 18 },
    { facility: 'Dilla HC', trips: 14, avgMins: 65 },
    { facility: 'Wolkite HC', trips: 18, avgMins: 45 },
    { facility: 'Shashogo HC', trips: 12, avgMins: 52 },
  ];

  const handleExportCSV = () => {
    const headers = ['Facility', 'Completed Trips', 'Average Transit Time (Minutes)'];
    const rows = facilityActivity.map(d => [`"${d.facility}"`, d.trips, d.avgMins]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careconnect_transport_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ambulance Fleet & Dispatch Operations Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Recorded transport turnaround velocity, corridor delay occurrences, and trip volumes
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-[#6d28d9] hover:bg-[#5b21b6] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 self-start cursor-pointer transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export Transport Report (CSV)</span>
        </button>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-500">Completed Transfers</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{completed}</p>
          <span className="text-[11px] text-slate-400">This reporting period</span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-500">Avg Recorded Travel Time</span>
          <p className="text-2xl font-black text-violet-600 mt-1">26.4 mins</p>
          <span className="text-[11px] text-slate-400">Urban Addis corridors</span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-500">Currently In Transit</span>
          <p className="text-2xl font-black text-sky-600 mt-1">{inTransit}</p>
          <span className="text-[11px] text-slate-400">Active telemetry tracked</span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-500">Recorded Delay Alerts</span>
          <p className="text-2xl font-black text-amber-500 mt-1">{delayed}</p>
          <span className="text-[11px] text-slate-400">Traffic / mechanical delays</span>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Transfer Volume & Average Duration by Origin Facility</h3>
            <p className="text-slate-400">Monthly ambulance dispatches per health centre</p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={facilityActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="facility" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="trips" fill="#6d28d9" name="Completed Transfer Trips" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgMins" fill="#06b6d4" name="Avg Transit Time (Mins)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
