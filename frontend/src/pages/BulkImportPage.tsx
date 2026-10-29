import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Institution } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Download,
  Trash2,
  Eye,
  ArrowLeft,
  RefreshCw,
  Database,
  Shield,
  Zap,
  X,
  Check,
} from 'lucide-react';

// ─── Bulk-Import-specific types ──────────────────────────────────────────────

interface CorrectionItem {
  field: string;
  original: string;
  corrected: string;
  reason: string;
}

interface AnalyzedRecord {
  row: number;
  original_data: Record<string, any>;
  corrected_data: Record<string, any>;
  corrections: CorrectionItem[];
  validation_errors: string[];
  is_valid: boolean;
  is_duplicate_in_db: boolean;
  is_duplicate_in_batch: boolean;
  duplicate_reason: string | null;
  duplicate_match_id: number | null;
  anomaly_status: 'NORMAL' | 'ANOMALOUS' | 'NOT_RUN';
  anomaly_score: number | null;
  anomaly_reason: string | null;
  ml_classification: 'GENUINE' | 'SUSPICIOUS' | 'NOT_RUN';
  ml_confidence: number | null;
  ml_reason: string | null;
  overall_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  include_in_import: boolean;
}

interface BatchAnalysis {
  batch_id: string;
  filename: string;
  total_records: number;
  valid_records: number;
  validation_issues: number;
  duplicate_count: number;
  anomaly_count: number;
  suspicious_count: number;
  auto_corrections_count: number;
  manual_review_count: number;
  records: AnalyzedRecord[];
}

interface ConfirmResult {
  batch_id: string;
  imported_count: number;
  skipped_count: number;
  status: string;
  message: string;
}

interface BatchSummary {
  id: number;
  batch_id: string;
  filename: string;
  uploaded_by: string;
  upload_timestamp: string;
  status: string;
  total_records: number;
  valid_records: number;
  validation_issues_count: number;
  duplicate_count: number;
  anomaly_count: number;
  suspicious_count: number;
  imported_count: number;
  file_deleted: boolean;
}

// ─── Workflow states ──────────────────────────────────────────────────────────

type WorkflowState = 'UPLOAD' | 'ANALYZING' | 'REVIEW' | 'CONFIRMING' | 'COMPLETE';
type ReviewTab = 'all' | 'corrections' | 'validation' | 'duplicates' | 'anomalies';

// ─── Helper utilities ─────────────────────────────────────────────────────────

const riskColor = (risk: AnalyzedRecord['overall_risk']) => {
  switch (risk) {
    case 'LOW':      return 'bg-emerald-100 text-emerald-800';
    case 'MEDIUM':   return 'bg-yellow-100 text-yellow-800';
    case 'HIGH':     return 'bg-orange-100 text-orange-800';
    case 'CRITICAL': return 'bg-rose-100 text-rose-800';
    default:         return 'bg-slate-100 text-slate-600';
  }
};

const anomalyBadge = (status: AnalyzedRecord['anomaly_status']) => {
  switch (status) {
    case 'ANOMALOUS': return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800"><Zap className="h-2.5 w-2.5" />Anomalous</span>;
    case 'NORMAL':    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800"><Check className="h-2.5 w-2.5" />Normal</span>;
    default:          return <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">—</span>;
  }
};

const mlBadge = (cls: AnalyzedRecord['ml_classification']) => {
  switch (cls) {
    case 'SUSPICIOUS': return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-800"><AlertTriangle className="h-2.5 w-2.5" />Suspicious</span>;
    case 'GENUINE':    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800"><Shield className="h-2.5 w-2.5" />Genuine</span>;
    default:           return <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">—</span>;
  }
};

const formatTs = (ts: string) => {
  try { return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return ts; }
};

// ─── Summary Card component ───────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}
const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, color, icon }) => (
  <div className={`flex-1 min-w-[120px] rounded-xl border p-3 flex flex-col gap-1 ${color}`}>
    <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-80">{icon}{label}</div>
    <div className="text-2xl font-extrabold leading-none">{value}</div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const BulkImportPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  // ── Global state ──────────────────────────────────────────────────────────
  const [state, setState] = useState<WorkflowState>('UPLOAD');
  const [error, setError] = useState<string | null>(null);

  // ── UPLOAD state ──────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [instLoading, setInstLoading] = useState(false);
  const [batchHistory, setBatchHistory] = useState<BatchSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── REVIEW state ──────────────────────────────────────────────────────────
  const [analysis, setAnalysis] = useState<BatchAnalysis | null>(null);
  const [records, setRecords] = useState<AnalyzedRecord[]>([]);
  const [activeTab, setActiveTab] = useState<ReviewTab>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // ── COMPLETE state ────────────────────────────────────────────────────────
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [fileDeleted, setFileDeleted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isAicteAdmin = hasRole(['AICTE_ADMIN']);

  // ── Load institutions (for admin) and batch history ───────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiClient.get<BatchSummary[]>('/bulk-import/batches');
      setBatchHistory(res.data);
    } catch {
      // Non-critical; fail silently
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAicteAdmin) {
      setInstLoading(true);
      apiClient.get<Institution[]>('/institutions')
        .then(r => setInstitutions(r.data))
        .catch(() => {})
        .finally(() => setInstLoading(false));
    }
    loadHistory();
  }, [isAicteAdmin, loadHistory]);

  // ── File selection helpers ────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(csv|xlsx)$/i)) {
      setError('Only CSV and XLSX files are accepted.');
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  // ── Analyze ───────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setError(null);
    setState('ANALYZING');

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (isAicteAdmin && selectedInstitutionId) {
      formData.append('institution_id', selectedInstitutionId);
    }

    try {
      const res = await apiClient.post<BatchAnalysis>('/bulk-import/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      const data = res.data;

      // Pre-compute include_in_import defaults:
      // Valid, non-duplicate records → included.  Others → excluded.
      const initialised: AnalyzedRecord[] = data.records.map(r => ({
        ...r,
        include_in_import: r.is_valid && !r.is_duplicate_in_db && !r.is_duplicate_in_batch,
      }));

      setAnalysis(data);
      setRecords(initialised);
      setActiveTab('all');
      setExpandedRow(null);
      setState('REVIEW');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join('; ')
          : 'Failed to analyze the file. Please check its format and try again.';
      setError(msg);
      setState('UPLOAD');
    }
  };

  // ── Toggle include for a record ───────────────────────────────────────────
  const toggleInclude = (row: number) => {
    setRecords(prev =>
      prev.map(r => (r.row === row ? { ...r, include_in_import: !r.include_in_import } : r))
    );
  };

  // ── Confirm import ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!analysis) return;
    setError(null);
    setState('CONFIRMING');

    const excludedRows = records
      .filter(r => !r.include_in_import)
      .map(r => r.row);

    try {
      const res = await apiClient.post<ConfirmResult>(
        `/bulk-import/confirm/${analysis.batch_id}`,
        { excluded_rows: excludedRows }
      );
      setConfirmResult(res.data);
      setFileDeleted(false);
      setDeleteError(null);
      setState('COMPLETE');
      loadHistory();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg =
        typeof detail === 'string' ? detail : 'Failed to store records. Please try again.';
      setError(msg);
      setState('REVIEW');
    }
  };

  // ── Delete source CSV ─────────────────────────────────────────────────────
  const handleDeleteCsv = async () => {
    if (!confirmResult) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/bulk-import/${confirmResult.batch_id}/source-file`);
      setFileDeleted(true);
      setShowDeleteModal(false);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setDeleteError(typeof detail === 'string' ? detail : 'Failed to delete source file.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Reset to upload ───────────────────────────────────────────────────────
  const resetToUpload = () => {
    setSelectedFile(null);
    setAnalysis(null);
    setRecords([]);
    setConfirmResult(null);
    setFileDeleted(false);
    setDeleteError(null);
    setError(null);
    setSelectedInstitutionId('');
    setState('UPLOAD');
    loadHistory();
  };

  // ── Derived review counts ─────────────────────────────────────────────────
  const includedCount = records.filter(
    r => r.include_in_import && r.is_valid && !r.is_duplicate_in_db && !r.is_duplicate_in_batch
  ).length;
  // All records user has checked (including invalid / dup overrides):
  const totalChecked = records.filter(r => r.include_in_import).length;
  const duplicateIncluded = records.filter(
    r => r.include_in_import && (r.is_duplicate_in_db || r.is_duplicate_in_batch)
  ).length;

  // ── Filtered tab records ──────────────────────────────────────────────────
  const tabRecords: AnalyzedRecord[] = (() => {
    switch (activeTab) {
      case 'corrections': return records.filter(r => r.corrections && r.corrections.length > 0);
      case 'validation':  return records.filter(r => !r.is_valid);
      case 'duplicates':  return records.filter(r => r.is_duplicate_in_db || r.is_duplicate_in_batch);
      case 'anomalies':   return records.filter(r => r.anomaly_status === 'ANOMALOUS' || r.ml_classification === 'SUSPICIOUS');
      default:            return records;
    }
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bulk Import</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload a CSV/XLSX file to validate, analyse, and import student records in bulk.
          </p>
        </div>
        {/* Step breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium select-none">
          {(['UPLOAD', 'ANALYZING', 'REVIEW', 'CONFIRMING', 'COMPLETE'] as WorkflowState[]).map((s, i, arr) => (
            <React.Fragment key={s}>
              <span className={`px-2 py-1 rounded-full ${state === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {s === 'UPLOAD' ? 'Upload' : s === 'ANALYZING' ? 'Analyse' : s === 'REVIEW' ? 'Review' : s === 'CONFIRMING' ? 'Confirm' : 'Complete'}
              </span>
              {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── UPLOAD ── */}
      {state === 'UPLOAD' && (
        <div className="space-y-6">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div><span className="font-semibold">Error: </span>{error}</div>
              <button onClick={() => setError(null)} className="ml-auto shrink-0"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Upload card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-700 text-white mb-3">
                  <Upload className="h-7 w-7" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Upload Student Data File</h2>
                <p className="text-xs text-slate-500">
                  Supports <strong>.csv</strong> and <strong>.xlsx</strong> formats.
                  The file will be analysed for validation errors, duplicate entries, and ML anomalies before import.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors flex flex-col items-center gap-3
                  ${isDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30'
                  }`}
              >
                {selectedFile ? (
                  <>
                    <FileText className="h-10 w-10 text-emerald-600" />
                    <div className="text-center">
                      <p className="font-semibold text-emerald-700 text-sm">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB · Click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-slate-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">Drag & drop your file here</p>
                      <p className="text-xs text-slate-400">or click to browse</p>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                />
              </div>

              {/* AICTE Admin: institution selector */}
              {isAicteAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Institution <span className="text-slate-400 font-normal">(optional — assign records to a specific institution)</span>
                  </label>
                  <select
                    value={selectedInstitutionId}
                    onChange={e => setSelectedInstitutionId(e.target.value)}
                    disabled={instLoading}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="">— Use institution from file / default —</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions row */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={`${apiClient.defaults.baseURL}/bulk-import/template`}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Template CSV
                </a>
                <button
                  onClick={handleAnalyze}
                  disabled={!selectedFile}
                  className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-sm transition"
                >
                  <Zap className="h-4 w-4" />
                  Analyse CSV
                </button>
              </div>
            </div>
          </div>

          {/* Batch history */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Database className="h-4 w-4 text-blue-600" /> Recent Import Batches
              </div>
              <button onClick={loadHistory} className="text-slate-400 hover:text-blue-700 transition" title="Refresh">
                <RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {historyLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading batch history…</div>
            ) : batchHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No import batches found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Filename</th>
                      <th className="py-2.5 px-4">Uploaded By</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Records</th>
                      <th className="py-2.5 px-4">Imported</th>
                      <th className="py-2.5 px-4">Dups</th>
                      <th className="py-2.5 px-4">Anomalies</th>
                      <th className="py-2.5 px-4">File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {batchHistory.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4 font-medium text-slate-800 max-w-[180px] truncate">{b.filename}</td>
                        <td className="py-2.5 px-4 text-slate-500">{b.uploaded_by}</td>
                        <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">{formatTs(b.upload_timestamp)}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
                            ${b.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                              b.status === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                              'bg-slate-100 text-slate-600'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">{b.total_records}</td>
                        <td className="py-2.5 px-4 font-semibold text-emerald-700">{b.imported_count}</td>
                        <td className="py-2.5 px-4 text-orange-600">{b.duplicate_count}</td>
                        <td className="py-2.5 px-4 text-purple-600">{b.anomaly_count}</td>
                        <td className="py-2.5 px-4">
                          {b.file_deleted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><Trash2 className="h-3 w-3" />Deleted</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600"><FileText className="h-3 w-3" />Stored</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ANALYZING ── */}
      {state === 'ANALYZING' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center space-y-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mx-auto">
            <RefreshCw className="h-9 w-9 text-blue-700 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Analysing CSV…</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Running validation, duplicate detection, and ML inference. Please wait — this may take up to a minute for large files.
            </p>
          </div>
          {/* Progress checklist */}
          <div className="inline-flex flex-col items-start gap-3 text-sm">
            {[
              { label: 'Parsing CSV', done: true },
              { label: 'Validating schema & field rules', done: true },
              { label: 'Deterministic duplicate detection', done: true },
              { label: 'Running ML analysis (Isolation Forest + Random Forest)…', done: false },
            ].map(step => (
              <div key={step.label} className={`flex items-center gap-3 ${step.done ? 'text-emerald-700' : 'text-blue-700'}`}>
                {step.done
                  ? <CheckCircle className="h-4 w-4 shrink-0" />
                  : <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                }
                <span className={step.done ? 'line-through opacity-60' : 'font-semibold'}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REVIEW ── */}
      {state === 'REVIEW' && analysis && (
        <div className="space-y-4 pb-24">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div><span className="font-semibold">Error: </span>{error}</div>
              <button onClick={() => setError(null)} className="ml-auto shrink-0"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* File info bar */}
          <div className="flex items-center gap-3 text-xs text-slate-500 bg-white rounded-xl border border-slate-200 px-4 py-2.5">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-slate-800">{analysis.filename}</span>
            <span className="text-slate-300">|</span>
            <span>Batch ID: <code className="font-mono text-slate-700">{analysis.batch_id}</code></span>
          </div>

          {/* Summary cards */}
          <div className="flex flex-wrap gap-3">
            <SummaryCard label="Total Records" value={analysis.total_records} color="bg-slate-50 border-slate-200 text-slate-800" icon={<Database className="h-3.5 w-3.5" />} />
            <SummaryCard label="Valid Records" value={analysis.valid_records} color="bg-emerald-50 border-emerald-200 text-emerald-900" icon={<CheckCircle className="h-3.5 w-3.5" />} />
            <SummaryCard label="Validation Issues" value={analysis.validation_issues} color="bg-rose-50 border-rose-200 text-rose-900" icon={<XCircle className="h-3.5 w-3.5" />} />
            <SummaryCard label="Duplicates" value={analysis.duplicate_count} color="bg-orange-50 border-orange-200 text-orange-900" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            {analysis.anomaly_count > 0 && (
              <SummaryCard label="IF Anomalies" value={analysis.anomaly_count} color="bg-purple-50 border-purple-200 text-purple-900" icon={<Zap className="h-3.5 w-3.5" />} />
            )}
            {analysis.suspicious_count > 0 && (
              <SummaryCard label="RF Suspicious" value={analysis.suspicious_count} color="bg-yellow-50 border-yellow-200 text-yellow-900" icon={<Shield className="h-3.5 w-3.5" />} />
            )}
            <SummaryCard label="Auto-Corrections" value={analysis.auto_corrections_count} color="bg-blue-50 border-blue-200 text-blue-900" icon={<Check className="h-3.5 w-3.5" />} />
            <SummaryCard label="Manual Review" value={analysis.manual_review_count} color="bg-rose-50 border-rose-200 text-rose-900" icon={<Eye className="h-3.5 w-3.5" />} />
          </div>

          {/* ML warning banners */}
          {analysis.anomaly_count > 0 && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
              <p>
                <strong>{analysis.anomaly_count} record{analysis.anomaly_count !== 1 ? 's' : ''} flagged as anomalous</strong> by Isolation Forest.
                These records have <strong>NOT</strong> been modified. Manual verification is recommended before confirming import.
              </p>
            </div>
          )}
          {analysis.suspicious_count > 0 && (
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600" />
              <p>
                <strong>{analysis.suspicious_count} record{analysis.suspicious_count !== 1 ? 's' : ''} classified as Suspicious</strong> by Random Forest.
                These records require review and have not been automatically altered.
              </p>
            </div>
          )}

          {/* Import rules note */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
            <span><CheckCircle className="inline h-3 w-3 text-emerald-600 mr-1" />Valid non-duplicate records are pre-selected for import.</span>
            <span><XCircle className="inline h-3 w-3 text-rose-500 mr-1" />Records with validation errors are excluded by default (override via checkbox).</span>
            <span><AlertTriangle className="inline h-3 w-3 text-orange-500 mr-1" />Duplicates excluded by default (override via checkbox).</span>
            <span><Zap className="inline h-3 w-3 text-purple-600 mr-1" />Anomalous/Suspicious records ARE included unless you uncheck them.</span>
            <span><Check className="inline h-3 w-3 text-blue-600 mr-1" />Safe auto-corrections are applied automatically (see Corrections tab).</span>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-200 overflow-x-auto">
              {([
                { key: 'all',         label: `All Records (${records.length})` },
                { key: 'corrections', label: `Auto-Corrections (${records.filter(r => r.corrections?.length > 0).length})` },
                { key: 'validation',  label: `Validation Issues (${records.filter(r => !r.is_valid).length})` },
                { key: 'duplicates',  label: `Duplicates (${records.filter(r => r.is_duplicate_in_db || r.is_duplicate_in_batch).length})` },
                { key: 'anomalies',   label: `Anomalies & Suspicious (${records.filter(r => r.anomaly_status === 'ANOMALOUS' || r.ml_classification === 'SUSPICIOUS').length})` },
              ] as { key: ReviewTab; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 px-3 py-2 text-xs font-semibold border-b-2 transition -mb-px whitespace-nowrap
                    ${activeTab === tab.key
                      ? 'border-blue-700 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {tabRecords.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400">No records in this category.</div>
              ) : (
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Student ID</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">APAAR ID</th>
                      <th className="py-2.5 px-3">Validation</th>
                      <th className="py-2.5 px-3">Duplicate</th>
                      <th className="py-2.5 px-3">IF Anomaly</th>
                      <th className="py-2.5 px-3">RF Class</th>
                      <th className="py-2.5 px-3">Risk</th>
                      <th className="py-2.5 px-3 text-center">Include</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {tabRecords.map(record => {
                      const isExpanded = expandedRow === record.row;
                      const isDup = record.is_duplicate_in_db || record.is_duplicate_in_batch;
                      const hasCorrections = record.corrections && record.corrections.length > 0;
                      const rowBg = !record.is_valid
                        ? 'bg-rose-50/40'
                        : isDup
                        ? 'bg-orange-50/40'
                        : '';

                      return (
                        <React.Fragment key={record.row}>
                          <tr
                            className={`hover:bg-slate-50 transition cursor-pointer ${rowBg}`}
                            onClick={() => setExpandedRow(isExpanded ? null : record.row)}
                          >
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">{record.row}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {record.corrected_data?.student_id || record.original_data?.student_id || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[140px] truncate">
                              {record.corrected_data?.full_name || record.original_data?.full_name || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {record.corrected_data?.apaar_id || record.original_data?.apaar_id || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              {record.is_valid
                                ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800"><Check className="h-2.5 w-2.5" />Valid</span>
                                : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800"><X className="h-2.5 w-2.5" />Invalid</span>
                              }
                            </td>
                            <td className="py-2.5 px-3">
                              {isDup
                                ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {record.is_duplicate_in_db ? 'In DB' : 'In Batch'}
                                  </span>
                                : <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700">Unique</span>
                              }
                            </td>
                            <td className="py-2.5 px-3">{anomalyBadge(record.anomaly_status)}</td>
                            <td className="py-2.5 px-3">{mlBadge(record.ml_classification)}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${riskColor(record.overall_risk)}`}>
                                {record.overall_risk}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={record.include_in_import}
                                onChange={() => toggleInclude(record.row)}
                                disabled={!record.is_valid && !isDup}
                                className="h-4 w-4 rounded border-slate-300 text-blue-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title={!record.is_valid ? 'Record has validation errors' : isDup ? 'Duplicate — override to include' : ''}
                              />
                            </td>
                          </tr>

                          {/* Expanded detail row */}
                          {isExpanded && (
                            <tr className="bg-slate-50">
                              <td colSpan={10} className="px-5 py-4 space-y-4 text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                  {/* Validation Errors */}
                                  {record.validation_errors && record.validation_errors.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="font-bold text-rose-700 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Validation Errors</p>
                                      <ul className="list-disc list-inside text-rose-600 space-y-0.5 pl-1">
                                        {record.validation_errors.map((e, i) => <li key={i}>{e}</li>)}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Auto-corrections */}
                                  {hasCorrections && (
                                    <div className="space-y-1">
                                      <p className="font-bold text-blue-700 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Auto-Corrections Applied</p>
                                      <table className="w-full border border-blue-100 rounded text-[11px]">
                                        <thead className="bg-blue-50">
                                          <tr>
                                            <th className="px-2 py-1 text-left text-blue-600">Field</th>
                                            <th className="px-2 py-1 text-left text-slate-500">Original</th>
                                            <th className="px-2 py-1 text-left text-emerald-600">Corrected</th>
                                            <th className="px-2 py-1 text-left text-slate-400">Reason</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {record.corrections.map((c, i) => (
                                            <tr key={i} className="border-t border-blue-100">
                                              <td className="px-2 py-1 font-mono font-semibold">{c.field}</td>
                                              <td className="px-2 py-1 text-rose-600 line-through">{c.original}</td>
                                              <td className="px-2 py-1 text-emerald-700 font-semibold">{c.corrected}</td>
                                              <td className="px-2 py-1 text-slate-500">{c.reason}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {/* Duplicate info */}
                                  {isDup && (
                                    <div className="space-y-1">
                                      <p className="font-bold text-orange-700 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Duplicate Information</p>
                                      <p className="text-slate-600">{record.duplicate_reason || 'Duplicate detected.'}</p>
                                      {record.duplicate_match_id && (
                                        <p className="text-slate-500">Matched DB record ID: <code className="font-mono bg-orange-50 px-1 rounded">{record.duplicate_match_id}</code></p>
                                      )}
                                      {record.is_duplicate_in_batch && <p className="text-orange-600 font-medium">Duplicate within this CSV batch.</p>}
                                      {record.is_duplicate_in_db && <p className="text-orange-700 font-medium">Already exists in database.</p>}
                                    </div>
                                  )}

                                  {/* ML details */}
                                  {(record.anomaly_status !== 'NOT_RUN' || record.ml_classification !== 'NOT_RUN') && (
                                    <div className="space-y-2">
                                      <p className="font-bold text-slate-700 flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-purple-600" /> ML Analysis Details</p>
                                      {record.anomaly_status !== 'NOT_RUN' && (
                                        <div className="space-y-0.5">
                                          <p className="text-[11px] text-slate-500">
                                            <strong className="text-purple-700">Isolation Forest:</strong> {record.anomaly_status}
                                            {record.anomaly_score !== null && <span className="ml-1 font-mono text-slate-400">(score: {record.anomaly_score?.toFixed(4)})</span>}
                                          </p>
                                          {record.anomaly_reason && <p className="text-slate-500">{record.anomaly_reason}</p>}
                                        </div>
                                      )}
                                      {record.ml_classification !== 'NOT_RUN' && (
                                        <div className="space-y-0.5">
                                          <p className="text-[11px] text-slate-500">
                                            <strong className="text-yellow-700">Random Forest:</strong> {record.ml_classification}
                                            {record.ml_confidence !== null && <span className="ml-1 font-mono text-slate-400">({(record.ml_confidence! * 100).toFixed(1)}% conf)</span>}
                                          </p>
                                          {record.ml_reason && <p className="text-slate-500">{record.ml_reason}</p>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Sticky action bar ── */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40 px-6 py-3 flex items-center justify-between gap-4">
            <button
              onClick={resetToUpload}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex items-center gap-4">
              {duplicateIncluded > 0 && (
                <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span><strong>{duplicateIncluded}</strong> duplicate{duplicateIncluded !== 1 ? 's' : ''} included — verify before confirming.</span>
                </div>
              )}
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-800">{totalChecked}</span> records selected
                {totalChecked !== includedCount && (
                  <span className="ml-1 text-slate-400">(incl. {totalChecked - includedCount} overrides)</span>
                )}
              </div>
              <button
                onClick={handleConfirm}
                disabled={totalChecked === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-sm transition"
              >
                <Database className="h-4 w-4" />
                Confirm & Store {totalChecked} Record{totalChecked !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMING ── */}
      {state === 'CONFIRMING' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center space-y-6">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mx-auto">
            <Database className="h-9 w-9 text-blue-700 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Storing Records…</h2>
            <p className="text-sm text-slate-500">Writing validated student records to the database. Please wait.</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-blue-700">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">In progress</span>
          </div>
        </div>
      )}

      {/* ── COMPLETE ── */}
      {state === 'COMPLETE' && confirmResult && (
        <div className="space-y-6">
          {/* Success card */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-emerald-900">Import Complete</h2>
              <p className="text-sm text-emerald-700 mt-1">{confirmResult.message}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-emerald-800">{confirmResult.imported_count}</div>
                <div className="text-xs text-emerald-600 font-medium mt-0.5">Records Imported</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-slate-600">{confirmResult.skipped_count}</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Records Skipped</div>
              </div>
            </div>
            <div className="text-xs text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-lg px-4 py-2">
              Batch ID: <code className="font-mono font-bold">{confirmResult.batch_id}</code>
            </div>
          </div>

          {/* Batch detail table */}
          {batchHistory.length > 0 && (() => {
            const thisBatch = batchHistory.find(b => b.batch_id === confirmResult.batch_id);
            if (!thisBatch) return null;
            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Batch Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { label: 'Filename', value: thisBatch.filename },
                        { label: 'Uploaded By', value: thisBatch.uploaded_by },
                        { label: 'Upload Timestamp', value: formatTs(thisBatch.upload_timestamp) },
                        { label: 'Status', value: thisBatch.status },
                        { label: 'Total Records', value: thisBatch.total_records },
                        { label: 'Valid Records', value: thisBatch.valid_records },
                        { label: 'Validation Issues', value: thisBatch.validation_issues_count },
                        { label: 'Duplicates', value: thisBatch.duplicate_count },
                        { label: 'Anomalies', value: thisBatch.anomaly_count },
                        { label: 'Suspicious', value: thisBatch.suspicious_count },
                        { label: 'Imported', value: thisBatch.imported_count },
                      ].map(row => (
                        <tr key={row.label} className="hover:bg-slate-50">
                          <td className="py-2.5 px-5 text-slate-500 font-medium w-48">{row.label}</td>
                          <td className="py-2.5 px-5 text-slate-800 font-semibold">{String(row.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* CSV deletion */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Source File</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The uploaded CSV is stored on the server. You may delete it to free storage — all imported records remain unaffected.
              </p>
            </div>
            {fileDeleted ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg">
                <Trash2 className="h-3.5 w-3.5" /> Source file deleted
              </span>
            ) : (
              <button
                onClick={() => { setShowDeleteModal(true); setDeleteError(null); }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Uploaded Source CSV
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/students')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <Eye className="h-4 w-4" /> View Imported Students
            </button>
            <button
              onClick={resetToUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-lg text-sm font-semibold transition"
            >
              <Upload className="h-4 w-4" /> Import Another File
            </button>
          </div>
        </div>
      )}

      {/* ── Delete CSV modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Trash2 className="h-4 w-4" /> Delete Uploaded CSV
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-rose-200 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 text-sm text-slate-700">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Delete uploaded CSV?</strong> This will permanently remove the source file from storage.
                  All imported student records and analysis results in the database will remain unaffected.
                </p>
              </div>
              {deleteError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-xs">
                  <XCircle className="h-4 w-4 shrink-0" /> {deleteError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCsv}
                  disabled={deleteLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition"
                >
                  {deleteLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleteLoading ? 'Deleting…' : 'Delete CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
