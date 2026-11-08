import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  MapPin,
  HeartPulse,
  Phone,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button } from '@shared/components/ui/Button.jsx';
import { Card } from '@shared/components/display/Card.jsx';
import { TextInput } from '@shared/components/forms/TextInput.jsx';
import { Select } from '@shared/components/forms/Select.jsx';
import { Checkbox } from '@shared/components/forms/Checkbox.jsx';
import { Alert } from '@shared/components/feedback/Alert.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { patientService } from '../../services/patientService.js';
import { formatPatientId } from '@shared/utils/formatters.js';

const ETHIOPIAN_REGIONS = [
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

const GENDER_OPTIONS = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'OTHER', label: 'Other' }
];

const BLOOD_TYPE_OPTIONS = [
  { value: '', label: 'Unknown / Not Tested' },
  { value: 'O+', label: 'O Positive (O+)' },
  { value: 'O-', label: 'O Negative (O-)' },
  { value: 'A+', label: 'A Positive (A+)' },
  { value: 'A-', label: 'A Negative (A-)' },
  { value: 'B+', label: 'B Positive (B+)' },
  { value: 'B-', label: 'B Negative (B-)' },
  { value: 'AB+', label: 'AB Positive (AB+)' },
  { value: 'AB-', label: 'AB Negative (AB-)' }
];

const RELATIONSHIP_OPTIONS = [
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'PARENT', label: 'Parent / Mother / Father' },
  { value: 'CHILD', label: 'Son / Daughter' },
  { value: 'SIBLING', label: 'Brother / Sister' },
  { value: 'GUARDIAN', label: 'Legal Guardian' },
  { value: 'FAMILY', label: 'Other Family Relative' },
  { value: 'NEIGHBOR', label: 'Neighbor' },
  { value: 'OTHER', label: 'Other Caregiver' }
];

export function PatientRegistrationForm({ onSuccess, onCancel }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    // Identity
    first_name: '',
    father_name: '',
    grandfather_name: '',
    gender: 'FEMALE',
    dob_mode: 'dob', // 'dob' or 'age'
    date_of_birth: '',
    age_years: '',
    age_months: '0',
    is_dob_estimated: false,
    national_id: '',
    kebele_id: '',
    medical_record_number: '',
    blood_type: '',
    primary_language: 'AMHARIC',
    is_pregnant: false,
    edd_date: '',
    // Contact & Geography
    phone_number: '',
    region: user?.facilityRegion?.split(',')[1]?.trim() || 'Addis Ababa',
    subcity_zone: '',
    woreda: '',
    kebele: '',
    house_number: '',
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: 'FAMILY',
    // Clinical Baseline
    known_allergies: '',
    chronic_conditions: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredPatient, setRegisteredPatient] = useState(null);

  // Duplicate candidates pre-check
  const [duplicateCandidates, setDuplicateCandidates] = useState([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: val
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Debounced duplicate detection
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const hasMinData =
      formData.national_id.trim().length >= 4 ||
      (formData.first_name.trim().length >= 2 && formData.father_name.trim().length >= 2) ||
      formData.phone_number.trim().length >= 9;

    if (!hasMinData) {
      setDuplicateCandidates([]);
      setIsCheckingDuplicates(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsCheckingDuplicates(true);
      try {
        const candidates = await patientService.identifyPatients({
          first_name: formData.first_name.trim() || undefined,
          father_name: formData.father_name.trim() || undefined,
          grandfather_name: formData.grandfather_name.trim() || undefined,
          phone_number: formData.phone_number.trim() || undefined,
          national_id: formData.national_id.trim() || undefined,
          mrn: formData.medical_record_number.trim() || undefined,
          region: formData.region || undefined,
          woreda: formData.woreda.trim() || undefined
        });
        setDuplicateCandidates(candidates || []);
      } catch {
        // Resilient fallback; ignore pre-check errors
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    formData.first_name,
    formData.father_name,
    formData.grandfather_name,
    formData.phone_number,
    formData.national_id,
    formData.medical_record_number,
    formData.region,
    formData.woreda
  ]);

  const validate = () => {
    const errors = {};

    if (!formData.first_name.trim()) {
      errors.first_name = 'Given name (first name) is required';
    } else if (formData.first_name.trim().length < 2) {
      errors.first_name = 'Given name must be at least 2 characters';
    }

    if (!formData.father_name.trim()) {
      errors.father_name = "Father's name is required";
    } else if (formData.father_name.trim().length < 2) {
      errors.father_name = "Father's name must be at least 2 characters";
    }

    if (formData.grandfather_name.trim() && formData.grandfather_name.trim().length < 2) {
      errors.grandfather_name = "Grandfather's name must be at least 2 characters when entered";
    }

    if (formData.dob_mode === 'dob') {
      if (!formData.date_of_birth) {
        errors.date_of_birth = 'Date of birth is required or switch to estimated age';
      } else {
        const d = new Date(formData.date_of_birth);
        if (isNaN(d.getTime())) {
          errors.date_of_birth = 'Invalid date format';
        } else if (d > new Date()) {
          errors.date_of_birth = 'Date of birth cannot be in the future';
        }
      }
    } else {
      if (!formData.age_years && formData.age_years !== 0) {
        errors.age_years = 'Age in years is required';
      } else {
        const age = Number(formData.age_years);
        if (isNaN(age) || age < 0 || age > 130) {
          errors.age_years = 'Age must be between 0 and 130 years';
        }
      }
    }

    if (formData.phone_number.trim()) {
      const clean = formData.phone_number.replace(/[\s-]/g, '');
      if (!/^\+?[0-9]{9,15}$/.test(clean)) {
        errors.phone_number = 'Phone format invalid. Must contain 9 to 15 digits (e.g., +251 911 234567)';
      }
    }

    if (formData.emergency_contact_phone.trim()) {
      const clean = formData.emergency_contact_phone.replace(/[\s-]/g, '');
      if (!/^\+?[0-9]{9,15}$/.test(clean)) {
        errors.emergency_contact_phone = 'Emergency phone format invalid';
      }
    }

    if (formData.emergency_contact_name.trim() && !formData.emergency_contact_phone.trim()) {
      errors.emergency_contact_phone = 'Phone number is required when emergency contact name is provided';
    }

    if (formData.is_pregnant && formData.edd_date) {
      const edd = new Date(formData.edd_date);
      if (isNaN(edd.getTime())) {
        errors.edd_date = 'Invalid EDD date format';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        father_name: formData.father_name.trim(),
        grandfather_name: formData.grandfather_name.trim() || undefined,
        gender: formData.gender,
        date_of_birth: formData.dob_mode === 'dob' ? formData.date_of_birth : undefined,
        age_years: formData.dob_mode === 'age' ? Number(formData.age_years) : undefined,
        age_months: formData.age_months !== '' ? Number(formData.age_months) : undefined,
        is_dob_estimated: formData.dob_mode === 'age' || formData.is_dob_estimated,
        national_id: formData.national_id.trim() || undefined,
        kebele_id: formData.kebele_id.trim() || undefined,
        medical_record_number: formData.medical_record_number.trim() || undefined,
        phone_number: formData.phone_number.trim() || undefined,
        region: formData.region,
        subcity_zone: formData.subcity_zone.trim() || undefined,
        woreda: formData.woreda.trim() || undefined,
        kebele: formData.kebele.trim() || undefined,
        house_number: formData.house_number.trim() || undefined,
        blood_type: formData.blood_type || undefined,
        primary_language: formData.primary_language || 'AMHARIC',
        is_pregnant: formData.is_pregnant,
        edd_date: formData.is_pregnant && formData.edd_date ? formData.edd_date : undefined,
        emergency_contact_name: formData.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || undefined,
        emergency_contact_relation: formData.emergency_contact_name.trim() ? formData.emergency_contact_relation : undefined,
        known_allergies: formData.known_allergies.trim() || undefined,
        chronic_conditions: formData.chronic_conditions.trim() || undefined
      };

      const result = await patientService.registerPatient(payload);
      setRegisteredPatient(result);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Patient registration failed';
      setSubmitError(msg);

      if (err?.response?.data?.error?.details && Array.isArray(err.response.data.error.details)) {
        const apiErrors = {};
        err.response.data.error.details.forEach((item) => {
          if (item.field) apiErrors[item.field] = item.message;
        });
        setFieldErrors(apiErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Registration Confirmation View
  if (registeredPatient) {
    const pFullName = registeredPatient.full_name || `${registeredPatient.first_name} ${registeredPatient.father_name}`;
    return (
      <Card className="p-8 max-w-2xl mx-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-center shadow-md">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Patient Successfully Registered
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          The official healthcare record has been created in your health centre facility repository.
        </p>

        {/* Reference Number Box */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 mb-6 text-left space-y-2">
          <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
            Official Patient Reference Number
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400 select-all">
            {formatPatientId(registeredPatient.id)}
          </div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 pt-1">
            {pFullName}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {registeredPatient.gender} • Age: {registeredPatient.age_years ?? '—'} • {registeredPatient.region || 'Addis Ababa'}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setRegisteredPatient(null);
              setFormData((prev) => ({
                ...prev,
                first_name: '',
                father_name: '',
                grandfather_name: '',
                date_of_birth: '',
                age_years: '',
                national_id: '',
                phone_number: '',
                emergency_contact_name: '',
                emergency_contact_phone: ''
              }));
            }}
          >
            Register Another Patient
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate(`/patients/${encodeURIComponent(registeredPatient.id)}`)}
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <span>Open Patient Profile</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {submitError && (
        <Alert variant="danger" title="Registration Failed">
          {submitError}
        </Alert>
      )}

      {/* Duplicate candidate warning banner */}
      {duplicateCandidates.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">
                Possible Duplicate Record Detected ({duplicateCandidates.length})
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                A patient with matching demographics or phone number already exists in the system. Please verify if this patient is already registered before creating a new record:
              </p>
              <div className="mt-2 space-y-1.5">
                {duplicateCandidates.slice(0, 3).map((c) => (
                  <div
                    key={c.patient?.id}
                    className="text-xs bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold">{c.patient?.full_name}</span>{' '}
                      <span className="font-mono text-slate-500">({c.patient?.id})</span> —{' '}
                      <span>{c.patient?.gender}, Age {c.patient?.age_years}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/patients/${encodeURIComponent(c.patient?.id)}`)}
                      className="text-sky-600 dark:text-sky-400 hover:underline font-medium ml-2"
                    >
                      View Record
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Ethiopian Patronymic Identity */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <User className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            1. Patient Identity & Patronymic Demographics
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label="Given Name (First Name) *"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            error={fieldErrors.first_name}
            placeholder="e.g. Almaz"
            required
            autoComplete="off"
          />

          <TextInput
            label="Father's Name *"
            name="father_name"
            value={formData.father_name}
            onChange={handleChange}
            error={fieldErrors.father_name}
            placeholder="e.g. Bekele"
            required
            autoComplete="off"
          />

          <TextInput
            label="Grandfather's Name (Optional)"
            name="grandfather_name"
            value={formData.grandfather_name}
            onChange={handleChange}
            error={fieldErrors.grandfather_name}
            placeholder="e.g. Tadesse"
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          <Select
            label="Sex / Gender *"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            options={GENDER_OPTIONS}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Age Specification Mode
            </label>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, dob_mode: 'dob' }))}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                  formData.dob_mode === 'dob'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Exact DOB
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, dob_mode: 'age', is_dob_estimated: true }))}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                  formData.dob_mode === 'age'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Estimated Age
              </button>
            </div>
          </div>

          {formData.dob_mode === 'dob' ? (
            <TextInput
              label="Date of Birth *"
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              error={fieldErrors.date_of_birth}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <TextInput
                label="Age (Years) *"
                type="number"
                name="age_years"
                value={formData.age_years}
                onChange={handleChange}
                error={fieldErrors.age_years}
                placeholder="Years"
                min="0"
                max="130"
                required
              />
              <TextInput
                label="Months (0-11)"
                type="number"
                name="age_months"
                value={formData.age_months}
                onChange={handleChange}
                placeholder="Months"
                min="0"
                max="11"
              />
            </div>
          )}
        </div>

        {/* Pregnancy indicator if Female */}
        {formData.gender === 'FEMALE' && (
          <div className="p-3.5 rounded-xl bg-pink-50/60 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Checkbox
              label="Patient is currently pregnant (Maternal Health)"
              name="is_pregnant"
              checked={formData.is_pregnant}
              onChange={handleChange}
            />

            {formData.is_pregnant && (
              <div className="w-full sm:w-60">
                <TextInput
                  label="Estimated Date of Delivery (EDD)"
                  type="date"
                  name="edd_date"
                  value={formData.edd_date}
                  onChange={handleChange}
                  error={fieldErrors.edd_date}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Section 2: Official Identifiers */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            2. Official Identifiers (Fayda, Kebele & MRN)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label="Fayda National ID (Optional)"
            name="national_id"
            value={formData.national_id}
            onChange={handleChange}
            error={fieldErrors.national_id}
            placeholder="e.g. FAYDA-12345678"
            autoComplete="off"
            helperText="16-digit National ID or Fayda reference"
          />

          <TextInput
            label="Kebele Resident ID (Optional)"
            name="kebele_id"
            value={formData.kebele_id}
            onChange={handleChange}
            placeholder="e.g. KEB-08-9921"
            autoComplete="off"
          />

          <TextInput
            label="Facility Medical Record Number (MRN)"
            name="medical_record_number"
            value={formData.medical_record_number}
            onChange={handleChange}
            placeholder="e.g. HC-MRN-4421"
            autoComplete="off"
          />
        </div>
      </Card>

      {/* Section 3: Contact & Geographic Location */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <MapPin className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            3. Contact & Regional Geographic Location
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label="Phone Number (Optional)"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            error={fieldErrors.phone_number}
            placeholder="+251 9XX XXXXXX"
            autoComplete="tel"
            helperText="Supports Ethiopian mobile or landline numbers"
          />

          <Select
            label="Administrative Region *"
            name="region"
            value={formData.region}
            onChange={handleChange}
            options={ETHIOPIAN_REGIONS}
            required
          />

          <TextInput
            label="Zone / Subcity"
            name="subcity_zone"
            value={formData.subcity_zone}
            onChange={handleChange}
            placeholder="e.g. Yeka / Bole"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TextInput
            label="Woreda"
            name="woreda"
            value={formData.woreda}
            onChange={handleChange}
            placeholder="e.g. Woreda 03"
          />

          <TextInput
            label="Kebele"
            name="kebele"
            value={formData.kebele}
            onChange={handleChange}
            placeholder="e.g. Kebele 08"
          />

          <TextInput
            label="House Number"
            name="house_number"
            value={formData.house_number}
            onChange={handleChange}
            placeholder="e.g. House 142"
          />
        </div>
      </Card>

      {/* Section 4: Emergency Contact */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            4. Emergency Contact Details
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label="Contact Full Name"
            name="emergency_contact_name"
            value={formData.emergency_contact_name}
            onChange={handleChange}
            placeholder="e.g. Desta Mekonnen"
          />

          <TextInput
            label="Contact Phone Number"
            name="emergency_contact_phone"
            value={formData.emergency_contact_phone}
            onChange={handleChange}
            error={fieldErrors.emergency_contact_phone}
            placeholder="+251 9XX XXXXXX"
          />

          <Select
            label="Relationship to Patient"
            name="emergency_contact_relation"
            value={formData.emergency_contact_relation}
            onChange={handleChange}
            options={RELATIONSHIP_OPTIONS}
          />
        </div>
      </Card>

      {/* Section 5: Clinical Baseline */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <HeartPulse className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            5. Clinical Baseline & Allergies
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Blood Group"
            name="blood_type"
            value={formData.blood_type}
            onChange={handleChange}
            options={BLOOD_TYPE_OPTIONS}
          />

          <TextInput
            label="Known Drug / Food Allergies"
            name="known_allergies"
            value={formData.known_allergies}
            onChange={handleChange}
            placeholder="e.g. Penicillin, Sulfa"
          />

          <TextInput
            label="Chronic Medical Conditions"
            name="chronic_conditions"
            value={formData.chronic_conditions}
            onChange={handleChange}
            placeholder="e.g. Hypertension, Type 2 Diabetes"
          />
        </div>
      </Card>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={onCancel || (() => navigate('/patients'))}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
          className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white min-w-[180px] justify-center"
        >
          {submitting ? (
            <>
              <Spinner size="sm" className="text-white" />
              <span>Registering Patient...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Register</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default PatientRegistrationForm;
