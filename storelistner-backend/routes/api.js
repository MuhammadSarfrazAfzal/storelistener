// routes/api.js - Storelistener REST API endpoints
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Store = require('../models/Store');
const Session = require('../models/Session');
const { generateFullAnalysis, analyzeRealtimeChunk } = require('../services/aiService');
const { transcribeAudio } = require('../services/sttService');

// Configure audio upload storage
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `session-${req.params.id || Date.now()}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });
const uploadMemory = multer({ storage: multer.memoryStorage() });

// Helper to seed stores if empty
async function ensureDefaultStores() {
  const count = await Store.countDocuments();
  if (count === 0) {
    await Store.create([
      { storeCode: 'STORE-NYC-01', name: 'Apple Authorized - 5th Ave', location: 'Manhattan, New York', manager: 'David Miller' },
      { storeCode: 'STORE-LA-02', name: 'iStore Premium - Beverly Hills', location: 'Los Angeles, California', manager: 'Sarah Jenkins' },
      { storeCode: 'STORE-MIA-03', name: 'Apple Hub - Brickell', location: 'Miami, Florida', manager: 'Carlos Rodriguez' }
    ]);
  }
}

// ---------------- STORES ----------------
router.get('/stores', async (req, res) => {
  try {
    await ensureDefaultStores();
    const stores = await Store.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, stores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/stores', async (req, res) => {
  try {
    const { storeCode, name, location, manager } = req.body;
    const store = await Store.create({ storeCode, name, location, manager });
    res.json({ success: true, store });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ---------------- SESSIONS ----------------
router.get('/sessions', async (req, res) => {
  try {
    const { storeCode, outcome, limit = 50, page = 1 } = req.query;
    const query = {};
    if (storeCode) query.storeCode = storeCode;
    if (outcome && outcome !== 'all') query['analytics.dealOutcome'] = outcome;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [sessions, total] = await Promise.all([
      Session.find(query)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Session.countDocuments(query)
    ]);

    res.json({ success: true, total, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.id });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start new conversation session from Desktop App
router.post('/sessions/start', async (req, res) => {
  try {
    const { sessionId, storeCode, storeName, deviceId, salesRep } = req.body;
    const newSession = await Session.create({
      sessionId: sessionId || `SES-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      storeCode: storeCode || 'STORE-NYC-01',
      storeName: storeName || 'Apple Store Downtown',
      deviceId: deviceId || 'terminal-pos-01',
      salesRep: salesRep || 'Sales Specialist',
      status: 'active',
      startedAt: new Date(),
      transcripts: []
    });

    // Notify connected admin dashboards
    const io = req.app.get('io');
    if (io) {
      io.emit('session_started', newSession);
    }

    res.json({ success: true, session: newSession });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Append transcript batch or chunk
router.post('/sessions/:id/transcript', async (req, res) => {
  try {
    const { text, speaker = 'customer', confidence = 0.95 } = req.body;
    const session = await Session.findOne({ sessionId: req.params.id });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const realtimeAnalysis = analyzeRealtimeChunk(text, session.transcripts);
    const transcriptItem = {
      timestamp: new Date(),
      speaker,
      text,
      confidence,
      signal: realtimeAnalysis.isClosingSignal ? 'CLOSING_SIGNAL' : (realtimeAnalysis.detectedObjection ? 'OBJECTION' : null)
    };

    session.transcripts.push(transcriptItem);
    await session.save();

    // Stream live chunk to socket clients
    const io = req.app.get('io');
    if (io) {
      io.to(`session_${session.sessionId}`).emit('transcript_chunk', {
        sessionId: session.sessionId,
        item: transcriptItem,
        realtimeAnalysis
      });
      io.emit('live_session_update', {
        sessionId: session.sessionId,
        storeCode: session.storeCode,
        latestText: text,
        speaker,
        probability: realtimeAnalysis.probability
      });
    }

    res.json({ success: true, realtimeAnalysis, item: transcriptItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// End and finalize session with full AI intelligence analysis
router.post('/sessions/:id/end', async (req, res) => {
  try {
    const { transcripts = [], durationSeconds } = req.body;
    let session = await Session.findOne({ sessionId: req.params.id });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (transcripts.length > 0 && session.transcripts.length === 0) {
      session.transcripts = transcripts;
    }

    const endedAt = new Date();
    const duration = durationSeconds || Math.max(10, Math.round((endedAt - new Date(session.startedAt)) / 1000));
    
    // Generate AI conversation analysis
    const fullAnalysis = await generateFullAnalysis(session.transcripts, { durationSeconds: duration });

    session.status = 'completed';
    session.endedAt = endedAt;
    session.durationSeconds = duration;
    session.analytics = fullAnalysis;

    await session.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('session_ended', session);
    }

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload audio recording file
router.post('/sessions/:id/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file uploaded' });
    }
    const session = await Session.findOne({ sessionId: req.params.id });
    if (session) {
      session.audioFileName = req.file.filename;
      session.audioUrl = `/uploads/${req.file.filename}`;
      await session.save();
    }
    res.json({ success: true, audioUrl: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Real-time Cloud Speech-to-Text Transcription for Urdu, Punjabi & English audio chunk
router.post('/sessions/:id/live-transcribe', uploadMemory.single('audioChunk'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'No audio chunk provided' });
    }

    const { language = 'ur', speaker = 'customer' } = req.body;
    const session = await Session.findOne({ sessionId: req.params.id });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Transcribe with Cloud STT (Groq / OpenAI / Gemini)
    const sttResult = await transcribeAudio(req.file.buffer, req.file.mimetype || 'audio/webm', language);
    const transcribedText = (sttResult.text || '').trim();

    if (!transcribedText) {
      return res.json({ success: true, text: '', provider: sttResult.provider, note: 'Silence or no speech detected' });
    }

    // Realtime AI Intelligence
    const realtimeAnalysis = analyzeRealtimeChunk(transcribedText, session.transcripts);
    const transcriptItem = {
      timestamp: new Date(),
      speaker,
      text: transcribedText,
      confidence: 0.96,
      signal: realtimeAnalysis.isClosingSignal ? 'CLOSING_SIGNAL' : (realtimeAnalysis.detectedObjection ? 'OBJECTION' : null)
    };

    session.transcripts.push(transcriptItem);
    await session.save();

    // Stream live chunk to connected Admin dashboards over Socket.IO
    const io = req.app.get('io');
    if (io) {
      const payload = {
        sessionId: session.sessionId,
        text: transcribedText,
        speaker,
        isFinal: true,
        confidence: 0.96,
        timestamp: new Date(),
        realtimeAI: realtimeAnalysis,
        provider: sttResult.provider
      };
      io.to(`session_${session.sessionId}`).emit('transcript_stream_chunk', payload);
      io.emit('live_monitor_event', payload);

      if (realtimeAnalysis.isClosingSignal) {
        io.emit('deal_closure_detected', {
          sessionId: session.sessionId,
          signal: realtimeAnalysis.closingMatch,
          text: transcribedText,
          timestamp: new Date()
        });
      }
    }

    res.json({
      success: true,
      text: transcribedText,
      provider: sttResult.provider,
      realtimeAnalysis,
      item: transcriptItem
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- ANALYTICS & DASHBOARD KPI ----------------
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const { storeCode } = req.query;
    const filter = {};
    if (storeCode && storeCode !== 'all') {
      filter.storeCode = storeCode;
    }

    const sessions = await Session.find(filter).sort({ startedAt: -1 }).limit(100);

    const totalConversations = sessions.length;
    let wonCount = 0;
    let lostCount = 0;
    let negotiationCount = 0;
    let totalDuration = 0;
    let sentimentCount = { positive: 0, neutral: 0, negative: 0 };
    const deviceFrequency = {};
    const objectionFrequency = {};
    const repPerformance = {};

    sessions.forEach(s => {
      totalDuration += (s.durationSeconds || 0);
      const outcome = s.analytics?.dealOutcome || 'in_negotiation';
      if (outcome === 'won') wonCount++;
      else if (outcome === 'lost') lostCount++;
      else negotiationCount++;

      const sent = s.analytics?.customerSentiment || 'neutral';
      sentimentCount[sent] = (sentimentCount[sent] || 0) + 1;

      (s.analytics?.devicesDiscussed || []).forEach(d => {
        deviceFrequency[d] = (deviceFrequency[d] || 0) + 1;
      });

      (s.analytics?.objections || []).forEach(obj => {
        objectionFrequency[obj] = (objectionFrequency[obj] || 0) + 1;
      });

      const rep = s.salesRep || 'Sales Rep';
      if (!repPerformance[rep]) {
        repPerformance[rep] = { total: 0, won: 0, avgScore: 0, scores: [] };
      }
      repPerformance[rep].total++;
      if (outcome === 'won') repPerformance[rep].won++;
      if (s.analytics?.salesRepPerformance?.score) {
        repPerformance[rep].scores.push(s.analytics.salesRepPerformance.score);
      }
    });

    const winRate = totalConversations > 0 ? Math.round((wonCount / totalConversations) * 100) : 0;
    const avgDurationSeconds = totalConversations > 0 ? Math.round(totalDuration / totalConversations) : 0;

    // Format rep leaderboard
    const repLeaderboard = Object.entries(repPerformance).map(([name, data]) => ({
      name,
      total: data.total,
      won: data.won,
      rate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
      avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 85
    })).sort((a, b) => b.won - a.won);

    // Format top devices
    const topDevices = Object.entries(deviceFrequency)
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Format top objections
    const topObjections = Object.entries(objectionFrequency)
      .map(([objection, count]) => ({ objection, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      stats: {
        totalConversations,
        wonCount,
        lostCount,
        negotiationCount,
        winRate,
        avgDurationSeconds,
        sentimentBreakdown: sentimentCount,
        topDevices,
        topObjections,
        repLeaderboard,
        recentSessions: sessions.slice(0, 10)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
