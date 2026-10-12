// server.js - Storelistener Backend Server
require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const { analyzeRealtimeChunk } = require('./services/aiService');
const { createStreamingSession } = require('./services/sttAdapter');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');

const activeSTTSessions = new Map();

const app = express();
const server = http.createServer(app);

// Enable Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve recorded audio files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Attach io instance to express app so routes can broadcast
app.set('io', io);

// Mount API routes
app.use('/api/auth', authRoutes.router);
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Storelistener Server',
    mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// Real-time WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join a specific store room
  socket.on('join_store', (storeCode) => {
    socket.join(`store_${storeCode}`);
    console.log(`Socket ${socket.id} joined store: ${storeCode}`);
  });

  // Join a specific conversation session
  socket.on('join_session', (sessionId) => {
    socket.join(`session_${sessionId}`);
    console.log(`Socket ${socket.id} joined session: ${sessionId}`);
  });

  // Stream live audio frequency/volume levels for real-time visualization
  socket.on('audio_level', (data) => {
    // Broadcast live audio pulse to admins watching this session or store
    if (data.sessionId) {
      socket.to(`session_${data.sessionId}`).emit('live_audio_level', data);
    }
    socket.broadcast.emit('global_audio_pulse', data);
  });

  // Real-time live transcript stream from Store Desktop App
  socket.on('live_transcript_stream', (data) => {
    const { sessionId, text, speaker = 'customer', isFinal = false, confidence = 0.95 } = data;
    
    // Perform instant AI deal intelligence check
    const realtimeAI = analyzeRealtimeChunk(text);

    // Broadcast live to all listeners (Admin React app & other connected devices)
    const payload = {
      sessionId,
      text,
      speaker,
      isFinal,
      confidence,
      timestamp: new Date(),
      realtimeAI
    };

    if (sessionId) {
      io.to(`session_${sessionId}`).emit('transcript_stream_chunk', payload);
    }
    // Also emit globally for admin multi-store live monitoring wall
    io.emit('live_monitor_event', payload);

    // If deal closure was detected in the utterance, emit special alert event
    if (realtimeAI.isClosingSignal) {
      io.emit('deal_closure_detected', {
        sessionId,
        signal: realtimeAI.closingMatch,
        text,
        timestamp: new Date()
      });
    }

    // If copilot coaching suggestion is available, send to the desktop app!
    if (realtimeAI.copilotTip) {
      socket.emit('copilot_suggestion', {
        tip: realtimeAI.copilotTip,
        trigger: text
      });
    }
  });

    // Stream live audio data chunks (admin can listen to live speech in real time)
    socket.on('live_audio_data', (data) => {
      // Broadcast real audio chunk to admins listening live
      if (data && data.sessionId) {
        socket.to(`session_${data.sessionId}`).emit('admin_live_audio', data);
      }
      socket.broadcast.emit('global_live_audio', data);
    });

    socket.on('live_audio_chunk', (data) => {
      if (data && data.sessionId) {
        socket.to(`session_${data.sessionId}`).emit('admin_live_audio', data);
      }
      socket.broadcast.emit('global_live_audio', data);
    });

    // Device heartbeat / status
    socket.on('device_heartbeat', (data) => {
      io.emit('device_status_update', {
        ...data,
        lastSeen: new Date()
      });
    });

    // -------------------------------------------------------------
    // Module 4: Real-Time Speech-to-Text Streaming Gateway
    // -------------------------------------------------------------
    socket.on('stt_start_session', (payload = {}) => {
      const {
        sessionId,
        storeCode = 'STORE-NYC-01',
        language = 'multi',
        targetLanguage = 'en',
        model = 'nova-3',
        authToken,
      } = payload;

      if (!sessionId) {
        return socket.emit('stt_error', { error: 'sessionId is required to start transcription.' });
      }

      // Authenticate session if token is provided
      if (authToken) {
        try {
          jwt.verify(authToken, JWT_SECRET);
        } catch (err) {
          console.warn(`[STT Auth] Token validation rejected for session ${sessionId}:`, err.message);
          return socket.emit('stt_error', {
            error: 'Authentication failed: Invalid or expired authorization token.',
            sessionId,
          });
        }
      }

      // Clean up previous active session on this socket if any
      if (activeSTTSessions.has(socket.id)) {
        try {
          activeSTTSessions.get(socket.id).finish();
        } catch (e) {}
        activeSTTSessions.delete(socket.id);
      }

      console.log(`🎙️ [STT] Starting streaming session ${sessionId} for socket ${socket.id} (model: ${model}, lang: ${language} -> target: ${targetLanguage})`);

      const sessionController = createStreamingSession({
        sessionId,
        storeCode,
        language,
        targetLanguage,
        model,
        onSegment: (segment) => {
          // Send to the active desktop recorder
          socket.emit('stt_transcript_segment', segment);

          // Broadcast to session listeners & owner live monitoring wall
          io.to(`session_${sessionId}`).emit('transcript_stream_chunk', segment);
          io.emit('live_monitor_event', segment);
        },
        onStatus: (statusPayload) => {
          socket.emit('stt_status', statusPayload);
        },
        onError: (errPayload) => {
          socket.emit('stt_error', errPayload);
        },
        onClose: (closePayload) => {
          socket.emit('stt_closed', closePayload);
          activeSTTSessions.delete(socket.id);
        },
      });

      activeSTTSessions.set(socket.id, sessionController);
    });

    socket.on('stt_audio_chunk', (payload = {}) => {
      const { sessionId, chunk } = payload;
      const sessionController = activeSTTSessions.get(socket.id);

      if (!sessionController) {
        return;
      }

      try {
        let buffer;
        if (Buffer.isBuffer(chunk)) {
          buffer = chunk;
        } else if (typeof chunk === 'string') {
          buffer = Buffer.from(chunk, 'base64');
        } else if (chunk instanceof ArrayBuffer || ArrayBuffer.isView(chunk)) {
          buffer = Buffer.from(chunk);
        }

        if (buffer && buffer.length > 0) {
          sessionController.sendAudioChunk(buffer);
        }
      } catch (err) {
        console.warn(`[STT] Audio chunk forwarding note for ${sessionId}:`, err.message);
      }
    });

    socket.on('stt_stop_session', (payload = {}) => {
      const { sessionId } = payload;
      console.log(`⏹️ [STT] Stopping streaming session for socket ${socket.id} (sessionId: ${sessionId})`);

      const sessionController = activeSTTSessions.get(socket.id);
      if (sessionController) {
        sessionController.finish();
        activeSTTSessions.delete(socket.id);
      }
      socket.emit('stt_status', { status: 'stopped', sessionId });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      if (activeSTTSessions.has(socket.id)) {
        try {
          activeSTTSessions.get(socket.id).finish();
        } catch (e) {}
        activeSTTSessions.delete(socket.id);
      }
    });
  });

  // Database connection & startup
  const PORT = process.env.PORT || 5000;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sarfrazafzal790_db_user:uf5VWKdvIil4yXUS@storelistener.sy7em7l.mongodb.net/storelistener?retryWrites=true&w=majority&appName=Storelistener';

  console.log('Connecting to MongoDB Atlas...');
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 4000 })
    .then(async () => {
      console.log('✅ Connected successfully to MongoDB Atlas');
      await authRoutes.seedDefaultUsers();
      server.listen(PORT, () => {
        console.log(`🚀 Storelistener Backend running on port ${PORT}`);
        console.log(`📡 WebSocket server ready for real-time live events`);
      });
    })
    .catch(async (err) => {
      console.warn('⚠️ MongoDB Atlas Connection Note:', err.message);
      console.log('Using resilient local persistence fallback for JWT & user management...');
      await authRoutes.seedDefaultUsers();
      server.listen(PORT, () => {
        console.log(`🚀 Storelistener Backend running on port ${PORT} (Resilient Fallback Mode)`);
      });
    });

module.exports = { app, server, io };
