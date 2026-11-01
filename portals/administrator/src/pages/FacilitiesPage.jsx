import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  CheckCircle2,
  Phone,
  BedDouble,
  Wind,
  Droplets,
  Edit3,
  X,
  Download,
  Eye,
  Filter,
  Activity,
  Layers
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function FacilitiesPage() {
  const { facilities, createFacility, updateFacility, toggleFacilityStatus } = useCareConnectData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'General Hospital',
    region: 'Addis Ababa',
    zone: 'Kirkos',
    woreda: 'Woreda 01',
    beds: 120,
    availableBeds: 25,
    icuBeds: 6,
    availableIcuBeds: 2,
    ventilators: 4,
    availableVentilators: 2,
    oxygenLevel: '85% Adequate',
    workloadLevel: 'Normal',
    contactPhone: '+251 11',
    specialties: 'General Surgery, Pediatrics, Emergency Care'
  });

  // Regions list
  const regions = useMemo(() => {
    const set = new Set(facilities.map(f => f.region).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [facilities]);

  // Filtered facilities
  const filtered = useMemo(() => {
    return facilities.filter(f => {
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.woreda && f.woreda.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = selectedType === 'All' || f.type === selectedType;
      const matchRegion = selectedRegion === 'All' || f.region === selectedRegion;

      return matchSearch && matchType && matchRegion;
    });
  }, [facilities, searchTerm, selectedType, selectedRegion]);

  const handleOpenRegister = () => {
    setFormData({
      name: '',
      type: 'General Hospital',
      region: 'Addis Ababa',
      zone: 'Kirkos',
      woreda: 'Woreda 01',
      beds: 120,
      availableBeds: 25,
      icuBeds: 6,
      availableIcuBeds: 2,
      ventilators: 4,
      availableVentilators: 2,
      oxygenLevel: '85% Adequate',
      workloadLevel: 'Normal',
      contactPhone: '+251 11',
      specialties: 'General Surgery, Pediatrics, Emergency Care'
    });
    setIsRegisterOpen(true);
  };

  const handleOpenEdit = (f) => {
    setSelectedFacility(f);
    setFormData({
      name: f.name,
      type: f.type,
      region: f.region,
      zone: f.zone,
      woreda: f.woreda || 'Woreda 01',
      beds: f.beds,
      availableBeds: f.availableBeds,
      icuBeds: f.icuBeds || 0,
      availableIcuBeds: f.availableIcuBeds || 0,
      ventilators: f.ventilators || 0,
      availableVentilators: f.availableVentilators || 0,
      oxygenLevel: f.oxygenLevel || '85% Adequate',
      workloadLevel: f.workloadLevel || 'Normal',
      contactPhone: f.contactPhone || '+251 11',
      specialties: Array.isArray(f.specialties) ? f.specialties.join(', ') : (f.specialties || '')
    });
    setIsEditOpen(true);
  };

  const handleOpenView = (f) => {
    setSelectedFacility(f);
    setIsViewOpen(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const specialtiesArr = formData.specialties
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    await createFacility({
      ...formData,
      beds: Number(formData.beds),
      availableBeds: Number(formData.availableBeds),
      icuBeds: Number(formData.icuBeds),
      availableIcuBeds: Number(formData.availableIcuBeds),
      ventilators: Number(formData.ventilators),
      availableVentilators: Number(formData.availableVentilators),
      specialties: specialtiesArr.length > 0 ? specialtiesArr : ['General Medicine']
    });

    setIsRegisterOpen(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFacility) return;

    const specialtiesArr = formData.specialties
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    await updateFacility(selectedFacility.id, {
      ...formData,
      beds: Number(formData.beds),
      availableBeds: Number(formData.availableBeds),
      icuBeds: Number(formData.icuBeds),
      availableIcuBeds: Number(formData.availableIcuBeds),
      ventilators: Number(formData.ventilators),
      availableVentilators: Number(formData.availableVentilators),
      specialties: specialtiesArr.length > 0 ? specialtiesArr : selectedFacility.specialties
    });

    setIsEditOpen(false);
  };

  const handleToggleStatus = async (id) => {
    await toggleFacilityStatus(id);
  };

  const handleExportCSV = () => {
    const headers = ['Facility ID', 'Name', 'Type', 'Region', 'Zone', 'Woreda', 'Total Beds', 'Available Beds', 'Status', 'Phone'];
    const rows = filtered.map(f => [
      f.id,
      `"${f.name}"`,
      `"${f.type}"`,
      `"${f.region}"`,
      `"${f.zone}"`,
      `"${f.woreda || ''}"`,
      f.beds,
      f.availableBeds,
      `"${f.operatingStatus || 'Operational'}"`,
      `"${f.contactPhone || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careconnect_facilities_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Healthcare Facility Directory (Section 9.E, FR-06, FR-07)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Registry of verified health centres, general hospitals, and tertiary referral institutes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenRegister}
            className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-xl font-bold shadow-xs flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Facility</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Total Facilities</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{facilities.length}</p>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">
            {facilities.filter(f => f.operatingStatus === 'Operational' || !f.operatingStatus).length} Operational
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Specialized Hospitals</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
            {facilities.filter(f => f.type && f.type.toLowerCase().includes('tertiary')).length}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Tertiary Referral Centers</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">General Hospitals</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {facilities.filter(f => f.type && f.type.toLowerCase().includes('general')).length}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Secondary Referral Hubs</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Health Centres</span>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-0.5">
            {facilities.filter(f => f.type && f.type.toLowerCase().includes('health centre')).length}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Primary Triage Facilities</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search facility by name, zone, woreda..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              <option value="All">All Types</option>
              <option value="Tertiary Specialized Hospital">Tertiary Specialized Hospital</option>
              <option value="General Hospital">General Hospital</option>
              <option value="Primary Health Centre">Primary Health Centre</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((f) => {
          const isOperational = f.operatingStatus === 'Operational' || !f.operatingStatus;
          const specialties = Array.isArray(f.specialties) ? f.specialties : [];

          return (
            <div key={f.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase">{f.type}</span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug mt-0.5">{f.name}</h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    isOperational
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900'
                  }`}>
                    {f.operatingStatus || 'Operational'}
                  </span>
                </div>

                <div className="space-y-2 text-slate-600 dark:text-slate-300 mt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{f.woreda ? `${f.woreda}, ` : ''}{f.zone}, {f.region}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold">
                      {f.beds} Total Beds • <span className="text-emerald-600 dark:text-emerald-400">{f.availableBeds} Available</span>
                    </span>
                  </div>

                  {f.contactPhone && (
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{f.contactPhone}</span>
                    </div>
                  )}
                </div>

                {specialties.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-1">
                    {specialties.slice(0, 3).map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                        {s}
                      </span>
                    ))}
                    {specialties.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-400">
                        +{specialties.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <button
                  onClick={() => handleToggleStatus(f.id)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  {isOperational ? 'Mark Maintenance' : 'Set Operational'}
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenView(f)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    title="View Facility Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(f)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg font-bold text-slate-700 dark:text-slate-200"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Register Facility Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Register Healthcare Facility</h3>
              <button onClick={() => setIsRegisterOpen(false)}><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. St. Peter's Specialized Hospital"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Facility Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Tertiary Specialized Hospital">Tertiary Specialized Hospital</option>
                    <option value="General Hospital">General Hospital</option>
                    <option value="Primary Health Centre">Primary Health Centre</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Region</label>
                  <input
                    type="text"
                    required
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Zone / Sub-city</label>
                  <input
                    type="text"
                    required
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Woreda</label>
                  <input
                    type="text"
                    value={formData.woreda}
                    onChange={(e) => setFormData({ ...formData, woreda: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Total Beds</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.beds}
                    onChange={(e) => setFormData({ ...formData, beds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Available Beds</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.availableBeds}
                    onChange={(e) => setFormData({ ...formData, availableBeds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">ICU Beds</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.icuBeds}
                    onChange={(e) => setFormData({ ...formData, icuBeds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Clinical Specialties (comma-separated)</label>
                <input
                  type="text"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  placeholder="Cardiology, Emergency Medicine, Trauma Surgery"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setIsRegisterOpen(false)} className="px-4 py-2 border rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#1e3a8a] text-white font-bold rounded-xl">Save & Register Facility</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Facility Modal */}
      {isEditOpen && selectedFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Edit Facility: {selectedFacility.name}</h3>
              <button onClick={() => setIsEditOpen(false)}><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Facility Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Tertiary Specialized Hospital">Tertiary Specialized Hospital</option>
                    <option value="General Hospital">General Hospital</option>
                    <option value="Primary Health Centre">Primary Health Centre</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Region</label>
                  <input
                    type="text"
                    required
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Zone / Sub-city</label>
                  <input
                    type="text"
                    required
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Woreda</label>
                  <input
                    type="text"
                    value={formData.woreda}
                    onChange={(e) => setFormData({ ...formData, woreda: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Total Beds</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.beds}
                    onChange={(e) => setFormData({ ...formData, beds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Available Beds</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.availableBeds}
                    onChange={(e) => setFormData({ ...formData, availableBeds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Clinical Specialties</label>
                <input
                  type="text"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 border rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#1e3a8a] text-white font-bold rounded-xl">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Facility Details Modal */}
      {isViewOpen && selectedFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase">{selectedFacility.type}</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">{selectedFacility.name}</h3>
              </div>
              <button onClick={() => setIsViewOpen(false)}><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Jurisdiction Location:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedFacility.woreda}, {selectedFacility.zone}, {selectedFacility.region}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Operating Status:</span>
                <span className="font-bold text-emerald-600">{selectedFacility.operatingStatus || 'Operational'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Total / Available Beds:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedFacility.availableBeds} / {selectedFacility.beds}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">ICU Units:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedFacility.availableIcuBeds || 0} / {selectedFacility.icuBeds || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Oxygen Readiness:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{selectedFacility.oxygenLevel || '85%'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Contact Number:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedFacility.contactPhone || 'N/A'}</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5 text-[11px]">Authorized Clinical Services:</span>
              <div className="flex flex-wrap gap-1.5">
                {(selectedFacility.specialties || []).map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[10px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}