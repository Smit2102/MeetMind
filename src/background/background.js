/**
 * MeetMind — Background Service Worker
 *
 * Orchestrates the meeting lifecycle:
 * 1. Detects meeting tabs (Google Meet, Zoom, Teams)
 * 2. Records tab audio via offscreen document (MediaRecorder)
 * 3. Sends audio to Gemini for transcription + analysis
 * 4. Persists results to chrome.storage.local
 */

// ─── State ───────────────────────────────────────────────────

let activeMeeting = null; // { tabId, meetingId, platform, url, startedAt, title }
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
      console.log(`[MeetMind] Meeting detected on ${platform}:`, url);
      showMeetingDetectedBadge();
      notifyMeetingDetected(tabId, platform);
    } else if (!platform && isRecording && activeMeeting?.tabId === tabId) {
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

// ─── Message Handling ────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_RECORDING': {
      const { tabId, platform, url } = message;
      startRecording(tabId, platform, url)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    case 'STOP_RECORDING': {
      handleMeetingEnd()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    case 'GET_RECORDING_STATUS': {
      sendResponse({
        isRecording,
        activeMeeting: activeMeeting
          ? {
              meetingId: activeMeeting.meetingId,
              platform: activeMeeting.platform,
              startedAt: activeMeeting.startedAt,
            }
          : null,
      });
      break;
    }

    case 'MEETING_STATE_CHANGE': {
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

    // 2. Ensure offscreen document exists
    await ensureOffscreenDocument();

    // 3. Start audio capture in offscreen document
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_START_CAPTURE', streamId }, (response) => {
        if (response?.success) resolve();
        else reject(new Error(response?.error || 'Failed to start capture'));
      });
    });

    // 4. Update state
    activeMeeting = {
      tabId,
      meetingId: `local_${Date.now()}`,
      platform,
      url,
      startedAt: new Date().toISOString(),
    };
    isRecording = true;

    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    await chrome.storage.session.set({ activeMeeting, isRecording: true });

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

  console.log('[MeetMind] Meeting ended — collecting audio...');

  const endedAt = new Date().toISOString();
  const durationMinutes = Math.round(
    (new Date(endedAt) - new Date(activeMeeting.startedAt)) / 60000
  );

  try {
    // 1. Stop recording and get audio data from offscreen
    const audioResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_CAPTURE' }, (response) => {
        resolve(response || { audioData: null });
      });
    });

    console.log(`[MeetMind] Meeting duration: ${durationMinutes} min, audio: ${audioResult.audioData ? (audioResult.audioData.length / 1024).toFixed(0) + ' KB' : 'none'}`);

    // 2. Build base meeting record
    const meetingData = {
      ...activeMeeting,
      endedAt,
      durationMinutes,
    };

    // 3. Analyze with Gemini (transcription + analysis from audio)
    const { geminiApiKey: storedKey } = await chrome.storage.local.get('geminiApiKey');
    const geminiApiKey = storedKey || import.meta.env.VITE_GEMINI_API_KEY;

    if (geminiApiKey && audioResult.audioData && audioResult.audioData.length > 0) {
      console.log('[MeetMind] Sending audio to Gemini for transcription + analysis...');
      chrome.action.setBadgeText({ text: 'AI' });
      chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' });

      const { analyzeMeetingAudio } = await import('../lib/gemini.js');
      const analysis = await analyzeMeetingAudio(
        audioResult.audioData,
        audioResult.mimeType,
        geminiApiKey
      );

      meetingData.transcript = analysis.transcript || '';
      meetingData.analysis = analysis;
      console.log('[MeetMind] Gemini analysis complete:', analysis.summary?.substring(0, 80));
    } else {
      console.warn('[MeetMind] Skipping Gemini — no audio data or no API key');
    }

    // 4. Save to local storage
    const { meetings: existing = [] } = await chrome.storage.local.get('meetings');
    existing.unshift(meetingData);
    if (existing.length > 50) existing.length = 50;
    await chrome.storage.local.set({ meetings: existing });

    // 5. Show notification
    chrome.notifications.create('meeting-processed', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'MeetMind — Meeting Summary Ready',
      message: meetingData.analysis?.summary?.substring(0, 100) || 'Meeting recorded and saved.',
      priority: 2,
    });

    console.log('[MeetMind] Meeting saved successfully');
  } catch (error) {
    console.error('[MeetMind] Error processing meeting:', error);
  } finally {
    activeMeeting = null;
    isRecording = false;
    chrome.action.setBadgeText({ text: '' });
    await chrome.storage.session.remove(['activeMeeting', 'isRecording']);

    try {
      chrome.offscreen.closeDocument();
    } catch (_) {
      // Already closed
    }
  }
}

// ─── Content Script Communication ────────────────────────────

function handleMeetingStateChange(message, tab) {
  const { state, title } = message;

  if (state === 'joined' && !isRecording && tab) {
    const platform = detectPlatform(tab.url || '');
    if (platform) notifyMeetingDetected(tab.id, platform);
  } else if (state === 'left' && isRecording) {
    handleMeetingEnd();
  }

  if (title && activeMeeting) {
    activeMeeting.title = title;
  }
}

// ─── Offscreen Document Management ──────────────────────────

async function ensureOffscreenDocument() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')],
  });

  if (existing.length > 0) return;

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
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: 'MeetMind — Meeting Detected',
    message: `Open MeetMind to start recording this ${formatPlatform(platform)} meeting.`,
    priority: 2,
  });
}

function formatPlatform(platform) {
  const names = { 'google-meet': 'Google Meet', 'zoom': 'Zoom', 'teams': 'Microsoft Teams' };
  return names[platform] || platform;
}

// ─── Service Worker Initialization ───────────────────────────

chrome.storage.session.get(['activeMeeting', 'isRecording'], (data) => {
  if (data.isRecording && data.activeMeeting) {
    activeMeeting = data.activeMeeting;
    isRecording = true;
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    console.log('[MeetMind] Restored active recording state');
  }
});

console.log('[MeetMind] Background service worker initialized');
