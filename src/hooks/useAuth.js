import { useState, useEffect } from 'react';

/**
 * Hook to track Supabase auth state.
 * Falls back to local mode if Supabase is not configured.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { supabaseUrl } = await chrome.storage.local.get('supabaseUrl');
        if (!supabaseUrl) {
          // Local mode
          setUser({ email: 'local@meetmind.app', name: 'Local User' });
          setLoading(false);
          return;
        }

        // TODO: Import and check Supabase auth
        setUser({ email: 'local@meetmind.app', name: 'Local User' });
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  return { user, loading, isAuthenticated: !!user };
}
