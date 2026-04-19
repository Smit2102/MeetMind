import { useState, useEffect } from 'react';

/**
 * Hook to track the current recording status from the background service worker.
 */
export function useRecordingStatus(pollIntervalMs = 2000) {
  const [isRecording, setIsRecording] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);

  useEffect(() => {
    function checkStatus() {
      try {
        chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' }, (response) => {
          if (chrome.runtime.lastError) return;
          if (response) {
            setIsRecording(response.isRecording || false);
            setActiveMeeting(response.activeMeeting || null);
          }
        });
      } catch {
        // Not in extension context
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  return { isRecording, activeMeeting };
}
