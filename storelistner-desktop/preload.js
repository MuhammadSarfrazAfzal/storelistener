/**
 * Storelistener Desktop — Secure Preload Bridge (Module 3)
 * File: preload.js
 *
 * Implements contextIsolation with a tightly scoped, validated API bridge.
 * Node integration is disabled in the renderer; no raw fs or ipcRenderer is exposed.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Store management
  getStores: () => ipcRenderer.invoke('app:getStores'),

  // Storage path inspection (display only)
  getStorageDirectory: () => ipcRenderer.invoke('app:getStorageDirectory'),

  // Recording operations
  saveRecording: (recordingPayload) => ipcRenderer.invoke('recording:save', recordingPayload),
  listRecordings: () => ipcRenderer.invoke('recording:list'),
  deleteRecording: (recordingId) => ipcRenderer.invoke('recording:delete', recordingId),
  getAudioDataUrl: (recordingId) => ipcRenderer.invoke('recording:getAudioDataUrl', recordingId),

  // Window lifecycle / safety notification
  notifyRecordingState: (isRecording) => ipcRenderer.send('recording:stateChanged', isRecording),
  onActiveRecordingWarning: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('app:activeRecordingWarning', handler);
    return () => ipcRenderer.removeListener('app:activeRecordingWarning', handler);
  },
});
