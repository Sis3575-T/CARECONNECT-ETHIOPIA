import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  MapPin,
  CheckCircle2,
  Stethoscope,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Building,
  Filter,
  Check
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { Select } from '@shared/components/forms/Select.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';
import { referralCreationService } from '../../services/referralCreationService.js';

const REGION_OPTIONS = [
  { value: 'ALL', label: 'All Regions' },
  { value: 'Addis Ababa', label: 'Addis Ababa' },
  { value: 'Afar', label: 'Afar' },
  { value: 'Amhara', label: 'Amhara' },
  { value: 'Benishangul-Gumuz', label: 'Benishangul-Gumuz' },
  { value: 'Central Ethiopia', label: 'Central Ethiopia' },
  { value: 'Dire Dawa', label: 'Dire Dawa' },
  { value: 'Gambela', label: 'Gambela' },
  { value: 'Harari', label: 'Harari' },
  { value: 'Oromia', label: 'Oromia' },
  { value: 'Sidama', label: 'Sidama' },
  { value: 'Somali', label: 'Somali' },
  { value: 'South Ethiopia', label: 'South Ethiopia' },
  { value: 'Southwest Ethiopia', label: 'Southwest Ethiopia' },
  { value: 'Tigray', label: 'Tigray' }
];

export function ReferralDestinationStep({
  destinationData,
  onChange,
  onBack,
  onProceed
}) {
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [hospitalError, setHospitalError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');

  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [validationError, setValidationError] = useState(null);

  // Load hospitals from backend
  useEffect(() => {
    let isMounted = true;
    setLoadingHospitals(true);
    setHospitalError(null);

    referralCreationService
      .getDestinationHospitals({
        region: regionFilter,
        search: searchTerm
      })
      .then((data) => {
        if (isMounted) setHospitals(data || []);
      })
      .catch(() => {
        if (isMounted) setHospitalError('Failed to load destination hospitals. Please check facility network.');
      })
      .finally(() => {
        if (isMounted) setLoadingHospitals(false);
      });

    return () => {
      isMounted = false;
    };
  }, [regionFilter, searchTerm]);

  // Load services when a hospital is selected
  useEffect(() => {
    if (destinationData.destination_facility_id) {
      let isMounted = true;
      setLoadingServices(true);

      referralCreationService
        .getHospitalServices(destinationData.destination_facility_id)
        .then((data) => {
          if (isMounted) setServices(data || []);
        })
        .catch(() => {
          if (isMounted) setServices([]);
        })
        .finally(() => {
          if (isMounted) setLoadingServices(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setServices([]);
    }
  }, [destinationData.destination_facility_id]);

  const handleHospitalSelect = (hospital) => {
    setValidationError(null);
    onChange({
      ...destinationData,
      destination_facility_id: hospital.id,
      destination_facility_name: hospital.name,
      destination_facility_region: hospital.region,
      required_specialty: '' // reset specialty for new hospital
    });
  };

  const handleSpecialtySelect = (specialty) => {
    onChange({
      ...destinationData,
      required_specialty: specialty
    });
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (!destinationData.destination_facility_id) {
      setValidationError('Please select an authorized destination hospital to receive this referral');
      return;
    }
    onProceed();
  };

  const selectedHospital = hospitals.find((h) => h.id === destinationData.destination_facility_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Step 3: Destination Hospital & Specialty Service Selection</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select an authorized tertiary or specialized hospital and the target clinical department for patient transfer
        </p>
      </div>

      {validationError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Hospital Search & Region Filter Row */}
      <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hospitals by name, city, or specialty..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>

          <div className="w-full sm:w-52">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              aria-label="Filter hospitals by region"
            >
              {REGION_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Hospitals Selection Grid */}
        {loadingHospitals ? (
          <div className="py-12 text-center">
            <Spinner size="md" className="mx-auto mb-2 text-sky-600" />
            <p className="text-xs text-slate-500">Querying active healthcare hospitals...</p>
          </div>
        ) : hospitalError ? (
          <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs text-center">
            {hospitalError}
          </div>
        ) : hospitals.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No active hospitals found matching "{searchTerm}". Try broadening your search or region.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {hospitals.map((hosp) => {
              const isSelected = destinationData.destination_facility_id === hosp.id;
              const typeLabel = (hosp.facility_type || hosp.type || 'Hospital')
                .replace(/_/g, ' ')
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase());

              return (
                <div
                  key={hosp.id}
                  onClick={() => handleHospitalSelect(hosp)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && handleHospitalSelect(hosp)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 shadow-sm ring-1 ring-sky-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                        {hosp.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {typeLabel}
                      </span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{[hosp.woreda, hosp.region].filter(Boolean).join(', ') || 'Ethiopia'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Target Service / Department Selection */}
      {destinationData.destination_facility_id && (
        <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Stethoscope className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Target Clinical Department or Specialty
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Specify the specialty department at <strong className="text-slate-800 dark:text-slate-200">{destinationData.destination_facility_name}</strong> to handle clinical triage:
          </p>

          {loadingServices ? (
            <div className="py-6 text-center">
              <Spinner size="sm" className="mx-auto mb-1 text-indigo-600" />
              <span className="text-xs text-slate-400">Loading department capabilities...</span>
            </div>
          ) : services.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {services.map((svc) => {
                const sName = svc.service_name || svc.name || svc;
                const isSelected = destinationData.required_specialty === sName;
                return (
                  <button
                    key={sName}
                    type="button"
                    onClick={() => handleSpecialtySelect(sName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {sName}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
              {[
                'Emergency & Trauma',
                'General Surgery',
                'Internal Medicine',
                'Obstetrics & Gynecology',
                'Pediatrics',
                'Cardiology',
                'Orthopedics',
                'Intensive Care Unit (ICU)'
              ].map((specialty) => {
                const isSelected = destinationData.required_specialty === specialty;
                return (
                  <button
                    key={specialty}
                    type="button"
                    onClick={() => handleSpecialtySelect(specialty)}
                    className={`p-2.5 rounded-lg text-xs font-medium text-left border transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {specialty}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clinical Info</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={handleContinue}
          disabled={!destinationData.destination_facility_id}
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white min-w-[170px] justify-center"
        >
          <span>Continue to Attachments</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default ReferralDestinationStep;
