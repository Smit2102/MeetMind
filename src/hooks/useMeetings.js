import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to fetch and cache the meetings list.
 */
export function useMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { meetings: stored } = await chrome.storage.local.get('meetings');
      setMeetings(stored || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { meetings, loading, error, refresh };
}
