import React from 'react';

export interface BadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, label, size = 'md' }) => {
  const normStatus = (status || '').toUpperCase();
  const displayLabel = label || status || 'UNKNOWN';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';

  // Validation
  if (normStatus === 'VALID' || normStatus === 'GENUINE' || normStatus === 'NORMAL' || normStatus === 'UNIQUE' || normStatus === 'VERIFIED') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (normStatus === 'INVALID' || normStatus === 'SUSPICIOUS' || normStatus === 'ANOMALOUS' || normStatus === 'CONFIRMED_DUPLICATE' || normStatus === 'CRITICAL' || normStatus === 'REJECTED') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (normStatus === 'DUPLICATE_FLAGGED' || normStatus === 'WARNING' || normStatus === 'HIGH' || normStatus === 'FLAGGED' || normStatus === 'UNDER_REVIEW') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (normStatus === 'PENDING' || normStatus === 'MEDIUM' || normStatus === 'INFO' || normStatus === 'NEW') {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (normStatus === 'NOT_EVALUATED' || normStatus === 'NOT_TRAINED' || normStatus === 'LOW' || normStatus === 'RESOLVED' || normStatus === 'DISMISSED') {
    colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${sizeClasses} ${colorClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        normStatus.includes('VALID') || normStatus === 'NORMAL' || normStatus === 'GENUINE' || normStatus === 'VERIFIED'
          ? 'bg-emerald-500'
          : normStatus.includes('INVALID') || normStatus === 'SUSPICIOUS' || normStatus === 'ANOMALOUS' || normStatus === 'REJECTED'
          ? 'bg-rose-500'
          : normStatus.includes('FLAGGED') || normStatus === 'WARNING'
          ? 'bg-amber-500'
          : 'bg-blue-500'
      }`} />
      {displayLabel}
    </span>
  );
};

