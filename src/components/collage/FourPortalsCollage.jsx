import React from 'react';
import { useNavigate } from 'react-router-dom';
import HealthCentrePortal from '../health-centre/HealthCentrePortal';
import HospitalPortal from '../hospital/HospitalPortal';
import TransportPortal from '../transport/TransportPortal';
import AdminPortal from '../admin/AdminPortal';
import { Plus, Building2, Truck, Settings, Maximize2, ExternalLink } from 'lucide-react';

export default function FourPortalsCollage() {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-[1720px] mx-auto p-2 sm:p-4 md:p-6 space-y-6">
      {/* 2x2 Grid matching the user's uploaded image */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 items-start">
        
        {/* Quadrant 1: Health Centre Portal */}
        <div className="flex flex-col items-center">
          {/* Top Pill Badge matching screenshot with direct URL link */}
          <div className="relative -mb-3 z-10">
            <button
              onClick={() => navigate('/health-centre')}
              className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-5 py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 group"
              title="Open /health-centre"
            >
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                <Plus className="w-3 h-3 stroke-[3]" />
              </div>
              <span>Health Centre Portal</span>
              <span className="text-[10px] font-mono opacity-75 bg-white/20 px-1.5 py-0.5 rounded">/health-centre</span>
              <Maximize2 className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity ml-0.5" />
            </button>
          </div>

          <div className="w-full shadow-lg rounded-2xl overflow-hidden border border-slate-200/90 transition-transform duration-200">
            <HealthCentrePortal
              isCollageItem={true}
              onExpandPortal={() => navigate('/health-centre')}
            />
          </div>
        </div>

        {/* Quadrant 2: Hospital Portal */}
        <div className="flex flex-col items-center">
          {/* Top Pill Badge matching screenshot with direct URL link */}
          <div className="relative -mb-3 z-10">
            <button
              onClick={() => navigate('/hospital')}
              className="bg-[#0f766e] hover:bg-[#115e59] text-white px-5 py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 group"
              title="Open /hospital"
            >
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                <Building2 className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span>Hospital Portal</span>
              <span className="text-[10px] font-mono opacity-75 bg-white/20 px-1.5 py-0.5 rounded">/hospital</span>
              <Maximize2 className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity ml-0.5" />
            </button>
          </div>

          <div className="w-full shadow-lg rounded-2xl overflow-hidden border border-slate-200/90 transition-transform duration-200">
            <HospitalPortal
              isCollageItem={true}
              onExpandPortal={() => navigate('/hospital')}
            />
          </div>
        </div>

        {/* Quadrant 3: Transport Coordinator Portal */}
        <div className="flex flex-col items-center">
          {/* Top Pill Badge matching screenshot with direct URL link */}
          <div className="relative -mb-3 z-10">
            <button
              onClick={() => navigate('/transport')}
              className="bg-[#4338ca] hover:bg-[#3730a3] text-white px-5 py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 group"
              title="Open /transport"
            >
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                <Truck className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span>Transport Coordinator Portal</span>
              <span className="text-[10px] font-mono opacity-75 bg-white/20 px-1.5 py-0.5 rounded">/transport</span>
              <Maximize2 className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity ml-0.5" />
            </button>
          </div>

          <div className="w-full shadow-lg rounded-2xl overflow-hidden border border-slate-200/90 transition-transform duration-200">
            <TransportPortal
              isCollageItem={true}
              onExpandPortal={() => navigate('/transport')}
            />
          </div>
        </div>

        {/* Quadrant 4: System Administrator Portal */}
        <div className="flex flex-col items-center">
          {/* Top Pill Badge matching screenshot with direct URL link */}
          <div className="relative -mb-3 z-10">
            <button
              onClick={() => navigate('/admin')}
              className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-5 py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 group"
              title="Open /admin"
            >
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                <Settings className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span>System Administrator Portal</span>
              <span className="text-[10px] font-mono opacity-75 bg-white/20 px-1.5 py-0.5 rounded">/admin</span>
              <Maximize2 className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity ml-0.5" />
            </button>
          </div>

          <div className="w-full shadow-lg rounded-2xl overflow-hidden border border-slate-200/90 transition-transform duration-200">
            <AdminPortal
              isCollageItem={true}
              onExpandPortal={() => navigate('/admin')}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
