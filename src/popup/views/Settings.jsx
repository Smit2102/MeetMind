import { useState, useEffect } from 'react';
import { useAppContext } from '../App';

export default function Settings() {
  const { user, navigateTo } = useAppContext();
  const [geminiKey, setGeminiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await chrome.storage.local.get(['geminiApiKey', 'supabaseUrl', 'supabaseAnonKey']);
      setGeminiKey(data.geminiApiKey || '');
      setSupabaseUrl(data.supabaseUrl || '');
      setSupabaseKey(data.supabaseAnonKey || '');
    } catch {
      // Not in extension context
    }
  }

  async function handleSave() {
    try {
      await chrome.storage.local.set({
        geminiApiKey: geminiKey,
        supabaseUrl,
        supabaseAnonKey: supabaseKey,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  function handleSignOut() {
    try { chrome.storage.local.clear(); } catch {}
    navigateTo('login');
  }

  return (
    <div className="p-4 animate-fade-in">
      <h1 className="text-lg font-bold text-white mb-1">Settings</h1>
      <p className="text-xs text-surface-500 mb-5">Configure API keys and account settings</p>

      {/* Account */}
      <div className="glass-card-static mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
               style={{ background: 'linear-gradient(135deg, #4c6ef5, #7c3aed)' }}>
            {user?.name?.[0] || user?.email?.[0] || 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.name || 'MeetMind User'}</p>
            <p className="text-xs text-surface-400">{user?.email || 'local@meetmind.app'}</p>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
        API Configuration
      </h2>

      <div className="space-y-3 mb-5">
        <div>
          <label className="block text-xs text-surface-400 mb-1">Google Gemini API Key</label>
          <input
            type="password"
            className="input-field text-xs"
            placeholder="Enter your Gemini key..."
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
          />
          <p className="text-[10px] text-surface-500 mt-1">Used for both transcription and meeting analysis</p>
        </div>

        <div>
          <label className="block text-xs text-surface-400 mb-1">Supabase URL</label>
          <input
            type="text"
            className="input-field text-xs"
            placeholder="https://your-project.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-surface-400 mb-1">Supabase Anon Key</label>
          <input
            type="password"
            className="input-field text-xs"
            placeholder="Enter your Supabase anon key..."
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
          />
        </div>
      </div>

      {/* Save Button */}
      <button onClick={handleSave} className="btn-primary w-full mb-3 flex items-center justify-center gap-2">
        {saved ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved!
          </>
        ) : (
          'Save Settings'
        )}
      </button>

      {/* Sign Out */}
      <button onClick={handleSignOut} className="btn-secondary w-full text-sm">
        Sign Out
      </button>

      <p className="text-center text-xs text-surface-600 mt-4">MeetMind v1.0.0</p>
    </div>
  );
}
