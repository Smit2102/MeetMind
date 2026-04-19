import React from 'react';

const PLATFORM_STYLES = {
  'google-meet': {
    bg: 'linear-gradient(135deg, #1a73e8, #34a853)',
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-1/2 h-1/2">
        <path d="M14 12l5.24-3.58A1 1 0 0121 9.28v5.44a1 1 0 01-1.76.66L14 12zm-2 4V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h5a2 2 0 002-2z" />
      </svg>
    ),
  },
  'zoom': {
    bg: 'linear-gradient(135deg, #2D8CFF, #0B5CFF)',
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-1/2 h-1/2">
        <path d="M3.5 7.5A2 2 0 015.5 5.5h8a2 2 0 012 2v5a2 2 0 01-2 2h-3l-3 3v-3H5.5a2 2 0 01-2-2v-5zm14 1l3-2v7l-3-2v-3z" />
      </svg>
    ),
  },
  'teams': {
    bg: 'linear-gradient(135deg, #5B5FC7, #7B83EB)',
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-1/2 h-1/2">
        <path d="M17 8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM19.5 10h-5A1.5 1.5 0 0013 11.5V17h3v-3h2v3h1.5a1.5 1.5 0 001.5-1.5v-4.5a1.5 1.5 0 00-1.5-1.5zM10 8a3 3 0 100-6 3 3 0 000 6zm3 2H7a2 2 0 00-2 2v5a2 2 0 002 2h6a2 2 0 002-2v-5a2 2 0 00-2-2z" />
      </svg>
    ),
  },
};

export default function PlatformIcon({ platform, size = 32 }) {
  const style = PLATFORM_STYLES[platform] || PLATFORM_STYLES['google-meet'];

  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: style.bg,
      }}
    >
      {style.icon}
    </div>
  );
}
