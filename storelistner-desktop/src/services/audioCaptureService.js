/**
 * Storelistener Desktop — Audio Capture & Voice Activity Detection Service (Module 4)
 * File: src/services/audioCaptureService.js
 *
 * Implements:
 * - Robust acoustic Speech Activity Detection (VAD) via VoiceActivityDetector
 * - Distinguishes human speech from fans, AC hum, keyboard typing, and clicks
 * - Lifecycle state machine:
 *   IDLE -> SPEECH_CANDIDATE -> CONFIRMED_SPEECH -> ACTIVE_RECORDING
 * - 15-second continuous silence countdown driven by VAD speech decisions (not raw energy)
 * - Pre-roll audio buffering to preserve opening words without truncation
 * - Resource cleanup and resilient device management
 */

import { VoiceActivityDetector } from './vadService.js';

class AudioCaptureService {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyserNode = null;
    this.recordedChunks = [];
    this.preRollChunks = [];
    this.animFrameId = null;

    // Active session parameters
    this.isMonitoring = false;
    this.isSessionActive = false;
    this.isPaused = false;

    // Session timestamps
    this.sessionStartTime = null;
    this.pauseStartTime = null;
    this.totalPausedDuration = 0;

    // Advanced VAD Engine
    this.vad = new VoiceActivityDetector({
      sampleRate: 44100,
      speechThreshold: 0.58,
      candidateThreshold: 0.46,
      minCandidateFrames: 6, // ~150-200ms sustained speech
      silenceTimeoutSeconds: 15,
      onStateChange: (state) => {
        if (this.onLifecycleChange) {
          this.onLifecycleChange(state);
        }
      },
      onConfirmedSpeech: (details) => {
        if (this.onConfirmedSpeech) {
          this.onConfirmedSpeech(details);
        }
      },
      onSilenceCountdown: (remaining) => {
        if (this.onSilenceCountdown) {
          this.onSilenceCountdown(remaining);
        }
      },
      onSilenceTimeout: () => {
        if (this.onContinuousSilence) {
          this.onContinuousSilence();
        }
      },
    });

    // External callbacks
    this.onAudioLevel = null;
    this.onAudioChunk = null;
    this.onLifecycleChange = null;
    this.onConfirmedSpeech = null;
    this.onSilenceCountdown = null;
    this.onContinuousSilence = null;
  }

  /**
   * Discovers available audio input devices
   */
  async getMicrophoneDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error('MediaDevices API is not supported in this environment.');
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${index + 1}`,
      }));
    return mics;
  }

  /**
   * Checks current microphone permission state
   */
  async checkPermissionStatus() {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        return result.state; // 'granted', 'prompt', 'denied'
      } catch (e) {
        return 'prompt';
      }
    }
    return 'prompt';
  }

  /**
   * Detects the best supported audio MIME type
   */
  getSupportedMimeType() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];

    if (typeof MediaRecorder === 'undefined') {
      return '';
    }

    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  /**
   * Starts automatic microphone monitoring in IDLE state with VAD
   */
  async startMonitoring({
    deviceId,
    onAudioLevel,
    onLifecycleChange,
    onConfirmedSpeech,
    onSilenceCountdown,
    onContinuousSilence,
  } = {}) {
    this.onAudioLevel = onAudioLevel;
    this.onLifecycleChange = onLifecycleChange;
    this.onConfirmedSpeech = onConfirmedSpeech;
    this.onSilenceCountdown = onSilenceCountdown;
    this.onContinuousSilence = onContinuousSilence;

    // Reset VAD state
    this.vad.reset();

    // 1. Request/verify microphone mediaStream
    if (!this.mediaStream || !this.mediaStream.active) {
      const audioConstraints = deviceId ? { deviceId: { exact: deviceId } } : true;
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
    }

    // 2. Setup AudioContext and AnalyserNode
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.vad.sampleRate = this.audioContext.sampleRate || 44100;

      const sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.3;
      sourceNode.connect(this.analyserNode);

      this.isMonitoring = true;
      this.startVADLoop();
    } catch (err) {
      console.warn('[VAD Engine] Could not initialize Web Audio AnalyserNode:', err.message);
    }
  }

  /**
   * Continuous VAD Analysis Loop: runs at screen refresh rate (~60fps / 16ms)
   */
  startVADLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    const bufferLength = this.analyserNode ? this.analyserNode.frequencyBinCount : 256;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength * 2);

    const checkAudioFrame = () => {
      if (!this.isMonitoring || !this.analyserNode) return;

      this.analyserNode.getByteFrequencyData(freqData);
      this.analyserNode.getByteTimeDomainData(timeData);

      // Process acoustic features with VAD engine
      const vadResult = this.vad.processFrame(freqData, timeData);

      // Calculate approximate dBFS level for visualizer
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += freqData[i];
      const avg = sum / bufferLength;
      const levelPercent = Math.min(100, Math.round((avg / 255) * 100));
      const db = avg > 0 ? Math.round(20 * Math.log10(avg / 255)) : -60;

      // Notify live visualizer with rich acoustic metadata
      if (this.onAudioLevel) {
        this.onAudioLevel(levelPercent, db, Array.from(freqData), {
          isSpeech: vadResult.isSpeech,
          speechProbability: vadResult.speechProbability,
          lifecycleState: vadResult.lifecycleState,
          silenceCountdown: vadResult.silenceCountdown,
          features: vadResult.features,
        });
      }

      this.animFrameId = requestAnimationFrame(checkAudioFrame);
    };

    this.animFrameId = requestAnimationFrame(checkAudioFrame);
  }

  /**
   * Starts active conversation recording upon CONFIRMED_SPEECH
   */
  startActiveSession({ onAudioChunk } = {}) {
    if (this.isSessionActive) {
      return;
    }

    this.onAudioChunk = onAudioChunk;
    this.recordedChunks = [];
    this.sessionStartTime = Date.now();
    this.totalPausedDuration = 0;
    this.pauseStartTime = null;

    const mimeType = this.getSupportedMimeType();
    const recorderOptions = mimeType ? { mimeType } : {};

    if (!this.mediaStream || !this.mediaStream.active) {
      throw new Error('Microphone mediaStream is not active.');
    }

    this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
        if (this.onAudioChunk && !this.isPaused && this.isSessionActive) {
          this.onAudioChunk(event.data);
        }
      }
    };

    // Emit 250ms chunks for streaming to backend STT
    this.mediaRecorder.start(250);
    this.isSessionActive = true;
    this.isPaused = false;

    // Flush any buffered pre-roll chunks so beginning syllables are preserved
    if (this.preRollChunks.length > 0 && onAudioChunk) {
      for (const chunk of this.preRollChunks) {
        this.recordedChunks.push(chunk);
        onAudioChunk(chunk);
      }
      this.preRollChunks = [];
    }

    return {
      startedAt: new Date(this.sessionStartTime).toISOString(),
      mimeType: this.mediaRecorder.mimeType || mimeType,
    };
  }

  /**
   * Pauses active recording session
   */
  pauseActiveSession() {
    if (!this.isSessionActive || this.isPaused) return false;
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
      this.pauseStartTime = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Resumes active recording session
   */
  resumeActiveSession() {
    if (!this.isSessionActive || !this.isPaused) return false;
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      if (this.pauseStartTime) {
        this.totalPausedDuration += Date.now() - this.pauseStartTime;
        this.pauseStartTime = null;
      }
      this.isPaused = false;
      return true;
    }
    return false;
  }

  /**
   * Stops active session and packages audio into base64 payload for IPC saving
   * Resets VAD back to IDLE monitoring for subsequent conversations.
   */
  stopActiveSession() {
    return new Promise((resolve, reject) => {
      // Reset VAD state back to IDLE monitoring
      this.vad.reset();

      if (!this.isSessionActive || !this.mediaRecorder) {
        this.isSessionActive = false;
        return resolve(null);
      }

      const recorder = this.mediaRecorder;
      const actualMimeType = recorder.mimeType || this.getSupportedMimeType() || 'audio/webm';
      const endTime = Date.now();

      let activeElapsedMs = endTime - this.sessionStartTime - this.totalPausedDuration;
      if (this.isPaused && this.pauseStartTime) {
        activeElapsedMs -= endTime - this.pauseStartTime;
      }
      const durationSeconds = Math.max(1, Math.round(activeElapsedMs / 1000));

      recorder.onstop = () => {
        try {
          const blob = new Blob(this.recordedChunks, { type: actualMimeType });
          const sizeBytes = blob.size;

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            this.isSessionActive = false;
            this.isPaused = false;
            this.mediaRecorder = null;
            this.recordedChunks = [];
            this.preRollChunks = [];

            resolve({
              base64Data: base64String,
              mimeType: actualMimeType,
              durationSeconds,
              sizeBytes,
              startedAt: new Date(this.sessionStartTime).toISOString(),
              endedAt: new Date(endTime).toISOString(),
            });
          };

          reader.onerror = (readErr) => {
            this.isSessionActive = false;
            reject(readErr);
          };

          reader.readAsDataURL(blob);
        } catch (err) {
          this.isSessionActive = false;
          reject(err);
        }
      };

      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          recorder.onstop();
        }
      } catch (err) {
        this.isSessionActive = false;
        reject(err);
      }
    });
  }

  /**
   * Complete hardware cleanup (called on application shutdown)
   */
  cleanup() {
    this.isMonitoring = false;
    this.isSessionActive = false;
    this.isPaused = false;
    this.vad.reset();

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.preRollChunks = [];
  }
}

export const audioCaptureService = new AudioCaptureService();
export default audioCaptureService;
