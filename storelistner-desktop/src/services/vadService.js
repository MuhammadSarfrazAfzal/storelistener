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
 * 3. Harmonic Autocorrelation in the human pitch register (80Hz - 400Hz)
 * 4. Crest Factor & Temporal Envelope analysis to reject short transient clicks (< 40ms)
 * 5. Adaptive Per-Band Noise Floor Tracking with Minimum Statistics
 * 6. Temporal Hysteresis & State Machine:
 *    IDLE -> SPEECH_CANDIDATE -> CONFIRMED_SPEECH -> ACTIVE_RECORDING
 */

export class VoiceActivityDetector {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.fftSize = options.fftSize || 512;

    // Configurable thresholds
    this.speechThreshold = options.speechThreshold ?? 0.60;
    this.candidateThreshold = options.candidateThreshold ?? 0.48;
    this.minCandidateFrames = options.minCandidateFrames ?? 6; // ~150-200ms of sustained speech
    this.silenceThreshold = options.silenceThreshold ?? 0.35;
    this.silenceTimeoutSeconds = options.silenceTimeoutSeconds ?? 15;

    // Adaptive noise floor tracking (6 bands)
    this.noiseFloorBands = [0.01, 0.01, 0.01, 0.01, 0.01, 0.01];

    // Lifecycle state: 'IDLE' | 'SPEECH_CANDIDATE' | 'CONFIRMED_SPEECH' | 'ACTIVE_RECORDING'
    this.lifecycleState = 'IDLE';

    // State counters
    this.consecutiveSpeechFrames = 0;
    this.consecutiveSilenceFrames = 0;
    this.candidateStartTime = null;
    this.silenceStartTime = null;
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
    this.continuousSilenceSeconds = 0;
    if (this.onStateChange) {
      this.onStateChange(this.lifecycleState);
    }
  }

  /**
   * Computes the Spectral Flatness Measure (SFM)
   * Geometric Mean / Arithmetic Mean of power spectrum.
   * Flat noise (fans, hiss) has SFM close to 1.0; speech has SFM < 0.45.
   */
  computeSpectralFlatness(spectrum, startBin, endBin) {
    let sumLog = 0;
    let sumLinear = 0;
    const count = endBin - startBin + 1;
    if (count <= 0) return 1.0;

    for (let k = startBin; k <= endBin; k++) {
      const p = Math.max(1e-8, (spectrum[k] / 255) ** 2);
      sumLog += Math.log(p);
      sumLinear += p;
    }

    const geometricMean = Math.exp(sumLog / count);
    const arithmeticMean = sumLinear / count;
    if (arithmeticMean <= 1e-9) return 1.0;
    return Math.min(1.0, geometricMean / arithmeticMean);
  }

  /**
   * Computes normalized autocorrelation in the human pitch lag range (80Hz to 400Hz)
   */
  computePitchHarmonicity(timeDomainData) {
    const N = timeDomainData.length;
    if (N < 128) return 0;

    // Center samples around 0
    let mean = 0;
    for (let i = 0; i < N; i++) mean += timeDomainData[i];
    mean /= N;

    let energy = 0;
    const centered = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      centered[i] = (timeDomainData[i] - mean) / 128;
      energy += centered[i] * centered[i];
    }
    if (energy < 1e-5) return 0;

    // Pitch search window: 80Hz - 400Hz at sampleRate
    const minLag = Math.max(1, Math.floor(this.sampleRate / 400));
    const maxLag = Math.min(N - 1, Math.floor(this.sampleRate / 80));

    let maxCorr = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      let lagEnergy = 0;
      const len = N - lag;
      for (let i = 0; i < len; i++) {
        corr += centered[i] * centered[i + lag];
        lagEnergy += centered[i + lag] * centered[i + lag];
      }
      if (lagEnergy > 1e-6) {
        const normCorr = corr / Math.sqrt(energy * lagEnergy);
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
    // Band 0: Sub-bass rumble (0 - 200 Hz) - traffic, fan hum
    // Band 1: Lower speech & F0 (200 - 500 Hz)
    // Band 2: Primary vowel formants F1 (500 - 1500 Hz)
    // Band 3: Speech clarity & F2/F3 (1500 - 3000 Hz)
    // Band 4: Upper speech & sibilants (3000 - 5000 Hz)
    // Band 5: High hiss & transients (5000+ Hz)
    const bandRanges = [
      [0, Math.floor(200 / binHz)],
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

    // Adaptive noise floor update (slow tracking of minimum energy)
    for (let b = 0; b < 6; b++) {
      if (bandEnergies[b] < this.noiseFloorBands[b]) {
        this.noiseFloorBands[b] = this.noiseFloorBands[b] * 0.90 + bandEnergies[b] * 0.10;
      } else {
        this.noiseFloorBands[b] = this.noiseFloorBands[b] * 0.998 + bandEnergies[b] * 0.002;
      }
    }

    // Speech Band Energy: Bands 1, 2, 3 (200 Hz - 3000 Hz)
    const speechBandEnergy = bandEnergies[1] + bandEnergies[2] * 1.5 + bandEnergies[3] * 1.2;
    // Noise Bands: Band 0 (sub-bass rumble) and Band 5 (high hiss)
    const outOfBandEnergy = bandEnergies[0] * 1.2 + bandEnergies[5] * 0.8 + 1e-6;
    // Speech-to-Out-of-Band Energy Ratio
    const speechToNoiseRatio = speechBandEnergy / outOfBandEnergy;

    // Spectral Flatness in speech region (250Hz - 3500Hz)
    const sfm = this.computeSpectralFlatness(
      freqData,
      Math.floor(250 / binHz),
      Math.min(numBins - 1, Math.floor(3500 / binHz))
    );

    // Harmonic pitch autocorrelation
    const harmonicity = this.computePitchHarmonicity(timeData);

    // Crest factor (transient detector)
    const crestFactor = this.computeCrestFactor(timeData);

    // Total audio energy level in dBFS approx
    let totalPower = 0;
    for (let k = 0; k < numBins; k++) totalPower += (freqData[k] / 255) ** 2;
    const avgPower = totalPower / numBins;
    const energyLevelPercent = Math.min(100, Math.round(Math.sqrt(avgPower) * 100));

    // ------------------------------------------------------------------
    // Speech Probability Calculation:
    // Human speech exhibits:
    // + Strong speech band energy relative to sub-bass rumble (SBR > 1.2)
    // + Low spectral flatness (SFM < 0.45 due to formant peaks)
    // + High harmonic pitch correlation (harmonicity > 0.4)
    // - Low crest factor (non-impulsive, crest < 4.0)
    //
    // Noise (Fans/AC) exhibits:
    // - High spectral flatness (SFM > 0.70)
    // - Low speech band to out-of-band ratio (most energy is low rumble)
    // - Zero harmonic periodicity
    //
    // Keyboard clicks exhibit:
    // - Very high crest factor (> 4.5) with high high-frequency content (Band 5)
    // ------------------------------------------------------------------
    let score = 0;

    // 1. Formant spectral energy concentration
    if (speechToNoiseRatio > 1.4) score += 0.35;
    else if (speechToNoiseRatio > 1.0) score += 0.20;
    else if (speechToNoiseRatio < 0.6) score -= 0.30; // Heavy rumble/fan penalty

    // 2. Harmonic structure / pitch salience
    if (harmonicity > 0.55) score += 0.35;
    else if (harmonicity > 0.35) score += 0.20;
    else if (harmonicity < 0.15) score -= 0.15; // Fan / white noise penalty

    // 3. Spectral peakiness (Inverse of Flatness)
    if (sfm < 0.30) score += 0.25;
    else if (sfm < 0.50) score += 0.15;
    else if (sfm > 0.75) score -= 0.30; // Broadband fan / white noise penalty

    // 4. Impulse / Click Rejection
    if (crestFactor > 4.5) {
      score -= 0.40; // Sharp impulse like keyboard tap or mouse click
    }

    // 5. Absolute minimum threshold check (prevent triggering in dead silence)
    if (speechBandEnergy < 0.002 || energyLevelPercent < 5) {
      score = 0;
    }

    // Sigmoid normalization into probability [0.0, 1.0]
    const speechProbability = Math.max(0, Math.min(1.0, 1 / (1 + Math.exp(-4 * (score - 0.35)))));
    const isSpeechFrame = speechProbability >= this.speechThreshold;

    // ------------------------------------------------------------------
    // State Machine Evaluation:
    // IDLE -> SPEECH_CANDIDATE -> CONFIRMED_SPEECH -> ACTIVE_RECORDING
    // ------------------------------------------------------------------
    let remainingSilence = null;

    if (this.lifecycleState === 'IDLE') {
      if (speechProbability >= this.candidateThreshold) {
        // Speech candidate detected
        this.lifecycleState = 'SPEECH_CANDIDATE';
        this.consecutiveSpeechFrames = 1;
        this.candidateStartTime = Date.now();
        if (this.onStateChange) this.onStateChange(this.lifecycleState);
      }
    } else if (this.lifecycleState === 'SPEECH_CANDIDATE') {
      if (isSpeechFrame) {
        this.consecutiveSpeechFrames++;
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
          this.silenceStartTime = null;
          this.continuousSilenceSeconds = 0;
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
      if (isSpeechFrame) {
        // Human speech is active: reset silence countdown
        this.consecutiveSilenceFrames = 0;
        if (this.continuousSilenceSeconds > 0) {
          this.continuousSilenceSeconds = 0;
          this.silenceStartTime = null;
          if (this.onSilenceCountdown) {
            this.onSilenceCountdown(null);
          }
        }
      } else {
        // Non-speech (silence OR background noise)
        this.consecutiveSilenceFrames++;
        if (!this.silenceStartTime) {
          this.silenceStartTime = Date.now();
        }
        const elapsedSec = Math.floor((Date.now() - this.silenceStartTime) / 1000);
        this.continuousSilenceSeconds = elapsedSec;
        remainingSilence = Math.max(0, this.silenceTimeoutSeconds - elapsedSec);

        if (this.onSilenceCountdown) {
          this.onSilenceCountdown(remainingSilence);
        }

        // Check if 15 seconds continuous silence reached
        if (this.continuousSilenceSeconds >= this.silenceTimeoutSeconds) {
          this.lifecycleState = 'IDLE';
          this.continuousSilenceSeconds = 0;
          this.silenceStartTime = null;
          if (this.onSilenceTimeout) {
            this.onSilenceTimeout();
          }
          if (this.onStateChange) this.onStateChange(this.lifecycleState);
        }
      }
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
        speechToNoiseRatio: Number(speechToNoiseRatio.toFixed(2)),
        energyLevelPercent,
      },
    };
  }
}

export default VoiceActivityDetector;
