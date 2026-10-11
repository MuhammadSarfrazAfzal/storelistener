/**
 * Storelistener Desktop — Main Application Component (Module 3)
 * File: src/App.jsx
 */

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Snackbar,
  Alert,
} from '@mui/material';

import DesktopHeader from './components/DesktopHeader';
import RecordingWorkspace from './components/RecordingWorkspace';
import ConsentDialog from './components/ConsentDialog';
import SavedRecordingsLibrary from './components/SavedRecordingsLibrary';

import audioCaptureService from './services/audioCaptureService';
import transcriptionClient from './services/transcriptionClient';
import { CONFIGURED_STORES, DEFAULT_STORE_ID } from './config/stores';

export default function App() {
  const [stores, setStores] = useState(CONFIGURED_STORES);
  const [selectedStoreId, setSelectedStoreId] = useState(DEFAULT_STORE_ID);

  const [microphones, setMicrophones] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState('');
  const [permissionState, setPermissionState] = useState('prompt');
  const [storageDirectory, setStorageDirectory] = useState('');

  // Recording states: 'idle' | 'recording' | 'paused' | 'saving'
  const [recordingState, setRecordingState] = useState('idle');
  const [sessionTitle, setSessionTitle] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioDb, setAudioDb] = useState(-60);
  const [frequencyData, setFrequencyData] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [savedRecordings, setSavedRecordings] = useState([]);

  // Real-Time Speech-to-Text State (Module 4)
  const [activeSessionId, setActiveSessionId] = useState('');
  const [sttStatus, setSttStatus] = useState('idle');
  const [sttError, setSttError] = useState(null);
  const [transcriptSegments, setTranscriptSegments] = useState([]);
  const [interimText, setInterimText] = useState('');
  const transcriptSegmentsRef = useRef([]);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const timerRef = useRef(null);

  // Synchronize transcript ref
  useEffect(() => {
    transcriptSegmentsRef.current = transcriptSegments;
  }, [transcriptSegments]);

  // Subscribe to backend STT streaming events
  useEffect(() => {
    const handleTranscript = (seg) => {
      if (seg.isFinal) {
        setTranscriptSegments((prev) => {
          const exists = prev.some((s) => s.segmentId === seg.segmentId);
          if (exists) return prev;
          return [...prev, seg];
        });
        setInterimText('');
      } else {
        setInterimText(seg.text || '');
      }
    };

    const handleStatus = ({ status, error }) => {
      setSttStatus(status);
      if (error) setSttError(error);
      else if (status === 'active' || status === 'idle') setSttError(null);
    };

    const handleError = ({ message }) => {
      setSttError(message);
    };

    transcriptionClient.on('transcript', handleTranscript);
    transcriptionClient.on('status', handleStatus);
    transcriptionClient.on('error', handleError);

    transcriptionClient.connect();

    return () => {
      transcriptionClient.off('transcript', handleTranscript);
      transcriptionClient.off('status', handleStatus);
      transcriptionClient.off('error', handleError);
    };
  }, []);

  // Initialize application environment, stores, and recordings
  useEffect(() => {
    async function initDesktop() {
      // 1. Load store configuration from Electron or fallback
      if (window.electronAPI && window.electronAPI.getStores) {
        try {
          const loadedStores = await window.electronAPI.getStores();
          if (Array.isArray(loadedStores) && loadedStores.length > 0) {
            setStores(loadedStores);
          }
        } catch (e) {
          console.warn('Could not load stores from IPC, using default:', e);
        }
      }

      // 2. Load storage path
      if (window.electronAPI && window.electronAPI.getStorageDirectory) {
        try {
          const dir = await window.electronAPI.getStorageDirectory();
          setStorageDirectory(dir);
        } catch (e) {
          console.warn('Could not query storage path:', e);
        }
      }

      // 3. Enumerate microphones & permissions
      try {
        const mics = await audioCaptureService.getMicrophoneDevices();
        setMicrophones(mics);
        if (mics.length > 0) {
          setSelectedMicId(mics[0].deviceId);
        }
        const perm = await audioCaptureService.checkPermissionStatus();
        setPermissionState(perm);
      } catch (e) {
        console.warn('Could not query audio devices initially:', e);
      }

      // 4. Load persisted recordings
      loadRecordings();
    }

    initDesktop();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioCaptureService.cleanup();
    };
  }, []);

  const loadRecordings = async () => {
    if (window.electronAPI && window.electronAPI.listRecordings) {
      try {
        const res = await window.electronAPI.listRecordings();
        if (res && res.success && Array.isArray(res.records)) {
          setSavedRecordings(res.records);
        }
      } catch (err) {
        console.error('Failed to list recordings:', err);
      }
    }
  };

  // Start Recording after Consent Confirmation
  const handleConfirmStart = async (title) => {
    setConsentDialogOpen(false);
    setSessionTitle(title);
    setErrorMessage(null);
    setElapsedSeconds(0);
    setAudioLevel(0);
    setAudioDb(-60);

    // Generate isolated session ID & reset transcript buffers
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveSessionId(newSessionId);
    setTranscriptSegments([]);
    transcriptSegmentsRef.current = [];
    setInterimText('');
    setSttError(null);

    // Start STT stream on backend socket gateway
    transcriptionClient.startSession({
      sessionId: newSessionId,
      storeId: selectedStoreId,
      title: title || 'Customer Consultation',
      model: 'nova-3',
      language: 'en',
    });

    try {
      await audioCaptureService.startRecording({
        deviceId: selectedMicId,
        onAudioLevel: (level, db, freq) => {
          setAudioLevel(level);
          setAudioDb(db);
          setFrequencyData(freq);
        },
        onAudioChunk: (chunk) => {
          // Stream raw audio slice to STT provider via secure backend gateway
          transcriptionClient.sendAudioChunk(chunk);
        },
      });

      setRecordingState('recording');
      setPermissionState('granted');

      // Inform Electron main process to guard window closing
      if (window.electronAPI && window.electronAPI.notifyRecordingState) {
        window.electronAPI.notifyRecordingState(true);
      }

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      setToast({
        open: true,
        message: `Recording started for "${title}". Audio is being captured.`,
        severity: 'info',
      });
    } catch (err) {
      console.error('Start recording failure:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Microphone access was denied. Please grant microphone permissions in Windows Settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No microphone device was detected. Please connect an audio input device.');
      } else {
        setErrorMessage(`Failed to start recording: ${err.message}`);
      }
      setRecordingState('idle');
    }
  };

  // Pause Recording
  const handlePause = () => {
    const success = audioCaptureService.pauseRecording();
    if (success) {
      setRecordingState('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setAudioLevel(0);
      setAudioDb(-60);
    }
  };

  // Resume Recording
  const handleResume = () => {
    const success = audioCaptureService.resumeRecording();
    if (success) {
      setRecordingState('recording');
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  // Stop Recording and Save via IPC
  const handleStop = async () => {
    setRecordingState('saving');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Convert any pending interim text into a confirmed segment so spoken words are never lost
    if (interimText && interimText.trim()) {
      const promotedSegment = {
        segmentId: `seg_interim_${Date.now()}`,
        sessionId: activeSessionId,
        speaker: 'Speaker',
        text: interimText.trim(),
        startTime: null,
        endTime: null,
        isFinal: true,
        receivedAt: new Date().toISOString(),
      };
      setTranscriptSegments((prev) => [...prev, promotedSegment]);
      transcriptSegmentsRef.current = [...transcriptSegmentsRef.current, promotedSegment];
      setInterimText('');
    }

    // Signal STT provider to finalize audio stream
    transcriptionClient.stopSession();

    // Brief flush delay to capture final provider response
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const recordingData = await audioCaptureService.stopRecording();

      // Clear recording guard in main process
      if (window.electronAPI && window.electronAPI.notifyRecordingState) {
        window.electronAPI.notifyRecordingState(false);
      }

      // Save locally via IPC
      if (window.electronAPI && window.electronAPI.saveRecording) {
        const payload = {
          storeId: selectedStoreId,
          title: sessionTitle || 'Customer Consultation',
          startedAt: recordingData.startedAt,
          endedAt: recordingData.endedAt,
          durationSeconds: recordingData.durationSeconds,
          mimeType: recordingData.mimeType,
          base64Data: recordingData.base64Data,
        };

        const result = await window.electronAPI.saveRecording(payload);
        if (result && result.success) {
          const recId = result.record.recordingId;

          // Always persist transcript linked to this recording ID
          if (window.electronAPI && window.electronAPI.saveTranscript) {
            try {
              await window.electronAPI.saveTranscript(recId, transcriptSegmentsRef.current || []);
            } catch (trErr) {
              console.warn('Could not persist transcript to disk:', trErr);
            }
          }

          setToast({
            open: true,
            message: `Recording safely saved to local storage (${result.record.fileName}).`,
            severity: 'success',
          });
          await loadRecordings();
        } else {
          throw new Error(result?.error || 'Save failed in main process.');
        }
      } else {
        setToast({
          open: true,
          message: 'Recording captured (Mock environment: IPC save unavailable).',
          severity: 'warning',
        });
      }
    } catch (err) {
      console.error('Stop recording error:', err);
      setErrorMessage(`Failed to finalize recording: ${err.message}`);
    } finally {
      setRecordingState('idle');
      setAudioLevel(0);
      setAudioDb(-60);
      setFrequencyData([]);
    }
  };

  // Delete recording
  const handleDeleteRecording = async (recId) => {
    if (window.electronAPI && window.electronAPI.deleteRecording) {
      const res = await window.electronAPI.deleteRecording(recId);
      if (res && res.success) {
        setToast({
          open: true,
          message: 'Recording deleted from workstation disk.',
          severity: 'info',
        });
        await loadRecordings();
      } else {
        setToast({
          open: true,
          message: `Delete failed: ${res?.error}`,
          severity: 'error',
        });
      }
    }
  };

  // Load audio data URL for playback
  const handleLoadAudioDataUrl = async (recId) => {
    if (window.electronAPI && window.electronAPI.getAudioDataUrl) {
      const res = await window.electronAPI.getAudioDataUrl(recId);
      if (res && res.success) {
        return res.dataUrl;
      } else {
        setToast({
          open: true,
          message: `Could not load audio: ${res?.error}`,
          severity: 'error',
        });
        return null;
      }
    }
    return null;
  };

  const currentStore = stores.find((s) => s.id === selectedStoreId) || stores[0];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Desktop Header */}
      <DesktopHeader
        stores={stores}
        selectedStoreId={selectedStoreId}
        onSelectStore={(id) => setSelectedStoreId(id)}
        microphones={microphones}
        selectedMicId={selectedMicId}
        onSelectMic={(id) => setSelectedMicId(id)}
        permissionState={permissionState}
        isRecording={recordingState !== 'idle'}
        storageDirectory={storageDirectory}
      />

      {/* 2. Main Workspace */}
      <Container maxWidth="lg" sx={{ py: 3.5, flex: 1 }}>
        <RecordingWorkspace
          storeName={currentStore.name}
          storeTerminal={currentStore.terminal || 'POS Counter 01'}
          recordingState={recordingState}
          elapsedSeconds={elapsedSeconds}
          audioLevel={audioLevel}
          audioDb={audioDb}
          frequencyData={frequencyData}
          sessionTitle={sessionTitle}
          onOpenConsentDialog={() => setConsentDialogOpen(true)}
          onPauseRecording={handlePause}
          onResumeRecording={handleResume}
          onStopRecording={handleStop}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
          sessionId={activeSessionId}
          sttStatus={sttStatus}
          sttError={sttError}
          transcriptSegments={transcriptSegments}
          interimText={interimText}
        />

        {/* 3. Saved Recordings Library */}
        <SavedRecordingsLibrary
          recordings={savedRecordings}
          stores={stores}
          onDeleteRecording={handleDeleteRecording}
          onLoadAudioDataUrl={handleLoadAudioDataUrl}
          onLoadTranscript={async (recId) => {
            if (window.electronAPI && window.electronAPI.getTranscript) {
              const res = await window.electronAPI.getTranscript(recId);
              return res?.success ? res.transcript : null;
            }
            return null;
          }}
        />
      </Container>

      {/* Consent Safeguard Modal */}
      <ConsentDialog
        open={consentDialogOpen}
        onClose={() => setConsentDialogOpen(false)}
        onConfirmStart={handleConfirmStart}
        storeName={currentStore.name}
      />

      {/* Global Feedback Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2, fontWeight: 500, fontSize: '0.8125rem' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
