import React from 'react';
import { X, Sparkles, CheckCircle2, Building2, MapPin, Activity, Stethoscope, ChevronRight } from 'lucide-react';

export default function AIRecommendationDetailsModal({ isOpen, onClose, onSelectHospital }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-base leading-tight">AI Recommendation Explanation</h3>
              <p className="text-xs text-sky-100">CareConnect AI Weighted Facility Matching Algorithm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-sky-50 rounded-xl border border-sky-100">
            <div className="p-2 rounded-lg bg-sky-600 text-white shrink-0 mt-0.5">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-800 text-sm">
                  Tikur Anbessa Specialized Hospital
                </h4>
                <span className="bg-sky-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Rank #1 (98% Match)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive Tertiary Referral Facility • Lideta, Addis Ababa
              </p>
            </div>
          </div>

          {/* AI Ranking Factors Breakdown */}
          <div className="space-y-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Evaluated Match Factors (AI-06 & AI-07)
            </h5>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                  <span>Clinical Specialty</span>
                </div>
                <p className="mt-1 font-bold text-slate-800 text-[13px]">
                  Cardiology & Cath Lab
                </p>
                <span className="text-[10px] text-emerald-600 font-medium">✓ 100% Service Match</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>Distance from Yeka HC</span>
                </div>
                <p className="mt-1 font-bold text-slate-800 text-[13px]">
                  8.4 km (~22 mins)
                </p>
                <span className="text-[10px] text-emerald-600 font-medium">✓ Nearest Tertiary Hub</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Activity className="w-3.5 h-3.5 text-sky-600" />
                  <span>Reported Capacity</span>
                </div>
                <p className="mt-1 font-bold text-slate-800 text-[13px]">
                  42 Available Beds
                </p>
                <span className="text-[10px] text-slate-500 font-medium">Last reported: 45 min ago</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Emergency Status</span>
                </div>
                <p className="mt-1 font-bold text-slate-800 text-[13px]">
                  Accepting Cardiac
                </p>
                <span className="text-[10px] text-emerald-600 font-medium">✓ Active Acceptance Duty</span>
              </div>
            </div>
          </div>

          {/* Clinical advisory note */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 leading-relaxed">
            <span className="font-bold">Clinical Advisory (Section 6.19):</span> AI hospital recommendations are advisory and based on recent capacity reports. Healthcare workers must confirm clinical acceptance.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
          <button
            onClick={() => {
              if (onSelectHospital) onSelectHospital();
              onClose();
            }}
            className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <span>Proceed to Refer Patient</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
