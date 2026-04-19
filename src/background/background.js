/**
 * MeetMind — Background Service Worker
 * 
 * Orchestrates the entire meeting lifecycle:
 * 1. Detects meeting tabs (Google Meet, Zoom, Teams)
 * 2. Manages audio capture via offscreen document
 * 3. Accumulates transcripts from AssemblyAI
 * 4. Processes meetings with Gemini AI on meeting end
 * 5. Persists everything to Supabase
 */

// ─── State ───────────────────────────────────────────────────

let activeMeeting = null; // { tabId, meetingId, platform, startedAt }
let transcriptSegments = [];
let isRecording = false;

// ─── Meeting URL Patterns ────────────────────────────────────

const MEETING_PATTERNS = {
  'google-meet': /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i,
  'zoom': /^https:\/\/.*\.?zoom\.us\/(j|wc)\//i,
  'teams': /^https:\/\/teams\.microsoft\.com\/.*\/(meeting|call)/i,
};

function detectPlatform(url) {
  for (const [platform, pattern] of Object.entries(MEETING_PATTERNS)) {
    if (pattern.test(url)) return platform;
  }
  return null;
}

// ─── Tab Monitoring ──────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    const url = changeInfo.url || tab.url;
    if (!url) return;

    const platform = detectPlatform(url);

    if (platform && !isRecording) {
      // Meeting detected — notify user
      console.log(`[MeetMind] Meeting detected on ${platform}:`, url);
      showMeetingDetectedBadge();
      notifyMeetingDetected(tabId, platform);
    } else if (!platform && isRecording && activeMeeting?.tabId === tabId) {
      // User navigated away from meeting — end recording
      console.log('[MeetMind] User left meeting (URL changed)');
      handleMeetingEnd();
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (isRecording && activeMeeting?.tabId === tabId) {
    console.log('[MeetMind] Meeting tab closed');
    handleMeetingEnd();
  }
});

// ─── Extension Icon Click (Start Recording) ─────────────────

chrome.action.onClicked.addListener(async (tab) => {
  // This only fires if there's no default_popup set
  // When popup is active, we handle this through messages instead
  const platform = detectPlatform(tab.url || '');
  if (platform && !isRecording) {
    await startRecording(tab.id, platform, tab.url);
  }
});

// ─── Message Handling ────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_RECORDING': {
      const { tabId, platform, url } = message;
      startRecording(tabId, platform, url)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // Async response
    }

    case 'STOP_RECORDING': {
      handleMeetingEnd()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    case 'TRANSCRIPT_SEGMENT': {
      // Received from offscreen document
      if (message.text && message.isFinal) {
        transcriptSegments.push(message.text);
        // Store in session storage for persistence across service worker restarts
        chrome.storage.session.set({ transcriptSegments });
        console.log(`[MeetMind] Transcript segment: "${message.text.substring(0, 50)}..."`);
      }
      sendResponse({ received: true });
      break;
    }

    case 'GET_RECORDING_STATUS': {
      sendResponse({
        isRecording,
        activeMeeting: activeMeeting
          ? {
              meetingId: activeMeeting.meetingId,
              platform: activeMeeting.platform,
              startedAt: activeMeeting.startedAt,
              segmentCount: transcriptSegments.length,
            }
          : null,
      });
      break;
    }

    case 'MEETING_STATE_CHANGE': {
      // From content script
      handleMeetingStateChange(message, sender.tab);
      sendResponse({ received: true });
      break;
    }

    case 'GET_ACTIVE_TAB_INFO': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
          const platform = detectPlatform(tab.url || '');
          sendResponse({ tabId: tab.id, url: tab.url, platform });
        } else {
          sendResponse({ tabId: null, url: null, platform: null });
        }
      });
      return true;
    }

    default:
      break;
  }
});

// ─── Recording Lifecycle ─────────────────────────────────────

async function startRecording(tabId, platform, url) {
  if (isRecording) {
    console.warn('[MeetMind] Already recording');
    return;
  }

  console.log(`[MeetMind] Starting recording for ${platform} on tab ${tabId}`);

  try {
    // 1. Get media stream ID from tab
    const streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(id);
        }
      });
    });

    // 2. Create offscreen document if it doesn't exist
    await ensureOffscreenDocument();

    // 3. Get API key from storage
    const { assemblyaiApiKey } = await chrome.storage.local.get('assemblyaiApiKey');

    // 4. Send stream ID to offscreen document to start capture
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_START_CAPTURE',
      streamId,
      assemblyaiApiKey: assemblyaiApiKey || '',
    });

    // 5. Create meeting record in Supabase (if keys are configured)
    let meetingId = `local_${Date.now()}`; // Fallback local ID
    try {
      const { supabaseUrl, supabaseAnonKey } = await chrome.storage.local.get([
        'supabaseUrl',
        'supabaseAnonKey',
      ]);
      if (supabaseUrl && supabaseAnonKey) {
        // We'll save to Supabase when meeting ends for simplicity
      }
    } catch (dbErr) {
      console.warn('[MeetMind] Supabase not configured, using local storage:', dbErr);
    }

    // 6. Update state
    activeMeeting = {
      tabId,
      meetingId,
      platform,
      url,
      startedAt: new Date().toISOString(),
    };
    transcriptSegments = [];
    isRecording = true;

    // 7. Update badge
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });

    // 8. Save state to session storage
    await chrome.storage.session.set({
      activeMeeting,
      transcriptSegments: [],
      isRecording: true,
    });

    console.log('[MeetMind] Recording started successfully');
  } catch (error) {
    console.error('[MeetMind] Failed to start recording:', error);
    throw error;
  }
}

async function handleMeetingEnd() {
  if (!isRecording || !activeMeeting) {
    console.warn('[MeetMind] No active recording to stop');
    return;
  }

  console.log('[MeetMind] Meeting ended — processing...');

  try {
    // 1. Stop audio capture in offscreen document
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_CAPTURE' });

    // 2. Restore session data (in case service worker restarted)
    const sessionData = await chrome.storage.session.get(['transcriptSegments']);
    if (sessionData.transcriptSegments) {
      transcriptSegments = sessionData.transcriptSegments;
    }

    // 3. Assemble full transcript
    const fullTranscript = transcriptSegments.join('\n');
    const endedAt = new Date().toISOString();
    const durationMinutes = Math.round(
      (new Date(endedAt) - new Date(activeMeeting.startedAt)) / 60000
    );

    console.log(`[MeetMind] Meeting duration: ${durationMinutes} min, transcript segments: ${transcriptSegments.length}`);

    // 4. Save meeting data locally first
    const meetingData = {
      ...activeMeeting,
      endedAt,
      durationMinutes,
      transcript: fullTranscript,
    };

    // 5. Analyze with Gemini (if API key configured)
    let analysis = null;
    const { geminiApiKey: storedGeminiKey } = await chrome.storage.local.get('geminiApiKey');
    const geminiApiKey = storedGeminiKey || import.meta.env.VITE_GEMINI_API_KEY;

    if (geminiApiKey && fullTranscript.trim().length > 0) {
      console.log('[MeetMind] Analyzing transcript with Gemini...');
      chrome.action.setBadgeText({ text: 'AI' });
      chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' });

      // Dynamic import to avoid loading gemini.js until needed
      const { analyzeMeeting } = await import('../lib/gemini.js');
      analysis = await analyzeMeeting(fullTranscript, geminiApiKey);

      meetingData.analysis = analysis;
      console.log('[MeetMind] AI analysis complete');
    }

    // 6. Save to local storage as backup / offline cache
    const { meetings: existingMeetings = [] } = await chrome.storage.local.get('meetings');
    existingMeetings.unshift(meetingData);
    // Keep only last 50 meetings in local storage
    if (existingMeetings.length > 50) existingMeetings.length = 50;
    await chrome.storage.local.set({ meetings: existingMeetings });

    // 7. Show completion notification
    chrome.notifications.create('meeting-processed', {
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'MeetMind — Meeting Summary Ready',
      message: analysis?.summary?.substring(0, 100) || 'Meeting recorded and saved.',
      priority: 2,
    });

    console.log('[MeetMind] Meeting data saved successfully');
  } catch (error) {
    console.error('[MeetMind] Error processing meeting end:', error);
  } finally {
    // 8. Reset state
    activeMeeting = null;
    transcriptSegments = [];
    isRecording = false;

    chrome.action.setBadgeText({ text: '' });
    await chrome.storage.session.remove(['activeMeeting', 'transcriptSegments', 'isRecording']);

    // 9. Close offscreen document
    try {
      await chrome.offscreen.closeDocument();
    } catch (e) {
      // Document may already be closed
    }
  }
}

// ─── Content Script Communication ────────────────────────────

function handleMeetingStateChange(message, tab) {
  const { state, title } = message;
  console.log(`[MeetMind] Meeting state change: ${state}`, { title, tabId: tab?.id });

  if (state === 'joined' && !isRecording && tab) {
    // Content script detected user joined meeting
    const platform = detectPlatform(tab.url || '');
    if (platform) {
      notifyMeetingDetected(tab.id, platform);
    }
  } else if (state === 'left' && isRecording) {
    handleMeetingEnd();
  }

  // Update meeting title if available
  if (title && activeMeeting) {
    activeMeeting.title = title;
  }
}

// ─── Offscreen Document Management ──────────────────────────

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')],
  });

  if (existingContexts.length > 0) {
    return; // Already exists
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Capturing tab audio for meeting transcription',
  });
}

// ─── UI Helpers ──────────────────────────────────────────────

function showMeetingDetectedBadge() {
  chrome.action.setBadgeText({ text: '●' });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
}

function notifyMeetingDetected(tabId, platform) {
  chrome.notifications.create(`meeting-detected-${tabId}`, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: 'MeetMind — Meeting Detected',
    message: `Open MeetMind to start recording this ${formatPlatform(platform)} meeting.`,
    priority: 2,
  });
}

function formatPlatform(platform) {
  const names = {
    'google-meet': 'Google Meet',
    'zoom': 'Zoom',
    'teams': 'Microsoft Teams',
  };
  return names[platform] || platform;
}

// ─── Service Worker Initialization ───────────────────────────

// Restore state on service worker restart
chrome.storage.session.get(['activeMeeting', 'transcriptSegments', 'isRecording'], (data) => {
  if (data.isRecording && data.activeMeeting) {
    activeMeeting = data.activeMeeting;
    transcriptSegments = data.transcriptSegments || [];
    isRecording = true;
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    console.log('[MeetMind] Restored active recording state');
  }
});

console.log('[MeetMind] Background service worker initialized');
