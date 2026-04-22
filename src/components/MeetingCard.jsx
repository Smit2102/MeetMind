import React from 'react';
import PlatformIcon from './PlatformIcon';

export default function MeetingCard({ meeting, onClick, onDelete, highlight, style }) {
  const date = new Date(meeting.startedAt || meeting.started_at);
  const duration = meeting.durationMinutes || meeting.duration_minutes;
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

  function handleDelete(e) {
    e.stopPropagation(); // prevent card click / navigation
    onDelete?.();
  }

  return (
    <div className="glass-card animate-slide-up relative group" style={style}>
      {/* Delete button — visible on hover */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center
                     opacity-0 group-hover:opacity-100 transition-opacity
                     text-surface-500 hover:text-red-400 hover:bg-red-400/10"
          title="Delete meeting"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Clickable area */}
      <button onClick={onClick} className="w-full text-left cursor-pointer">
        <div className="flex items-start gap-3">
          <PlatformIcon platform={meeting.platform} size={32} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 pr-6">
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
              {duration && (
                <span className="text-[10px] text-surface-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {duration} min
                </span>
              )}
              {pendingActions > 0 && (
                <span className="badge badge-amber text-[10px] py-0">
                  {pendingActions} action{pendingActions > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <svg className="w-4 h-4 text-surface-600 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}
