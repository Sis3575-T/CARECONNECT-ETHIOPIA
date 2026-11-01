import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Activity,
  Stethoscope,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  X,
  Phone,
  Bed,
  HeartPulse,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function HospitalsPage() {
  const navigate = useNavigate();
  const { facilities } = useCareConnectData();

  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedHospitalForModal, setSelectedHospitalForModal] = useState(null);
  const [comparisonList, setComparisonList] = useState([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const hospitalsOnly = facilities.filter(f => f.type.includes('Hospital') || f.beds > 50);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filtered = hospitalsOnly.filter(f =>
    selectedSpecialty === 'All' || (f.specialties && f.specialties.some(s => s.toLowerCase().includes(selectedSpecialty.toLowerCase())))
  );

  const toggleComparison = (hospital) => {
    if (comparisonList.some(h => h.id === hospital.id)) {
      setComparisonList(comparisonList.filter(h => h.id !== hospital.id));
    } else {
      if (comparisonList.length >= 3) {
        alert('You can compare a maximum of 3 hospitals simultaneously.');
        return;
      }
      setComparisonList([...comparisonList, hospital]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hospital Recommendations & Matching (AI-04)</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time multi-criteria ranking based on distance, reported bed/ICU capacity, and clinical specialty match
          </p>
        </div>

        <div className="flex items-center gap-2">
          {comparisonList.length > 1 && (
            <button
              onClick={() => setIsComparisonOpen(true)}
              className="px-3.5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer animate-bounce"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Compare Selected ({comparisonList.length})</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Live Capacities</span>
          </button>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-3 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 rounded-2xl flex items-center gap-3 text-xs text-sky-800 dark:text-sky-300">
        <Info className="w-4 h-4 text-sky-600 shrink-0" />
        <p>
          <b>Capacity Advisory:</b> Bed and ICU counts are reported broadcast telemetry from receiving institutions and subject to emergency arrivals. Outdated metrics are not represented as guaranteed clinical availability.
        </p>
      </div>

      {/* Specialty Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['All', 'Cardiology', 'Oncology', 'Trauma', 'Obstetrics', 'Pediatrics', 'Neurosurgery'].map((sp) => (
          <button
            key={sp}
            onClick={() => setSelectedSpecialty(sp)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedSpecialty === sp
                ? 'bg-[#0284c7] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            {sp}
          </button>
        ))}
      </div>

      {/* Hospitals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((f, i) => {
          const isCompared = comparisonList.some(h => h.id === f.id);
          return (
            <div
              key={f.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-xs flex flex-col justify-between transition-all space-y-4 ${
                isCompared ? 'border-sky-500 ring-2 ring-sky-400/30' : 'border-slate-200/80 dark:border-slate-700 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                      Rank #{i + 1} Recommendation
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base mt-0.5 leading-snug">{f.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{f.type} • {f.zone}, {f.region}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800 shrink-0">
                    {f.ratingScore}% Score
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5" /> Distance:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{f.distanceKmFromCenter} km from Yeka HC</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Bed className="w-3.5 h-3.5" /> Available Beds:
                    </span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      {f.availableBeds} Free / {f.beds} Total (ICU: {f.availableIcuBeds || 2})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Activity className="w-3.5 h-3.5" /> Reported Workload:
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{f.workloadLevel}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <RefreshCw className="w-3.5 h-3.5" /> Last Capacity Update:
                    </span>
                    <span className="font-semibold text-slate-500">{f.lastCapacityUpdate}</span>
                  </div>
                </div>

                {/* Specialties tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {f.specialties && f.specialties.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="mt-3 p-2.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed">
                  Recommended for shortest corridor transfer time and active on-call surgical/critical care triage.
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => toggleComparison(f)}
                  className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                    isCompared
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {isCompared ? '✓ Selected' : '+ Compare'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedHospitalForModal(f)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 cursor-pointer"
                    title="View Full Facility Profile"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate('/create-referral')}
                    className="px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>Select Hospital</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Facility Details Modal */}
      {selectedHospitalForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-sky-600 uppercase">Hospital Profile</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{selectedHospitalForModal.name}</h3>
              </div>
              <button onClick={() => setSelectedHospitalForModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Facility Type</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedHospitalForModal.type}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Contact Phone</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedHospitalForModal.contactPhone || '+251 11'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Beds</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedHospitalForModal.beds}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Available Beds</span>
                <span className="font-extrabold text-emerald-600">{selectedHospitalForModal.availableBeds}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">ICU Beds Free</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedHospitalForModal.availableIcuBeds || 2}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Oxygen Reserves</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedHospitalForModal.oxygenLevel || '90%'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">Medical Specialties</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedHospitalForModal.specialties?.map((s, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setSelectedHospitalForModal(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedHospitalForModal(null);
                  navigate('/create-referral');
                }}
                className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl shadow-xs"
              >
                Proceed with Referral
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {isComparisonOpen && comparisonList.length > 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Hospital Side-by-Side Comparison</h3>
              <button onClick={() => setIsComparisonOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparisonList.map((h) => (
                <div key={h.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-sky-600 font-bold">{h.id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold text-[10px]">{h.ratingScore}% Match</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{h.name}</h4>
                  <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div>Distance: <b className="text-slate-900 dark:text-white">{h.distanceKmFromCenter} km</b></div>
                    <div>Available Beds: <b className="text-emerald-600">{h.availableBeds}</b> / {h.beds}</div>
                    <div>ICU Beds: <b>{h.availableIcuBeds || 2} free</b></div>
                    <div>Workload: <b>{h.workloadLevel}</b></div>
                    <div>Last Update: <b>{h.lastCapacityUpdate}</b></div>
                  </div>
                  <button
                    onClick={() => {
                      setIsComparisonOpen(false);
                      navigate('/create-referral');
                    }}
                    className="w-full py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl font-bold cursor-pointer"
                  >
                    Select This Facility
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsComparisonOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
