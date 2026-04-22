/**
 * MeetMind — Offscreen Document
 *
 * Records tab audio using MediaRecorder and returns the audio blob
 * to the background service worker when recording stops.
 * Gemini handles both transcription and analysis from the audio file.
 */

let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;

// ─── Message Handling ────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'OFFSCREEN_START_CAPTURE': {
      startCapture(message.streamId)
        .then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.error('[MeetMind Offscreen] Start capture failed:', err.message);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    case 'OFFSCREEN_STOP_CAPTURE': {
      stopCapture()
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ audioData: null, error: err.message }));
      return true;
    }
  }
});

// ─── Audio Capture ───────────────────────────────────────────

async function startCapture(streamId) {
  console.log('[MeetMind Offscreen] Starting audio capture, streamId:', streamId);

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
  });

  // Route audio to speakers so user can still hear the meeting
  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(mediaStream);
  source.connect(audioContext.destination);

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
  audioChunks = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.start(5000); // Chunk every 5 seconds
  console.log('[MeetMind Offscreen] Recording started with MediaRecorder');
}

async function stopCapture() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      cleanup();
      resolve({ audioData: null, mimeType: null });
      return;
    }

    mediaRecorder.onstop = async () => {
      try {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunks, { type: mimeType });
        const arrayBuffer = await blob.arrayBuffer();
        const audioData = Array.from(new Uint8Array(arrayBuffer));

        console.log(`[MeetMind Offscreen] Captured ${(audioData.length / 1024).toFixed(0)} KB of audio`);
        cleanup();
        resolve({ audioData, mimeType });
      } catch (err) {
        cleanup();
        resolve({ audioData: null, error: err.message });
      }
    };

    mediaRecorder.stop();
  });
}

function cleanup() {
  mediaStream?.getTracks().forEach((t) => t.stop());
  audioContext?.close().catch(() => {});
  mediaStream = null;
  mediaRecorder = null;
  audioChunks = [];
  audioContext = null;
}
