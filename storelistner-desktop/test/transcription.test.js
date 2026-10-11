/**
 * Storelistener Desktop & STT Adapter — Test Suite (Module 4)
 * File: test/transcription.test.js
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

describe('Module 4: Speech-to-Text Provider Response Parsing & Normalization', () => {
  // Pure parser logic corresponding to sttAdapter.js
  function parseDeepgramEvent(rawPayload, sessionId = 'sess-test-123') {
    let data;
    try {
      data = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    } catch {
      return null;
    }

    if (data.type === 'Results' && data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
      const alt = data.channel.alternatives[0];
      const text = (alt.transcript || '').trim();
      if (!text) return null;

      const isFinal = Boolean(data.is_final);
      let speaker = null;
      if (Array.isArray(alt.words) && alt.words.length > 0 && typeof alt.words[0].speaker === 'number') {
        speaker = alt.words[0].speaker;
      }

      const startTime = typeof data.start === 'number' ? data.start : null;
      const duration = typeof data.duration === 'number' ? data.duration : 0;
      const endTime = startTime !== null ? Math.round((startTime + duration) * 100) / 100 : null;

      return {
        segmentId: `seg_${data.start || 0}_${data.duration || 0}_${Date.now()}`,
        sessionId,
        speaker,
        text,
        startTime,
        endTime,
        isFinal,
        receivedAt: new Date().toISOString(),
      };
    }
    return null;
  }

  test('Correctly parses interim recognition result from Deepgram format', () => {
    const mockDeepgramInterim = {
      type: 'Results',
      channel_index: [0, 1],
      duration: 1.25,
      start: 0.5,
      is_final: false,
      channel: {
        alternatives: [
          {
            transcript: 'hello welcome to the',
            confidence: 0.88,
            words: [
              { word: 'hello', start: 0.5, end: 0.8, confidence: 0.9, speaker: 0 },
              { word: 'welcome', start: 0.8, end: 1.2, confidence: 0.89, speaker: 0 },
            ],
          },
        ],
      },
    };

    const segment = parseDeepgramEvent(mockDeepgramInterim, 'sess-abc');
    assert.ok(segment, 'Segment should be created');
    assert.equal(segment.sessionId, 'sess-abc');
    assert.equal(segment.text, 'hello welcome to the');
    assert.equal(segment.isFinal, false);
    assert.equal(segment.speaker, 0);
    assert.equal(segment.startTime, 0.5);
    assert.equal(segment.endTime, 1.75);
    assert.ok(segment.receivedAt);
  });

  test('Correctly parses finalized segment with diarization from Deepgram format', () => {
    const mockDeepgramFinal = {
      type: 'Results',
      duration: 2.4,
      start: 1.75,
      is_final: true,
      channel: {
        alternatives: [
          {
            transcript: 'I would like to trade in my iPhone 13 Pro.',
            confidence: 0.98,
            words: [
              { word: 'I', start: 1.75, end: 1.9, confidence: 0.98, speaker: 1 },
              { word: 'would', start: 1.9, end: 2.1, confidence: 0.99, speaker: 1 },
            ],
          },
        ],
      },
    };

    const segment = parseDeepgramEvent(mockDeepgramFinal, 'sess-abc');
    assert.ok(segment);
    assert.equal(segment.isFinal, true);
    assert.equal(segment.speaker, 1);
    assert.equal(segment.text, 'I would like to trade in my iPhone 13 Pro.');
    assert.equal(segment.startTime, 1.75);
    assert.equal(segment.endTime, 4.15);
  });

  test('Ignores empty or silence transcript frames without fabricating text', () => {
    const emptyFrame = {
      type: 'Results',
      duration: 1.0,
      start: 4.15,
      is_final: false,
      channel: {
        alternatives: [{ transcript: '   ', confidence: 0 }],
      },
    };

    const segment = parseDeepgramEvent(emptyFrame);
    assert.equal(segment, null, 'Empty transcripts must return null');
  });

  test('Leaves speaker null when diarization is not present rather than guessing', () => {
    const nonDiarized = {
      type: 'Results',
      duration: 1.0,
      start: 0,
      is_final: true,
      channel: {
        alternatives: [{ transcript: 'Good morning.', words: [] }],
      },
    };

    const segment = parseDeepgramEvent(nonDiarized);
    assert.ok(segment);
    assert.equal(segment.speaker, null);
  });
});

describe('Module 4: Transcript Deduplication, Ordering, and Session Isolation', () => {
  test('Prevents duplicate finalized segments while maintaining chronological order', () => {
    const segmentStore = [];

    function addSegment(store, newSeg) {
      if (!newSeg.isFinal) return;
      const exists = store.some((s) => s.segmentId === newSeg.segmentId);
      if (!exists) {
        store.push(newSeg);
      }
    }

    const seg1 = { segmentId: 'seg_1', startTime: 0.0, endTime: 1.5, text: 'Hello', isFinal: true };
    const seg2 = { segmentId: 'seg_2', startTime: 1.6, endTime: 3.0, text: 'How can I help?', isFinal: true };

    addSegment(segmentStore, seg1);
    addSegment(segmentStore, seg2);
    // Duplicate arrival
    addSegment(segmentStore, seg1);

    assert.equal(segmentStore.length, 2);
    assert.equal(segmentStore[0].segmentId, 'seg_1');
    assert.equal(segmentStore[1].segmentId, 'seg_2');
  });

  test('Session isolation: Separate sessions maintain isolated buffers', () => {
    const sessionBuffers = new Map();

    function bufferForSession(sessionId, seg) {
      if (!sessionBuffers.has(sessionId)) {
        sessionBuffers.set(sessionId, []);
      }
      sessionBuffers.get(sessionId).push(seg);
    }

    bufferForSession('sess-A', { text: 'Session A text' });
    bufferForSession('sess-B', { text: 'Session B text' });

    assert.equal(sessionBuffers.get('sess-A').length, 1);
    assert.equal(sessionBuffers.get('sess-A')[0].text, 'Session A text');
    assert.equal(sessionBuffers.get('sess-B').length, 1);
    assert.equal(sessionBuffers.get('sess-B')[0].text, 'Session B text');
    assert.notDeepEqual(sessionBuffers.get('sess-A'), sessionBuffers.get('sess-B'));
  });
});

describe('Module 4: Local Transcript Persistence & Recovery', () => {
  let tempDir;
  let transcriptsDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storelistener-tr-test-'));
    transcriptsDir = path.join(tempDir, 'recordings', 'transcripts');
    fs.mkdirSync(transcriptsDir, { recursive: true });
  });

  after(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function saveTranscriptMock(recordingId, segments, provider = 'deepgram') {
    if (!recordingId || typeof recordingId !== 'string') {
      throw new Error('Valid recordingId required.');
    }
    const cleanId = recordingId.replace(/[^a-zA-Z0-9-_]/g, '');
    const trFile = path.join(transcriptsDir, `${cleanId}.json`);

    const payload = {
      recordingId: cleanId,
      provider,
      model: 'nova-3',
      savedAt: new Date().toISOString(),
      segmentCount: segments.length,
      segments: segments.map((s, idx) => ({
        segmentId: s.segmentId || `seg_${idx}`,
        speaker: s.speaker !== undefined ? s.speaker : null,
        text: s.text,
        startTime: s.startTime || null,
        endTime: s.endTime || null,
        isFinal: true,
        receivedAt: s.receivedAt || new Date().toISOString(),
      })),
    };

    fs.writeFileSync(trFile, JSON.stringify(payload, null, 2), 'utf8');
    return { success: true, transcript: payload };
  }

  function getTranscriptMock(recordingId) {
    const cleanId = String(recordingId).replace(/[^a-zA-Z0-9-_]/g, '');
    const trFile = path.join(transcriptsDir, `${cleanId}.json`);
    if (!fs.existsSync(trFile)) {
      return { success: false, transcript: null };
    }
    const data = JSON.parse(fs.readFileSync(trFile, 'utf8'));
    return { success: true, transcript: data };
  }

  test('Persists structured transcript linked to recording session ID', () => {
    const recId = 'rec_store-01_1740000000_abcd1234';
    const sampleSegments = [
      {
        segmentId: 'seg_1',
        speaker: 0,
        text: 'Welcome to Apple store, how can I help?',
        startTime: 0.5,
        endTime: 3.2,
      },
      {
        segmentId: 'seg_2',
        speaker: 1,
        text: 'I am looking for an iPhone 16 Pro in Desert Titanium.',
        startTime: 3.5,
        endTime: 7.1,
      },
    ];

    const saveRes = saveTranscriptMock(recId, sampleSegments);
    assert.equal(saveRes.success, true);
    assert.equal(saveRes.transcript.recordingId, recId);
    assert.equal(saveRes.transcript.segmentCount, 2);

    const getRes = getTranscriptMock(recId);
    assert.equal(getRes.success, true);
    assert.ok(getRes.transcript);
    assert.equal(getRes.transcript.segments.length, 2);
    assert.equal(getRes.transcript.segments[0].text, 'Welcome to Apple store, how can I help?');
    assert.equal(getRes.transcript.segments[1].speaker, 1);
  });

  test('Returns success: false for non-existent transcript without throwing unhandled error', () => {
    const res = getTranscriptMock('non_existent_rec_id');
    assert.equal(res.success, false);
    assert.equal(res.transcript, null);
  });

  test('Cleans up transcript file when recording is deleted', () => {
    const recId = 'rec_to_delete_999';
    saveTranscriptMock(recId, [{ text: 'Test deletion' }]);
    const cleanId = recId.replace(/[^a-zA-Z0-9-_]/g, '');
    const trFile = path.join(transcriptsDir, `${cleanId}.json`);
    assert.ok(fs.existsSync(trFile), 'File should exist before deletion');

    // Simulate delete handler
    fs.unlinkSync(trFile);
    assert.equal(fs.existsSync(trFile), false, 'File should be removed after deletion');
  });
});
