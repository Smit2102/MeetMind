import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import MeetingCard from '../../components/MeetingCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

// ─── Mock Data (will be replaced with Supabase) ─────────────

const MOCK_MEETINGS = [
  {
    id: '1',
    title: 'Sprint Planning — Q2 Features',
    platform: 'google-meet',
    started_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    ended_at: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    duration_minutes: 32,
    analysis: {
      summary: 'The team aligned on Q2 priorities including the new dashboard redesign and API v3 migration.',
      action_items: [
        { task: 'Create design mockups for dashboard', owner: 'Sarah', status: 'pending' },
        { task: 'Write API migration guide', owner: 'Mike', status: 'pending' },
      ],
    },
  },
  {
    id: '2',
    title: 'Design Review — New Onboarding Flow',
    platform: 'zoom',
    started_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    ended_at: new Date(Date.now() - 25.25 * 3600000).toISOString(),
    duration_minutes: 45,
    analysis: {
      summary: 'Reviewed the new user onboarding wireframes. Decided to simplify step 2 and add progress indicators.',
      action_items: [
        { task: 'Update wireframes with feedback', owner: 'Alex', status: 'done' },
        { task: 'Write copy for onboarding steps', owner: 'Jordan', status: 'pending' },
      ],
    },
  },
  {
    id: '3',
    title: 'Weekly Standup',
    platform: 'teams',
    started_at: new Date(Date.now() - 50 * 3600000).toISOString(),
    ended_at: new Date(Date.now() - 49.75 * 3600000).toISOString(),
    duration_minutes: 15,
    analysis: {
      summary: 'Quick status updates from all team members. No blockers reported. Release on track for Friday.',
      action_items: [],
    },
  },
  {
    id: '4',
    title: 'Client Feedback Session — Acme Corp',
    platform: 'google-meet',
    started_at: new Date(Date.now() - 74 * 3600000).toISOString(),
    ended_at: new Date(Date.now() - 73 * 3600000).toISOString(),
    duration_minutes: 58,
    analysis: {
      summary: 'Acme Corp provided feedback on the beta. Key asks: faster load times, bulk export feature, and custom branding.',
      action_items: [
        { task: 'Performance audit on dashboard', owner: 'Dev Team', status: 'pending' },
        { task: 'Scope bulk export feature', owner: 'PM', status: 'pending' },
        { task: 'Create custom branding spec', owner: 'Design', status: 'pending' },
      ],
    },
  },
];

export default function Home() {
  const { navigateTo } = useAppContext();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);

  useEffect(() => {
    loadMeetings();
    checkRecordingStatus();
  }, []);

  async function loadMeetings() {
    try {
      // Try to load from chrome.storage.local first
      const { meetings: storedMeetings } = await chrome.storage.local.get('meetings');
      if (storedMeetings && storedMeetings.length > 0) {
        setMeetings(storedMeetings);
      } else {
        // Use mock data for demo
        setMeetings(MOCK_MEETINGS);
      }
    } catch (error) {
      // Fallback for development (no chrome API)
      console.warn('[MeetMind] Using mock data:', error.message);
      setMeetings(MOCK_MEETINGS);
    } finally {
      setLoading(false);
    }
  }

  async function checkRecordingStatus() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' }, (response) => {
        if (response) {
          setIsRecording(response.isRecording);
          setActiveMeeting(response.activeMeeting);
        }
      });
    } catch {
      // Not in extension context
    }
  }

  async function handleStartRecording() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB_INFO' }, (response) => {
        if (response?.platform) {
          chrome.runtime.sendMessage({
            type: 'START_RECORDING',
            tabId: response.tabId,
            platform: response.platform,
            url: response.url,
          });
          setIsRecording(true);
        }
      });
    } catch {
      console.error('Failed to start recording');
    }
  }

  async function handleStopRecording() {
    try {
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, () => {
        setIsRecording(false);
        setActiveMeeting(null);
        // Reload meetings after a delay
        setTimeout(loadMeetings, 2000);
      });
    } catch {
      console.error('Failed to stop recording');
    }
  }

  // ─── Pending action items count ─────────────────────────

  const pendingActions = meetings.reduce((count, m) => {
    return count + (m.analysis?.action_items?.filter(a => a.status === 'pending')?.length || 0);
  }, 0);

  return (
    <div className="p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, #4c6ef5, #7c3aed)' }}>
              🧠
            </span>
            MeetMind
          </h1>
        </div>
        {pendingActions > 0 && (
          <div className="badge badge-amber">
            {pendingActions} pending {pendingActions === 1 ? 'action' : 'actions'}
          </div>
        )}
      </div>

      {/* Recording Status Banner */}
      {isRecording && (
        <div className="glass-card-static mb-4 flex items-center justify-between animate-slide-down"
             style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)' }}>
          <div className="flex items-center gap-3">
            <span className="recording-dot" />
            <div>
              <p className="text-sm font-medium text-white">Recording in progress</p>
              <p className="text-xs text-surface-400">
                {activeMeeting?.platform?.replace('-', ' ') || 'Meeting'} •{' '}
                {activeMeeting?.segmentCount || 0} segments
              </p>
            </div>
          </div>
          <button onClick={handleStopRecording} className="btn-danger text-xs px-3 py-1.5">
            Stop
          </button>
        </div>
      )}

      {/* Meetings List */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider">
          Recent Meetings
        </h2>
        <span className="text-xs text-surface-500">{meetings.length} meetings</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon="📹"
          title="No meetings yet"
          message="Join a Google Meet, Zoom, or Teams call and MeetMind will detect it automatically."
        />
      ) : (
        <div className="space-y-2.5 pb-4">
          {meetings.map((meeting, index) => (
            <MeetingCard
              key={meeting.id || index}
              meeting={meeting}
              onClick={() => navigateTo('detail', meeting.id || index)}
              style={{ animationDelay: `${index * 50}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
