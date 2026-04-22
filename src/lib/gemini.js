/**
 * Gemini API helpers — audio transcription + meeting analysis.
 * One API key handles everything: no AssemblyAI needed.
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;

const ANALYSIS_PROMPT = `You are a meeting analyst. Listen to this meeting audio recording.
First transcribe everything that was said (include speaker names if distinguishable).
Then analyze the meeting.

Return ONLY valid JSON with these exact keys:
{
  "transcript": "full word-for-word transcript of the meeting",
  "summary": "3-5 sentence executive summary of what was discussed and decided",
  "action_items": [
    { "task": "description of the task", "owner": "person responsible", "due_date": "deadline if mentioned" }
  ],
  "decisions": ["decision 1", "decision 2"],
  "open_questions": ["question 1", "question 2"]
}`;

/**
 * Analyze a meeting audio recording using Gemini.
 * Uploads audio to Gemini Files API, then transcribes + analyzes in one call.
 */
export async function analyzeMeetingAudio(audioData, mimeType, apiKey) {
  if (!audioData || audioData.length === 0) {
    return getFallbackAnalysis('No audio was recorded');
  }

  try {
    console.log(`[MeetMind] Uploading ${(audioData.length / 1024).toFixed(0)} KB audio to Gemini Files API...`);

    const fileUri = await uploadAudioFile(audioData, mimeType, apiKey);

    console.log('[MeetMind] Audio uploaded, waiting for processing...');
    await waitForFileActive(fileUri, apiKey);

    console.log('[MeetMind] Analyzing audio with Gemini...');
    const response = await fetch(`${BASE_URL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { fileData: { mimeType, fileUri } },
            { text: ANALYSIS_PROMPT },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[MeetMind] Gemini analysis error ${response.status}:`, errBody);
      return getFallbackAnalysis(`Gemini error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return getFallbackAnalysis('Empty response from Gemini');

    const jsonStr = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(jsonStr);
    return normalizeAnalysis(parsed);
  } catch (error) {
    console.error('[MeetMind] analyzeMeetingAudio failed:', error);
    return getFallbackAnalysis(error.message);
  }
}

/**
 * Upload audio bytes to the Gemini Files API.
 */
async function uploadAudioFile(audioData, mimeType, apiKey) {
  const blob = new Blob([new Uint8Array(audioData)], { type: mimeType });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'X-Goog-Upload-Protocol': 'raw',
        'X-Goog-Upload-Header-Content-Type': mimeType,
      },
      body: blob,
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Audio upload failed: ${response.status} — ${errBody}`);
  }

  const data = await response.json();
  const fileUri = data.file?.uri;
  if (!fileUri) throw new Error('No file URI returned from upload');

  return fileUri;
}

/**
 * Poll until the uploaded file is ACTIVE and ready for inference.
 */
async function waitForFileActive(fileUri, apiKey) {
  const fileId = fileUri.split('/').pop();

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${apiKey}`
    );
    const data = await res.json();

    if (data.state === 'ACTIVE') return;
    if (data.state === 'FAILED') throw new Error('Gemini file processing failed');
    console.log(`[MeetMind] File state: ${data.state}, waiting...`);
  }

  throw new Error('Timeout waiting for Gemini file to become active');
}

function normalizeAnalysis(parsed) {
  return {
    transcript: parsed.transcript || '',
    summary: parsed.summary || 'No summary generated.',
    action_items: Array.isArray(parsed.action_items)
      ? parsed.action_items.map((item, i) => ({
          id: item.id || `ai_${i}`,
          task: item.task || '',
          owner: item.owner || '',
          due_date: item.due_date || '',
          status: item.status || 'pending',
        }))
      : [],
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    open_questions: Array.isArray(parsed.open_questions) ? parsed.open_questions : [],
  };
}

function getFallbackAnalysis(reason) {
  return {
    transcript: '',
    summary: `Meeting analysis could not be completed: ${reason}. The audio has been saved.`,
    action_items: [],
    decisions: [],
    open_questions: [],
    _error: reason,
  };
}
