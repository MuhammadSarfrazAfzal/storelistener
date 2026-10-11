/**
 * Storelistener Desktop — Real-Time Transcription WebSocket Client (Module 4)
 * File: src/services/transcriptionClient.js
 *
 * Connects securely to the Express backend Socket.IO gateway,
 * buffers early chunks (preserving WebM container headers),
 * streams real-time microphone chunks, and receives continuous transcript updates.
 */

import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

class TranscriptionClient {
  constructor() {
    this.socket = null;
    this.currentSessionId = null;
    this.pendingSessionOptions = null;
    this.pendingChunks = [];
    this.isConnected = false;
    this.listeners = new Map(); // event -> Set of callbacks
  }

  /**
   * Registers an event listener
   * Supported events: 'transcript', 'status', 'error', 'closed'
   */
  on(event, callback) {
    if (typeof callback !== 'function') return;
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  /**
   * Unregisters an event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emits a local event to all registered listeners
   */
  emitLocal(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[TranscriptionClient] Error in "${event}" listener:`, err);
        }
      }
    }
  }

  /**
   * Initializes Socket.IO connection to Express backend
   */
  connect() {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }

    try {
      this.socket = io(BACKEND_URL, {
        reconnectionAttempts: 10,
        reconnectionDelay: 1500,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('📡 [TranscriptionClient] Connected to backend gateway:', this.socket.id);
        this.emitLocal('status', { status: 'gateway_connected' });

        // If a session was started before socket completed handshake, emit start now
        if (this.pendingSessionOptions && this.currentSessionId) {
          console.log('🎙️ [TranscriptionClient] Sending buffered start_session:', this.currentSessionId);
          this.socket.emit('stt_start_session', this.pendingSessionOptions);
        }

        // Flush any buffered audio chunks (critical for WebM container header!)
        this.flushPendingChunks();
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        console.warn('⚠️ [TranscriptionClient] Disconnected from backend:', reason);
        this.emitLocal('status', { status: 'gateway_disconnected', details: reason });
      });

      this.socket.on('connect_error', (err) => {
        console.warn('⚠️ [TranscriptionClient] Backend gateway connection error:', err.message);
        this.emitLocal('error', { message: `Backend unavailable: ${err.message}` });
        this.emitLocal('status', {
          status: 'error',
          error: `Cannot connect to transcription backend at ${BACKEND_URL}. Ensure Express backend is running.`,
        });
      });

      // Transcript segment from provider via backend
      this.socket.on('stt_transcript_segment', (segment) => {
        if (segment) {
          if (!this.currentSessionId || segment.sessionId === this.currentSessionId) {
            this.emitLocal('transcript', segment);
          }
        }
      });

      // Status updates ('connecting', 'connected', 'active', 'unconfigured', etc.)
      this.socket.on('stt_status', (statusPayload) => {
        this.emitLocal('status', statusPayload);
      });

      // Error payloads
      this.socket.on('stt_error', (errPayload) => {
        const errMsg = errPayload?.error || 'Transcription error received from provider.';
        this.emitLocal('error', { message: errMsg });
        this.emitLocal('status', { status: 'error', error: errMsg });
      });

      // Session closed
      this.socket.on('stt_closed', (closePayload) => {
        this.emitLocal('status', { status: 'closed', details: closePayload });
      });
    } catch (err) {
      console.error('[TranscriptionClient] Socket initialization failed:', err);
    }

    return this.socket;
  }

  /**
   * Starts a real-time transcription session with the backend
   */
  startSession(options = {}) {
    return this.startTranscription(options);
  }

  startTranscription({
    sessionId,
    storeId,
    storeCode,
    title,
    language = 'en',
    model = 'nova-3',
    onSegment,
    onStatus,
    onError,
    authToken,
  } = {}) {
    this.connect();
    this.currentSessionId = sessionId;
    this.pendingChunks = [];

    const payload = {
      sessionId,
      storeCode: storeCode || storeId || 'store-01',
      title,
      language,
      model,
      authToken,
    };
    this.pendingSessionOptions = payload;

    if (onSegment) this.on('transcript', onSegment);
    if (onStatus) this.on('status', onStatus);
    if (onError) this.on('error', onError);

    if (this.socket && this.socket.connected) {
      this.socket.emit('stt_start_session', payload);
    }
  }

  /**
   * Forwards a live audio chunk (Blob or ArrayBuffer) to backend.
   * If socket is not yet open, chunks are queued so the initial
   * WebM EBML container header is NEVER dropped.
   */
  async sendAudioChunk(chunk) {
    if (!this.currentSessionId) {
      return;
    }

    try {
      let arrayBuffer;
      if (chunk instanceof Blob) {
        arrayBuffer = await chunk.arrayBuffer();
      } else if (chunk instanceof ArrayBuffer) {
        arrayBuffer = chunk;
      } else if (ArrayBuffer.isView(chunk)) {
        arrayBuffer = chunk.buffer;
      } else {
        return;
      }

      if (!this.socket || !this.socket.connected) {
        // Buffer up to 100 chunks (~25 seconds) during handshake
        if (this.pendingChunks.length < 100) {
          this.pendingChunks.push(arrayBuffer);
        }
        return;
      }

      // Flush previously buffered chunks first
      this.flushPendingChunks();

      this.socket.emit('stt_audio_chunk', {
        sessionId: this.currentSessionId,
        chunk: arrayBuffer,
      });
    } catch (err) {
      console.warn('[TranscriptionClient] Chunk send error:', err.message);
    }
  }

  /**
   * Flushes any chunks queued before the socket connection was established
   */
  flushPendingChunks() {
    if (!this.socket || !this.socket.connected || !this.currentSessionId) return;
    while (this.pendingChunks.length > 0) {
      const buffered = this.pendingChunks.shift();
      this.socket.emit('stt_audio_chunk', {
        sessionId: this.currentSessionId,
        chunk: buffered,
      });
    }
  }

  /**
   * Finalizes and closes the active transcription session
   */
  stopSession() {
    return this.stopTranscription();
  }

  stopTranscription() {
    if (this.socket && this.currentSessionId) {
      this.socket.emit('stt_stop_session', {
        sessionId: this.currentSessionId,
      });
    }
    this.currentSessionId = null;
    this.pendingSessionOptions = null;
    this.pendingChunks = [];
  }

  /**
   * Cleanly disconnects client socket
   */
  disconnect() {
    this.stopTranscription();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }
}

export const transcriptionClient = new TranscriptionClient();
export default transcriptionClient;
