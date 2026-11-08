import React, { useState } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  AlertCircle,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  Paperclip,
  CheckCircle2
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg'
];

const DOCUMENT_TYPES = [
  { value: 'LAB_RESULT', label: 'Laboratory Results' },
  { value: 'IMAGING', label: 'Radiology / Ultrasound / X-Ray' },
  { value: 'CLINICAL_NOTE', label: 'Clinical Examination Notes' },
  { value: 'PRESCRIPTION', label: 'Prior Prescription / Medication Record' },
  { value: 'DISCHARGE_SUMMARY', label: 'Previous Discharge Summary' },
  { value: 'OTHER', label: 'Other Clinical Supporting Document' }
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function ReferralDocumentsStep({
  attachedFiles,
  onChangeFiles,
  onBack,
  onProceed
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('LAB_RESULT');
  const [docDescription, setDocDescription] = useState('');
  const [fileError, setFileError] = useState(null);

  const handleFilesAdded = (filesList) => {
    setFileError(null);
    const newAttachments = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) && !file.name.match(/\.(pdf|jpe?g|png)$/i)) {
        setFileError(`File "${file.name}" is not supported. Allowed formats: PDF, JPEG, PNG.`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`File "${file.name}" exceeds the 10MB maximum file size limit.`);
        continue;
      }

      newAttachments.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        documentType: selectedDocType,
        description: docDescription.trim() || file.name
      });
    }

    if (newAttachments.length > 0) {
      onChangeFiles([...attachedFiles, ...newAttachments]);
      setDocDescription('');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (fileId) => {
    onChangeFiles(attachedFiles.filter((item) => item.id !== fileId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Step 4: Clinical Supporting Documents & Attachments</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Upload diagnostic investigations, laboratory reports, or referral slips (optional, max 10MB per file)
        </p>
      </div>

      {fileError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      {/* Upload Box */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Category
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="e.g., CBC & Blood Chemistry, Abdominal Ultrasound"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Drag & drop files here, or{' '}
            <label className="text-sky-600 dark:text-sky-400 hover:underline cursor-pointer">
              browse your device
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Supports PDF, JPEG, PNG (maximum 10MB per file)
          </p>
        </div>
      </Card>

      {/* Attached Files List */}
      {attachedFiles.length > 0 ? (
        <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Attached Supporting Files ({attachedFiles.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Total: {formatBytes(attachedFiles.reduce((acc, f) => acc + (f.fileSize || 0), 0))}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {attachedFiles.map((att) => {
              const docTypeLabel =
                DOCUMENT_TYPES.find((d) => d.value === att.documentType)?.label || att.documentType;

              return (
                <div
                  key={att.id}
                  className="py-2.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {att.fileName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {docTypeLabel}
                        </span>
                        <span>•</span>
                        <span>{formatBytes(att.fileSize)}</span>
                        {att.description && att.description !== att.fileName && (
                          <>
                            <span>•</span>
                            <span className="truncate italic">"{att.description}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveFile(att.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                    title="Remove attachment"
                    aria-label={`Remove attachment ${att.fileName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-3">
          <FileCheck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">No documents attached yet.</span>
            <p className="mt-0.5">
              Attaching diagnostic files or prior clinical records is optional. You can proceed directly to review if no files are needed.
            </p>
          </div>
        </div>
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
          <span>Back to Destination</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={onProceed}
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white min-w-[170px] justify-center"
        >
          <span>Proceed to Final Review</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default ReferralDocumentsStep;
