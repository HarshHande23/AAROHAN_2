import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api';
import { DashboardMetrics } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { 
  Users, 
  CheckCircle, 
  Copy, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  Bell, 
  Building2, 
  ArrowRight,
  TrendingUp,
  Inbox,
  UserPlus,
  UploadCloud
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err?.response?.data?.detail || "Failed to load dashboard metrics from database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Querying live academic registry metrics..." />;
  }

  if (error || !metrics) {
    return (
      <div className="bg-white p-8 rounded-xl border border-rose-200 text-center">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Failed to Connect to Academic Database</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          Retry Database Connection
        </button>
      </div>
    );
  }

  const isDatabaseEmpty = metrics.total_students === 0;

  // Prepare real chart data from backend
  const programChartData = Object.entries(metrics.program_distribution || {}).map(([name, count]) => ({
    name,
    count,
  }));

  const riskChartData = Object.entries(metrics.risk_distribution || {}).map(([name, count]) => ({
    name,
    count,
  }));

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Institutional Verification Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics computed directly from the central academic relational database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Enrol Student
          </Link>
          <Link
            to="/bulk-import"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition shadow-xs"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Bulk Import CSV
          </Link>
        </div>
      </div>

      {/* Empty Database State Notice */}
      {isDatabaseEmpty && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3.5">
          <Inbox className="h-5 w-5 text-blue-700 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-blue-900 text-sm">Database Is Currently Empty</h4>
            <p className="text-blue-700 mt-0.5">
              No student records are registered in the database yet. All counts below are genuinely calculated at 0.
              Click <strong>"Enrol Student"</strong> or <strong>"Bulk Import CSV"</strong> to register authentic student records and trigger validation, duplicate checks, and ML inference.
            </p>
          </div>
        </div>
      )}

      {/* Real Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{metrics.total_students}</span>
            <span className="text-xs text-slate-500">enrolled</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across {metrics.total_institutions} institutions</p>
        </div>

        {/* Validated Records */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Records Validated</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{metrics.records_validated}</span>
            <span className="text-xs text-emerald-700 font-semibold">
              {metrics.total_students > 0 ? `${Math.round((metrics.records_validated / metrics.total_students) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Passed deterministic rules</p>
        </div>

        {/* Duplicate Cases */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duplicate Cases</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Copy className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{metrics.duplicate_cases}</span>
            <span className="text-xs text-amber-700 font-semibold">deterministic</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Matched APAAR ID / certificate</p>
        </div>

        {/* Anomalies Detected (Isolation Forest) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Isolation Forest</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{metrics.anomalies_detected}</span>
            <span className="text-xs text-rose-700 font-semibold">anomalies</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Statistical profile outliers</p>
        </div>

        {/* Suspicious Records (Random Forest) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Random Forest Flagged</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{metrics.suspicious_records}</span>
            <span className="text-xs text-rose-700 font-semibold">suspicious</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Supervised model inference</p>
        </div>

        {/* Genuine Records */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Genuine Records</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{metrics.genuine_records}</span>
            <span className="text-xs text-emerald-700 font-semibold">classified</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">High confidence genuine</p>
        </div>

        {/* Pending Verification */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Verification</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{metrics.pending_verification}</span>
            <span className="text-xs text-slate-500">awaiting</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires manual audit</p>
        </div>

        {/* Active Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Alerts</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{metrics.active_alerts}</span>
            <span className="text-xs text-amber-700 font-semibold">open</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Action items in queue</p>
        </div>
      </div>

      {/* Real Charts Grid (Only render when there is data) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrolments by Program */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Enrolment Distribution by Program</h3>
          <p className="text-xs text-slate-500 mb-4">Calculated from stored student degree programs</p>
          
          {programChartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
              <Inbox className="h-8 w-8 mb-2 text-slate-300" />
              <span>No program data available in database</span>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={programChartData}>
                  <XAxis dataKey="name" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Risk / Anomaly Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Overall Risk Level Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Combined evaluation from validation, duplicates, and ML inference</p>
          
          {riskChartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
              <Inbox className="h-8 w-8 mb-2 text-slate-300" />
              <span>No evaluated risk profiles available yet</span>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    fontSize={11}
                  >
                    {riskChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recently Registered Student Records */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recently Enrolled Students</h3>
            <p className="text-xs text-slate-500">Live records retrieved directly from the relational database</p>
          </div>
          <Link
            to="/students"
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
          >
            View All Students <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {metrics.recent_students.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No student records enrolled yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Newly enrolled or imported students will appear here in real-time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">APAAR ID</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Validation</th>
                  <th className="py-3 px-4">Duplicate</th>
                  <th className="py-3 px-4">Isolation Forest</th>
                  <th className="py-3 px-4">Random Forest</th>
                  <th className="py-3 px-4">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metrics.recent_students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <Link to={`/students/${student.id}`} className="hover:text-blue-700 hover:underline">
                        {student.full_name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{student.apaar_id}</td>
                    <td className="py-3 px-4 text-slate-600">{student.institution_name}</td>
                    <td className="py-3 px-4 text-slate-600">{student.degree_program}</td>
                    <td className="py-3 px-4"><Badge status={student.validation_status} size="sm" /></td>
                    <td className="py-3 px-4"><Badge status={student.duplicate_status} size="sm" /></td>
                    <td className="py-3 px-4"><Badge status={student.anomaly_status} size="sm" /></td>
                    <td className="py-3 px-4"><Badge status={student.ml_classification} size="sm" /></td>
                    <td className="py-3 px-4"><Badge status={student.overall_risk_level} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Real Audit Trail Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Immutable Audit Trail</h3>
            <p className="text-xs text-slate-500">Real security log of enrolments, modifications, and ML analysis</p>
          </div>
          <Link
            to="/audit-logs"
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
          >
            Full Audit Logs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {metrics.recent_audit_logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No audit events recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Actions performed in the system will automatically generate verifiable audit entries.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {metrics.recent_audit_logs.map((log) => (
              <div key={log.id} className="p-4 flex items-start justify-between text-xs hover:bg-slate-50/70 transition">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{log.action}</span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {log.entity_type} #{log.entity_id}
                    </span>
                  </div>
                  <p className="text-slate-500">{log.details}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">{log.user_email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

