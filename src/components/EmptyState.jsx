import React from 'react';

export default function EmptyState({ icon = '📭', title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
           style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-surface-300 mb-1">{title}</h3>
      <p className="text-xs text-surface-500 leading-relaxed max-w-[260px]">{message}</p>
    </div>
  );
}
