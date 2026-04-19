import React from 'react';
import PlatformIcon from './PlatformIcon';

export default function MeetingCard({ meeting, onClick, highlight, style }) {
  const date = new Date(meeting.started_at);
  const now = new Date();
  const diffHours = Math.floor((now - date) / 3600000);

  let timeLabel;
  if (diffHours < 1) timeLabel = 'Just now';
  else if (diffHours < 24) timeLabel = `${diffHours}h ago`;
  else if (diffHours < 48) timeLabel = 'Yesterday';
  else timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const pendingActions = meeting.analysis?.action_items?.filter(
    (a) => a.status === 'pending'
  )?.length || 0;

  function highlightText(text) {
    if (!highlight || !text) return text;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={i} className="bg-brand-500/30 text-brand-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  return (
    <button
      onClick={onClick}
      className="glass-card w-full text-left animate-slide-up cursor-pointer"
      style={style}
    >
      <div className="flex items-start gap-3">
        <PlatformIcon platform={meeting.platform} size={32} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white truncate">
              {highlightText(meeting.title)}
            </h3>
            <span className="text-[10px] text-surface-500 whitespace-nowrap shrink-0">
              {timeLabel}
            </span>
          </div>

          {/* Summary preview */}
          {meeting.analysis?.summary && (
            <p className="text-xs text-surface-400 mt-1 line-clamp-2 leading-relaxed">
              {highlightText(meeting.analysis.summary.substring(0, 100))}
              {meeting.analysis.summary.length > 100 ? '...' : ''}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-2">
            {meeting.duration_minutes && (
              <span className="text-[10px] text-surface-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {meeting.duration_minutes} min
              </span>
            )}
            {pendingActions > 0 && (
              <span className="badge badge-amber text-[10px] py-0">
                {pendingActions} action{pendingActions > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg className="w-4 h-4 text-surface-600 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
