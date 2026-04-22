/**
 * AssemblyAI real-time streaming transcription client.
 * 
 * Uses the v3 WebSocket API for low-latency streaming.
 * Audio must be sent as PCM16 at 16kHz sample rate.
 */

const ASSEMBLYAI_WS_URL = 'wss://streaming.assemblyai.com/v3/ws';
const ASSEMBLYAI_TOKEN_URL = 'https://api.assemblyai.com/v3/realtime/token';
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 1000;

/**
 * Creates a real-time transcription session with AssemblyAI.
 * 
 * @param {Object} options
 * @param {string} options.apiKey - AssemblyAI API key
 * @param {function} options.onTranscript - Callback for transcript segments: ({ text, isFinal }) => void
 * @param {function} options.onError - Callback for errors: (error) => void
 * @param {function} options.onOpen - Callback when connection opens
 * @param {function} options.onClose - Callback when connection closes
 * @returns {Object} Transcriber instance with sendAudio() and close() methods
 */
export function createRealtimeTranscriber({ apiKey, onTranscript, onError, onOpen, onClose }) {
  let ws = null;
  let reconnectAttempts = 0;
  let isClosedIntentionally = false;
  let token = null;

  /**
   * Request a temporary auth token from AssemblyAI.
   */
  async function getToken() {
    console.log('[MeetMind] Requesting AssemblyAI token...');
    const response = await fetch(ASSEMBLYAI_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({ expires_in: 3600 }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AssemblyAI token request failed: ${response.status} — ${body}`);
    }

    const data = await response.json();
    console.log('[MeetMind] AssemblyAI token obtained successfully');
    return data.token;
  }

  /**
   * Establish WebSocket connection with auto-reconnect.
   */
  async function connect() {
    try {
      token = await getToken();
      const wsUrl = `${ASSEMBLYAI_WS_URL}?sample_rate=16000&token=${token}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[MeetMind] AssemblyAI WebSocket connected');
        reconnectAttempts = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.message_type === 'FinalTranscript' && msg.text) {
            onTranscript?.({ text: msg.text, isFinal: true });
          } else if (msg.message_type === 'PartialTranscript' && msg.text) {
            onTranscript?.({ text: msg.text, isFinal: false });
          } else if (msg.error) {
            console.error('[MeetMind] AssemblyAI error message:', msg.error);
            onError?.(new Error(msg.error));
          }
        } catch (parseError) {
          console.error('[MeetMind] Failed to parse AssemblyAI message:', parseError);
        }
      };

      ws.onerror = (error) => {
        console.error('[MeetMind] AssemblyAI WebSocket error:', error);
        onError?.(error);
      };

      ws.onclose = (event) => {
        console.log('[MeetMind] AssemblyAI WebSocket closed:', event.code, event.reason);

        if (!isClosedIntentionally && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts);
          console.log(`[MeetMind] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          reconnectAttempts++;

          setTimeout(() => {
            connect();
          }, delay);
        } else {
          onClose?.();
        }
      };
    } catch (error) {
      console.error('[MeetMind] ❌ Failed to connect to AssemblyAI:', error.message);
      onError?.(error);

      // Retry connection on token failure too
      if (!isClosedIntentionally && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts);
        reconnectAttempts++;
        setTimeout(() => connect(), delay);
      }
    }
  }

  /**
   * Send PCM16 audio data to AssemblyAI.
   * @param {ArrayBuffer|Int16Array} audioData - PCM16 audio samples
   */
  function sendAudio(audioData) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // AssemblyAI expects base64-encoded audio in a JSON message
      const base64 = arrayBufferToBase64(
        audioData instanceof Int16Array ? audioData.buffer : audioData
      );
      ws.send(JSON.stringify({ audio_data: base64 }));
    }
  }

  /**
   * Gracefully close the transcription session.
   */
  function close() {
    isClosedIntentionally = true;
    if (ws) {
      // Send terminate message before closing
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ terminate_session: true }));
      }
      ws.close();
      ws = null;
    }
  }

  /**
   * Check if the WebSocket connection is active.
   */
  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  // Start the connection
  connect();

  return {
    sendAudio,
    close,
    isConnected,
  };
}

// ─── Utilities ───────────────────────────────────────────────

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
