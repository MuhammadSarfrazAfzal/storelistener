# Storelistener 🎙️
### Retail In-Store Audio Monitoring, Real-Time AI Speech Transcription & Deal Closure Engine

**Storelistener** is an enterprise AI sales intelligence platform built specifically for retail stores (e.g. iPhone stores). It operates across three tightly integrated applications to capture, monitor, transcribe, and analyze sales conversations at store counters, accelerating deal closure and boosting conversion rates.

---

## 🏛️ Architecture Overview

```
 ┌──────────────────────────────────────────────────────────────┐
 │             STORE DESKTOP CLIENT (Electron App)              │
 │  • Counter/sales desk terminal in each iPhone store          │
 │  • Voice Activity Detection (VAD): auto-records on arrival   │
 │  • Free zero-latency English Speech Recognition (Chromium)   │
 │  • Real-time Audio Spectrum Visualizer (Web Audio API)       │
 │  • Deal Closure Detector: alerts & auto-closes on payment    │
 │  • Real-time Sales Copilot: objection counters & upsell tips │
 └──────────────────────────────┬───────────────────────────────┘
                                │ Audio Stream, Transcripts, Deal Triggers
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                 BACKEND API (Express + Socket.io)            │
 │  • Port: 5000                                                │
 │  • MongoDB Atlas: conversations, transcripts, analytics      │
 │  • WebSocket Server: bidirectional live audio & transcript   │
 │  • AI Intelligence Service: closure likelihood, sentiment,   │
 │    products discussed, objections, coaching critique         │
 │  • Audio Upload Storage (Multer `/uploads`)                  │
 └──────────────────────────────┬───────────────────────────────┘
                                │ Real-Time Multi-Store Live Sync
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │              ADMIN MONITOR & ANALYTICS (React App)           │
 │  • Port: 5173                                                │
 │  • Live Multi-Store Monitor Wall (streaming audio & text)    │
 │  • Instant Deal Closure Alert Banner & Confetti              │
 │  • Executive KPIs: Deal Win Rate (%), Total Inquiries        │
 │  • Top iPhone Models & Customer Objections Breakdown         │
 │  • Sales Rep Leaderboard & AI Coaching Scores                │
 │  • Full Conversation Inspector with Audio Player             │
 └──────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Run the Applications

### 1. Backend Server (`storelistner-backend`)
```bash
cd storelistner-backend
npm install
npm start
```
- **Port:** `http://localhost:5000`
- **Health Check:** `http://localhost:5000/health`
- **Database:** Connected to your MongoDB Atlas cluster (`storelistener`).

---

### 2. Front Admin React App (`storelistner-frontend`)
```bash
cd storelistner-frontend
npm install
npm run dev
```
- **Dashboard URL:** `http://localhost:5173`
- Features live socket synchronization, multi-store filtering, conversation playback, and a **"Simulate Conversation"** button to test live streams with zero hardware setup.

---

### 3. Store Desktop Terminal (`storelistner-desktop`)
```bash
cd storelistner-desktop
npm install
npm start
```
- Launches the native **Electron terminal** window.
- Select your store branch (e.g. *Apple Authorized - 5th Ave*), terminal number, and sales specialist.
- **Smart Customer Radar**: When toggled on, automatically detects customer speech and starts recording.
- **Auto-Closure**: When the customer says *"I'll take it"*, *"Can I pay with credit card?"*, or *"Receipt"*, the app displays a celebration banner and initiates an auto-close countdown.

---

## 🧠 AI Models & Intelligence Stack

1. **Live Speech Transcription:**
   - English speech-to-text powered by Chromium's native speech recognition engine (zero API cost, zero network latency, word-by-word streaming).
2. **Deal Closure & Objection Detection:**
   - Real-time natural language pattern matching identifying buying signals, price objections, trade-in inquiries, and warranty questions.
3. **Conversational Analytics & Coaching:**
   - Automated scoring of each transaction (Win / Loss / In-Negotiation), customer sentiment classification, and recommended follow-up actions.
   - Optional external LLM enrichment (e.g., Google Gemini free tier or Groq) via `GEMINI_API_KEY` in `storelistner-backend/.env`.
