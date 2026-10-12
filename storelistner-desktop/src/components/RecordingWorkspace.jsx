/**
 * Storelistener Desktop — Recording Workspace Component (Module 4)
 * File: src/components/RecordingWorkspace.jsx
 *
 * Automatic Voice-Activated Session Interface with:
 * - Real-time VAD state machine visualization:
 *   IDLE -> SPEECH_DETECTED -> ACTIVE_SESSION -> 15s SILENCE COUNTDOWN -> SAVE_AND_CLOSE -> IDLE
 * - Silence countdown timer chip
 * - Automatic default session naming
 * - Visible in-store recording notice & consent/privacy safeguard banner
 * - Real-time multilingual speech-to-text transcript panel with English translation
 */

import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  LinearProgress,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import RecordDotIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import WaveformIcon from '@mui/icons-material/GraphicEq';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import HearingIcon from '@mui/icons-material/Hearing';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GTranslateIcon from '@mui/icons-material/GTranslate';

import LiveTranscriptPanel from './LiveTranscriptPanel';

function formatTimer(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function RecordingWorkspace({
  storeName,
  storeTerminal,
  lifecycleState = 'IDLE', // 'IDLE' | 'SPEECH_CANDIDATE' | 'CONFIRMED_SPEECH' | 'ACTIVE_RECORDING' | 'SILENCE_COUNTDOWN' | 'SAVE_AND_CLOSE'
  isSpeaking = false,
  speechProbability = 0,
  silenceCountdown = null, // seconds remaining (1 to 15)
  elapsedSeconds = 0,
  audioLevel = 0, // 0 - 100
  audioDb = -60,
  frequencyData = [],
  sessionTitle = '',
  sessionId = '',
  onForceStopAndSave,
  errorMessage,
  onClearError,
  sttStatus,
  sttError,
  transcriptSegments = [],
  interimText = '',
  permissionState = 'granted',
}) {
  const isIdle = lifecycleState === 'IDLE';
  const isCandidate = lifecycleState === 'SPEECH_CANDIDATE';
  const isConfirmed = lifecycleState === 'CONFIRMED_SPEECH';
  const isActive = lifecycleState === 'ACTIVE_RECORDING' || lifecycleState === 'ACTIVE_SESSION' || lifecycleState === 'SILENCE_COUNTDOWN';
  const isSaving = lifecycleState === 'SAVE_AND_CLOSE';

  // Compute 16 visualizer bars from frequencyData
  const bars = Array.from({ length: 16 }).map((_, index) => {
    if (frequencyData.length > 0) {
      const dataIndex = Math.min(frequencyData.length - 1, Math.floor((index / 16) * frequencyData.length));
      const val = frequencyData[dataIndex] || 0;
      return Math.max(6, Math.round((val / 255) * 48));
    }
    return isSpeaking ? 18 : 6;
  });

  // State Badge Renderer
  const renderStateBadge = () => {
    if (isSaving) {
      return (
        <Chip
          icon={<RecordDotIcon sx={{ fontSize: 12, color: '#DC2626 !important' }} />}
          label="FINALIZING & SAVING SESSION..."
          sx={{
            bgcolor: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.04em',
          }}
        />
      );
    }

    if (silenceCountdown !== null && silenceCountdown > 0) {
      return (
        <Chip
          icon={<AccessTimeIcon sx={{ fontSize: 14, color: '#D97706 !important' }} />}
          label={`SILENCE DETECTED — CLOSING IN ${silenceCountdown}s`}
          sx={{
            bgcolor: '#FFFBEB',
            color: '#B45309',
            border: '1px solid #FDE68A',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.04em',
            animation: 'pulseWarn 1s infinite',
            '@keyframes pulseWarn': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.6 },
              '100%': { opacity: 1 },
            },
          }}
        />
      );
    }

    if (isActive) {
      return (
        <Chip
          icon={
            <RecordDotIcon
              sx={{
                fontSize: 12,
                color: '#DC2626 !important',
                animation: 'pulseRec 1.2s infinite',
                '@keyframes pulseRec': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.3 },
                  '100%': { opacity: 1 },
                },
              }}
            />
          }
          label="ACTIVE RECORDING (SPEECH CONFIRMED)"
          sx={{
            bgcolor: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FCA5A5',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.04em',
          }}
        />
      );
    }

    if (isConfirmed) {
      return (
        <Chip
          icon={<HearingIcon sx={{ fontSize: 14, color: '#16A34A !important' }} />}
          label="HUMAN SPEECH CONFIRMED — STARTING SESSION..."
          sx={{
            bgcolor: '#F0FDF4',
            color: '#15803D',
            border: '1px solid #BBF7D0',
            fontWeight: 700,
            fontSize: '0.75rem',
          }}
        />
      );
    }

    if (isCandidate) {
      return (
        <Chip
          icon={<HearingIcon sx={{ fontSize: 14, color: '#2563EB !important' }} />}
          label={`SPEECH CANDIDATE — EVALUATING VAD (${Math.round(speechProbability * 100)}%)...`}
          sx={{
            bgcolor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
            fontWeight: 700,
            fontSize: '0.75rem',
          }}
        />
      );
    }

    // Default: IDLE Monitoring
    return (
      <Chip
        icon={<HearingIcon sx={{ fontSize: 14, color: '#16A34A !important' }} />}
        label="IDLE — MONITORING MICROPHONE (WAITING FOR SPEECH)"
        sx={{
          bgcolor: '#F0FDF4',
          color: '#15803D',
          border: '1px solid #BBF7D0',
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.03em',
        }}
      />
    );
  };

  return (
    <Card sx={{ bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      {/* 1. Visible Recording Notice & Privacy Safeguard Banner */}
      <Box
        sx={{
          bgcolor: '#F8FAFC',
          px: 3,
          py: 1.5,
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <ShieldOutlinedIcon sx={{ fontSize: 18, color: '#2563EB' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.78125rem' }}>
            <strong>In-Store Recording Notice & Consent Safeguard:</strong> Audio is automatically captured only when active speech is detected. All consultations are recorded for sales training and quality assurance in compliance with store policy.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            icon={<GTranslateIcon sx={{ fontSize: '13px !important', color: '#4F46E5 !important' }} />}
            label="Live English Translation Enabled"
            sx={{
              height: 22,
              bgcolor: '#EEF2FF',
              color: '#4338CA',
              border: '1px solid #C7D2FE',
              fontWeight: 600,
              fontSize: '0.6875rem',
            }}
          />
        </Stack>
      </Box>

      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
        {/* Top Session Metadata Row */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                Counter Audio Recording Session
              </Typography>
              <Chip
                size="small"
                label={storeTerminal}
                sx={{
                  bgcolor: '#F1F5F9',
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.6875rem',
                }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.8125rem' }}>
              Store Assignment: <strong>{storeName}</strong> • {sessionTitle || 'Microphone monitoring active — speak to start'}
            </Typography>
          </Box>

          {/* Real-time State Machine Pill */}
          <Box>{renderStateBadge()}</Box>
        </Stack>

        {/* Permission / Hardware Error Alert */}
        {errorMessage && (
          <Alert severity="error" onClose={onClearError} sx={{ mb: 3, borderRadius: 2, fontSize: '0.8125rem' }}>
            {errorMessage}
          </Alert>
        )}

        {permissionState === 'denied' && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontSize: '0.8125rem' }}>
            <strong>Microphone Access Denied:</strong> Microphone permissions are blocked. Please enable microphone permissions in Windows Settings and restart the app.
          </Alert>
        )}

        {/* Central Display: Session Duration Timer & Live Audio Visualizer */}
        <Box
          sx={{
            p: 3,
            borderRadius: 2.5,
            bgcolor: isActive ? '#FAFAFA' : '#F8FAFC',
            border: '1px solid',
            borderColor: isActive ? '#FECACA' : '#E2E8F0',
            mb: 3,
            transition: 'border-color 0.2s ease',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={3}
          >
            {/* Timer */}
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.05em' }}>
                  SESSION DURATION
                </Typography>
                {isActive && (
                  <Chip
                    size="small"
                    label="Auto Recording"
                    sx={{ height: 18, fontSize: '0.625rem', bgcolor: '#FEE2E2', color: '#991B1B', fontWeight: 700 }}
                  />
                )}
              </Stack>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: { xs: '2.5rem', sm: '3.25rem' },
                  letterSpacing: '-0.02em',
                  color: isActive ? 'error.main' : 'text.secondary',
                  lineHeight: 1.1,
                  mt: 0.5,
                }}
              >
                {formatTimer(elapsedSeconds)}
              </Typography>
            </Box>

            {/* Live Audio Level & Waveform Bars */}
            <Box sx={{ width: { xs: '100%', md: 380 }, textAlign: 'center' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <WaveformIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    MICROPHONE INPUT (VAD ACTIVE)
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: isSpeaking ? '#16A34A' : speechProbability > 0.35 ? '#2563EB' : 'text.secondary' }}>
                  {isSpeaking
                    ? `SPEECH CONFIRMED (p=${speechProbability.toFixed(2)})`
                    : speechProbability >= 0.35
                    ? `ACOUSTIC CANDIDATE (p=${speechProbability.toFixed(2)})`
                    : `${audioDb} dBFS (p=${speechProbability.toFixed(2)})`}
                </Typography>
              </Stack>

              {/* 16-Bar Audio Visualizer */}
              <Box
                sx={{
                  height: 52,
                  bgcolor: '#FFFFFF',
                  borderRadius: 1.5,
                  p: 1,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {bars.map((h, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 8,
                      height: `${h}px`,
                      maxHeight: 44,
                      borderRadius: 1,
                      bgcolor: isSpeaking
                        ? '#16A34A'
                        : audioLevel > 60
                        ? '#2563EB'
                        : audioLevel > 15
                        ? '#60A5FA'
                        : '#CBD5E1',
                      transition: 'height 0.08s ease, background-color 0.15s ease',
                    }}
                  />
                ))}
              </Box>

              {/* Level indicator bar */}
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={audioLevel}
                  color={isSpeaking ? 'success' : audioLevel > 60 ? 'primary' : 'inherit'}
                  sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0' }}
                />
              </Box>
            </Box>
          </Stack>
        </Box>

        {/* Action Controls & Session Lifecycle Status */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          {isIdle && (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>
                🎤 <strong>Ready for customer:</strong> Monitoring microphone automatically. Speak naturally to begin a session.
              </Typography>
            </Box>
          )}

          {isActive && (
            <Button
              variant="contained"
              size="large"
              color="error"
              startIcon={<StopIcon />}
              disabled={isSaving}
              onClick={onForceStopAndSave}
              sx={{
                py: 1.25,
                px: 3.5,
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: '#B91C1C',
                '&:hover': { bgcolor: '#991B1B' },
              }}
            >
              {isSaving ? 'Finalizing Audio...' : 'Save & Close Session Now'}
            </Button>
          )}
        </Stack>

        {/* Live Speech-to-Text Transcript Panel (Module 4) */}
        <LiveTranscriptPanel
          sessionId={sessionId}
          recordingState={isActive ? 'recording' : isSaving ? 'saving' : 'idle'}
          sttStatus={sttStatus}
          sttError={sttError}
          transcriptSegments={transcriptSegments}
          interimText={interimText}
        />
      </CardContent>
    </Card>
  );
}
