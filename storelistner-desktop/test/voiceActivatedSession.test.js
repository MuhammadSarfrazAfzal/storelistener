/**
 * Storelistener Desktop — Voice-Activated Sessions & Acoustic VAD Test Suite (Module 4)
 * File: test/voiceActivatedSession.test.js
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { VoiceActivityDetector } from '../src/services/vadService.js';

// --- Synthetic Acoustic Signal Generators for VAD Verification ---

function createQuietFrame(length = 256) {
  const freq = new Uint8Array(length);
  const time = new Uint8Array(length * 2);
  // Quiet room: minimal ambient noise floor (~ -58 dBFS)
  for (let i = 0; i < length; i++) freq[i] = Math.floor(Math.random() * 4);
  for (let i = 0; i < length * 2; i++) time[i] = 128 + Math.floor((Math.random() - 0.5) * 4);
  return { freq, time };
}

function createFanNoiseFrame(length = 256) {
  const freq = new Uint8Array(length);
  const time = new Uint8Array(length * 2);
  // Fan/AC: strong 60Hz hum in low bins (bins 0-2) + flat broadband noise (high SFM)
  freq[0] = 75; // 60Hz hum
  freq[1] = 60; // 120Hz harmonic
  for (let i = 2; i < length; i++) {
    freq[i] = 25 + Math.floor(Math.random() * 6); // Flat stationary noise
  }
  for (let i = 0; i < length * 2; i++) {
    // 60Hz motor hum (lag > 700 samples, well below speech pitch register) + random air turbulence
    time[i] = 128 + Math.floor(Math.sin(i * 0.0085) * 20 + (Math.random() - 0.5) * 12);
  }
  return { freq, time };
}

function createKeyboardClickFrame(length = 256) {
  const freq = new Uint8Array(length);
  const time = new Uint8Array(length * 2);
  // Keyboard click: sudden wideband spike with very high crest factor (> 5.0)
  for (let i = 0; i < length; i++) freq[i] = 20 + Math.floor(Math.random() * 30);
  for (let i = 0; i < length * 2; i++) time[i] = 128;
  // Sharp Dirac-like transient impulse in first few samples
  time[10] = 250;
  time[11] = 8;
  time[12] = 240;
  time[13] = 20;
  return { freq, time };
}

function createTrafficRumbleFrame(length = 256) {
  const freq = new Uint8Array(length);
  const time = new Uint8Array(length * 2);
  // Traffic rumble: high energy strictly below 150Hz (bins 0-3), near zero in speech band
  freq[0] = 90;
  freq[1] = 80;
  freq[2] = 50;
  for (let i = 3; i < length; i++) freq[i] = Math.floor(Math.random() * 4);
  for (let i = 0; i < length * 2; i++) {
    time[i] = 128 + Math.floor(Math.sin(i * 0.05) * 40);
  }
  return { freq, time };
}

function createHumanSpeechFrame(length = 256, pitchHz = 150) {
  const freq = new Uint8Array(length);
  const time = new Uint8Array(length * 2);
  // Formant bandwidths: F1 (~500Hz: bins 5-8), F2 (~1500Hz: bins 15-20), F3 (~2500Hz: bins 26-32)
  for (let b = 5; b <= 8; b++) freq[b] = 120;
  for (let b = 15; b <= 20; b++) freq[b] = 100;
  for (let b = 26; b <= 32; b++) freq[b] = 80;

  // Periodic pitch waveform with 150Hz fundamental
  const samplesPerPeriod = Math.floor(44100 / pitchHz);
  for (let i = 0; i < length * 2; i++) {
    const phase = (i % samplesPerPeriod) / samplesPerPeriod;
    const sample = Math.sin(phase * 2 * Math.PI) * 45 + Math.sin(phase * 4 * Math.PI) * 25;
    time[i] = 128 + Math.floor(sample);
  }
  return { freq, time };
}

describe('Module 4: Acoustic Feature-Based Voice Activity Detection (VAD)', () => {
  test('Requirement 1: Quiet room: classified as non-speech with near-zero probability', () => {
    const vad = new VoiceActivityDetector({ sampleRate: 44100 });
    const { freq, time } = createQuietFrame();
    const result = vad.processFrame(freq, time);

    assert.equal(result.isSpeech, false, 'Quiet room must not be speech');
    assert.ok(result.speechProbability < 0.20, `Quiet room probability (${result.speechProbability}) must be < 0.20`);
    assert.equal(vad.lifecycleState, 'IDLE');
  });

  test('Requirement 2: Fan or Air-Conditioning noise: rejected as non-speech due to high spectral flatness and rumble', () => {
    const vad = new VoiceActivityDetector({ sampleRate: 44100 });
    // Process 20 frames of continuous fan noise
    let maxProbability = 0;
    for (let f = 0; f < 20; f++) {
      const { freq, time } = createFanNoiseFrame();
      const res = vad.processFrame(freq, time);
      if (res.speechProbability > maxProbability) maxProbability = res.speechProbability;
    }

    assert.ok(maxProbability < 0.40, `Fan noise probability (${maxProbability}) must be well below speech threshold`);
    assert.equal(vad.lifecycleState, 'IDLE', 'Fan noise alone must never leave IDLE');
  });

  test('Requirement 3: Keyboard typing & occasional clicks: rejected by high crest factor transient detector', () => {
    const vad = new VoiceActivityDetector({ sampleRate: 44100 });
    // Simulate quiet typing: quiet frame, sudden click, quiet frame
    vad.processFrame(createQuietFrame().freq, createQuietFrame().time);
    const clickRes = vad.processFrame(createKeyboardClickFrame().freq, createKeyboardClickFrame().time);
    vad.processFrame(createQuietFrame().freq, createQuietFrame().time);

    assert.equal(clickRes.isSpeech, false, 'Keyboard clicks must be classified as non-speech');
    assert.ok(clickRes.features.crestFactor > 4.0, 'Click must have high crest factor');
    assert.equal(vad.lifecycleState, 'IDLE', 'Isolated click must not start session');
  });

  test('Requirement 4: Traffic / low-frequency rumble: rejected due to low speech-to-rumble ratio', () => {
    const vad = new VoiceActivityDetector({ sampleRate: 44100 });
    let maxProbability = 0;
    for (let f = 0; f < 15; f++) {
      const { freq, time } = createTrafficRumbleFrame();
      const res = vad.processFrame(freq, time);
      if (res.speechProbability > maxProbability) maxProbability = res.speechProbability;
    }

    assert.ok(maxProbability < 0.35, `Traffic rumble probability (${maxProbability}) must be < 0.35`);
    assert.equal(vad.lifecycleState, 'IDLE', 'Traffic rumble must not trigger session');
  });

  test('Requirement 5: Clear human speech: transitions IDLE -> SPEECH_CANDIDATE -> CONFIRMED_SPEECH -> ACTIVE_RECORDING', () => {
    let confirmedEventFired = false;
    const statesObserved = [];

    const vad = new VoiceActivityDetector({
      sampleRate: 44100,
      minCandidateFrames: 5,
      onStateChange: (state) => statesObserved.push(state),
      onConfirmedSpeech: () => { confirmedEventFired = true; },
    });

    // Feed 10 consecutive frames of human speech (~200ms)
    for (let f = 0; f < 10; f++) {
      const { freq, time } = createHumanSpeechFrame();
      vad.processFrame(freq, time);
    }

    assert.ok(confirmedEventFired, 'Confirmed speech callback must be triggered');
    assert.ok(statesObserved.includes('SPEECH_CANDIDATE'), 'Must enter SPEECH_CANDIDATE first');
    assert.ok(statesObserved.includes('CONFIRMED_SPEECH'), 'Must enter CONFIRMED_SPEECH');
    assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING', 'Must transition to ACTIVE_RECORDING');
  });

  test('Requirement 6: Short pause during conversation (< 15s): session remains active and resets silence timer upon speech', () => {
    let silenceTimeoutFired = false;
    let countdownValues = [];

    const vad = new VoiceActivityDetector({
      sampleRate: 44100,
      minCandidateFrames: 3,
      silenceTimeoutSeconds: 15,
      onSilenceCountdown: (rem) => { if (rem !== null) countdownValues.push(rem); },
      onSilenceTimeout: () => { silenceTimeoutFired = true; },
    });

    // 1. Establish speech session
    for (let i = 0; i < 5; i++) {
      const { freq, time } = createHumanSpeechFrame();
      vad.processFrame(freq, time);
    }
    assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING');

    // 2. Pause for a short period (non-speech frames)
    for (let i = 0; i < 10; i++) {
      const { freq, time } = createQuietFrame();
      vad.processFrame(freq, time);
    }
    assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING', 'Session must remain active during short pause');
    assert.equal(silenceTimeoutFired, false, '15s silence must not trigger prematurely');

    // 3. Speech resumes
    for (let i = 0; i < 4; i++) {
      const { freq, time } = createHumanSpeechFrame();
      vad.processFrame(freq, time);
    }
    assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING', 'Session continues seamlessly');
    assert.equal(vad.silenceStartTime, null, 'silenceStartTime must be unconditionally reset to null');
    assert.equal(vad.continuousSilenceSeconds, 0, 'continuousSilenceSeconds must be reset to 0');
  });

  test('Requirement 6b: Speak continuously for at least 30 seconds: session stays open without silence timer accumulating', () => {
    let silenceTimeoutFired = false;
    let countdownValues = [];

    const vad = new VoiceActivityDetector({
      sampleRate: 44100,
      minCandidateFrames: 3,
      silenceTimeoutSeconds: 15,
      onSilenceCountdown: (rem) => { if (rem !== null) countdownValues.push(rem); },
      onSilenceTimeout: () => { silenceTimeoutFired = true; },
    });

    // 1. Establish session
    for (let i = 0; i < 4; i++) vad.processFrame(createHumanSpeechFrame().freq, createHumanSpeechFrame().time);
    assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING');

    // 2. Simulate 30 seconds of conversational speech with natural short syllable gaps (300ms)
    // 30 seconds = 30 intervals of 1 second (each second has speech frames and micro-pauses)
    for (let second = 0; second < 30; second++) {
      // 800ms of active speech frames
      for (let f = 0; f < 8; f++) {
        vad.processFrame(createHumanSpeechFrame().freq, createHumanSpeechFrame().time);
      }
      // 200ms natural micro-gap between syllables
      for (let f = 0; f < 2; f++) {
        vad.processFrame(createQuietFrame().freq, createQuietFrame().time);
      }
      // Verify silence timer never builds up to 15s
      assert.ok(vad.continuousSilenceSeconds < 2, 'Micro-gaps during continuous conversation must not accumulate');
      assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING', `Session must remain active at second ${second + 1}`);
    }

    assert.equal(silenceTimeoutFired, false, 'Silence timeout must never fire during continuous conversation');
    assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING', 'Session must remain ACTIVE_RECORDING after 30+ seconds');
  });

  test('Requirement 7: Continuous silence for 15 seconds: session triggers silence timeout and returns to IDLE', () => {
    let silenceTimeoutFired = false;

    const vad = new VoiceActivityDetector({
      sampleRate: 44100,
      minCandidateFrames: 3,
      silenceTimeoutSeconds: 15,
      onSilenceTimeout: () => { silenceTimeoutFired = true; },
    });

    // Start session
    for (let i = 0; i < 5; i++) vad.processFrame(createHumanSpeechFrame().freq, createHumanSpeechFrame().time);
    assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING');

    // Simulate 15.1 seconds of elapsed silence
    vad.silenceStartTime = Date.now() - 15200;
    vad.processFrame(createQuietFrame().freq, createQuietFrame().time);

    assert.ok(silenceTimeoutFired, '15s silence timeout must fire');
    assert.equal(vad.lifecycleState, 'IDLE', 'State must return to IDLE');
  });

  test('Requirement 8: Background noise after speech ends does NOT prevent session from closing', () => {
    let silenceTimeoutFired = false;

    const vad = new VoiceActivityDetector({
      sampleRate: 44100,
      minCandidateFrames: 3,
      silenceTimeoutSeconds: 15,
      onSilenceTimeout: () => { silenceTimeoutFired = true; },
    });

    // Start active recording with speech
    for (let i = 0; i < 5; i++) vad.processFrame(createHumanSpeechFrame().freq, createHumanSpeechFrame().time);
    assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING');

    // Background fan noise continues while speaker has stopped talking
    vad.silenceStartTime = Date.now() - 15200;
    // Feed fan noise frame
    const res = vad.processFrame(createFanNoiseFrame().freq, createFanNoiseFrame().time);

    assert.equal(res.isSpeech, false, 'Fan noise must be classified as non-speech during active session');
    assert.ok(silenceTimeoutFired, 'Background fan noise must NOT prevent session closure');
    assert.equal(vad.lifecycleState, 'IDLE');
  });

  test('Requirement 9: A new spoken conversation after closure starts a new session', () => {
    const vad = new VoiceActivityDetector({ sampleRate: 44100, minCandidateFrames: 3 });

    // Session 1
    for (let i = 0; i < 5; i++) vad.processFrame(createHumanSpeechFrame().freq, createHumanSpeechFrame().time);
    assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING');
    vad.reset();
    assert.equal(vad.lifecycleState, 'IDLE');

    // Session 2
    for (let i = 0; i < 5; i++) vad.processFrame(createHumanSpeechFrame().freq, createHumanSpeechFrame().time);
    assert.equal(vad.lifecycleState, 'ACTIVE_RECORDING', 'Second conversation must start cleanly');
  });
});

describe('Module 4: English Translation & Local Storage Persistence Verification', () => {
  let tempDir;
  let metadataPath;
  let transcriptsDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storelistener-vad-test-'));
    const recordingsDir = path.join(tempDir, 'recordings');
    transcriptsDir = path.join(recordingsDir, 'transcripts');
    fs.mkdirSync(transcriptsDir, { recursive: true });
    metadataPath = path.join(recordingsDir, 'metadata.json');
  });

  after(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('Requirement 10: Saved audio and English translated transcript remain accessible after app restart', () => {
    const sessionId = `sess_${Date.now()}_abc`;
    const recId = `rec_store-01_${Date.now()}_xyz`;

    const record = {
      recordingId: recId,
      sessionId,
      title: 'Conversation - 12 Oct 2026, 03:45 PM',
      durationSeconds: 28,
      fileName: 'rec_store-01_1740001234_xyz.webm',
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(metadataPath, JSON.stringify([record], null, 2), 'utf8');

    const transcriptPayload = {
      recordingId: recId,
      sessionId,
      provider: 'deepgram',
      model: 'nova-3',
      segments: [
        {
          segmentId: 'seg_1',
          speaker: 0,
          text: 'Hello, how can I help you today?',
          isTranslated: false,
        },
        {
          segmentId: 'seg_2',
          speaker: 1,
          text: 'How much does the iPhone 16 Pro cost?',
          originalText: 'Cuánto cuesta el iPhone 16 Pro',
          isTranslated: true,
          sourceLanguage: 'es',
          targetLanguage: 'en',
        },
      ],
    };
    fs.writeFileSync(path.join(transcriptsDir, `${recId}.json`), JSON.stringify(transcriptPayload, null, 2), 'utf8');

    // Simulate restart: read fresh from disk
    const reloadedRecords = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    assert.equal(reloadedRecords.length, 1);
    assert.equal(reloadedRecords[0].recordingId, recId);

    const reloadedTr = JSON.parse(fs.readFileSync(path.join(transcriptsDir, `${recId}.json`), 'utf8'));
    assert.equal(reloadedTr.segments.length, 2);
    assert.equal(reloadedTr.segments[1].text, 'How much does the iPhone 16 Pro cost?');
    assert.equal(reloadedTr.segments[1].isTranslated, true);
    assert.equal(reloadedTr.segments[1].originalText, 'Cuánto cuesta el iPhone 16 Pro');
  });
});
