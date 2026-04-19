import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Chrome extension — no URL redirect
  },
});

// ─── Auth Helpers ────────────────────────────────────────────

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: chrome.identity?.getRedirectURL?.() || undefined,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

// ─── Meeting CRUD ────────────────────────────────────────────

export async function createMeeting({ title, platform, startedAt }) {
  const user = await getUser();
  const { data, error } = await supabase
    .from('meetings')
    .insert({
      user_id: user.id,
      title: title || 'Untitled Meeting',
      platform,
      started_at: startedAt || new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function endMeeting(meetingId) {
  const endedAt = new Date().toISOString();
  const { data: meeting } = await supabase
    .from('meetings')
    .select('started_at')
    .eq('id', meetingId)
    .single();

  const durationMinutes = meeting
    ? Math.round((new Date(endedAt) - new Date(meeting.started_at)) / 60000)
    : null;

  const { data, error } = await supabase
    .from('meetings')
    .update({ ended_at: endedAt, duration_minutes: durationMinutes })
    .eq('id', meetingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMeetings(limit = 20) {
  const user = await getUser();
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      summaries (overview),
      action_items (id, task, owner, due_date, status)
    `)
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getMeetingById(meetingId) {
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      transcripts (id, full_text, created_at),
      summaries (id, overview, decisions, open_questions, created_at),
      action_items (id, task, owner, due_date, status, created_at)
    `)
    .eq('id', meetingId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Transcript CRUD ─────────────────────────────────────────

export async function saveTranscript(meetingId, fullText) {
  const { data, error } = await supabase
    .from('transcripts')
    .insert({ meeting_id: meetingId, full_text: fullText })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Summary CRUD ────────────────────────────────────────────

export async function saveSummary(meetingId, { overview, decisions, openQuestions }) {
  const { data, error } = await supabase
    .from('summaries')
    .insert({
      meeting_id: meetingId,
      overview,
      decisions: decisions || [],
      open_questions: openQuestions || [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Action Items CRUD ───────────────────────────────────────

export async function saveActionItems(meetingId, actionItems) {
  if (!actionItems || actionItems.length === 0) return [];
  const rows = actionItems.map((item) => ({
    meeting_id: meetingId,
    task: item.task,
    owner: item.owner || null,
    due_date: item.due_date || null,
    status: 'pending',
  }));
  const { data, error } = await supabase
    .from('action_items')
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

export async function updateActionItemStatus(itemId, status) {
  const { data, error } = await supabase
    .from('action_items')
    .update({ status })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Search ──────────────────────────────────────────────────

export async function searchMeetings(query) {
  const user = await getUser();

  // Search across summaries and transcripts using full-text search
  const { data: summaryMatches, error: sErr } = await supabase
    .from('summaries')
    .select('meeting_id, overview')
    .textSearch('overview', query, { type: 'websearch' });

  const { data: transcriptMatches, error: tErr } = await supabase
    .from('transcripts')
    .select('meeting_id')
    .textSearch('full_text', query, { type: 'websearch' });

  if (sErr) throw sErr;
  if (tErr) throw tErr;

  // Combine unique meeting IDs
  const meetingIds = [
    ...new Set([
      ...(summaryMatches || []).map((s) => s.meeting_id),
      ...(transcriptMatches || []).map((t) => t.meeting_id),
    ]),
  ];

  if (meetingIds.length === 0) return [];

  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      summaries (overview),
      action_items (id, task, owner, due_date, status)
    `)
    .eq('user_id', user.id)
    .in('id', meetingIds)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data;
}
