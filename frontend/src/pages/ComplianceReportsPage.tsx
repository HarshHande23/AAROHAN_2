import React, { useState, useEffect } from 'react';
import { reportsApi, institutionsApi } from '../api';
import { ComplianceReport, Institution } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  FileText, 
  Download, 
  Filter, 
  Building2, 
  CheckCircle, 
  Copy, 
  AlertTriangle, 
  ShieldCheck, 
  Award,
  Calendar
} from 'lucide-react';

export const ComplianceReportsPage: React.FC = () => {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const data = await reportsApi.getComplianceReport({
        institution_id: selectedInstId ? Number(selectedInstId) : undefined,
        academic_year: selectedYear || undefined,
      });
      setReport(data);
    } catch (err) {
      console.error("Compliance report error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    institutionsApi.getInstitutions().then(setInstitutions).catch(console.error);
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedInstId, selectedYear]);

  const exportCsv = () => {
    if (!report) return;
    let csv = "Institution Name,Institution Code,Total Enrolled,Valid Records,Duplicate Cases,Anomalies,Suspicious Classifications\n";
    report.institution_breakdown.forEach((row) => {
      csv += `"${row.institution_name}","${row.institution_code}",${row.total},${row.valid},${row.duplicates},${row.anomalies},${row.suspicious}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `APAAR_Compliance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const exportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `APAAR_Compliance_Report_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Statutory Compliance Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated institutional compliance audits, duplicate ratios, and anomaly incidence statistics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={!report || report.total_enrolled === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={exportJson}
            disabled={!report || report.total_enrolled === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition shadow-xs disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export JSON
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <span className="text-slate-400 font-semibold flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" /> Scope:
        </span>

        <select
          value={selectedInstId}
          onChange={(e) => setSelectedInstId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700"
        >
          <option value="">All Registered Institutions</option>
          {institutions.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.name} ({inst.code})
            </option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700"
        >
          <option value="2025-2026">AY 2025-2026</option>
          <option value="2024-2025">AY 2024-2025</option>
          <option value="2023-2024">AY 2023-2024</option>
        </select>

        <span className="text-[11px] text-slate-400 font-mono ml-auto">
          Last computed: {report?.generated_at ? new Date(report.generated_at).toLocaleTimeString() : 'N/A'}
        </span>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingSpinner message="Calculating real institutional compliance rates from database..." />
      ) : !report || report.total_enrolled === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Compliance Data Available"
          description="There are currently zero student records in the registry for the selected filter parameters. Enrol students to generate audit metrics."
        />
      ) : (
        <div className="space-y-6">
          {/* Statutory Ratio Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Enrolled</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{report.total_enrolled}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Students in scope</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Validation Rate</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{report.valid_percentage.toFixed(1)}%</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Passed deterministic rules</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Duplicate Rate</span>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">{report.duplicate_rate.toFixed(1)}%</p>
              <p className="text-[10px] text-amber-600 mt-0.5">Duplicate case ratio</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Anomaly Rate</span>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">{report.anomaly_rate.toFixed(1)}%</p>
              <p className="text-[10px] text-rose-600 mt-0.5">Isolation Forest outliers</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-xs">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Verified Credential</span>
              <p className="text-2xl font-extrabold text-blue-700 mt-1">{report.verified_percentage.toFixed(1)}%</p>
              <p className="text-[10px] text-blue-600 mt-0.5">Officially verified</p>
            </div>
          </div>

          {/* Institutional Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Institutional Audit Breakdown</h3>
                <p className="text-[11px] text-slate-500">Live aggregate counts grouped by registered educational institutions</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Institution Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4 text-center">Total Students</th>
                    <th className="py-3 px-4 text-center">Valid Records</th>
                    <th className="py-3 px-4 text-center">Duplicates</th>
                    <th className="py-3 px-4 text-center">Anomalies</th>
                    <th className="py-3 px-4 text-center">Suspicious ML</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {report.institution_breakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.institution_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{row.institution_code}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{row.total}</td>
                      <td className="py-3 px-4 text-center font-semibold text-emerald-700">{row.valid}</td>
                      <td className="py-3 px-4 text-center font-semibold text-amber-700">{row.duplicates}</td>
                      <td className="py-3 px-4 text-center font-semibold text-rose-700">{row.anomalies}</td>
                      <td className="py-3 px-4 text-center font-semibold text-rose-700">{row.suspicious}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

