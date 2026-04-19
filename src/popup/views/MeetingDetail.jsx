import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import SummaryCard from '../../components/SummaryCard';
import ActionItem from '../../components/ActionItem';
import TranscriptViewer from '../../components/TranscriptViewer';
import LoadingSpinner from '../../components/LoadingSpinner';
import PlatformIcon from '../../components/PlatformIcon';

// ─── Mock detail data ────────────────────────────────────────

const MOCK_DETAILS = {
  '1': {
    id: '1',
    title: 'Sprint Planning — Q2 Features',
    platform: 'google-meet',
    started_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    duration_minutes: 32,
    transcript: `[00:00] Sarah: Alright everyone, let's kick off sprint planning for Q2.
[00:15] Mike: Sounds good. I've prepared the backlog items we discussed last week.
[01:02] Sarah: Great. The top priority is the dashboard redesign. We've had a lot of customer feedback asking for better data visualization.
[01:30] Alex: I can start on the design mockups this week. I've been looking at some modern dashboard patterns.
[02:15] Mike: For the API side, we need to finalize the v3 migration plan. I think we should write a migration guide for existing users.
[03:00] Sarah: Agreed. Mike, can you own that? Deadline by end of next week?
[03:10] Mike: Sure, I'll have a draft ready by Friday.
[04:00] Jordan: What about the mobile responsive work? That's been on the backlog for a while.
[04:30] Sarah: Let's push that to the second half of the sprint. Dashboard and API are the top priorities.
[05:00] Alex: Makes sense. I'll have the mockups ready by Wednesday for review.
[05:30] Sarah: Perfect. Let's reconvene on Wednesday for a design review. Anything else?
[06:00] All: No, we're good.
[06:05] Sarah: Great, talk to you all Wednesday!`,
    analysis: {
      summary: 'The team aligned on Q2 sprint priorities. Dashboard redesign is the top priority based on customer feedback, followed by API v3 migration. Mobile responsive work is deferred to sprint 2. Design mockups due Wednesday, API migration guide due by Friday.',
      action_items: [
        { id: 'a1', task: 'Create design mockups for dashboard redesign', owner: 'Alex', due_date: 'Wednesday', status: 'pending' },
        { id: 'a2', task: 'Write API v3 migration guide', owner: 'Mike', due_date: 'Friday', status: 'pending' },
        { id: 'a3', task: 'Schedule design review meeting for Wednesday', owner: 'Sarah', due_date: 'Today', status: 'done' },
      ],
      decisions: [
        'Dashboard redesign is the #1 priority for Q2',
        'API v3 migration is the #2 priority',
        'Mobile responsive work deferred to second half of sprint',
      ],
      open_questions: [
        'What specific data visualization patterns should the new dashboard use?',
        'How will we handle backward compatibility during API v3 migration?',
      ],
    },
  },
};

export default function MeetingDetail() {
  const { navigateTo, selectedMeetingId } = useAppContext();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState([]);

  useEffect(() => {
    loadMeeting();
  }, [selectedMeetingId]);

  async function loadMeeting() {
    try {
      // Try to load from chrome.storage.local
      const { meetings: storedMeetings } = await chrome.storage.local.get('meetings');
      const found = storedMeetings?.find((m, i) => m.id === selectedMeetingId || m.meetingId === selectedMeetingId || i.toString() === selectedMeetingId);

      if (found) {
        setMeeting(found);
        setActionItems(found.analysis?.action_items || []);
      } else {
        // Use mock data
        const mock = MOCK_DETAILS[selectedMeetingId] || MOCK_DETAILS['1'];
        setMeeting(mock);
        setActionItems(mock.analysis?.action_items || []);
      }
    } catch {
      const mock = MOCK_DETAILS[selectedMeetingId] || MOCK_DETAILS['1'];
      setMeeting(mock);
      setActionItems(mock.analysis?.action_items || []);
    } finally {
      setLoading(false);
    }
  }

  function toggleActionItem(itemId) {
    setActionItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, status: item.status === 'pending' ? 'done' : 'pending' }
          : item
      )
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-4 text-center text-surface-400">
        Meeting not found.
      </div>
    );
  }

  const analysis = meeting.analysis || {};
  const dateStr = new Date(meeting.startedAt || meeting.started_at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = new Date(meeting.startedAt || meeting.started_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={() => navigateTo('home')}
          className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-start gap-3">
          <PlatformIcon platform={meeting.platform} size={36} />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">
              {meeting.title || 'Meeting'}
            </h1>
            <p className="text-xs text-surface-400 mt-1">
              {dateStr} at {timeStr} · {meeting.durationMinutes || meeting.duration_minutes || 0} min
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(580px - 140px)' }}>
        {/* Summary */}
        {analysis.summary && (
          <SummaryCard summary={analysis.summary} className="mb-3" />
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="mb-3">
            <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
              Action Items ({actionItems.filter(a => a.status === 'pending').length} pending)
            </h2>
            <div className="space-y-1.5">
              {actionItems.map((item) => (
                <ActionItem
                  key={item.id}
                  item={item}
                  onToggle={() => toggleActionItem(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Decisions */}
        {analysis.decisions?.length > 0 && (
          <div className="mb-3">
            <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
              Key Decisions
            </h2>
            <div className="glass-card-static space-y-2">
              {analysis.decisions.map((decision, i) => (
                <div key={i} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-accent-emerald mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-surface-300">{decision}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Questions */}
        {analysis.open_questions?.length > 0 && (
          <div className="mb-3">
            <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-violet" />
              Open Questions
            </h2>
            <div className="glass-card-static space-y-2">
              {analysis.open_questions.map((question, i) => (
                <div key={i} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-accent-violet mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-surface-300">{question}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        {meeting.transcript && (
          <TranscriptViewer transcript={meeting.transcript} />
        )}
      </div>
    </div>
  );
}
