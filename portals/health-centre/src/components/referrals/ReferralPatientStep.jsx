import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Phone,
  MapPin,
  Calendar,
  HeartPulse,
  ArrowRight,
  AlertCircle,
  X,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';
import { patientService } from '../../services/patientService.js';
import { formatPatientId, formatClinicalDate, formatEthiopianPhone } from '@shared/utils/formatters.js';

export function ReferralPatientStep({ selectedPatient, onSelectPatient, onProceed }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const debounceTimerRef = useRef(null);

  // Search patients as clinician types
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearching(false);
      setHasSearched(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await patientService.getPatients({
          search: searchTerm.trim(),
          limit: 6
        });
        setSearchResults(res.data || []);
        setHasSearched(true);
      } catch (err) {
        setSearchError('Failed to search patients. Please verify network connectivity.');
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchTerm]);

  const handleSelect = (patient) => {
    onSelectPatient(patient);
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Step 1: Patient Selection & Identification</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select an authorized patient registered under your health centre facility to initiate this clinical referral
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate('/patients/register')}
          className="text-xs inline-flex items-center gap-1.5 border-dashed"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Patient Not Registered? Add New</span>
        </Button>
      </div>

      {/* Selected Patient Display Card */}
      {selectedPatient ? (
        <Card className="p-6 bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/60 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
                {selectedPatient.first_name ? selectedPatient.first_name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.father_name}`}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Selected for Referral
                  </span>
                </div>
                <div className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 mt-0.5">
                  ID: {formatPatientId(selectedPatient.id)}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectPatient(null)}
              className="text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Change Patient</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-sky-100 dark:border-sky-900/40 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Biological Sex:</span>
              <strong className="text-slate-800 dark:text-slate-200">{selectedPatient.gender || '—'}</strong>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Age:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {selectedPatient.age_years !== null && selectedPatient.age_years !== undefined
                  ? `${selectedPatient.age_years} yrs ${selectedPatient.is_dob_estimated ? '(est)' : ''}`
                  : 'Not recorded'}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Phone Contact:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {selectedPatient.phone_number ? formatEthiopianPhone(selectedPatient.phone_number) : 'None on file'}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Location:</span>
              <strong className="text-slate-800 dark:text-slate-200 truncate block">
                {[selectedPatient.woreda, selectedPatient.region].filter(Boolean).join(', ') || '—'}
              </strong>
            </div>
          </div>

          {selectedPatient.national_id && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fayda National ID: <strong className="font-mono">{selectedPatient.national_id}</strong></span>
            </div>
          )}
        </Card>
      ) : (
        /* Patient Search Input Box */
        <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Search Patient Directory *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {searching ? <Spinner size="sm" /> : <Search className="w-4 h-4" />}
              </div>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type Patient Name, ETH-PAT ID, Fayda ID, MRN, or Phone Number..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                autoComplete="off"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Only patients registered under your healthcare facility will appear in this referral selection
            </p>
          </div>

          {searchError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Search Results Dropdown/List */}
          {searchResults.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                Matching Patient Records ({searchResults.length}):
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {searchResults.map((patient) => {
                  const fullName = patient.full_name || `${patient.first_name} ${patient.father_name}`;
                  return (
                    <div
                      key={patient.id}
                      onClick={() => handleSelect(patient)}
                      className="p-3 bg-white dark:bg-slate-900 hover:bg-sky-50/60 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-semibold text-xs flex items-center justify-center shrink-0">
                          {patient.first_name ? patient.first_name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-sky-600">
                            {fullName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {formatPatientId(patient.id)} • {patient.gender}, Age {patient.age_years ?? '—'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium inline-flex items-center gap-1 group-hover:underline">
                          Select <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasSearched && searchResults.length === 0 && !searching && (
            <div className="py-6 text-center text-xs text-slate-500 space-y-2">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p>No patient records match "{searchTerm}" at your health centre.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/patients/register')}
                className="text-xs"
              >
                Register New Patient
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step Navigation Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/patients')}
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="primary"
          disabled={!selectedPatient}
          onClick={onProceed}
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white min-w-[170px] justify-center"
        >
          <span>Continue to Clinical Info</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default ReferralPatientStep;
