/**
 * MeetMind — Offscreen Document
 * 
 * Handles audio capture and streaming in a DOM-enabled environment.
 * Receives stream IDs from the service worker, captures tab audio,
 * converts to PCM16 via AudioWorklet, and streams to AssemblyAI.
 */

import { createRealtimeTranscriber } from '../lib/assemblyai.js';

let mediaStream = null;
let audioContext = null;
let workletNode = null;
let transcriber = null;

// ─── Message Handling ────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'OFFSCREEN_START_CAPTURE': {
      startCapture(message.streamId, message.assemblyaiApiKey)
        .then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.error('[MeetMind Offscreen] Start capture failed:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    case 'OFFSCREEN_STOP_CAPTURE': {
      stopCapture();
      sendResponse({ success: true });
      break;
    }
  }
});

// ─── Audio Capture ───────────────────────────────────────────

async function startCapture(streamId, assemblyaiApiKey) {
  console.log('[MeetMind Offscreen] Starting audio capture with streamId:', streamId);

  try {
    // 1. Get media stream from the tab
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    });

    // 2. Create AudioContext at 16kHz for AssemblyAI
    audioContext = new AudioContext({ sampleRate: 16000 });

    // 3. Create source from the media stream
    const source = audioContext.createMediaStreamSource(mediaStream);

    // 4. Connect to destination so user can still hear the meeting audio
    source.connect(audioContext.destination);

    // 5. Load and create AudioWorklet for PCM16 conversion
    // Must use chrome.runtime.getURL — Vite inlines data: URLs which Chrome CSP blocks
    await audioContext.audioWorklet.addModule(
      chrome.runtime.getURL('audio-processor.js')
    );
    workletNode = new AudioWorkletNode(audioContext, 'pcm16-processor');

    // 6. Handle processed audio chunks
    workletNode.port.onmessage = (event) => {
      const { pcm16Data } = event.data;
      if (transcriber && pcm16Data) {
        transcriber.sendAudio(pcm16Data);
      }
    };

    // 7. Connect source → worklet
    source.connect(workletNode);

    // 8. Start AssemblyAI real-time transcription
    if (assemblyaiApiKey) {
      transcriber = createRealtimeTranscriber({
        apiKey: assemblyaiApiKey,
        onTranscript: ({ text, isFinal }) => {
          // Forward transcript segments to service worker
          chrome.runtime.sendMessage({
            type: 'TRANSCRIPT_SEGMENT',
            text,
            isFinal,
          });
        },
        onError: (error) => {
          console.error('[MeetMind Offscreen] AssemblyAI error:', error);
        },
        onOpen: () => {
          console.log('[MeetMind Offscreen] AssemblyAI connected - streaming audio');
        },
        onClose: () => {
          console.log('[MeetMind Offscreen] AssemblyAI disconnected');
        },
      });
    } else {
      console.warn('[MeetMind Offscreen] No AssemblyAI API key — audio captured but not transcribed');
    }

    console.log('[MeetMind Offscreen] Audio capture started successfully');
  } catch (error) {
    console.error('[MeetMind Offscreen] Failed to start audio capture:', error);
    stopCapture();
    throw error;
  }
}

function stopCapture() {
  console.log('[MeetMind Offscreen] Stopping audio capture');

  // Stop transcription
  if (transcriber) {
    transcriber.close();
    transcriber = null;
  }

  // Disconnect worklet
  if (workletNode) {
    workletNode.disconnect();
    workletNode = null;
  }

  // Close audio context
  if (audioContext) {
    audioContext.close().catch(console.error);
    audioContext = null;
  }

  // Stop all media tracks
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  console.log('[MeetMind Offscreen] Audio capture stopped');
}
