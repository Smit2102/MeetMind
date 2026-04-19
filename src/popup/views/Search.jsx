import React, { useState, useCallback, useEffect} from 'react';
import { useAppContext } from '../App';
import SearchBar from '../../components/SearchBar';
import MeetingCard from '../../components/MeetingCard';
import EmptyState from '../../components/EmptyState';

export default function Search() {
  const { navigateTo } = useAppContext();
  const [query, setQuery] = useState('');
  const [allMeetings, setAllMeetings] = useState([]);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function loadAllMeetings() {
      try {
        const { meetings } = await chrome.storage.local.get('meetings');
        setAllMeetings(meetings || []);
      } catch {
        setAllMeetings([]);
      }
    }
    loadAllMeetings();
  }, []);

  const performSearch = useCallback((searchQuery, meetings) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const q = searchQuery.toLowerCase();
    const filtered = meetings.filter((m) => {
      const titleMatch = m.title?.toLowerCase().includes(q);
      const summaryMatch = m.analysis?.summary?.toLowerCase().includes(q);
      const transcriptMatch = m.transcript?.toLowerCase().includes(q);
      const actionMatch = m.analysis?.action_items?.some(
        (a) => a.task?.toLowerCase().includes(q) || a.owner?.toLowerCase().includes(q)
      );
      return titleMatch || summaryMatch || transcriptMatch || actionMatch;
    });

    setResults(filtered);
    setHasSearched(true);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, allMeetings);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, allMeetings, performSearch]);

  return (
    <div className="p-4 animate-fade-in">
      <h1 className="text-lg font-bold text-white mb-4">Search Meetings</h1>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search by title, content, or action item..."
      />

      <div className="mt-4">
        {!hasSearched ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                 style={{ background: 'rgba(92, 124, 250, 0.1)' }}>
              <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="text-sm text-surface-400">
              Search across all your meeting summaries,<br />transcripts, and action items.
            </p>
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No results found"
            message={`No meetings match "${query}". Try a different keyword.`}
          />
        ) : (
          <div>
            <p className="text-xs text-surface-500 mb-3">
              {results.length} {results.length === 1 ? 'result' : 'results'} for "{query}"
            </p>
            <div className="space-y-2.5">
              {results.map((meeting, index) => (
                <MeetingCard
                  key={meeting.id || meeting.meetingId || index}
                  meeting={meeting}
                  onClick={() => navigateTo('detail', meeting.id || meeting.meetingId || index.toString())}
                  highlight={query}
                  style={{ animationDelay: `${index * 50}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
