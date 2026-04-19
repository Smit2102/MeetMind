import React from 'react';
import { useAppContext } from '../App';

export default function Login() {
  const { setIsAuthenticated, setUser } = useAppContext();

  async function handleGoogleLogin() {
    try {
      // For now, set local mode
      setUser({ email: 'user@gmail.com', name: 'MeetMind User' });
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      {/* Logo area */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg, #4c6ef5, #7c3aed)' }}>
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">MeetMind</h1>
        <p className="text-surface-400 text-sm leading-relaxed">
          Your AI meeting memory assistant.<br />
          Never miss an action item again.
        </p>
      </div>

      {/* Features */}
      <div className="w-full space-y-3 mb-8">
        {[
          { icon: '🎙️', text: 'Auto-capture meeting audio' },
          { icon: '📝', text: 'Real-time transcription' },
          { icon: '🤖', text: 'AI-powered summaries' },
          { icon: '✅', text: 'Track action items' },
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-xl"
               style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-lg">{feature.icon}</span>
            <span className="text-sm text-surface-300">{feature.text}</span>
          </div>
        ))}
      </div>

      {/* Login button */}
      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 hover:shadow-glow"
        style={{ background: 'linear-gradient(135deg, #4c6ef5, #5c7cfa)' }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.8"/>
          <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity="0.6"/>
          <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.4"/>
        </svg>
        Sign in with Google
      </button>

      <p className="mt-4 text-xs text-surface-500 text-center">
        Your data stays private. We only access meeting audio during active recording.
      </p>
    </div>
  );
}
