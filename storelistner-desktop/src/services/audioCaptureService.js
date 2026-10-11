/**
 * Storelistener Desktop — Audio Capture Service (Module 3)
 * File: src/services/audioCaptureService.js
 *
 * Implements real microphone capture using Web APIs:
 * - navigator.mediaDevices.getUserMedia()
 * - MediaRecorder with MIME-type feature detection
 * - AudioContext and AnalyserNode for live level metering and waveform visualization
 * - Clean resource disposal (all tracks stopped, context closed)
 */

class AudioCaptureService {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyserNode = null;
    this.recordedChunks = [];
    this.animFrameId = null;
    this.startTime = null;
    this.pauseStartTime = null;
    this.totalPausedDuration = 0;
    this.isRecording = false;
    this.isPaused = false;
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
        // Some Electron versions throw on microphone query; fallback to 'prompt'
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
   * Starts microphone recording session
   * @param {Object} options
   * @param {string} options.deviceId - Selected input device ID
   * @param {Function} options.onAudioLevel - Callback for live meter (levelPercent, db, freqArray)
   */
  async startRecording({ deviceId, onAudioLevel, onAudioChunk } = {}) {
    if (this.isRecording) {
      throw new Error('A recording session is already active.');
    }

    this.recordedChunks = [];
    this.startTime = Date.now();
    this.totalPausedDuration = 0;
    this.pauseStartTime = null;

    // 1. Request microphone stream
    const audioConstraints = deviceId ? { deviceId: { exact: deviceId } } : true;
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: false,
    });

    // 2. Set up AudioContext & AnalyserNode for live level visualization
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      const sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.6;
      sourceNode.connect(this.analyserNode);

      // Level monitoring loop
      const bufferLength = this.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkLevel = () => {
        if (!this.isRecording) return;

        if (this.isPaused) {
          if (onAudioLevel) onAudioLevel(0, -Infinity, new Uint8Array(bufferLength));
        } else if (this.analyserNode) {
          this.analyserNode.getByteFrequencyData(dataArray);

          // Calculate average energy
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          const levelPercent = Math.min(100, Math.round((avg / 255) * 100));

          // Calculate approximate dBFS (-60dB to 0dB)
          const db = avg > 0 ? Math.round(20 * Math.log10(avg / 255)) : -60;

          if (onAudioLevel) {
            onAudioLevel(levelPercent, db, Array.from(dataArray));
          }
        }

        this.animFrameId = requestAnimationFrame(checkLevel);
      };

      this.animFrameId = requestAnimationFrame(checkLevel);
    } catch (err) {
      console.warn('[AudioContext] Could not initialize live audio visualizer:', err.message);
    }

    // 3. Set up MediaRecorder
    const mimeType = this.getSupportedMimeType();
    const recorderOptions = mimeType ? { mimeType } : {};
    this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
        if (onAudioChunk && !this.isPaused) {
          onAudioChunk(event.data);
        }
      }
    };

    // Collect chunks every 250ms so final slices are never lost
    this.mediaRecorder.start(250);
    this.isRecording = true;
    this.isPaused = false;

    return {
      startedAt: new Date(this.startTime).toISOString(),
      mimeType: this.mediaRecorder.mimeType || mimeType,
    };
  }

  /**
   * Pauses the active recording
   */
  pauseRecording() {
    if (!this.isRecording || this.isPaused) return false;
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
      this.pauseStartTime = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Resumes the paused recording
   */
  resumeRecording() {
    if (!this.isRecording || !this.isPaused) return false;
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
   * Stops recording, releases hardware tracks, and finalizes audio file
   * @returns {Promise<{ base64Data: string, durationSeconds: number, mimeType: string, sizeBytes: number }>}
   */
  stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        return reject(new Error('No active recording session to stop.'));
      }

      const recorder = this.mediaRecorder;
      const actualMimeType = recorder.mimeType || this.getSupportedMimeType() || 'audio/webm';
      const endTime = Date.now();

      // Compute actual active recording duration (excluding pauses)
      let activeElapsedMs = endTime - this.startTime - this.totalPausedDuration;
      if (this.isPaused && this.pauseStartTime) {
        activeElapsedMs -= endTime - this.pauseStartTime;
      }
      const durationSeconds = Math.max(1, Math.round(activeElapsedMs / 1000));

      recorder.onstop = async () => {
        try {
          // Stop visualizer loop
          if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
          }

          // Release all microphone tracks immediately
          if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => {
              track.stop();
            });
            this.mediaStream = null;
          }

          // Close AudioContext
          if (this.audioContext && this.audioContext.state !== 'closed') {
            await this.audioContext.close().catch(() => {});
            this.audioContext = null;
          }

          // Combine recorded chunks into a single Blob
          const blob = new Blob(this.recordedChunks, { type: actualMimeType });
          const sizeBytes = blob.size;

          // Convert to base64 for safe IPC transport
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            this.isRecording = false;
            this.isPaused = false;
            this.mediaRecorder = null;
            this.recordedChunks = [];

            resolve({
              base64Data: base64String,
              mimeType: actualMimeType,
              durationSeconds,
              sizeBytes,
              startedAt: new Date(this.startTime).toISOString(),
              endedAt: new Date(endTime).toISOString(),
            });
          };
          reader.onerror = (readErr) => {
            this.cleanup();
            reject(readErr);
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Emergency cleanup of all hardware resources
   */
  cleanup() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.isRecording = false;
    this.isPaused = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}

export const audioCaptureService = new AudioCaptureService();
export default audioCaptureService;
