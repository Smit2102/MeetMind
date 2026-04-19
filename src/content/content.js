/**
 * MeetMind — Content Script
 * 
 * Injected into meeting pages (Google Meet, Zoom, Teams).
 * Detects meeting state (joined, left) and extracts meeting metadata.
 */

(function () {
  'use strict';

  const hostname = window.location.hostname;
  let currentState = 'unknown'; // 'lobby', 'joined', 'left'
  let meetingTitle = '';
  let observer = null;

  console.log('[MeetMind Content] Injected into:', hostname);

  // ─── Platform Detection ──────────────────────────────────

  function getPlatform() {
    if (hostname.includes('meet.google.com')) return 'google-meet';
    if (hostname.includes('zoom.us')) return 'zoom';
    if (hostname.includes('teams.microsoft.com')) return 'teams';
    return null;
  }

  // ─── Meeting Title Extraction ────────────────────────────

  function extractMeetingTitle() {
    const platform = getPlatform();

    switch (platform) {
      case 'google-meet': {
        // Try data attribute first, then various selectors
        const titleEl =
          document.querySelector('[data-meeting-title]') ||
          document.querySelector('[data-call-title]') ||
          document.querySelector('.lefKF'); // Meeting title class (may change)
        if (titleEl) return titleEl.textContent?.trim() || titleEl.getAttribute('data-meeting-title');

        // Fallback to document title: "Meeting nickname - Google Meet"
        const docTitle = document.title;
        if (docTitle && docTitle !== 'Google Meet') {
          return docTitle.replace(' - Google Meet', '').trim();
        }
        return 'Google Meet';
      }

      case 'zoom': {
        const topicEl =
          document.querySelector('.meeting-topic') ||
          document.querySelector('.meeting-info-topic');
        if (topicEl) return topicEl.textContent?.trim();

        const docTitle = document.title;
        if (docTitle && docTitle !== 'Zoom') {
          return docTitle.replace(' - Zoom', '').trim();
        }
        return 'Zoom Meeting';
      }

      case 'teams': {
        const headerEl =
          document.querySelector('[data-tid="call-title"]') ||
          document.querySelector('.calling-screen-header');
        if (headerEl) return headerEl.textContent?.trim();

        const docTitle = document.title;
        if (docTitle) {
          return docTitle.replace(' | Microsoft Teams', '').trim();
        }
        return 'Teams Meeting';
      }

      default:
        return document.title || 'Meeting';
    }
  }

  // ─── Meeting State Detection ─────────────────────────────

  function detectMeetingState() {
    const platform = getPlatform();

    switch (platform) {
      case 'google-meet':
        return detectGoogleMeetState();
      case 'zoom':
        return detectZoomState();
      case 'teams':
        return detectTeamsState();
      default:
        return 'unknown';
    }
  }

  function detectGoogleMeetState() {
    // Check for the "You left the meeting" or "You've been removed" messages
    const leaveIndicators = document.querySelectorAll(
      '[data-is-call-ended], [jsname="CQylAd"]'
    );
    if (leaveIndicators.length > 0) return 'left';

    // Check for active call indicators (video/audio controls)
    const callControls = document.querySelectorAll(
      '[data-is-muted], [aria-label*="microphone"], [aria-label*="camera"]'
    );
    if (callControls.length > 0) return 'joined';

    // Check for join button (lobby/pre-join)
    const joinButton = document.querySelector(
      '[jsname="Qx7uuf"], [data-idom-class*="join"]'
    );
    if (joinButton) return 'lobby';

    return 'unknown';
  }

  function detectZoomState() {
    // Active meeting indicators
    const footer = document.querySelector('.meeting-client-inner, #wc-container-left');
    if (footer) return 'joined';

    // Waiting room or preview
    const waitingRoom = document.querySelector('.waiting-room, .preview-video');
    if (waitingRoom) return 'lobby';

    return 'unknown';
  }

  function detectTeamsState() {
    // Active call indicators
    const callControls = document.querySelector(
      '[data-tid="callingButtons-showMoreBtn"], .calling-controls-section'
    );
    if (callControls) return 'joined';

    // Pre-join
    const preJoin = document.querySelector('.prejoin-screen, [data-tid="prejoin"]');
    if (preJoin) return 'lobby';

    return 'unknown';
  }

  // ─── State Change Notification ───────────────────────────

  function notifyStateChange(newState) {
    if (newState === currentState) return;

    const oldState = currentState;
    currentState = newState;
    meetingTitle = extractMeetingTitle();

    console.log(`[MeetMind Content] State: ${oldState} → ${newState} | Title: "${meetingTitle}"`);

    try {
      chrome.runtime.sendMessage({
        type: 'MEETING_STATE_CHANGE',
        state: newState,
        title: meetingTitle,
        platform: getPlatform(),
        url: window.location.href,
      });
    } catch (error) {
      // Extension context may be invalidated — ignore
      console.warn('[MeetMind Content] Failed to send state change:', error.message);
    }
  }

  // ─── DOM Observer ────────────────────────────────────────

  function startObserving() {
    // Initial state detection
    setTimeout(() => {
      const initialState = detectMeetingState();
      notifyStateChange(initialState);
    }, 2000); // Wait for page to stabilize

    // Watch for DOM changes
    observer = new MutationObserver(() => {
      const newState = detectMeetingState();
      notifyStateChange(newState);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-is-muted', 'aria-label', 'class', 'data-tid'],
    });

    // Also check periodically (some state changes don't trigger mutations)
    setInterval(() => {
      const newState = detectMeetingState();
      notifyStateChange(newState);
    }, 5000);
  }

  // ─── Cleanup on Page Unload ──────────────────────────────

  window.addEventListener('beforeunload', () => {
    if (currentState === 'joined') {
      notifyStateChange('left');
    }
    if (observer) {
      observer.disconnect();
    }
  });

  // ─── Initialize ──────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
})();
