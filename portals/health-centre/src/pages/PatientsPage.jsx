import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Filter,
  Phone,
  MapPin,
  Calendar,
  HeartPulse,
  ChevronRight,
  X,
  Edit2,
  Trash2,
  ArrowUpDown,
  FileText,
  Clock,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function PatientsPage() {
  const navigate = useNavigate();
  const { patients, referrals, createPatient, updatePatient, deletePatient } = useCareConnectData();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('All');
  const [filterBlood, setFilterBlood] = useState('All');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals state
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'referrals'
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  // Form state
  const initialForm = {
    name: '',
    age: '',
    gender: 'Male',
    phone: '+251 9',
    region: 'Addis Ababa',
    zone: 'Yeka',
    woreda: 'Woreda 03',
    kebele: 'Kebele 08',
    houseNo: 'House 102',
    emergencyContact: '',
    bloodType: 'O+',
    knownAllergies: 'None',
    chronicConditions: 'None'
  };
  const [formData, setFormData] = useState(initialForm);

  // Filter & Sort
  const filteredPatients = patients
    .filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.phone && p.phone.includes(searchTerm)) ||
        (p.nationalId && p.nationalId.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesGender = filterGender === 'All' || p.gender === filterGender;
      const matchesBlood = filterBlood === 'All' || p.bloodType === filterBlood;
      return matchesSearch && matchesGender && matchesBlood;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredPatients.length / pageSize) || 1;
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenRegister = () => {
    setEditingPatient(null);
    setFormData(initialForm);
    setIsRegisterOpen(true);
  };

  const handleOpenEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      region: patient.region || 'Addis Ababa',
      zone: patient.zone || 'Yeka',
      woreda: patient.woreda || 'Woreda 03',
      kebele: patient.kebele || 'Kebele 08',
      houseNo: patient.houseNo || 'House 102',
      emergencyContact: patient.emergencyContact || '',
      bloodType: patient.bloodType || 'O+',
      knownAllergies: patient.knownAllergies || 'None',
      chronicConditions: patient.chronicConditions || 'None'
    });
    setIsRegisterOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingPatient) {
      await updatePatient(editingPatient.id, formData);
      if (selectedPatient && selectedPatient.id === editingPatient.id) {
        setSelectedPatient({ ...selectedPatient, ...formData });
      }
    } else {
      await createPatient(formData);
    }
    setIsRegisterOpen(false);
    setEditingPatient(null);
  };

  const handleDelete = async (patientId) => {
    if (window.confirm('Are you sure you want to delete this patient record?')) {
      await deletePatient(patientId);
      if (selectedPatient && selectedPatient.id === patientId) {
        setSelectedPatient(null);
      }
    }
  };

  // Get referral history for the selected patient
  const patientReferrals = selectedPatient
    ? referrals.filter(r => r.patientId === selectedPatient.id || r.patientName === selectedPatient.name)
    : [];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Patient Registry & Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registered patients at Yeka Health Centre eligible for specialist referrals
          </p>
        </div>
        <button
          onClick={handleOpenRegister}
          className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all self-start cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search, Filters, and Sorting Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, patient ID, National ID, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Gender Filter */}
          <select
            value={filterGender}
            onChange={(e) => { setFilterGender(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          {/* Blood Type Filter */}
          <select
            value={filterBlood}
            onChange={(e) => { setFilterBlood(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="All">All Blood Types</option>
            <option value="O+">O+</option>
            <option value="A+">A+</option>
            <option value="B+">B+</option>
            <option value="AB+">AB+</option>
            <option value="O-">O-</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 bg-slate-50 dark:bg-slate-900">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-transparent border-none text-slate-700 dark:text-slate-200 focus:outline-none pr-1"
            >
              <option value="name">Name</option>
              <option value="age">Age</option>
              <option value="registeredAt">Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-1.5 py-0.5 rounded font-mono font-bold text-sky-600 dark:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              title="Toggle Asc/Desc"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Total Found */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
        <span>Showing {paginatedPatients.length} of {filteredPatients.length} Patients</span>
        <span>Page {currentPage} of {totalPages}</span>
      </div>

      {/* Patients Grid */}
      {paginatedPatients.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-700">
          <HeartPulse className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">No patients found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or register a new patient.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPatients.map((p) => {
            const refCount = referrals.filter(r => r.patientId === p.id || r.patientName === p.name).length;
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-sky-400 dark:hover:border-sky-500 transition-all space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-bold">{p.id}</span>
                      {p.nationalId && (
                        <span className="text-[9px] text-slate-400 font-mono">({p.nationalId})</span>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    {p.age} yrs • {p.gender}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{p.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{p.region} • {p.zone} • {p.woreda}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Blood: <b className="text-rose-500">{p.bloodType || 'O+'}</b> • Allergies: {p.knownAllergies || 'None'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <button
                    onClick={() => { setSelectedPatient(p); setActiveTab('referrals'); }}
                    className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold hover:underline cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{refCount} Referral{refCount !== 1 ? 's' : ''}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      title="Edit Patient"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Delete Patient"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setSelectedPatient(p); setActiveTab('overview'); }}
                      className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-semibold rounded-lg flex items-center gap-1 cursor-pointer ml-1"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-8 h-8 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                currentPage === i + 1
                  ? 'bg-[#0284c7] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Patient Details & Referral History Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center font-bold text-base">
                  {selectedPatient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{selectedPatient.name}</h3>
                  <span className="text-xs font-mono text-sky-600 dark:text-sky-400 font-bold">
                    {selectedPatient.id} • National ID: {selectedPatient.nationalId || 'N/A'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/80 text-xs font-bold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-all ${
                  activeTab === 'overview'
                    ? 'border-[#0284c7] text-[#0284c7]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Clinical Profile & Demographics
              </button>
              <button
                onClick={() => setActiveTab('referrals')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === 'referrals'
                    ? 'border-[#0284c7] text-[#0284c7]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <span>Referral History</span>
                <span className="px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950/80 text-[10px]">
                  {patientReferrals.length}
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Age & Gender</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPatient.age} years, {selectedPatient.gender}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Blood Group</span>
                      <span className="font-bold text-rose-500">{selectedPatient.bloodType || 'O+'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Phone Number</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPatient.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Location</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPatient.region}, {selectedPatient.zone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Woreda / Kebele</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPatient.woreda}, {selectedPatient.kebele}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">House Number</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPatient.houseNo || 'House 102'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-900 dark:text-white">Emergency Contact</h5>
                    <p className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
                      {selectedPatient.emergencyContact || 'No emergency contact registered'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white block">Known Allergies</span>
                      <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-800 dark:text-rose-300 font-medium">
                        {selectedPatient.knownAllergies || 'None recorded'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white block">Chronic Conditions</span>
                      <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 font-medium">
                        {selectedPatient.chronicConditions || 'None recorded'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'referrals' && (
                <div className="space-y-3">
                  {patientReferrals.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold">No referrals created yet for this patient</p>
                      <button
                        onClick={() => navigate('/create-referral')}
                        className="mt-3 px-4 py-2 bg-[#0284c7] text-white rounded-xl text-xs font-bold"
                      >
                        Create First Referral
                      </button>
                    </div>
                  ) : (
                    patientReferrals.map((ref) => (
                      <div
                        key={ref.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">{ref.id}</span>
                            <span className="text-[10px] text-slate-400">({ref.date})</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ref.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                            ref.status === 'In Transit' ? 'bg-violet-100 text-violet-700' :
                            ref.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {ref.status}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2">
                          {ref.clinicalSummary}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                          <span>Receiving: <b>{ref.receivingFacility}</b></span>
                          <span className="font-semibold text-sky-600 dark:text-sky-400">{ref.service}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs">
              <button
                onClick={() => handleOpenEdit(selectedPatient)}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Edit Patient
              </button>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  navigate('/create-referral');
                }}
                className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Create Referral for Patient</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Register / Edit Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingPatient ? 'Edit Patient Record' : 'Register New Patient (Yeka HC)'}
              </h3>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Almaz Bekele"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Age *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="125"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="e.g. 42"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251 9"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Blood Group</label>
                  <select
                    value={formData.bloodType}
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="O+">O+</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O-</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Region</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Zone / Sub-city</label>
                  <input
                    type="text"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Woreda / Kebele</label>
                  <input
                    type="text"
                    value={formData.woreda}
                    onChange={(e) => setFormData({ ...formData, woreda: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">House No.</label>
                  <input
                    type="text"
                    value={formData.houseNo}
                    onChange={(e) => setFormData({ ...formData, houseNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Emergency Contact (Name & Phone)</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="e.g. Tadesse Mengistu (Father) - +251 91 445 6677"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Known Allergies</label>
                  <input
                    type="text"
                    value={formData.knownAllergies}
                    onChange={(e) => setFormData({ ...formData, knownAllergies: e.target.value })}
                    placeholder="e.g. Penicillin, NSAIDs, or None"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Chronic Conditions</label>
                  <input
                    type="text"
                    value={formData.chronicConditions}
                    onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                    placeholder="e.g. Hypertension, Type 2 Diabetes, or None"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl shadow-xs"
                >
                  {editingPatient ? 'Update Patient' : 'Save Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
