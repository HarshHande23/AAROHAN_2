import React, { useState, useEffect } from 'react';
import { alertsApi } from '../api';
import { Alert } from '../types';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Filter, 
  Clock, 
  MessageSquare,
  Check,
  XCircle,
  Eye
} from 'lucide-react';

export const AlertsAnomaliesPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Selected Alert for Review Modal
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await alertsApi.getAlerts({
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
        alert_type: typeFilter || undefined,
      });
      setAlerts(data);
    } catch (err) {
      console.error("Alerts fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter, typeFilter]);

  const handleUpdateStatus = async (alertId: number, newStatus: string) => {
    setIsUpdating(true);
    try {
      await alertsApi.updateAlertStatus(alertId, {
        status: newStatus,
        notes: reviewNotes || undefined,
      });
      setSelectedAlert(null);
      setReviewNotes('');
      fetchAlerts();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update alert status.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Alerts & Anomaly Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time feed of statistical anomalies, ML flags, duplicate conflicts, and schema violations.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-400 font-semibold flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" /> Filter Queue:
        </span>

        {/* Severity */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>

        {/* Alert Type */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="">All Alert Types</option>
          <option value="ISOLATION_FOREST_ANOMALY">Isolation Forest Anomaly</option>
          <option value="RANDOM_FOREST_SUSPICIOUS">Random Forest Suspicious</option>
          <option value="DUPLICATE_DETECTED">Duplicate Detected</option>
          <option value="INVALID_IDENTIFIER">Invalid Identifier</option>
          <option value="ACADEMIC_INCONSISTENCY">Academic Inconsistency</option>
        </select>

        {(severityFilter || statusFilter || typeFilter) && (
          <button
            onClick={() => {
              setSeverityFilter('');
              setStatusFilter('');
              setTypeFilter('');
            }}
            className="text-blue-700 hover:underline font-semibold text-xs ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Alerts List */}
      {isLoading ? (
        <LoadingSpinner message="Querying live alert queue from database..." />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Alerts Detected"
          description="There are currently no active alerts or anomalies in the registry matching the selected criteria."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Active Audit Queue ({alerts.length})</h3>
            <span className="text-[11px] text-slate-400">Chronologically ordered</span>
          </div>

          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Alert #{alert.id}</span>
                    <Badge status={alert.severity} size="sm" />
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {alert.alert_type.replace(/_/g, ' ')}
                    </span>
                    <Badge status={alert.status} size="sm" />
                  </div>

                  <p className="text-xs text-slate-700 font-medium">{alert.reason}</p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>
                      Student: <Link to={`/students/${alert.student_id}`} className="text-blue-700 font-semibold hover:underline">{alert.student_name} ({alert.apaar_id})</Link>
                    </span>
                    <span>•</span>
                    <span>Node: {alert.institution_name}</span>
                    <span>•</span>
                    <span>{new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/students/${alert.student_id}`}
                    className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                    title="View Student Academic Record"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>

                  <button
                    onClick={() => {
                      setSelectedAlert(alert);
                      setReviewNotes(alert.review_notes || '');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-700 hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    Review Alert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Review Alert #{selectedAlert.id}</h3>
                <p className="text-[11px] text-slate-400">{selectedAlert.alert_type.replace(/_/g, ' ')}</p>
              </div>
              <Badge status={selectedAlert.severity} size="sm" />
            </div>

            <div className="text-xs space-y-2">
              <p className="text-slate-700 font-medium bg-slate-50 p-2.5 rounded border border-slate-200">
                {selectedAlert.reason}
              </p>
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Affected Student:</span> {selectedAlert.student_name} ({selectedAlert.apaar_id})
              </div>
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Institution:</span> {selectedAlert.institution_name}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Review Notes</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Document verification findings, root cause, or resolution explanation..."
                className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleUpdateStatus(selectedAlert.id, 'RESOLVED')}
                disabled={isUpdating}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition flex items-center justify-center gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Resolve
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedAlert.id, 'DISMISSED')}
                disabled={isUpdating}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition"
              >
                Dismiss
              </button>
              <button
                onClick={() => setSelectedAlert(null)}
                className="py-2 px-3 border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

