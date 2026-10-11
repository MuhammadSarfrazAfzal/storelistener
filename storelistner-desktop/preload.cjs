/**
 * Storelistener Desktop — Secure Preload Bridge (Module 3)
 * File: preload.cjs
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getStores: () => ipcRenderer.invoke('app:getStores'),
  getStorageDirectory: () => ipcRenderer.invoke('app:getStorageDirectory'),
  saveRecording: (recordingPayload) => ipcRenderer.invoke('recording:save', recordingPayload),
  listRecordings: () => ipcRenderer.invoke('recording:list'),
  deleteRecording: (recordingId) => ipcRenderer.invoke('recording:delete', recordingId),
  getAudioDataUrl: (recordingId) => ipcRenderer.invoke('recording:getAudioDataUrl', recordingId),
  saveTranscript: (recordingId, segments) => ipcRenderer.invoke('recording:saveTranscript', { recordingId, segments }),
  getTranscript: (recordingId) => ipcRenderer.invoke('recording:getTranscript', recordingId),
  notifyRecordingState: (isRecording) => ipcRenderer.send('recording:stateChanged', isRecording),
  onActiveRecordingWarning: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('app:activeRecordingWarning', handler);
    return () => ipcRenderer.removeListener('app:activeRecordingWarning', handler);
  },
});
