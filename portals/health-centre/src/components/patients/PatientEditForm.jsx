import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  X,
  User,
  ShieldCheck,
  MapPin,
  HeartPulse,
  Phone,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@shared/components/ui/Button.jsx';
import { Card } from '@shared/components/display/Card.jsx';
import { TextInput } from '@shared/components/forms/TextInput.jsx';
import { Select } from '@shared/components/forms/Select.jsx';
import { Checkbox } from '@shared/components/forms/Checkbox.jsx';
import { Alert } from '@shared/components/feedback/Alert.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';
import { patientService } from '../../services/patientService.js';

const GENDER_OPTIONS = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'OTHER', label: 'Other' }
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active Healthcare Record' },
  { value: 'INACTIVE', label: 'Inactive / Discharged' },
  { value: 'DECEASED', label: 'Deceased' }
];

const BLOOD_TYPE_OPTIONS = [
  { value: '', label: 'Unknown' },
  { value: 'O+', label: 'O Positive (O+)' },
  { value: 'O-', label: 'O Negative (O-)' },
  { value: 'A+', label: 'A Positive (A+)' },
  { value: 'A-', label: 'A Negative (A-)' },
  { value: 'B+', label: 'B Positive (B+)' },
  { value: 'B-', label: 'B Negative (B-)' },
  { value: 'AB+', label: 'AB Positive (AB+)' },
  { value: 'AB-', label: 'AB Negative (AB-)' }
];

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

export function PatientEditForm({ patient, onSaveSuccess, onCancel }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: patient.first_name || '',
    father_name: patient.father_name || '',
    grandfather_name: patient.grandfather_name || '',
    gender: patient.gender || 'FEMALE',
    date_of_birth: patient.date_of_birth ? patient.date_of_birth.split('T')[0] : '',
    age_years: patient.age_years ?? '',
    phone_number: patient.phone_number || '',
    national_id: patient.national_id || '',
    kebele_id: patient.kebele_id || '',
    medical_record_number: patient.medical_record_number || '',
    region: patient.region || 'Addis Ababa',
    subcity_zone: patient.subcity_zone || '',
    woreda: patient.woreda || '',
    kebele: patient.kebele || '',
    house_number: patient.house_number || '',
    blood_type: patient.blood_type || '',
    known_allergies: patient.known_allergies || '',
    chronic_conditions: patient.chronic_conditions || '',
    is_pregnant: Boolean(patient.is_pregnant),
    edd_date: patient.edd_date ? patient.edd_date.split('T')[0] : '',
    status: patient.status || 'ACTIVE',
    correction_reason: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.first_name.trim()) errors.first_name = 'Given name is required';
    if (!formData.father_name.trim()) errors.father_name = "Father's name is required";

    if (formData.phone_number.trim()) {
      const clean = formData.phone_number.replace(/[\s-]/g, '');
      if (!/^\+?[0-9]{9,15}$/.test(clean)) {
        errors.phone_number = 'Invalid phone number format';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const updates = {
        first_name: formData.first_name.trim(),
        father_name: formData.father_name.trim(),
        grandfather_name: formData.grandfather_name.trim() || null,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth || null,
        age_years: formData.age_years !== '' ? Number(formData.age_years) : null,
        phone_number: formData.phone_number.trim() || null,
        national_id: formData.national_id.trim() || null,
        kebele_id: formData.kebele_id.trim() || null,
        medical_record_number: formData.medical_record_number.trim() || null,
        region: formData.region,
        subcity_zone: formData.subcity_zone.trim() || null,
        woreda: formData.woreda.trim() || null,
        kebele: formData.kebele.trim() || null,
        house_number: formData.house_number.trim() || null,
        blood_type: formData.blood_type || null,
        known_allergies: formData.known_allergies.trim() || null,
        chronic_conditions: formData.chronic_conditions.trim() || null,
        is_pregnant: formData.is_pregnant,
        edd_date: formData.is_pregnant && formData.edd_date ? formData.edd_date : null
      };

      // 1. Update demographics
      const updatedPatient = await patientService.updatePatient(patient.id, updates);

      // 2. If status was changed, update status endpoint
      if (formData.status !== patient.status) {
        await patientService.updatePatientStatus(patient.id, {
          status: formData.status,
          reason: formData.correction_reason || 'Status updated via clinical management interface'
        });
      }

      // 3. If a specific correction reason was supplied, record formal demographic correction audit entry
      if (formData.correction_reason.trim()) {
        await patientService.recordCorrection(patient.id, {
          field_name: 'demographics',
          new_value: 'multi_field_update',
          reason: formData.correction_reason.trim()
        }).catch(() => {});
      }

      setSuccessMessage('Patient demographic record updated successfully');

      if (onSaveSuccess) {
        onSaveSuccess(updatedPatient);
      }
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to update patient record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <Alert variant="danger" title="Update Failed">
          {submitError}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" title="Success">
          {successMessage}
        </Alert>
      )}

      {/* Demographics Card */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <User className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            1. Edit Patronymic Demographics
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label="Given Name *"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            error={fieldErrors.first_name}
            required
          />

          <TextInput
            label="Father's Name *"
            name="father_name"
            value={formData.father_name}
            onChange={handleChange}
            error={fieldErrors.father_name}
            required
          />

          <TextInput
            label="Grandfather's Name"
            name="grandfather_name"
            value={formData.grandfather_name}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Sex / Gender *"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            options={GENDER_OPTIONS}
            required
          />

          <TextInput
            label="Date of Birth"
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
          />

          <TextInput
            label="Age in Years"
            type="number"
            name="age_years"
            value={formData.age_years}
            onChange={handleChange}
            min="0"
            max="130"
          />
        </div>

        {formData.gender === 'FEMALE' && (
          <div className="p-3 rounded-xl bg-pink-50/60 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30 flex items-center justify-between gap-4">
            <Checkbox
              label="Currently Pregnant (Maternal Case)"
              name="is_pregnant"
              checked={formData.is_pregnant}
              onChange={handleChange}
            />

            {formData.is_pregnant && (
              <div className="w-56">
                <TextInput
                  label="Estimated Date of Delivery (EDD)"
                  type="date"
                  name="edd_date"
                  value={formData.edd_date}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Identifiers Card */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            2. Official Identifiers
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label="Fayda National ID"
            name="national_id"
            value={formData.national_id}
            onChange={handleChange}
            placeholder="FAYDA-XXXXXXXX"
          />

          <TextInput
            label="Kebele Resident ID"
            name="kebele_id"
            value={formData.kebele_id}
            onChange={handleChange}
          />

          <TextInput
            label="Facility MRN"
            name="medical_record_number"
            value={formData.medical_record_number}
            onChange={handleChange}
          />
        </div>
      </Card>

      {/* Contact & Geography */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <MapPin className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            3. Contact & Location
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label="Phone Number"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            error={fieldErrors.phone_number}
            placeholder="+251 9XX XXXXXX"
          />

          <Select
            label="Administrative Region"
            name="region"
            value={formData.region}
            onChange={handleChange}
            options={ETHIOPIAN_REGIONS}
          />

          <TextInput
            label="Zone / Subcity"
            name="subcity_zone"
            value={formData.subcity_zone}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TextInput
            label="Woreda"
            name="woreda"
            value={formData.woreda}
            onChange={handleChange}
          />

          <TextInput
            label="Kebele"
            name="kebele"
            value={formData.kebele}
            onChange={handleChange}
          />

          <TextInput
            label="House Number"
            name="house_number"
            value={formData.house_number}
            onChange={handleChange}
          />
        </div>
      </Card>

      {/* Clinical Baseline & Status */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <HeartPulse className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            4. Clinical Baseline & Lifecycle Status
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
            label="Known Drug Allergies"
            name="known_allergies"
            value={formData.known_allergies}
            onChange={handleChange}
          />

          <TextInput
            label="Chronic Conditions"
            name="chronic_conditions"
            value={formData.chronic_conditions}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Select
            label="Record Lifecycle Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={STATUS_OPTIONS}
          />

          <TextInput
            label="Audit Correction Reason (Clinical Notes)"
            name="correction_reason"
            value={formData.correction_reason}
            onChange={handleChange}
            placeholder="e.g. Corrected spelling of father name per resident ID"
            helperText="Recorded in immutable security audit trail"
          />
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-3">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={onCancel || (() => navigate(`/patients/${patient.id}`))}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
          className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white min-w-[150px] justify-center"
        >
          {submitting ? (
            <>
              <Spinner size="sm" className="text-white" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Record</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default PatientEditForm;
