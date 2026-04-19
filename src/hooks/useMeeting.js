import { useState, useEffect } from 'react';

/**
 * Hook to fetch a single meeting with all related data.
 */
export function useMeeting(meetingId) {
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      if (!meetingId) return;
      setLoading(true);
      try {
        const { meetings } = await chrome.storage.local.get('meetings');
        const found = meetings?.find((m, i) => m.id === meetingId || i === meetingId);
        setMeeting(found || null);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [meetingId]);

  return { meeting, loading, error };
}
