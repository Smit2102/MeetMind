import React from 'react';

export default function LoadingSpinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} relative`}>
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: '#5c7cfa',
            borderRightColor: '#5c7cfa40',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div
          className="absolute inset-1 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: '#7c3aed',
            borderRightColor: '#7c3aed40',
            animation: 'spin 1.2s linear infinite reverse',
          }}
        />
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
