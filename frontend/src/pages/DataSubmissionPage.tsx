import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  UserPlus, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Send, 
  Building2, 
  ShieldCheck,
  Code2,
  Copy,
  Check
} from 'lucide-react';
import { BulkImportPage } from './BulkImportPage';
import { submissionsApi, institutionsApi, intakesApi } from '../api';
import { Institution, ProgramIntake, Student } from '../types';
import { useAuth } from '../context/AuthContext';

export const DataSubmissionPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'csv' | 'manual' | 'api'>('csv');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [intakes, setIntakes] = useState<ProgramIntake[]>([]);
  
  // Manual Form State
  const [formData, setFormData] = useState({
    institution_id: user?.institution_id || 1,
    student_id: '',
    apaar_id: '',
    full_name: '',
    email: '',
    date_of_birth: '2004-06-15',
    gender: 'Male',
    degree_program: 'B.Tech Computer Science and Engineering',
    admission_date: new Date().toISOString().split('T')[0],
    academic_year: '2024-2025',
    certificate_number: '',
    admission_category: 'GENERAL',
    supernumerary_quota: 'None',
    nri_status: 'NO',
    oci_status: 'NO',
    foreign_national_status: 'NO',
  });

  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState<Student | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  // API Tester State
  const [apiPayload, setApiPayload] = useState(
    JSON.stringify(
      {
        institution_code: user?.institution_code || 'COEP-1854',
        records: [
          {
            student_id: 'STU-API-101',
            apaar_id: '123456789012',
            full_name: 'Pooja Verma',
            email: 'pooja.verma@example.edu',
            date_of_birth: '2004-03-22',
            gender: 'Female',
            degree_program: 'B.Tech Information Technology',
            admission_date: '2024-08-01',
            academic_year: '2024-2025',
            certificate_number: 'CERT-2024-8801',
            admission_category: 'GENERAL',
            supernumerary_quota: 'None',
            nri_status: 'NO',
            oci_status: 'NO',
            foreign_national_status: 'NO'
          }
        ]
      },
      null,
      2
    )
  );
  const [apiLoading, setApiLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [insts, ints] = await Promise.all([
          institutionsApi.getInstitutions(),
          intakesApi.getIntakes()
        ]);
        setInstitutions(insts);
        setIntakes(ints);
        if (insts.length > 0 && !formData.institution_id) {
          setFormData((prev) => ({ ...prev, institution_id: insts[0].id }));
        }
      } catch (err) {
        console.error('Failed to load institution metadata', err);
      }
    };
    loadMeta();
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoading(true);
    setManualError(null);
    setManualResult(null);

    try {
      const student = await submissionsApi.submitManual(formData);
      setManualResult(student);
      // Reset unique fields
      setFormData((prev) => ({
        ...prev,
        student_id: '',
        apaar_id: '',
        full_name: '',
        email: '',
        certificate_number: '',
      }));
    } catch (err: any) {
      setManualError(err?.response?.data?.detail || 'Failed to submit student record.');
    } finally {
      setManualLoading(false);
    }
  };

  const handleApiTest = async () => {
    setApiLoading(true);
    setApiError(null);
    setApiResponse(null);
    try {
      const parsed = JSON.parse(apiPayload);
      const recordsToSubmit = parsed.records || [parsed];
      const res = await submissionsApi.submitApiBatch(recordsToSubmit);
      setApiResponse(res);
    } catch (err: any) {
      setApiError(err?.message || err?.response?.data?.detail || 'API submission failed');
    } finally {
      setApiLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <UploadCloud className="h-6 w-6 text-blue-400" />
            Unified Data Submission Gateway
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Submit post-admission student records to the central AICTE registry via CSV Batch Upload, Direct Manual Entry, or ERP REST API.
          </p>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'csv'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            CSV Batch Ingestion
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Manual Student Entry
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'api'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            REST API Integration
          </button>
        </div>
      </div>

      {/* Content depending on active tab */}
      {activeTab === 'csv' && (
        <div>
          <BulkImportPage />
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-400" />
                  Individual Student Admission Entry
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Feeds directly into the central validation, duplicate detection, intake quota, and ML anomaly engine.
                </p>
              </div>
              <span className="text-[10px] bg-blue-950 text-blue-300 font-mono font-bold px-2.5 py-1 rounded-full border border-blue-800">
                CHANNEL B: MANUAL
              </span>
            </div>

            {manualResult && (
              <div className="mb-6 bg-emerald-950/60 border border-emerald-800 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-white">Student Successfully Ingested</h4>
                  <p className="text-emerald-300 mt-0.5">
                    {manualResult.full_name} (APAAR: {manualResult.apaar_id}) has been committed to the registry.
                  </p>
                  <p className="text-slate-400 font-mono mt-1 text-[11px]">
                    Verification Hash: {manualResult.verification_code || 'SHA256:VERIFIED'}
                  </p>
                </div>
              </div>
            )}

            {manualError && (
              <div className="mb-6 bg-rose-950/60 border border-rose-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-white">Validation / Ingestion Issue</h4>
                  <p className="text-rose-300 mt-0.5">{manualError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Institution Node *
                  </label>
                  <select
                    value={formData.institution_id}
                    onChange={(e) => setFormData({ ...formData, institution_id: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Degree Program Enrolled *
                  </label>
                  <input
                    type="text"
                    value={formData.degree_program}
                    onChange={(e) => setFormData({ ...formData, degree_program: e.target.value })}
                    required
                    placeholder="e.g. B.Tech Computer Science and Engineering"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Identity Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    12-Digit APAAR ID *
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={formData.apaar_id}
                    onChange={(e) => setFormData({ ...formData, apaar_id: e.target.value })}
                    required
                    placeholder="12 digits e.g. 987654321012"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Institutional Student ID *
                  </label>
                  <input
                    type="text"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    required
                    placeholder="e.g. STU-2024-001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Certificate / Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.certificate_number}
                    onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                    placeholder="e.g. CERT-2024-998"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Full Student Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    placeholder="Full legal name"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="student@college.edu"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* SIH PS2 Specific Admission Categories */}
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-4">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                  SIH Mandatory Quota & Category Breakdown
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Admission Category
                    </label>
                    <select
                      value={formData.admission_category}
                      onChange={(e) => setFormData({ ...formData, admission_category: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="GENERAL">GENERAL</option>
                      <option value="RESERVED">RESERVED (OBC/SC/ST/EWS)</option>
                      <option value="MANAGEMENT">MANAGEMENT QUOTA</option>
                      <option value="NRI">NRI CATEGORY</option>
                      <option value="OCI">OCI CATEGORY</option>
                      <option value="FOREIGN_NATIONAL">FOREIGN NATIONAL (FN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      NRI Status
                    </label>
                    <select
                      value={formData.nri_status}
                      onChange={(e) => setFormData({ ...formData, nri_status: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="NO">NO</option>
                      <option value="YES">YES</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      OCI / FN Status
                    </label>
                    <select
                      value={formData.oci_status}
                      onChange={(e) => setFormData({ ...formData, oci_status: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="NO">NO (Domestic)</option>
                      <option value="YES">YES (OCI Holder)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Supernumerary Quota
                    </label>
                    <select
                      value={formData.supernumerary_quota}
                      onChange={(e) => setFormData({ ...formData, supernumerary_quota: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="None">None (Regular Seat)</option>
                      <option value="TFW">TFW (Tuition Fee Waiver)</option>
                      <option value="NRI_QUOTA">NRI Quota</option>
                      <option value="JK_MIGRANT">J&K Migrant</option>
                      <option value="SPORTS">Sports Quota</option>
                      <option value="FOREIGN_QUOTA">Foreign National Quota</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Data automatically verified against approved intake and active student registry.
                </span>
                <button
                  type="submit"
                  disabled={manualLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {manualLoading ? 'Processing Pipeline...' : 'Submit & Validate Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-emerald-400" />
                  Institution SIS / ERP REST API Integration
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Connect institutional admission software directly to the AICTE Central Registry endpoint.
                </p>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono font-bold px-2.5 py-1 rounded-full border border-emerald-800">
                POST /api/submissions/api
              </span>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Target Endpoint</span>
                <span className="font-mono text-emerald-400 text-xs break-all">
                  http://127.0.0.1:8000/api/submissions/api
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Authentication</span>
                <span className="font-mono text-blue-400 text-xs">
                  Header: Bearer Token or X-API-Key
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Central Pipeline</span>
                <span className="text-slate-200 text-xs">
                  Exact same 8 rules + Isolation Forest ML
                </span>
              </div>
            </div>

            {/* Live Interactive Request Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300">
                  Request JSON Payload:
                </label>
                <button
                  onClick={() => copyToClipboard(apiPayload)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <textarea
                value={apiPayload}
                onChange={(e) => setApiPayload(e.target.value)}
                rows={12}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Clicking send will execute against the live running FastAPI backend.
              </span>
              <button
                onClick={handleApiTest}
                disabled={apiLoading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {apiLoading ? 'Sending Batch...' : 'Send API Test Batch'}
              </button>
            </div>

            {/* API Response View */}
            {apiError && (
              <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-200 text-xs">
                <div className="font-bold">API Submission Error:</div>
                <div className="font-mono mt-1">{apiError}</div>
              </div>
            )}

            {apiResponse && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Response 200 OK — Batch Ingested
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Batch ID: {apiResponse.batch_id}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Total</div>
                    <div className="text-base font-bold text-white font-mono">{apiResponse.total_submitted}</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Valid</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">{apiResponse.valid_count}</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Duplicates</div>
                    <div className="text-base font-bold text-amber-400 font-mono">{apiResponse.duplicates_count}</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <div className="text-slate-400 text-[10px]">ML Anomalies</div>
                    <div className="text-base font-bold text-purple-400 font-mono">{apiResponse.anomalies_flagged}</div>
                  </div>
                </div>

                <pre className="p-3 bg-slate-900 rounded border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
