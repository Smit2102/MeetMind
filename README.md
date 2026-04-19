# MeetMind 🧠

**AI-powered meeting memory assistant** — a Chrome Extension that captures, transcribes, and summarizes your Google Meet, Zoom, and Microsoft Teams meetings.

## Features

- 🎙️ **Audio Capture** — Records meeting audio directly from browser tabs
- 📝 **Live Transcription** — Real-time speech-to-text via AssemblyAI
- 🤖 **AI Summaries** — Claude extracts summaries, action items, decisions, and open questions
- 🔍 **Search** — Full-text search across all past meetings
- ✅ **Action Tracking** — Track and manage action items from meetings
- 🔒 **Private** — All data stored locally and in your own Supabase instance

## Tech Stack

- **Extension**: Chrome Manifest V3 + Offscreen API for audio capture
- **Frontend**: React 18 + Tailwind CSS (Vite build)
- **Transcription**: AssemblyAI real-time streaming API (v3 WebSocket)
- **AI Processing**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth (Google OAuth)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API keys

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

Or configure keys directly in the extension's Settings page after loading.

### 3. Build the extension

```bash
npm run build
```

### 4. Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

### 5. Set up Supabase (optional)

Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor to create the required tables.

## Development

```bash
npm run dev
```

This starts the Vite dev server for rapid popup development. Note: Chrome extension APIs (tabCapture, etc.) require loading the built extension.

## Architecture

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐
│  Content Script  │───▶│  Service Worker   │───▶│  Claude API  │
│  (Meeting state) │    │  (Orchestrator)   │    │  (Summaries) │
└──────────────────┘    └────────┬──────────┘    └──────────────┘
                                 │
                        ┌────────▼──────────┐    ┌──────────────┐
                        │ Offscreen Document │───▶│ AssemblyAI   │
                        │ (Audio capture)    │    │ (Transcript) │
                        └───────────────────┘    └──────────────┘
                                 │
                        ┌────────▼──────────┐
                        │  Popup UI (React) │
                        │  + Supabase DB    │
                        └───────────────────┘
```

## Project Structure

```
src/
├── background/     → Service worker (orchestration)
├── offscreen/      → Audio capture + streaming
├── content/        → Meeting page injection
├── popup/          → React app (views)
├── components/     → Reusable React components
├── hooks/          → Custom React hooks
└── lib/            → API clients (Supabase, Claude, AssemblyAI)
```

## License

MIT
