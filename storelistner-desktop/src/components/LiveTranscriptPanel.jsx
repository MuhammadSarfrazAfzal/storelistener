/**
 * Storelistener Desktop — Live Transcript Panel Component (Module 4)
 * File: src/components/LiveTranscriptPanel.jsx
 *
 * Displays real-time streaming speech-to-text transcript segments
 * with distinct styling for confirmed segments vs. interim recognition results.
 */

import { useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import HearingIcon from '@mui/icons-material/Hearing';
import WaveformIcon from '@mui/icons-material/GraphicEq';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

function formatSeconds(sec) {
  if (sec == null || isNaN(sec)) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function LiveTranscriptPanel({
  sessionId,
  recordingState, // 'idle' | 'recording' | 'paused' | 'saving'
  sttStatus, // 'idle' | 'connecting' | 'active' | 'unconfigured' | 'error' | 'closed'
  sttError,
  transcriptSegments = [],
  interimText = '',
}) {
  const isRecording = recordingState === 'recording';
  const isPaused = recordingState === 'paused';
  const scrollRef = useRef(null);

  // Auto-scroll to latest segment or interim text
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptSegments, interimText]);

  // Determine badge styling based on STT status
  const renderStatusBadge = () => {
    if (sttStatus === 'active' || sttStatus === 'connected' || sttStatus === 'listening') {
      return (
        <Chip
          icon={
            <FiberManualRecordIcon
              sx={{
                fontSize: '10px !important',
                color: '#16A34A !important',
                animation: 'pulseSTT 1.5s infinite',
                '@keyframes pulseSTT': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.3 },
                  '100%': { opacity: 1 },
                },
              }}
            />
          }
          size="small"
          label="Deepgram Nova-3 Active"
          sx={{
            bgcolor: '#F0FDF4',
            color: '#15803D',
            border: '1px solid #BBF7D0',
            fontWeight: 700,
            fontSize: '0.6875rem',
          }}
        />
      );
    }

    if (sttStatus === 'connecting') {
      return (
        <Chip
          icon={<CircularProgress size={10} color="inherit" />}
          size="small"
          label="Connecting STT Stream..."
          sx={{
            bgcolor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
            fontWeight: 600,
            fontSize: '0.6875rem',
          }}
        />
      );
    }

    if (sttStatus === 'unconfigured') {
      return (
        <Tooltip title="Configure DEEPGRAM_API_KEY in storelistner-backend/.env to enable live transcription">
          <Chip
            size="small"
            label="STT Unconfigured (API Key Missing)"
            sx={{
              bgcolor: '#FFFBEB',
              color: '#B45309',
              border: '1px solid #FDE68A',
              fontWeight: 600,
              fontSize: '0.6875rem',
            }}
          />
        </Tooltip>
      );
    }

    if (sttStatus === 'error') {
      return (
        <Chip
          size="small"
          label="STT Connection Error"
          sx={{
            bgcolor: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
            fontWeight: 600,
            fontSize: '0.6875rem',
          }}
        />
      );
    }

    if (sttStatus === 'closed') {
      return (
        <Chip
          size="small"
          label="Session Closed"
          sx={{
            bgcolor: '#F1F5F9',
            color: '#64748B',
            fontWeight: 600,
            fontSize: '0.6875rem',
          }}
        />
      );
    }

    return (
      <Chip
        size="small"
        label="Standby"
        sx={{
          bgcolor: '#F1F5F9',
          color: '#64748B',
          fontWeight: 600,
          fontSize: '0.6875rem',
        }}
      />
    );
  };

  return (
    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #E2E8F0' }}>
      {/* Header bar of Transcript Section */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <RecordVoiceOverIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>
            Real-Time Speech-to-Text Transcript
          </Typography>
          {sessionId && (
            <Chip
              size="small"
              label={`Session: ${sessionId}`}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontFamily: 'monospace',
                bgcolor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: 'text.secondary',
              }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {renderStatusBadge()}
        </Stack>
      </Stack>

      {/* Unconfigured Notice Alert */}
      {sttStatus === 'unconfigured' && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            borderRadius: 2,
            fontSize: '0.8125rem',
            border: '1px solid #FDE68A',
            bgcolor: '#FFFBEB',
          }}
        >
          <strong>Speech-to-Text Provider Not Configured:</strong> Set <code>DEEPGRAM_API_KEY</code> in{' '}
          <code>storelistner-backend/.env</code> and restart the backend server. Audio recording is still running and
          saving locally.
        </Alert>
      )}

      {/* STT Error Alert */}
      {sttStatus === 'error' && sttError && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: 2,
            fontSize: '0.8125rem',
            border: '1px solid #FECACA',
            bgcolor: '#FEF2F2',
          }}
        >
          <strong>Transcription Provider Error:</strong> {sttError}
        </Alert>
      )}

      {/* Transcript Scroll Area */}
      <Paper
        ref={scrollRef}
        elevation={0}
        sx={{
          minHeight: 180,
          maxHeight: 280,
          overflowY: 'auto',
          p: 2.5,
          bgcolor: '#F8FAFC',
          borderRadius: 2.5,
          border: '1px solid #E2E8F0',
          position: 'relative',
        }}
      >
        {/* State 1: Idle and No Transcript */}
        {recordingState === 'idle' && transcriptSegments.length === 0 && !interimText && (
          <Stack
            direction="column"
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={{ height: 140, color: 'text.secondary', textAlign: 'center' }}
          >
            <HearingIcon sx={{ fontSize: 36, color: '#94A3B8' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748B' }}>
              Live Transcript Ready
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', maxWidth: 400 }}>
              Once you start a customer recording with required consent, streaming speech recognition results will appear
              here in real time.
            </Typography>
          </Stack>
        )}

        {/* State 2: Recording, STT connecting / waiting for first word */}
        {(isRecording || isPaused) && transcriptSegments.length === 0 && !interimText && (
          <Stack
            direction="column"
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={{ height: 140, color: 'text.secondary', textAlign: 'center' }}
          >
            {sttStatus === 'connecting' ? (
              <>
                <CircularProgress size={24} sx={{ color: '#2563EB', mb: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                  Establishing secure audio stream to Deepgram...
                </Typography>
              </>
            ) : sttStatus === 'active' ? (
              <>
                <WaveformIcon sx={{ fontSize: 32, color: '#16A34A', mb: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                  Listening for spoken dialogue...
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  Words will appear in real time as speech is recognized.
                </Typography>
              </>
            ) : (
              <>
                <HearingIcon sx={{ fontSize: 32, color: '#94A3B8' }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748B' }}>
                  Awaiting audio transcription stream
                </Typography>
              </>
            )}
          </Stack>
        )}

        {/* State 3: Render Confirmed & Interim Segments */}
        {(transcriptSegments.length > 0 || Boolean(interimText)) && (
          <Stack spacing={1.5}>
            {transcriptSegments.map((seg, idx) => {
              const startFormatted = formatSeconds(seg.startTime);
              const endFormatted = formatSeconds(seg.endTime);
              const timeDisplay =
                startFormatted !== null && endFormatted !== null
                  ? `${startFormatted} - ${endFormatted}`
                  : startFormatted !== null
                  ? `${startFormatted}`
                  : null;

              return (
                <Box
                  key={seg.segmentId || `seg-${idx}`}
                  sx={{
                    p: 1.5,
                    bgcolor: '#FFFFFF',
                    borderRadius: 2,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Chip
                      size="small"
                      label={seg.speaker !== undefined && seg.speaker !== null ? `Speaker ${seg.speaker}` : 'Speaker'}
                      sx={{
                        height: 20,
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        bgcolor: '#F1F5F9',
                        color: '#334155',
                      }}
                    />
                    {timeDisplay && (
                      <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        [{timeDisplay}]
                      </Typography>
                    )}
                    <Chip
                      size="small"
                      label="Finalized"
                      sx={{
                        height: 18,
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        bgcolor: '#F0FDF4',
                        color: '#16A34A',
                        border: '1px solid #BBF7D0',
                      }}
                    />
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#0F172A',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      pl: 0.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {seg.text}
                  </Typography>
                </Box>
              );
            })}

            {/* Interim Results (italicized recognition in flight) */}
            {interimText && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: '#F8FAFC',
                  borderRadius: 2,
                  border: '1px dashed #CBD5E1',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Chip
                    size="small"
                    label="Speaker"
                    sx={{
                      height: 20,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      bgcolor: '#E2E8F0',
                      color: '#475569',
                    }}
                  />
                  <Chip
                    size="small"
                    label="Interim..."
                    sx={{
                      height: 18,
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      bgcolor: '#EFF6FF',
                      color: '#2563EB',
                      border: '1px solid #BFDBFE',
                    }}
                  />
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#475569',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                    pl: 0.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {interimText}
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
