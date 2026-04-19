import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for debounced search across meetings.
 */
export function useSearch(debounceMs = 300) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { meetings } = await chrome.storage.local.get('meetings');
      const lower = q.toLowerCase();
      const filtered = (meetings || []).filter((m) => {
        return (
          m.title?.toLowerCase().includes(lower) ||
          m.analysis?.summary?.toLowerCase().includes(lower) ||
          m.transcript?.toLowerCase().includes(lower) ||
          m.analysis?.action_items?.some(
            (a) => a.task?.toLowerCase().includes(lower) || a.owner?.toLowerCase().includes(lower)
          )
        );
      });
      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => search(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs, search]);

  return { query, setQuery, results, loading };
}
