/**
 * Storelistener Desktop — Main Application Component (Module 4)
 * File: src/App.jsx
 *
 * Implements:
 * - Automatic microphone monitoring on application launch
 * - Real-time Voice Activity Detection (VAD)
 * - State machine lifecycle:
 *   IDLE -> SPEECH_DETECTED -> ACTIVE_SESSION -> 15s SILENCE -> SAVE_AND_CLOSE -> IDLE
 * - No empty sessions during prolonged silence
 * - Automatic session ID & default title generation (e.g. Conversation - 12 Oct 2026, 03:45 PM)
 * - Real-time English translation for multilingual speech
 * - Safe audio and transcript persistence linked to session ID
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Snackbar,
  Alert,
} from '@mui/material';

import DesktopHeader from './components/DesktopHeader';
import RecordingWorkspace from './components/RecordingWorkspace';
import SavedRecordingsLibrary from './components/SavedRecordingsLibrary';

import audioCaptureService from './services/audioCaptureService';
import transcriptionClient from './services/transcriptionClient';
import { CONFIGURED_STORES, DEFAULT_STORE_ID } from './config/stores';

/**
 * Generates formatted default session title: e.g. "Conversation - 12 Oct 2026, 03:45 PM"
 */
function generateDefaultSessionTitle() {
  const now = new Date();
  const day = now.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `Conversation - ${day} ${month} ${year}, ${timeStr}`;
}

export default function App() {
  const [stores, setStores] = useState(CONFIGURED_STORES);
  const [selectedStoreId, setSelectedStoreId] = useState(DEFAULT_STORE_ID);

  const [microphones, setMicrophones] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState('');
  const [permissionState, setPermissionState] = useState('prompt');
  const [storageDirectory, setStorageDirectory] = useState('');

  // State Machine: 'IDLE' | 'SPEECH_DETECTED' | 'ACTIVE_SESSION' | 'SILENCE_COUNTDOWN' | 'SAVE_AND_CLOSE'
  const [lifecycleState, setLifecycleState] = useState('IDLE');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [silenceCountdown, setSilenceCountdown] = useState(null);

  const [speechProbability, setSpeechProbability] = useState(0);

  const [sessionTitle, setSessionTitle] = useState('');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [audioLevel, setAudioLevel] = useState(0);
  const [audioDb, setAudioDb] = useState(-60);
  const [frequencyData, setFrequencyData] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  const [savedRecordings, setSavedRecordings] = useState([]);

  // Real-Time Speech-to-Text State
  const [sttStatus, setSttStatus] = useState('idle');
  const [sttError, setSttError] = useState(null);
  const [transcriptSegments, setTranscriptSegments] = useState([]);
  const [interimText, setInterimText] = useState('');

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  // References for async callbacks to prevent closure stale states
  const lifecycleStateRef = useRef('IDLE');
  const transcriptSegmentsRef = useRef([]);
  const interimTextRef = useRef('');
  const timerRef = useRef(null);
  const activeSessionIdRef = useRef('');
  const sessionTitleRef = useRef('');

  useEffect(() => {
    lifecycleStateRef.current = lifecycleState;
  }, [lifecycleState]);

  useEffect(() => {
    transcriptSegmentsRef.current = transcriptSegments;
  }, [transcriptSegments]);

  useEffect(() => {
    interimTextRef.current = interimText;
  }, [interimText]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    sessionTitleRef.current = sessionTitle;
  }, [sessionTitle]);

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

  // Forward declarations for state machine handlers
  const handleStopAndSave = useCallback(async () => {
    if (lifecycleStateRef.current === 'SAVE_AND_CLOSE' || lifecycleStateRef.current === 'IDLE') {
      return;
    }

    console.log('⏹️ [Session Lifecycle] 15s continuous silence confirmed. Finalizing & Saving session...');
    setLifecycleState('SAVE_AND_CLOSE');
    setSilenceCountdown(null);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Convert any pending interim text into a confirmed segment so spoken words are never lost
    if (interimTextRef.current && interimTextRef.current.trim()) {
      const promotedSegment = {
        segmentId: `seg_interim_${Date.now()}`,
        sessionId: activeSessionIdRef.current,
        speaker: 'Speaker',
        text: interimTextRef.current.trim(),
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
      const recordingData = await audioCaptureService.stopActiveSession();

      // Clear recording guard in main process
      if (window.electronAPI && window.electronAPI.notifyRecordingState) {
        window.electronAPI.notifyRecordingState(false);
      }

      if (recordingData && recordingData.base64Data) {
        // Save locally via IPC
        if (window.electronAPI && window.electronAPI.saveRecording) {
          const payload = {
            storeId: selectedStoreId,
            title: sessionTitleRef.current || generateDefaultSessionTitle(),
            startedAt: recordingData.startedAt,
            endedAt: recordingData.endedAt,
            durationSeconds: recordingData.durationSeconds,
            mimeType: recordingData.mimeType,
            base64Data: recordingData.base64Data,
          };

          const result = await window.electronAPI.saveRecording(payload);
          if (result && result.success) {
            const recId = result.record.recordingId;

            // Persist English transcript linked to recording ID
            if (window.electronAPI && window.electronAPI.saveTranscript) {
              try {
                await window.electronAPI.saveTranscript(recId, transcriptSegmentsRef.current || []);
              } catch (trErr) {
                console.warn('Could not persist transcript to disk:', trErr);
              }
            }

            setToast({
              open: true,
              message: `Conversation session auto-saved (${result.record.fileName}). Monitoring resumed.`,
              severity: 'success',
            });
            await loadRecordings();
          } else {
            console.error('Save failed in main process:', result?.error);
          }
        }
      }
    } catch (err) {
      console.error('Stop recording error:', err);
      setErrorMessage(`Failed to finalize recording: ${err.message}`);
    } finally {
      // Transition cleanly back to IDLE state
      setLifecycleState('IDLE');
      setActiveSessionId('');
      setSessionTitle('');
      setTranscriptSegments([]);
      transcriptSegmentsRef.current = [];
      setInterimText('');
      setElapsedSeconds(0);
      setSilenceCountdown(null);
    }
  }, [selectedStoreId]);

  const startAutoSession = useCallback(() => {
    if (lifecycleStateRef.current === 'ACTIVE_RECORDING' || lifecycleStateRef.current === 'SAVE_AND_CLOSE') {
      return;
    }

    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTitle = generateDefaultSessionTitle();

    console.log(`🎙️ [Session Lifecycle] Confirmed human speech! Starting session: ${newSessionId} ("${newTitle}")`);

    setActiveSessionId(newSessionId);
    setSessionTitle(newTitle);
    setTranscriptSegments([]);
    transcriptSegmentsRef.current = [];
    setInterimText('');
    setSttError(null);
    setElapsedSeconds(0);
    setSilenceCountdown(null);
    setLifecycleState('ACTIVE_RECORDING');

    // 1. Start STT streaming on backend socket gateway
    transcriptionClient.startSession({
      sessionId: newSessionId,
      storeId: selectedStoreId,
      title: newTitle,
      model: 'nova-3',
      language: 'multi',
      targetLanguage: 'en',
    });

    // 2. Start active audio capture session on existing warm microphone stream
    try {
      audioCaptureService.startActiveSession({
        onAudioChunk: (chunk) => {
          transcriptionClient.sendAudioChunk(chunk);
        },
      });

      // Inform Electron main process to guard window closing
      if (window.electronAPI && window.electronAPI.notifyRecordingState) {
        window.electronAPI.notifyRecordingState(true);
      }

      // Start elapsed seconds timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      setToast({
        open: true,
        message: `Human speech confirmed. Auto-recording "${newTitle}".`,
        severity: 'info',
      });
    } catch (err) {
      console.error('[Session Lifecycle] Failed to start active audio capture:', err);
      setErrorMessage(`Failed to start recording: ${err.message}`);
      setLifecycleState('IDLE');
    }
  }, [selectedStoreId]);

  // Start continuous microphone monitoring on startup or mic change
  const startMonitoringForMic = useCallback(async (micId) => {
    try {
      await audioCaptureService.startMonitoring({
        deviceId: micId,
        onAudioLevel: (level, db, freq, meta) => {
          setAudioLevel(level);
          setAudioDb(db);
          setFrequencyData(freq);
          if (meta) {
            setIsSpeaking(meta.isSpeech);
            setSpeechProbability(meta.speechProbability);
          }
        },
        onLifecycleChange: (state) => {
          // Sync lifecycle state with VAD state machine
          if (state === 'SPEECH_CANDIDATE' && lifecycleStateRef.current === 'IDLE') {
            setLifecycleState('SPEECH_CANDIDATE');
          } else if (state === 'IDLE' && lifecycleStateRef.current === 'SPEECH_CANDIDATE') {
            setLifecycleState('IDLE');
          }
        },
        onConfirmedSpeech: () => {
          startAutoSession();
        },
        onSilenceCountdown: (remaining) => {
          setSilenceCountdown(remaining);
        },
        onContinuousSilence: () => {
          handleStopAndSave();
        },
      });
      setPermissionState('granted');
      setErrorMessage(null);
    } catch (err) {
      console.warn('Microphone monitoring initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Microphone access was denied. Please grant microphone permissions in Windows Settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No microphone device was detected. Please connect an audio input device.');
      }
    }
  }, [startAutoSession, handleStopAndSave]);

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

      // 3. Enumerate microphones & initialize automatic monitoring
      try {
        const mics = await audioCaptureService.getMicrophoneDevices();
        setMicrophones(mics);
        const micToUse = mics.length > 0 ? mics[0].deviceId : '';
        if (micToUse) {
          setSelectedMicId(micToUse);
        }
        const perm = await audioCaptureService.checkPermissionStatus();
        setPermissionState(perm);

        // Start automatic microphone monitoring immediately on app launch!
        await startMonitoringForMic(micToUse);
      } catch (e) {
        console.warn('Could not query audio devices initially:', e);
        setErrorMessage('Microphone access is unavailable. Please check connected audio input devices.');
      }

      // 4. Load persisted recordings
      loadRecordings();
    }

    initDesktop();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioCaptureService.cleanup();
    };
  }, [startMonitoringForMic]);

  // Handle switching microphone device
  const handleSelectMic = async (micId) => {
    setSelectedMicId(micId);
    if (lifecycleStateRef.current === 'ACTIVE_SESSION' || lifecycleStateRef.current === 'SILENCE_COUNTDOWN') {
      await handleStopAndSave();
    }
    audioCaptureService.cleanup();
    await startMonitoringForMic(micId);
  };

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
        onSelectMic={handleSelectMic}
        permissionState={permissionState}
        isRecording={lifecycleState !== 'IDLE'}
        storageDirectory={storageDirectory}
      />

      {/* 2. Main Workspace */}
      <Container maxWidth="lg" sx={{ py: 3.5, flex: 1 }}>
        <RecordingWorkspace
          storeName={currentStore.name}
          storeTerminal={currentStore.terminal || 'POS Counter 01'}
          lifecycleState={lifecycleState}
          isSpeaking={isSpeaking}
          speechProbability={speechProbability}
          silenceCountdown={silenceCountdown}
          elapsedSeconds={elapsedSeconds}
          audioLevel={audioLevel}
          audioDb={audioDb}
          frequencyData={frequencyData}
          sessionTitle={sessionTitle}
          sessionId={activeSessionId}
          onForceStopAndSave={handleStopAndSave}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
          sttStatus={sttStatus}
          sttError={sttError}
          transcriptSegments={transcriptSegments}
          interimText={interimText}
          permissionState={permissionState}
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
