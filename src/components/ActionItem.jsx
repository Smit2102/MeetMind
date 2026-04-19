import React from 'react';

export default function ActionItem({ item, onToggle }) {
  const isDone = item.status === 'done';

  return (
    <div
      className={`glass-card-static flex items-start gap-3 py-3 transition-opacity ${
        isDone ? 'opacity-60' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
          isDone
            ? 'bg-accent-emerald/20 border-accent-emerald'
            : 'border-surface-500 hover:border-brand-400'
        }`}
      >
        {isDone && (
          <svg className="w-3 h-3 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isDone ? 'line-through text-surface-500' : 'text-surface-200'}`}>
          {item.task}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {item.owner && (
            <span className="badge badge-brand text-[10px]">
              👤 {item.owner}
            </span>
          )}
          {item.due_date && (
            <span className="badge badge-rose text-[10px]">
              📅 {item.due_date}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
