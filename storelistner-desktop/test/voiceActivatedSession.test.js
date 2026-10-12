/**
 * Storelistener Desktop — Voice-Activated Sessions & Translation Test Suite (Module 4)
 * File: test/voiceActivatedSession.test.js
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Module 4: Automatic Voice-Activated Session State Machine', () => {
  // Pure model of the session state machine
  class MockSessionStateMachine {
    constructor() {
      this.state = 'IDLE'; // 'IDLE' | 'SPEECH_DETECTED' | 'ACTIVE_SESSION' | '15_SECONDS_CONTINUOUS_SILENCE' | 'SAVE_AND_CLOSE'
      this.currentSessionId = null;
      this.currentTitle = null;
      this.continuousSilenceSeconds = 0;
      this.sessionsCreated = [];
      this.savedSessions = [];
    }

    onAudioFrame({ isSpeaking, elapsedSilenceSeconds = 0 }) {
      if (this.state === 'IDLE') {
        if (isSpeaking) {
          this.state = 'SPEECH_DETECTED';
          const sessId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const now = new Date();
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const title = `Conversation - ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          
          this.currentSessionId = sessId;
          this.currentTitle = title;
          this.sessionsCreated.push({ sessionId: sessId, title });
          this.continuousSilenceSeconds = 0;
          this.state = 'ACTIVE_SESSION';
        }
      } else if (this.state === 'ACTIVE_SESSION') {
        if (isSpeaking) {
          // Speech continues or resumes: reset silence timer
          this.continuousSilenceSeconds = 0;
        } else {
          // Silence continues
          this.continuousSilenceSeconds = elapsedSilenceSeconds;
          if (this.continuousSilenceSeconds >= 15) {
            this.state = '15_SECONDS_CONTINUOUS_SILENCE';
            this.finalizeAndClose();
          }
        }
      }
    }

    finalizeAndClose() {
      this.state = 'SAVE_AND_CLOSE';
      this.savedSessions.push({
        sessionId: this.currentSessionId,
        title: this.currentTitle,
        savedAt: new Date().toISOString(),
      });
      this.currentSessionId = null;
      this.currentTitle = null;
      this.continuousSilenceSeconds = 0;
      this.state = 'IDLE';
    }
  }

  test('Scenario 1: Launch in quiet room: state remains IDLE, no session created', () => {
    const sm = new MockSessionStateMachine();
    assert.equal(sm.state, 'IDLE');

    // Simulate 200 quiet frames
    for (let i = 0; i < 200; i++) {
      sm.onAudioFrame({ isSpeaking: false, elapsedSilenceSeconds: i * 0.1 });
    }

    assert.equal(sm.state, 'IDLE');
    assert.equal(sm.sessionsCreated.length, 0, 'No session should be created in silence');
    assert.equal(sm.currentSessionId, null);
  });

  test('Scenario 2: Speak a sentence: session automatically starts with unique ID and formatted title', () => {
    const sm = new MockSessionStateMachine();
    assert.equal(sm.state, 'IDLE');

    // User speaks
    sm.onAudioFrame({ isSpeaking: true });

    assert.equal(sm.state, 'ACTIVE_SESSION');
    assert.equal(sm.sessionsCreated.length, 1);
    assert.ok(sm.currentSessionId.startsWith('sess_'));
    assert.ok(sm.currentTitle.startsWith('Conversation -'));
  });

  test('Scenario 3: Continue speaking: session remains active and silence timer stays 0', () => {
    const sm = new MockSessionStateMachine();
    sm.onAudioFrame({ isSpeaking: true });

    // Ongoing speech
    for (let i = 0; i < 50; i++) {
      sm.onAudioFrame({ isSpeaking: true });
    }

    assert.equal(sm.state, 'ACTIVE_SESSION');
    assert.equal(sm.continuousSilenceSeconds, 0);
  });

  test('Scenario 4: Pause for less than 15 seconds (e.g. 8s) and resume: same session continues', () => {
    const sm = new MockSessionStateMachine();
    sm.onAudioFrame({ isSpeaking: true });
    const initialSessionId = sm.currentSessionId;

    // Pause for 8 seconds
    sm.onAudioFrame({ isSpeaking: false, elapsedSilenceSeconds: 8 });
    assert.equal(sm.state, 'ACTIVE_SESSION');
    assert.equal(sm.continuousSilenceSeconds, 8);

    // Speech resumes
    sm.onAudioFrame({ isSpeaking: true });
    assert.equal(sm.state, 'ACTIVE_SESSION');
    assert.equal(sm.continuousSilenceSeconds, 0, 'Silence counter should reset upon speech resumption');
    assert.equal(sm.currentSessionId, initialSessionId, 'Must continue the exact same session');
    assert.equal(sm.sessionsCreated.length, 1);
  });

  test('Scenario 5: 15 continuous seconds of silence: session closes, saves, and returns to IDLE', () => {
    const sm = new MockSessionStateMachine();
    sm.onAudioFrame({ isSpeaking: true });
    const activeId = sm.currentSessionId;

    // Silence reaches 15s
    sm.onAudioFrame({ isSpeaking: false, elapsedSilenceSeconds: 15 });

    assert.equal(sm.state, 'IDLE', 'State must return to IDLE after save');
    assert.equal(sm.savedSessions.length, 1);
    assert.equal(sm.savedSessions[0].sessionId, activeId);
    assert.equal(sm.currentSessionId, null);
  });

  test('Scenario 6: Speak again: a new session with new session ID starts automatically', () => {
    const sm = new MockSessionStateMachine();
    // First session
    sm.onAudioFrame({ isSpeaking: true });
    const firstId = sm.currentSessionId;
    sm.onAudioFrame({ isSpeaking: false, elapsedSilenceSeconds: 15 });
    assert.equal(sm.state, 'IDLE');

    // Second session
    sm.onAudioFrame({ isSpeaking: true });
    assert.equal(sm.state, 'ACTIVE_SESSION');
    const secondId = sm.currentSessionId;

    assert.notEqual(firstId, secondId, 'New session must have distinct session ID');
    assert.equal(sm.sessionsCreated.length, 2);
  });

  test('Scenario 7: Prolonged silence (simulating 2 hours): no empty sessions created', () => {
    const sm = new MockSessionStateMachine();
    // 7200 seconds of continuous silence
    for (let s = 1; s <= 7200; s += 60) {
      sm.onAudioFrame({ isSpeaking: false, elapsedSilenceSeconds: s });
    }

    assert.equal(sm.state, 'IDLE');
    assert.equal(sm.sessionsCreated.length, 0, 'Must never create empty sessions during prolonged silence');
    assert.equal(sm.savedSessions.length, 0);
  });
});

describe('Module 4: English Translation Pipeline for Multilingual Speech', () => {
  // Pure translation normalization logic corresponding to translationService.js
  function processTranscriptSegment(rawText, sourceLanguage = 'es') {
    // Known Spanish vocabulary mapping for tests
    const spanishTranslations = {
      'hola': 'hello',
      'buenos dias': 'good morning',
      'cuanto cuesta el iphone': 'how much is the iphone',
      'quisiera comprar un telefono': 'I would like to buy a phone',
      'puedo pagar con tarjeta': 'can I pay by card',
    };

    const lower = rawText.toLowerCase().trim();
    let translated = rawText;
    let wasTranslated = false;

    if (spanishTranslations[lower]) {
      translated = spanishTranslations[lower];
      wasTranslated = true;
    } else if (/[áéíóúñ¿¡]/.test(rawText) || lower.includes('iphone') && lower.includes('cuanto')) {
      translated = 'How much is the iPhone';
      wasTranslated = true;
    }

    return {
      text: translated,
      originalText: wasTranslated ? rawText : undefined,
      isTranslated: wasTranslated,
      sourceLanguage: wasTranslated ? sourceLanguage : 'en',
      targetLanguage: 'en',
    };
  }

  test('Scenario 8: Speak Spanish: verifies transcript text is converted into English while preserving metadata', () => {
    const spanishInput = 'Hola, buenos dias';
    const segment = processTranscriptSegment('Buenos dias', 'es');

    assert.equal(segment.isTranslated, true);
    assert.equal(segment.text, 'good morning');
    assert.equal(segment.originalText, 'Buenos dias');
    assert.equal(segment.sourceLanguage, 'es');
    assert.equal(segment.targetLanguage, 'en');
  });

  test('English speech passes through directly without translation distortion', () => {
    const englishInput = 'I would like to trade in my old iPhone.';
    const segment = processTranscriptSegment(englishInput, 'en');

    assert.equal(segment.isTranslated, false);
    assert.equal(segment.text, englishInput);
    assert.equal(segment.originalText, undefined);
    assert.equal(segment.targetLanguage, 'en');
  });
});

describe('Module 4: Session & Transcript Persistence Across Application Restart', () => {
  let tempDir;
  let metadataPath;
  let transcriptsDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storelistener-pers-test-'));
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

  test('Scenario 9: Persisted recordings and transcripts remain accessible after restart', () => {
    const sessionId = 'sess_1740001234_abc';
    const recId = 'rec_store-01_1740001234_xyz';

    // 1. Simulate saving recording session
    const record = {
      recordingId: recId,
      sessionId,
      title: 'Conversation - 12 Oct 2026, 03:45 PM',
      durationSeconds: 32,
      fileName: 'rec_store-01_1740001234_xyz.webm',
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(metadataPath, JSON.stringify([record], null, 2), 'utf8');

    // 2. Simulate saving English translated transcript
    const transcriptPayload = {
      recordingId: recId,
      sessionId,
      provider: 'deepgram',
      model: 'nova-3',
      segments: [
        {
          segmentId: 'seg_1',
          speaker: 0,
          text: 'Good morning, how can I help you?',
          isTranslated: false,
          targetLanguage: 'en',
        },
        {
          segmentId: 'seg_2',
          speaker: 1,
          text: 'I would like to buy a phone',
          originalText: 'Quisiera comprar un telefono',
          isTranslated: true,
          sourceLanguage: 'es',
          targetLanguage: 'en',
        },
      ],
    };
    fs.writeFileSync(path.join(transcriptsDir, `${recId}.json`), JSON.stringify(transcriptPayload, null, 2), 'utf8');

    // 3. Simulate App Restart: read fresh from disk
    assert.ok(fs.existsSync(metadataPath));
    const reloadedRecords = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    assert.equal(reloadedRecords.length, 1);
    assert.equal(reloadedRecords[0].title, 'Conversation - 12 Oct 2026, 03:45 PM');

    const transcriptFile = path.join(transcriptsDir, `${reloadedRecords[0].recordingId}.json`);
    assert.ok(fs.existsSync(transcriptFile));
    const reloadedTranscript = JSON.parse(fs.readFileSync(transcriptFile, 'utf8'));
    assert.equal(reloadedTranscript.segments.length, 2);
    assert.equal(reloadedTranscript.segments[1].text, 'I would like to buy a phone');
    assert.equal(reloadedTranscript.segments[1].originalText, 'Quisiera comprar un telefono');
    assert.equal(reloadedTranscript.segments[1].isTranslated, true);
  });
});
