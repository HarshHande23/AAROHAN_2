import React, { useState, useEffect } from 'react';
import { duplicatesApi, validationApi } from '../api';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { 
  CheckCircle, 
  Copy, 
  AlertTriangle, 
  ShieldCheck, 
  FileCheck, 
  XCircle, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export const ValidationDuplicatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'validation' | 'duplicates'>('validation');
  
  // Validation state
  const [validationSummary, setValidationSummary] = useState<{
    total_validated: number;
    valid_count: number;
    invalid_count: number;
    common_errors: { rule: string; count: number }[];
  } | null>(null);

  // Duplicates state
  const [duplicateCases, setDuplicateCases] = useState<any[]>([]);
  const [isDuplicateLoading, setIsDuplicateLoading] = useState<boolean>(true);
  const [isValidationLoading, setIsValidationLoading] = useState<boolean>(true);

  const fetchValidationData = async () => {
    setIsValidationLoading(true);
    try {
      const data = await validationApi.getValidationSummary();
      setValidationSummary(data);
    } catch (err) {
      console.error("Validation summary error:", err);
    } finally {
      setIsValidationLoading(false);
    }
  };

  const fetchDuplicateData = async () => {
    setIsDuplicateLoading(true);
    try {
      const data = await duplicatesApi.getDuplicates();
      setDuplicateCases(data.duplicate_cases || []);
    } catch (err) {
      console.error("Duplicate cases error:", err);
    } finally {
      setIsDuplicateLoading(false);
    }
  };

  useEffect(() => {
    fetchValidationData();
    fetchDuplicateData();
  }, []);

  const handleResolveDuplicate = async (id: number, action: 'CONFIRM' | 'DISMISS') => {
    try {
      await duplicatesApi.resolveDuplicate(id, action);
      alert(`Duplicate case #${id} marked as ${action === 'CONFIRM' ? 'Confirmed Duplicate' : 'Dismissed'}.`);
      fetchDuplicateData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to resolve duplicate case.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Validation & Duplicate Detection
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic rule validation engine and cross-institutional duplicate detection system.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('validation')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition ${
              activeTab === 'validation'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Deterministic Rules
          </button>
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition ${
              activeTab === 'duplicates'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate Detection ({duplicateCases.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Deterministic Rules Engine */}
      {activeTab === 'validation' && (
        <div className="space-y-6">
          {isValidationLoading ? (
            <LoadingSpinner message="Evaluating deterministic validation rules across database records..." />
          ) : (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 uppercase">Records Processed</span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {validationSummary?.total_validated || 0}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Evaluated against statutory schema rules</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs">
                  <span className="text-xs font-bold text-emerald-600 uppercase">Passed All Rules</span>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                    {validationSummary?.valid_count || 0}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    {validationSummary && validationSummary.total_validated > 0
                      ? `${Math.round((validationSummary.valid_count / validationSummary.total_validated) * 100)}% Pass Rate`
                      : '0% Pass Rate'}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-xs">
                  <span className="text-xs font-bold text-rose-600 uppercase">Violations Flagged</span>
                  <p className="text-2xl font-extrabold text-rose-700 mt-1">
                    {validationSummary?.invalid_count || 0}
                  </p>
                  <p className="text-[11px] text-rose-600 font-medium mt-1">Requires administrative correction</p>
                </div>
              </div>

              {/* Rules Description Cards */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <FileCheck className="h-4 w-4 text-blue-700" /> Active Deterministic Validation Specification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900">Rule 1: APAAR Identifier Specification</span>
                    <p className="text-slate-600 text-[11px]">
                      Must match valid schema (e.g. <code>APAAR-YYYY-XXXX</code> or 12 alphanumeric characters). Malformed formats trigger automatic validation rejection.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900">Rule 2: CGPA & GPA Scale Bounds</span>
                    <p className="text-slate-600 text-[11px]">
                      CGPA and semester GPA must fall within <code>0.00 &le; Score &le; 4.00</code>. Values outside standard academic bounds are rejected.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900">Rule 3: Attendance Range Check</span>
                    <p className="text-slate-600 text-[11px]">
                      Attendance percentage must strictly be within <code>0.0% &le; Attendance &le; 100.0%</code>.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900">Rule 4: Academic Chronology Consistency</span>
                    <p className="text-slate-600 text-[11px]">
                      Certificate issuance date must chronologically succeed or match the student's admission date.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Duplicate Detection Cases */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          {isDuplicateLoading ? (
            <LoadingSpinner message="Checking database for duplicate student entries and document numbers..." />
          ) : duplicateCases.length === 0 ? (
            <EmptyState
              icon={Copy}
              title="No Duplicate Cases Detected"
              description="The deterministic duplicate detection engine found zero duplicate APAAR IDs, certificate numbers, or student conflicts in the database."
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Flagged Duplicate Cases ({duplicateCases.length})</h3>
                  <p className="text-[11px] text-slate-500">Identified through deterministic cross-referencing of identifiers and documents</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Flagged Student</th>
                      <th className="py-3 px-4">APAAR ID</th>
                      <th className="py-3 px-4">Institution</th>
                      <th className="py-3 px-4">Duplicate Match Details</th>
                      <th className="py-3 px-4">Deterministic Reason</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {duplicateCases.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50/30 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <Link to={`/students/${item.student.id}`} className="hover:text-blue-700 hover:underline">
                            {item.student.full_name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">{item.student.apaar_id}</td>
                        <td className="py-3 px-4 text-slate-600">{item.student.institution_name}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {item.matched_student ? (
                            <div>
                              <span className="font-semibold text-slate-800">Match: {item.matched_student.full_name}</span>
                              <span className="text-slate-400 block">ID #{item.matched_student.id} • {item.matched_student.apaar_id}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Repeated identifier conflict</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-amber-800 font-medium">
                          {item.reason}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleResolveDuplicate(item.id, 'CONFIRM')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold transition"
                              title="Confirm as real duplicate"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleResolveDuplicate(item.id, 'DISMISS')}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-semibold transition"
                              title="Dismiss as false positive"
                            >
                              Dismiss
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

