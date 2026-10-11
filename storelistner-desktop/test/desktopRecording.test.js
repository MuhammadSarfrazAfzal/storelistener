/**
 * Storelistener Desktop — Unit & IPC Storage Test Suite (Module 3)
 * File: test/desktopRecording.test.js
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { CONFIGURED_STORES, DEFAULT_STORE_ID } from '../src/config/stores.js';

describe('Module 3: Store Configuration', () => {
  test('Contains exactly 3 configured iPhone stores', () => {
    assert.equal(CONFIGURED_STORES.length, 3);
    const ids = CONFIGURED_STORES.map((s) => s.id);
    assert.deepEqual(ids, ['store-01', 'store-02', 'store-03']);
  });

  test('Has valid default store identifier', () => {
    assert.equal(DEFAULT_STORE_ID, 'store-01');
    const defaultStore = CONFIGURED_STORES.find((s) => s.id === DEFAULT_STORE_ID);
    assert.ok(defaultStore);
    assert.equal(defaultStore.name, 'iPhone Store 01');
  });
});

describe('Module 3: Secure Local Recording Storage & IPC Logic', () => {
  let tempDir;
  let recordingsDir;
  let metadataPath;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storelistener-test-'));
    recordingsDir = path.join(tempDir, 'recordings');
    fs.mkdirSync(recordingsDir, { recursive: true });
    metadataPath = path.join(recordingsDir, 'metadata.json');
  });

  after(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function saveRecordingMock(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid recording payload: object expected.');
    }
    const {
      storeId = 'store-01',
      title = 'Customer Consultation',
      startedAt = new Date().toISOString(),
      endedAt = new Date().toISOString(),
      durationSeconds = 0,
      mimeType = 'audio/webm',
      base64Data,
    } = payload;

    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Recording audio data is missing or invalid base64.');
    }

    let extension = 'webm';
    if (mimeType.includes('ogg')) extension = 'ogg';
    if (mimeType.includes('wav')) extension = 'wav';

    const cleanStoreId = String(storeId).replace(/[^a-zA-Z0-9-_]/g, '');
    const randId = crypto.randomBytes(4).toString('hex');
    const timestamp = Date.now();
    const fileName = `rec_${cleanStoreId}_${timestamp}_${randId}.${extension}`;
    const filePath = path.join(recordingsDir, fileName);

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const newRecord = {
      recordingId: `rec_${timestamp}_${randId}`,
      storeId,
      title: String(title).slice(0, 100),
      startedAt,
      endedAt,
      durationSeconds: Math.max(0, Math.round(Number(durationSeconds) || 0)),
      fileName,
      mimeType,
      fileSizeBytes: buffer.length,
      savedAt: new Date().toISOString(),
    };

    let records = [];
    if (fs.existsSync(metadataPath)) {
      records = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }
    records.unshift(newRecord);
    fs.writeFileSync(metadataPath, JSON.stringify(records, null, 2), 'utf8');

    return { success: true, record: newRecord };
  }

  function listRecordingsMock() {
    if (!fs.existsSync(metadataPath)) return { success: true, records: [] };
    const records = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const verified = records.filter((r) => fs.existsSync(path.join(recordingsDir, r.fileName)));
    return { success: true, records: verified };
  }

  function deleteRecordingMock(recId) {
    if (!recId) throw new Error('Invalid recordingId provided.');
    if (!fs.existsSync(metadataPath)) throw new Error('Metadata not found');
    const records = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const target = records.find((r) => r.recordingId === recId);
    if (!target) throw new Error('Record not found');

    const filePath = path.join(recordingsDir, target.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    const remaining = records.filter((r) => r.recordingId !== recId);
    fs.writeFileSync(metadataPath, JSON.stringify(remaining, null, 2), 'utf8');
    return { success: true, deletedId: recId };
  }

  test('Rejects invalid payload without base64 audio data', () => {
    assert.throws(() => {
      saveRecordingMock({ storeId: 'store-01', title: 'Test' });
    }, /audio data is missing/);
  });

  test('Saves audio buffer to dedicated directory and updates metadata.json', () => {
    const fakeAudioBase64 = Buffer.from('RIFF_SAMPLE_AUDIO_DATA_FOR_STORELISTENER').toString('base64');
    const res = saveRecordingMock({
      storeId: 'store-01',
      title: 'iPhone 16 Trade-In Consultation',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 45,
      mimeType: 'audio/webm',
      base64Data: fakeAudioBase64,
    });

    assert.equal(res.success, true);
    assert.ok(res.record.recordingId.startsWith('rec_'));
    assert.equal(res.record.durationSeconds, 45);
    assert.ok(fs.existsSync(path.join(recordingsDir, res.record.fileName)));

    // Verify metadata persistence
    const listRes = listRecordingsMock();
    assert.equal(listRes.records.length, 1);
    assert.equal(listRes.records[0].recordingId, res.record.recordingId);
    assert.equal(listRes.records[0].title, 'iPhone 16 Trade-In Consultation');
  });

  test('Deletes recording file safely and updates metadata.json', () => {
    const listRes = listRecordingsMock();
    assert.equal(listRes.records.length, 1);
    const targetId = listRes.records[0].recordingId;
    const targetFileName = listRes.records[0].fileName;

    const delRes = deleteRecordingMock(targetId);
    assert.equal(delRes.success, true);
    assert.equal(delRes.deletedId, targetId);

    // File must no longer exist on disk
    assert.equal(fs.existsSync(path.join(recordingsDir, targetFileName)), false);

    // Metadata must be empty
    const updatedList = listRecordingsMock();
    assert.equal(updatedList.records.length, 0);
  });
});
