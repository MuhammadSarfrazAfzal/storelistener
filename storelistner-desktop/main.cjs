/**
 * Storelistener Desktop — Secure Electron Main Process (Module 3)
 * File: main.cjs
 */

const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow = null;
let isRecordingActive = false;

// Store development configuration (3 iPhone stores)
const STORE_CONFIG = [
  { id: 'store-01', name: 'iPhone Store 01', location: 'Downtown Flagship', terminal: 'POS Counter 01' },
  { id: 'store-02', name: 'iPhone Store 02', location: 'Westfield Galleria', terminal: 'POS Counter 02' },
  { id: 'store-03', name: 'iPhone Store 03', location: 'Metropolitan Mall', terminal: 'POS Counter 03' },
];

/**
 * Ensures the dedicated recordings directory and metadata file exist
 */
function getRecordingsDir() {
  const recordingsDir = path.join(app.getPath('userData'), 'recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }
  return recordingsDir;
}

function getMetadataPath() {
  return path.join(getRecordingsDir(), 'metadata.json');
}

function readMetadata() {
  const metaPath = getMetadataPath();
  if (!fs.existsSync(metaPath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(metaPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[Storage] Failed to read metadata.json, resetting to empty array:', err.message);
    return [];
  }
}

function writeMetadata(records) {
  const metaPath = getMetadataPath();
  fs.writeFileSync(metaPath, JSON.stringify(records, null, 2), 'utf8');
}

/**
 * Creates the primary secure application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#F8FAFC',
    title: 'Storelistener Desktop — Retail Conversation Recorder',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Forward renderer console messages to terminal
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Renderer Load Failed] code=${errorCode}: ${errorDescription}`);
  });

  // Load production bundle from dist or fallback to index.html
  const distPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5174').catch(() => {
      mainWindow.loadFile(path.join(__dirname, 'index.html'));
    });
  }

  // Intercept window close when recording is in progress to prevent data loss
  mainWindow.on('close', (e) => {
    if (isRecordingActive) {
      e.preventDefault();
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: ['Cancel and Keep Recording', 'Discard and Exit'],
        defaultId: 0,
        cancelId: 0,
        title: 'Active Recording in Progress',
        message: 'A customer conversation is currently being recorded.',
        detail: 'Closing the application now will terminate the active recording session. Are you sure you want to exit?',
      });

      if (choice === 1) {
        isRecordingActive = false;
        mainWindow.destroy();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// IPC Handlers — Strictly Scoped & Validated
// ---------------------------------------------------------------------------

// 1. Get Store Configurations
ipcMain.handle('app:getStores', async () => {
  return STORE_CONFIG;
});

// 2. Get Safe Storage Directory (Display string only)
ipcMain.handle('app:getStorageDirectory', async () => {
  return getRecordingsDir();
});

// 3. Track Active Recording State
ipcMain.on('recording:stateChanged', (event, active) => {
  isRecordingActive = Boolean(active);
});

// 4. Save Recording
ipcMain.handle('recording:save', async (event, payload) => {
  try {
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
    if (mimeType.includes('mp4')) extension = 'mp4';

    const cleanStoreId = String(storeId).replace(/[^a-zA-Z0-9-_]/g, '');
    const randId = crypto.randomBytes(4).toString('hex');
    const timestamp = Date.now();
    const fileName = `rec_${cleanStoreId}_${timestamp}_${randId}.${extension}`;
    const filePath = path.join(getRecordingsDir(), fileName);

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const fileSizeBytes = buffer.length;
    const recordingId = `rec_${timestamp}_${randId}`;

    const newRecord = {
      recordingId,
      storeId,
      title: String(title).slice(0, 100),
      startedAt,
      endedAt,
      durationSeconds: Math.max(0, Math.round(Number(durationSeconds) || 0)),
      fileName,
      mimeType,
      fileSizeBytes,
      savedAt: new Date().toISOString(),
    };

    const records = readMetadata();
    records.unshift(newRecord);
    writeMetadata(records);

    return { success: true, record: newRecord };
  } catch (err) {
    console.error('[Storage Error] Failed to save recording:', err);
    return { success: false, error: err.message };
  }
});

// 5. List Recordings
ipcMain.handle('recording:list', async () => {
  try {
    const records = readMetadata();
    const recordingsDir = getRecordingsDir();

    const verified = records.filter((r) => {
      const fullPath = path.join(recordingsDir, r.fileName);
      return fs.existsSync(fullPath);
    });

    if (verified.length !== records.length) {
      writeMetadata(verified);
    }

    return { success: true, records: verified };
  } catch (err) {
    return { success: false, error: err.message, records: [] };
  }
});

// 6. Delete Recording
ipcMain.handle('recording:delete', async (event, recordingId) => {
  try {
    if (!recordingId || typeof recordingId !== 'string') {
      throw new Error('Invalid recordingId provided.');
    }

    const records = readMetadata();
    const target = records.find((r) => r.recordingId === recordingId);
    if (!target) {
      throw new Error(`Recording record ${recordingId} not found.`);
    }

    const recordingsDir = getRecordingsDir();
    const filePath = path.join(recordingsDir, target.fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Also delete transcript file if exists
    const cleanId = recordingId.replace(/[^a-zA-Z0-9-_]/g, '');
    const transPath = path.join(getTranscriptsDir(), `${cleanId}.json`);
    if (fs.existsSync(transPath)) {
      fs.unlinkSync(transPath);
    }

    const remaining = records.filter((r) => r.recordingId !== recordingId);
    writeMetadata(remaining);

    return { success: true, deletedId: recordingId };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 7. Get Audio Data URL for playback
ipcMain.handle('recording:getAudioDataUrl', async (event, recordingId) => {
  try {
    if (!recordingId || typeof recordingId !== 'string') {
      throw new Error('Invalid recordingId provided.');
    }

    const records = readMetadata();
    const target = records.find((r) => r.recordingId === recordingId);
    if (!target) {
      throw new Error(`Recording record ${recordingId} not found.`);
    }

    const recordingsDir = getRecordingsDir();
    const filePath = path.join(recordingsDir, target.fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Recording file ${target.fileName} does not exist on disk.`);
    }

    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${target.mimeType || 'audio/webm'};base64,${base64}`;

    return { success: true, dataUrl, mimeType: target.mimeType };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/**
 * Ensures the dedicated transcripts subdirectory exists
 */
function getTranscriptsDir() {
  const transDir = path.join(getRecordingsDir(), 'transcripts');
  if (!fs.existsSync(transDir)) {
    fs.mkdirSync(transDir, { recursive: true });
  }
  return transDir;
}

// 8. Save Conversation Transcript (Module 4)
ipcMain.handle('recording:saveTranscript', async (event, payload) => {
  try {
    const { recordingId, segments = [] } = payload || {};
    if (!recordingId || typeof recordingId !== 'string') {
      throw new Error('Valid recordingId is required.');
    }

    const cleanId = recordingId.replace(/[^a-zA-Z0-9-_]/g, '');
    const transPath = path.join(getTranscriptsDir(), `${cleanId}.json`);

    const segmentList = Array.isArray(segments) ? segments : [];
    const transcriptPayload = {
      recordingId: cleanId,
      provider: 'deepgram',
      model: 'nova-3',
      savedAt: new Date().toISOString(),
      segmentCount: segmentList.length,
      segments: segmentList,
    };

    fs.writeFileSync(transPath, JSON.stringify(transcriptPayload, null, 2), 'utf8');

    return {
      success: true,
      count: segmentList.length,
      transcript: transcriptPayload,
      segments: segmentList,
    };
  } catch (err) {
    console.error('[Transcript Storage Error]', err.message);
    return { success: false, error: err.message };
  }
});

// 9. Get Conversation Transcript (Module 4)
ipcMain.handle('recording:getTranscript', async (event, recordingId) => {
  try {
    if (!recordingId || typeof recordingId !== 'string') {
      throw new Error('Valid recordingId is required.');
    }

    const cleanId = recordingId.replace(/[^a-zA-Z0-9-_]/g, '');
    const transPath = path.join(getTranscriptsDir(), `${cleanId}.json`);

    if (!fs.existsSync(transPath)) {
      return { success: false, transcript: null, segments: [] };
    }

    const raw = fs.readFileSync(transPath, 'utf8');
    const parsed = JSON.parse(raw);

    const transcriptObj = Array.isArray(parsed)
      ? {
          recordingId: cleanId,
          provider: 'deepgram',
          model: 'nova-3',
          savedAt: new Date().toISOString(),
          segmentCount: parsed.length,
          segments: parsed,
        }
      : parsed;

    return {
      success: true,
      transcript: transcriptObj,
      segments: transcriptObj.segments || [],
    };
  } catch (err) {
    return { success: false, error: err.message, transcript: null, segments: [] };
  }
});

// ---------------------------------------------------------------------------
// App Lifecycle & Permissions
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media' || permission === 'microphone' || permission === 'audioCapture') {
        return callback(true);
      }
      callback(true);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
      if (permission === 'media' || permission === 'microphone' || permission === 'audioCapture') {
        return true;
      }
      return true;
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
