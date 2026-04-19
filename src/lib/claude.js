/**
 * Claude API helper for meeting transcript analysis.
 * 
 * All calls are made from the background service worker to avoid
 * exposing the API key in content scripts or the popup.
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are a meeting analyst. Given a meeting transcript, extract:
1. A 3-5 sentence executive summary
2. All action items with owner name and deadline if mentioned (as JSON array with keys: task, owner, due_date)
3. Key decisions made (as JSON array of strings)
4. Open questions that were raised but not resolved (as JSON array of strings)

Return ONLY valid JSON with keys: summary, action_items, decisions, open_questions

Example format:
{
  "summary": "The team discussed...",
  "action_items": [
    { "task": "Update the design doc", "owner": "Sarah", "due_date": "2025-01-15" }
  ],
  "decisions": ["Decided to use React for the frontend"],
  "open_questions": ["What is the budget for Q2?"]
}`;

/**
 * Analyze a meeting transcript using Claude API.
 * 
 * @param {string} transcript - The full meeting transcript text
 * @param {string} apiKey - The Anthropic API key
 * @returns {Promise<Object>} Parsed analysis with summary, action_items, decisions, open_questions
 */
export async function analyzeMeeting(transcript, apiKey) {
  if (!apiKey) {
    console.error('[MeetMind] No Anthropic API key provided');
    return getFallbackAnalysis('API key not configured');
  }

  if (!transcript || transcript.trim().length === 0) {
    console.warn('[MeetMind] Empty transcript provided');
    return getFallbackAnalysis('No transcript available');
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Here is the meeting transcript to analyze:\n\n${transcript}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[MeetMind] Claude API error ${response.status}:`, errorBody);
      return getFallbackAnalysis(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      console.error('[MeetMind] Empty response from Claude');
      return getFallbackAnalysis('Empty response from AI');
    }

    // Parse the JSON response — Claude sometimes wraps in markdown code blocks
    const jsonStr = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(jsonStr);

    // Validate and normalize the response structure
    return {
      summary: parsed.summary || 'No summary generated.',
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      open_questions: Array.isArray(parsed.open_questions) ? parsed.open_questions : [],
    };
  } catch (error) {
    console.error('[MeetMind] Failed to analyze meeting:', error);
    return getFallbackAnalysis(error.message);
  }
}

/**
 * Returns a graceful fallback when AI analysis fails.
 */
function getFallbackAnalysis(reason) {
  return {
    summary: `Meeting analysis could not be completed. Reason: ${reason}. The full transcript has been saved and you can retry analysis later.`,
    action_items: [],
    decisions: [],
    open_questions: [],
    _error: reason,
  };
}
