import React, { useState } from 'react';

export default function TranscriptViewer({ transcript }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!transcript) return null;

  return (
    <div className="glass-card-static">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
               style={{ background: 'rgba(6, 182, 212, 0.15)' }}>
            <svg className="w-3.5 h-3.5 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
            Full Transcript
          </h3>
        </div>
        <svg
          className={`w-4 h-4 text-surface-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 animate-slide-down">
          <pre className="text-xs text-surface-400 font-mono leading-relaxed whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto p-3 rounded-xl"
               style={{ background: 'rgba(0,0,0,0.2)' }}>
            {transcript}
          </pre>
        </div>
      )}
    </div>
  );
}
