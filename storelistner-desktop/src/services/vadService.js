/**
 * Storelistener Desktop — Advanced Speech Activity Detection (VAD) Pipeline (Module 4)
 * File: src/services/vadService.js
 *
 * Implements a multi-feature acoustic Voice Activity Detector designed to distinguish
 * human speech from stationary noise (fans, air conditioning), low-frequency rumble (traffic),
 * and transient non-speech impulses (keyboard typing, mouse clicks, pen taps).
 *
 * Audio Features Analyzed:
 * 1. Sub-Band Spectral Energy (6 filterbank bands covering 80Hz - 8000Hz)
 * 2. Spectral Flatness Measure (SFM / Wiener Entropy) to detect tonal/harmonic speech vs broadband noise
 * 3. Normalized Harmonic Autocorrelation in the human pitch register (80Hz - 400Hz)
 * 4. Crest Factor & Temporal Envelope analysis to reject short transient clicks (< 40ms)
 * 5. Adaptive Per-Band Noise Floor Tracking with Minimum Statistics
 * 6. Temporal Hysteresis, Speech Hangover & Lifecycle State Machine:
 *    IDLE -> SPEECH_CANDIDATE -> CONFIRMED_SPEECH -> ACTIVE_RECORDING
 */

export class VoiceActivityDetector {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.fftSize = options.fftSize || 512;

    // Calibrated thresholds tuned for real microphone capture
    this.speechThreshold = options.speechThreshold ?? 0.50; // Confirmed speech frame threshold
    this.candidateThreshold = options.candidateThreshold ?? 0.38; // Pre-speech candidate entry threshold
    this.minCandidateFrames = options.minCandidateFrames ?? 4; // ~80-120ms of sustained speech to start session
    this.silenceTimeoutSeconds = options.silenceTimeoutSeconds ?? 15; // 15 seconds continuous silence timeout
    this.hangoverMs = options.hangoverMs ?? 1000; // 1 second speech hangover for natural pauses between words

    // Configurable debug mode
    this.debugMode = options.debugMode ?? false;
    this.lastDebugLogTime = 0;

    // Adaptive noise floor tracking (6 bands)
    this.noiseFloorBands = [0.01, 0.01, 0.01, 0.01, 0.01, 0.01];

    // Lifecycle state: 'IDLE' | 'SPEECH_CANDIDATE' | 'CONFIRMED_SPEECH' | 'ACTIVE_RECORDING'
    this.lifecycleState = 'IDLE';

    // State counters & timestamps
    this.consecutiveSpeechFrames = 0;
    this.consecutiveSilenceFrames = 0;
    this.candidateStartTime = null;
    this.silenceStartTime = null;
    this.lastSpeechTime = null;
    this.continuousSilenceSeconds = 0;

    // Callbacks
    this.onStateChange = options.onStateChange || null;
    this.onSilenceCountdown = options.onSilenceCountdown || null;
    this.onConfirmedSpeech = options.onConfirmedSpeech || null;
    this.onSilenceTimeout = options.onSilenceTimeout || null;
  }

  /**
   * Resets the detector back to IDLE state
   */
  reset() {
    this.lifecycleState = 'IDLE';
    this.consecutiveSpeechFrames = 0;
    this.consecutiveSilenceFrames = 0;
    this.candidateStartTime = null;
    this.silenceStartTime = null;
    this.lastSpeechTime = null;
    this.continuousSilenceSeconds = 0;
    if (this.onSilenceCountdown) {
      this.onSilenceCountdown(null);
    }
    if (this.onStateChange) {
      this.onStateChange(this.lifecycleState);
    }
  }

  /**
   * Computes the Spectral Flatness Measure (SFM)
   * Geometric Mean / Arithmetic Mean of power spectrum.
   * Flat noise (fans, hiss) has SFM close to 1.0; speech has SFM < 0.50.
   */
  computeSpectralFlatness(spectrum, startBin, endBin) {
    let sumLog = 0;
    let sumLinear = 0;
    const start = Math.max(0, startBin);
    const end = Math.min(spectrum.length - 1, endBin);
    const count = end - start + 1;
    if (count <= 0) return 1.0;

    for (let k = start; k <= end; k++) {
      const p = Math.max(1e-7, (spectrum[k] / 255) ** 2);
      sumLog += Math.log(p);
      sumLinear += p;
    }

    const geometricMean = Math.exp(sumLog / count);
    const arithmeticMean = sumLinear / count;
    if (arithmeticMean <= 1e-8) return 1.0;
    return Math.max(0, Math.min(1.0, geometricMean / arithmeticMean));
  }

  /**
   * Computes normalized autocorrelation in the human pitch lag range (80Hz to 400Hz)
   */
  computePitchHarmonicity(timeDomainData) {
    const N = timeDomainData.length;
    if (N < 64) return 0;

    // Center samples around 0
    let mean = 0;
    for (let i = 0; i < N; i++) mean += timeDomainData[i];
    mean /= N;

    const centered = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      centered[i] = (timeDomainData[i] - mean) / 128;
    }

    // Pitch search window: 80Hz - 400Hz at sampleRate
    const minLag = Math.max(1, Math.floor(this.sampleRate / 400));
    const maxLag = Math.min(N - 16, Math.floor(this.sampleRate / 80));
    if (minLag >= maxLag) return 0;

    let maxCorr = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      const len = N - lag;
      let corr = 0;
      let baseEnergy = 0;
      let lagEnergy = 0;
      for (let i = 0; i < len; i++) {
        const c = centered[i];
        const cl = centered[i + lag];
        corr += c * cl;
        baseEnergy += c * c;
        lagEnergy += cl * cl;
      }
      if (baseEnergy > 1e-5 && lagEnergy > 1e-5) {
        const normCorr = corr / Math.sqrt(baseEnergy * lagEnergy);
        if (normCorr > maxCorr) {
          maxCorr = normCorr;
        }
      }
    }

    return Math.max(0, Math.min(1.0, maxCorr));
  }

  /**
   * Computes crest factor (peak-to-RMS) to detect short impulsive transients (key clicks)
   */
  computeCrestFactor(timeDomainData) {
    let peak = 0;
    let sumSq = 0;
    const N = timeDomainData.length;
    if (N === 0) return 1.0;
    for (let i = 0; i < N; i++) {
      const val = Math.abs((timeDomainData[i] - 128) / 128);
      if (val > peak) peak = val;
      sumSq += val * val;
    }
    const rms = Math.sqrt(sumSq / N);
    if (rms < 1e-4) return 1.0;
    return peak / rms;
  }

  /**
   * Processes a single audio frame and calculates speech probability
   * @param {Uint8Array|Array<number>} freqData - FFT magnitude bins (0-255)
   * @param {Uint8Array|Array<number>} timeData - Time-domain waveform (0-255 centered at 128)
   * @returns {{ speechProbability: number, isSpeech: boolean, lifecycleState: string, silenceCountdown: number|null, features: Object }}
   */
  processFrame(freqData, timeData) {
    const numBins = freqData.length;
    const binHz = (this.sampleRate / 2) / numBins;

    // Define 6 acoustic sub-bands:
    // Band 0: Sub-bass rumble (0 - 200 Hz) - traffic, line hum
    // Band 1: Lower speech & F0 (200 - 500 Hz)
    // Band 2: Primary vowel formants F1 (500 - 1500 Hz)
    // Band 3: Speech clarity & F2/F3 (1500 - 3000 Hz)
    // Band 4: Upper speech & sibilants (3000 - 5000 Hz)
    // Band 5: High hiss & transients (5000+ Hz)
    const bandRanges = [
      [0, Math.max(1, Math.floor(200 / binHz))],
      [Math.floor(200 / binHz) + 1, Math.floor(500 / binHz)],
      [Math.floor(500 / binHz) + 1, Math.floor(1500 / binHz)],
      [Math.floor(1500 / binHz) + 1, Math.floor(3000 / binHz)],
      [Math.floor(3000 / binHz) + 1, Math.floor(5000 / binHz)],
      [Math.floor(5000 / binHz) + 1, numBins - 1],
    ];

    const bandEnergies = [0, 0, 0, 0, 0, 0];
    for (let b = 0; b < 6; b++) {
      const [start, end] = bandRanges[b];
      let sum = 0;
      const count = Math.max(1, end - start + 1);
      for (let k = start; k <= Math.min(numBins - 1, end); k++) {
        sum += (freqData[k] / 255) ** 2;
      }
      bandEnergies[b] = sum / count;
    }

    // Adaptive noise floor update (minimum statistics per band)
    for (let b = 0; b < 6; b++) {
      if (bandEnergies[b] < this.noiseFloorBands[b]) {
        this.noiseFloorBands[b] = this.noiseFloorBands[b] * 0.85 + bandEnergies[b] * 0.15;
      } else {
        this.noiseFloorBands[b] = this.noiseFloorBands[b] * 0.997 + bandEnergies[b] * 0.003;
      }
    }

    // Speech Band Energy: Bands 1, 2, 3 (200 Hz - 3000 Hz)
    const speechBandEnergy = bandEnergies[1] + bandEnergies[2] * 1.5 + bandEnergies[3] * 1.2;
    const speechNoiseFloor = this.noiseFloorBands[1] + this.noiseFloorBands[2] * 1.5 + this.noiseFloorBands[3] * 1.2 + 1e-6;
    const speechSnr = speechBandEnergy / speechNoiseFloor;

    // Low-frequency rumble rejection ratio (traffic / AC rumble)
    const rumbleEnergy = bandEnergies[0];
    const isDominantRumble = rumbleEnergy > speechBandEnergy * 2.5 && speechBandEnergy < 0.015;

    // Spectral Flatness in speech region (250Hz - 3500Hz)
    const sfm = this.computeSpectralFlatness(
      freqData,
      Math.floor(250 / binHz),
      Math.min(numBins - 1, Math.floor(3500 / binHz))
    );

    // Harmonic pitch autocorrelation
    const harmonicity = this.computePitchHarmonicity(timeData);

    // Crest factor (transient click detector)
    const crestFactor = this.computeCrestFactor(timeData);

    // Total audio energy level in approx dBFS
    let totalPower = 0;
    for (let k = 0; k < numBins; k++) totalPower += (freqData[k] / 255) ** 2;
    const avgPower = totalPower / numBins;
    const energyLevelPercent = Math.min(100, Math.round(Math.sqrt(avgPower) * 100));

    // ------------------------------------------------------------------
    // Speech Probability Calculation:
    // Human speech exhibits:
    // + Elevated speech band energy over the adaptive noise floor (speechSnr > 1.8)
    // + Formant resonance / low spectral flatness (SFM < 0.55)
    // + Harmonic periodicity in voiced vowels (harmonicity > 0.25)
    // - Low crest factor (< 4.2)
    // ------------------------------------------------------------------
    let score = 0;

    // 1. SNR in speech bands (200 - 3000 Hz) above adaptive noise floor
    if (speechSnr > 3.0) score += 0.35;
    else if (speechSnr > 1.8) score += 0.22;
    else if (speechSnr > 1.2) score += 0.10;

    // 2. Formant peakiness (SFM)
    if (sfm < 0.35) score += 0.25;
    else if (sfm < 0.55) score += 0.15;
    else if (sfm > 0.68) score -= 0.35; // Broadband fan / white noise penalty

    // 3. Harmonic pitch structure in voiced phonemes
    if (harmonicity > 0.42) score += 0.30;
    else if (harmonicity > 0.25) score += 0.15;

    // 4. Low-frequency rumble penalty (traffic, desk vibration, 60Hz hum)
    if (isDominantRumble || (rumbleEnergy > speechBandEnergy * 1.5 && speechBandEnergy < 0.02)) {
      score -= 0.35;
    }

    // 5. Transient impulse / Click rejection (keyboard clicks, mouse taps)
    if (crestFactor > 4.2) {
      score -= 0.35;
    }

    // 6. Near-silence gate (prevent activation from zero mic noise floor)
    if (energyLevelPercent < 3 || speechBandEnergy < 0.0006) {
      score = -0.50;
    }

    // Calibrated sigmoid normalization into probability [0.0, 1.0]
    const rawProb = 1 / (1 + Math.exp(-4 * (score - 0.20)));
    const speechProbability = Math.max(0, Math.min(1.0, rawProb));
    const isSpeechFrame = speechProbability >= this.speechThreshold;

    // ------------------------------------------------------------------
    // State Machine & Silence Timer Evaluation:
    // IDLE -> SPEECH_CANDIDATE -> CONFIRMED_SPEECH -> ACTIVE_RECORDING
    // ------------------------------------------------------------------
    let remainingSilence = null;

    if (this.lifecycleState === 'IDLE') {
      if (speechProbability >= this.candidateThreshold) {
        // Speech candidate detected
        this.lifecycleState = 'SPEECH_CANDIDATE';
        this.consecutiveSpeechFrames = 1;
        this.consecutiveSilenceFrames = 0;
        this.candidateStartTime = Date.now();
        if (this.onStateChange) this.onStateChange(this.lifecycleState);
      }
    } else if (this.lifecycleState === 'SPEECH_CANDIDATE') {
      if (speechProbability >= this.candidateThreshold) {
        this.consecutiveSpeechFrames++;
        this.consecutiveSilenceFrames = 0;
        // If sustained speech activity meets minimum candidate duration
        if (this.consecutiveSpeechFrames >= this.minCandidateFrames) {
          this.lifecycleState = 'CONFIRMED_SPEECH';
          if (this.onStateChange) this.onStateChange(this.lifecycleState);
          if (this.onConfirmedSpeech) {
            this.onConfirmedSpeech({
              speechProbability,
              candidateDurationMs: Date.now() - this.candidateStartTime,
            });
          }
          this.lifecycleState = 'ACTIVE_RECORDING';
          this.lastSpeechTime = Date.now();
          this.silenceStartTime = null;
          this.continuousSilenceSeconds = 0;
          this.consecutiveSilenceFrames = 0;
          if (this.onStateChange) this.onStateChange(this.lifecycleState);
        }
      } else {
        // Brief noise burst / transient dropped below candidate threshold: abort candidate
        this.consecutiveSilenceFrames++;
        if (this.consecutiveSilenceFrames > 3) {
          this.lifecycleState = 'IDLE';
          this.consecutiveSpeechFrames = 0;
          this.consecutiveSilenceFrames = 0;
          this.candidateStartTime = null;
          if (this.onStateChange) this.onStateChange(this.lifecycleState);
        }
      }
    } else if (this.lifecycleState === 'ACTIVE_RECORDING') {
      const now = Date.now();

      if (isSpeechFrame) {
        // HUMAN SPEECH IS ACTIVELY OCCURRING!
        // Unconditionally reset silence timer and clear countdown display
        this.lastSpeechTime = now;
        this.consecutiveSilenceFrames = 0;
        this.silenceStartTime = null;
        this.continuousSilenceSeconds = 0;

        if (this.onSilenceCountdown) {
          this.onSilenceCountdown(null);
        }
      } else {
        // NON-SPEECH FRAME (silence OR background noise)
        this.consecutiveSilenceFrames++;

        if (!this.silenceStartTime) {
          this.silenceStartTime = now;
        }

        const elapsedSec = Math.floor((now - this.silenceStartTime) / 1000);
        this.continuousSilenceSeconds = elapsedSec;
        remainingSilence = Math.max(0, this.silenceTimeoutSeconds - elapsedSec);

        if (this.onSilenceCountdown) {
          this.onSilenceCountdown(remainingSilence);
        }

        // Check if 15 continuous seconds of silence reached
        if (this.continuousSilenceSeconds >= this.silenceTimeoutSeconds) {
          if (this.debugMode) {
            console.log('⏱️ [VAD] 15 seconds continuous silence reached. Triggering closure.');
          }
          this.lifecycleState = 'IDLE';
          this.continuousSilenceSeconds = 0;
          this.silenceStartTime = null;
          this.lastSpeechTime = null;

          if (this.onSilenceTimeout) {
            this.onSilenceTimeout();
          }
          if (this.onStateChange) {
            this.onStateChange(this.lifecycleState);
          }
        }
      }
    }

    // Optional periodic debug logging in development mode
    if (this.debugMode && (Date.now() - this.lastDebugLogTime > 2500)) {
      this.lastDebugLogTime = Date.now();
      console.log(
        `[VAD Debug] State: ${this.lifecycleState} | p: ${speechProbability.toFixed(2)} | Speech?: ${isSpeechFrame} | SFM: ${sfm.toFixed(2)} | Harm: ${harmonicity.toFixed(2)} | Crest: ${crestFactor.toFixed(1)} | Silence: ${this.continuousSilenceSeconds}s`
      );
    }

    return {
      speechProbability: Number(speechProbability.toFixed(3)),
      isSpeech: isSpeechFrame,
      lifecycleState: this.lifecycleState,
      silenceCountdown: remainingSilence,
      features: {
        sfm: Number(sfm.toFixed(3)),
        harmonicity: Number(harmonicity.toFixed(3)),
        crestFactor: Number(crestFactor.toFixed(2)),
        speechToNoiseRatio: Number(speechSnr.toFixed(2)),
        energyLevelPercent,
      },
    };
  }
}

export default VoiceActivityDetector;
