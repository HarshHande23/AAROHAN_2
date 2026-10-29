import React, { useState, useEffect } from 'react';
import { mlApi } from '../api';
import { MLModelStatus } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  BarChart3, 
  Layers, 
  Clock, 
  FileCode 
} from 'lucide-react';

export const MLStatusPage: React.FC = () => {
  const [modelStatuses, setModelStatuses] = useState<{
    isolation_forest: MLModelStatus;
    random_forest: MLModelStatus;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrainingIf, setIsRetrainingIf] = useState<boolean>(false);
  const [isRetrainingRf, setIsRetrainingRf] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchMLStatus = async () => {
    setIsLoading(true);
    try {
      const data = await mlApi.getModelStatuses();
      setModelStatuses(data);
    } catch (err) {
      console.error("ML status error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMLStatus();
  }, []);

  const handleRetrainIF = async () => {
    setIsRetrainingIf(true);
    setActionMessage(null);
    try {
      const res = await mlApi.trainIsolationForest();
      setActionMessage(res.message);
      fetchMLStatus();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Isolation Forest retraining failed.");
    } finally {
      setIsRetrainingIf(false);
    }
  };

  const handleRetrainRF = async () => {
    setIsRetrainingRf(true);
    setActionMessage(null);
    try {
      const res = await mlApi.trainRandomForest();
      setActionMessage(res.message);
      fetchMLStatus();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Random Forest retraining failed.");
    } finally {
      setIsRetrainingRf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">ML Models & Retraining Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational status of serialized Isolation Forest and Random Forest pipelines trained on official PS2 datasets.
          </p>
        </div>
        <button
          onClick={fetchMLStatus}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Status
        </button>
      </div>

      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner message="Querying model artifacts and evaluation metadata..." />
      ) : !modelStatuses ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
          Failed to load ML model status from backend.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Isolation Forest Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 rounded-lg text-rose-700 border border-rose-200">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {modelStatuses.isolation_forest.model_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Algorithm: <code className="font-mono font-semibold">{modelStatuses.isolation_forest.algorithm}</code> • Version: {modelStatuses.isolation_forest.version}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge 
                  status={modelStatuses.isolation_forest.is_trained ? 'VALID' : 'INVALID'} 
                  label={modelStatuses.isolation_forest.is_trained ? 'Operational (Saved)' : 'Not Trained'} 
                />
                <button
                  onClick={handleRetrainIF}
                  disabled={isRetrainingIf}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRetrainingIf ? 'animate-spin' : ''}`} />
                  {isRetrainingIf ? 'Retraining...' : 'Retrain Anomaly Model'}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Training Dataset</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{modelStatuses.isolation_forest.training_dataset || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Training Records</span>
                  <span className="font-semibold text-slate-800 block mt-0.5 font-mono">
                    {modelStatuses.isolation_forest.training_records ? modelStatuses.isolation_forest.training_records.toLocaleString() : '0'} records
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Last Serialized</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {modelStatuses.isolation_forest.trained_at ? new Date(modelStatuses.isolation_forest.trained_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1.5">Feature Schema Used for Anomaly Isolation:</span>
                <div className="flex flex-wrap gap-1.5">
                  {modelStatuses.isolation_forest.features?.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px] border border-slate-200">
                      {f}
                    </span>
                  )) || <span className="text-slate-400">None</span>}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">Operational Role:</span>
                <p className="text-slate-600">
                  Unsupervised statistical outlier detection. Detects extreme academic and lifestyle behavioral anomalies without relying on ground-truth fraud labels.
                </p>
              </div>
            </div>
          </div>

          {/* Random Forest Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg text-blue-700 border border-blue-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {modelStatuses.random_forest.model_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Algorithm: <code className="font-mono font-semibold">{modelStatuses.random_forest.algorithm}</code> • Version: {modelStatuses.random_forest.version}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge 
                  status={modelStatuses.random_forest.is_trained ? 'VALID' : 'INVALID'} 
                  label={modelStatuses.random_forest.is_trained ? 'Operational (Saved)' : 'Not Trained'} 
                />
                <button
                  onClick={handleRetrainRF}
                  disabled={isRetrainingRf}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRetrainingRf ? 'animate-spin' : ''}`} />
                  {isRetrainingRf ? 'Retraining...' : 'Retrain Classifier'}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Training Dataset</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{modelStatuses.random_forest.training_dataset || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Training Records</span>
                  <span className="font-semibold text-slate-800 block mt-0.5 font-mono">
                    {modelStatuses.random_forest.training_records ? modelStatuses.random_forest.training_records.toLocaleString() : '0'} records
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Last Serialized</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {modelStatuses.random_forest.trained_at ? new Date(modelStatuses.random_forest.trained_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Evaluation Metrics */}
              {modelStatuses.random_forest.metrics && (
                <div>
                  <span className="text-slate-700 font-bold block mb-2">Evaluation Metrics (Tested on Holdout Test Set):</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(modelStatuses.random_forest.metrics).map(([metric, value]) => {
                      if (typeof value === 'object') return null;
                      return (
                        <div key={metric} className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-200">
                          <span className="text-slate-500 uppercase text-[10px] font-bold block">{metric.replace(/_/g, ' ')}</span>
                          <span className="text-base font-extrabold text-blue-900 font-mono">
                            {typeof value === 'number' ? (value <= 1 ? (value * 100).toFixed(2) + '%' : value) : String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <span className="text-slate-500 font-bold block mb-1.5">Feature Schema Used for Supervised Classification:</span>
                <div className="flex flex-wrap gap-1.5">
                  {modelStatuses.random_forest.features?.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px] border border-slate-200">
                      {f}
                    </span>
                  )) || <span className="text-slate-400">None</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

