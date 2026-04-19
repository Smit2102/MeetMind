import React, { useState, useCallback, useEffect} from 'react';
import { useAppContext } from '../App';
import SearchBar from '../../components/SearchBar';
import MeetingCard from '../../components/MeetingCard';
import EmptyState from '../../components/EmptyState';

// Re-use mock data for search
const ALL_MEETINGS = [
  {
    id: '1',
    title: 'Sprint Planning — Q2 Features',
    platform: 'google-meet',
    started_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    duration_minutes: 32,
    analysis: {
      summary: 'Dashboard redesign and API v3 migration are the top priorities for Q2.',
      action_items: [
        { task: 'Create design mockups', owner: 'Alex', status: 'pending' },
        { task: 'Write API migration guide', owner: 'Mike', status: 'pending' },
      ],
    },
  },
  {
    id: '2',
    title: 'Design Review — New Onboarding Flow',
    platform: 'zoom',
    started_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    duration_minutes: 45,
    analysis: {
      summary: 'Simplified onboarding step 2, added progress indicators. Wireframes updated.',
      action_items: [
        { task: 'Write copy for onboarding steps', owner: 'Jordan', status: 'pending' },
      ],
    },
  },
  {
    id: '3',
    title: 'Weekly Standup',
    platform: 'teams',
    started_at: new Date(Date.now() - 50 * 3600000).toISOString(),
    duration_minutes: 15,
    analysis: {
      summary: 'Quick status updates. No blockers. Release on track for Friday.',
      action_items: [],
    },
  },
  {
    id: '4',
    title: 'Client Feedback — Acme Corp',
    platform: 'google-meet',
    started_at: new Date(Date.now() - 74 * 3600000).toISOString(),
    duration_minutes: 58,
    analysis: {
      summary: 'Acme wants faster load times, bulk export, and custom branding.',
      action_items: [
        { task: 'Performance audit', owner: 'Dev Team', status: 'pending' },
      ],
    },
  },
];

export default function Search() {
  const { navigateTo } = useAppContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback((searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const q = searchQuery.toLowerCase();
    const filtered = ALL_MEETINGS.filter((m) => {
      const titleMatch = m.title.toLowerCase().includes(q);
      const summaryMatch = m.analysis?.summary?.toLowerCase().includes(q);
      const actionMatch = m.analysis?.action_items?.some(
        (a) => a.task.toLowerCase().includes(q) || a.owner?.toLowerCase().includes(q)
      );
      return titleMatch || summaryMatch || actionMatch;
    });

    setResults(filtered);
    setHasSearched(true);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

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
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => navigateTo('detail', meeting.id)}
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
