import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading data from secure academic registry...', 
  size = 'md' 
}) => {
  const iconSize = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Loader2 className={`${iconSize} animate-spin text-blue-700 mb-3`} />
      {message && <p className="text-sm font-medium text-slate-600">{message}</p>}
    </div>
  );
};

