/**
 * Storelistener Desktop — Recording Workspace Component (Module 3)
 * File: src/components/RecordingWorkspace.jsx
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
} from '@mui/material';
import RecordDotIcon from '@mui/icons-material/FiberManualRecord';
import ResumeIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import WaveformIcon from '@mui/icons-material/GraphicEq';
import MicIcon from '@mui/icons-material/Mic';
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
  recordingState, // 'idle' | 'recording' | 'paused' | 'saving'
  elapsedSeconds,
  audioLevel, // 0 - 100
  audioDb, // e.g. -24
  frequencyData = [],
  sessionTitle,
  onOpenConsentDialog,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  errorMessage,
  onClearError,
  sessionId,
  sttStatus,
  sttError,
  transcriptSegments = [],
  interimText = '',
}) {
  const isRecording = recordingState === 'recording';
  const isPaused = recordingState === 'paused';
  const isSaving = recordingState === 'saving';
  const isIdle = recordingState === 'idle';

  // Compute 16 visualizer bars from frequencyData or resting heights
  const bars = Array.from({ length: 16 }).map((_, index) => {
    if (isRecording && frequencyData.length > 0) {
      const dataIndex = Math.min(frequencyData.length - 1, Math.floor((index / 16) * frequencyData.length));
      const val = frequencyData[dataIndex] || 0;
      return Math.max(8, Math.round((val / 255) * 48));
    }
    if (isPaused) return 10;
    return 6;
  });

  return (
    <Card sx={{ bgcolor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0' }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
        {/* Top Status & Store context row */}
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
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, fontSize: '0.8125rem' }}>
              Store Assignment: <strong>{storeName}</strong> • {sessionTitle || 'No active consultation'}
            </Typography>
          </Box>

          {/* Recording State Pill */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 0.75,
              borderRadius: 20,
              bgcolor: isRecording ? '#FEF2F2' : isPaused ? '#FFFBEB' : '#F1F5F9',
              border: '1px solid',
              borderColor: isRecording ? '#FCA5A5' : isPaused ? '#FDE68A' : '#CBD5E1',
            }}
          >
            <RecordDotIcon
              sx={{
                fontSize: 12,
                color: isRecording ? 'error.main' : isPaused ? 'warning.main' : 'text.disabled',
                animation: isRecording ? 'pulseDot 1.2s infinite' : 'none',
                '@keyframes pulseDot': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.3 },
                  '100%': { opacity: 1 },
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.04em',
                color: isRecording ? 'error.dark' : isPaused ? 'warning.dark' : 'text.secondary',
              }}
            >
              {isRecording
                ? 'RECORDING ACTIVE'
                : isPaused
                ? 'RECORDING PAUSED'
                : isSaving
                ? 'FINALIZING & SAVING...'
                : 'STANDBY — READY'}
            </Typography>
          </Box>
        </Stack>

        {/* Error notification if any */}
        {errorMessage && (
          <Alert
            severity="error"
            onClose={onClearError}
            sx={{ mb: 3, borderRadius: 2, fontSize: '0.8125rem' }}
          >
            {errorMessage}
          </Alert>
        )}

        {/* Central Display: Big Timer & Live Audio Meter */}
        <Box
          sx={{
            p: 3,
            borderRadius: 2.5,
            bgcolor: isRecording ? '#FAFAFA' : '#F8FAFC',
            border: '1px solid',
            borderColor: isRecording ? '#FECACA' : '#E2E8F0',
            mb: 3.5,
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
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.05em' }}>
                SESSION DURATION
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: { xs: '2.5rem', sm: '3.25rem' },
                  letterSpacing: '-0.02em',
                  color: isRecording ? 'error.main' : isPaused ? 'warning.dark' : 'text.primary',
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
                    MICROPHONE INPUT LEVEL
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>
                  {isRecording ? `${audioDb} dBFS (${audioLevel}%)` : isPaused ? 'PAUSED' : 'OFFLINE'}
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
                      bgcolor: isRecording
                        ? audioLevel > 75
                          ? '#EF4444'
                          : audioLevel > 35
                          ? '#2563EB'
                          : '#16A34A'
                        : isPaused
                        ? '#F59E0B'
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
                  value={isRecording ? audioLevel : 0}
                  color={audioLevel > 75 ? 'error' : audioLevel > 40 ? 'primary' : 'success'}
                  sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0' }}
                />
              </Box>
            </Box>
          </Stack>
        </Box>

        {/* Primary Recording Action Controls */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
        >
          {/* Start Recording Button */}
          {isIdle && (
            <Button
              variant="contained"
              size="large"
              color="error"
              startIcon={<MicIcon />}
              onClick={onOpenConsentDialog}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              }}
            >
              Start Customer Recording
            </Button>
          )}

          {/* Pause / Resume Controls */}
          {(isRecording || isPaused) && (
            <>
              {isRecording ? (
                <Button
                  variant="outlined"
                  size="large"
                  color="warning"
                  startIcon={<PauseIcon />}
                  onClick={onPauseRecording}
                  sx={{
                    py: 1.25,
                    px: 3,
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                >
                  Pause Recording
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  startIcon={<ResumeIcon />}
                  onClick={onResumeRecording}
                  sx={{
                    py: 1.25,
                    px: 3,
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                >
                  Resume Recording
                </Button>
              )}

              {/* Stop Recording Button */}
              <Button
                variant="contained"
                size="large"
                color="error"
                startIcon={<StopIcon />}
                disabled={isSaving}
                onClick={onStopRecording}
                sx={{
                  py: 1.25,
                  px: 3.5,
                  fontWeight: 700,
                  borderRadius: 2,
                  bgcolor: '#B91C1C',
                  '&:hover': { bgcolor: '#991B1B' },
                }}
              >
                {isSaving ? 'Finalizing Audio...' : 'Stop & Save Recording'}
              </Button>
            </>
          )}
        </Stack>

        {/* Live Speech-to-Text Transcript Panel (Module 4) */}
        <LiveTranscriptPanel
          sessionId={sessionId}
          recordingState={recordingState}
          sttStatus={sttStatus}
          sttError={sttError}
          transcriptSegments={transcriptSegments}
          interimText={interimText}
        />
      </CardContent>
    </Card>
  );
}
