import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Chip,
  Button,
  IconButton,
  Avatar,
  Paper,
  Alert,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Sensors as SensorsIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Headset as HeadsetIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Launch as LaunchIcon,
  FiberManualRecord as DotIcon,
  Campaign as DealIcon,
} from '@mui/icons-material';

export default function LiveMonitorWall({ liveSessions = [], activeAlert, onInspectSession, socket }) {
  const [waveHeights, setWaveHeights] = useState([20, 45, 75, 30, 60, 90, 40, 65, 80, 50, 25, 70]);
  const [listeningSessionId, setListeningSessionId] = useState(null);

  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentAudioElementRef = useRef(null);

  // Animated spectrum
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveHeights((prev) => prev.map(() => Math.floor(Math.random() * 75) + 15));
    }, 180);
    return () => clearInterval(interval);
  }, []);

  // Play next audio chunk in FIFO queue
  const playNextChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const nextAudioSrc = audioQueueRef.current.shift();
    try {
      const audio = new Audio(nextAudioSrc);
      currentAudioElementRef.current = audio;
      audio.onended = () => {
        playNextChunk();
      };
      audio.onerror = (e) => {
        console.warn('Audio playback error:', e);
        playNextChunk();
      };
      audio.play().catch((e) => {
        console.warn('Browser autoplay policy note:', e.message);
        playNextChunk();
      });
    } catch (err) {
      playNextChunk();
    }
  };

  // Socket listener for real-time live audio chunks
  useEffect(() => {
    if (!socket) return;

    const handleLiveAudio = (data) => {
      if (!data || !data.audioData) return;

      if (listeningSessionId && (listeningSessionId === data.sessionId || listeningSessionId === 'all')) {
        audioQueueRef.current.push(data.audioData);
        if (!isPlayingRef.current) {
          playNextChunk();
        }
      }
    };

    socket.on('global_live_audio', handleLiveAudio);
    socket.on('admin_live_audio', handleLiveAudio);

    return () => {
      socket.off('global_live_audio', handleLiveAudio);
      socket.off('admin_live_audio', handleLiveAudio);
    };
  }, [socket, listeningSessionId]);

  const toggleListen = (sessionId) => {
    if (listeningSessionId === sessionId) {
      setListeningSessionId(null);
      audioQueueRef.current = [];
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
      isPlayingRef.current = false;
    } else {
      setListeningSessionId(sessionId);
      audioQueueRef.current = [];
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Deal Alert Banner */}
      {activeAlert && (
        <Alert
          severity="success"
          icon={<DealIcon sx={{ color: '#059669', fontSize: 26 }} />}
          action={
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={() => onInspectSession && onInspectSession(activeAlert.sessionId)}
              sx={{ fontWeight: 700, borderColor: '#059669', color: '#047857' }}
            >
              Inspect Deal
            </Button>
          }
          sx={{
            mb: 2.5,
            borderRadius: 3,
            bgcolor: '#ecfdf5',
            border: '2px solid #10b981',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.18)',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#065f46' }}>
            🎉 IN-STORE DEAL CLOSURE DETECTED!
          </Typography>
          <Typography variant="body2" sx={{ color: '#047857', mt: 0.5 }}>
            Customer Trigger: <strong>"{activeAlert.signal || activeAlert.text}"</strong>
            {activeAlert.sessionId && ` • Session #${activeAlert.sessionId.slice(-6)}`}
          </Typography>
        </Alert>
      )}

      {/* Live Channels Grid */}
      {liveSessions.length === 0 ? (
        <Card
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: '#ecfdf5',
                  color: '#059669',
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                }}
              >
                <SensorsIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Live Store Radar: Standby & Monitoring Active
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Awaiting audio speech from in-store terminals or web recorder. Real-time transcripts stream here.
                </Typography>
              </Box>
            </Stack>

            <Chip
              icon={<DotIcon sx={{ color: '#10b981 !important', fontSize: '14px !important' }} />}
              label="All Terminals Active"
              size="small"
              sx={{
                bgcolor: '#ecfdf5',
                color: '#047857',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
              }}
            />
          </Stack>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {liveSessions.map((session) => {
            const isListeningToThis = listeningSessionId === session.sessionId;

            return (
              <Grid item xs={12} md={6} key={session.sessionId}>
                <Card
                  sx={{
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    border: isListeningToThis ? '2px solid #059669' : '1px solid #e2e8f0',
                    boxShadow: isListeningToThis
                      ? '0 8px 24px rgba(5, 150, 105, 0.16)'
                      : '0 2px 10px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    {/* Card Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          icon={<DotIcon sx={{ color: '#ef4444 !important', fontSize: '12px !important' }} />}
                          label="LIVE MONITOR"
                          size="small"
                          sx={{
                            bgcolor: '#fef2f2',
                            color: '#b91c1c',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            border: '1px solid #fecaca',
                          }}
                        />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {session.storeName || session.storeCode}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        Rep: {session.salesRep || 'Specialist'}
                      </Typography>
                    </Stack>

                    {/* Audio Pulse Visualizer + Audio Listen Bar */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        mb: 2,
                        borderRadius: 2,
                        bgcolor: isListeningToThis ? '#ecfdf5' : '#f8fafc',
                        borderColor: isListeningToThis ? '#a7f3d0' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <VolumeUpIcon sx={{ color: isListeningToThis ? '#059669' : '#64748b', fontSize: 20 }} />
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: isListeningToThis ? '#047857' : '#64748b',
                          }}
                        >
                          {isListeningToThis
                            ? '🔴 Streaming live to speakers'
                            : 'In-Store Counter Stream'}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Button
                          size="small"
                          variant={isListeningToThis ? 'contained' : 'outlined'}
                          onClick={() => toggleListen(session.sessionId)}
                          startIcon={isListeningToThis ? <VolumeOffIcon /> : <HeadsetIcon />}
                          sx={{
                            fontSize: '0.75rem',
                            py: 0.5,
                            px: 1.5,
                            bgcolor: isListeningToThis ? '#059669' : '#ffffff',
                            color: isListeningToThis ? '#ffffff' : '#047857',
                            borderColor: '#a7f3d0',
                            '&:hover': {
                              bgcolor: isListeningToThis ? '#047857' : '#ecfdf5',
                            },
                          }}
                        >
                          {isListeningToThis ? 'Mute' : 'Listen Live'}
                        </Button>

                        {/* Spectrum Waves */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', height: 20 }}>
                          {waveHeights.slice(0, 8).map((h, i) => (
                            <Box
                              key={i}
                              sx={{
                                width: 3,
                                height: `${h}%`,
                                bgcolor: isListeningToThis ? '#059669' : '#cbd5e1',
                                borderRadius: 1,
                                transition: 'height 0.15s ease',
                              }}
                            />
                          ))}
                        </Box>
                      </Stack>
                    </Paper>

                    {/* Live Transcript ticker */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        mb: 2,
                        minHeight: 72,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#059669',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Live Recognized Speech:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#1e293b',
                          fontStyle: 'italic',
                          lineHeight: 1.45,
                          mt: 0.5,
                        }}
                      >
                        "{session.latestTranscript || 'Listening to conversation at sales desk...'}"
                      </Typography>
                    </Box>

                    {/* Live Probability Meter & Inspect Button */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TrendingUpIcon
                          sx={{
                            color: (session.probability || 50) > 70 ? '#059669' : '#d97706',
                            fontSize: 18,
                          }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                          Closure Probability:
                        </Typography>
                        <Chip
                          label={`${session.probability || 50}%`}
                          size="small"
                          sx={{
                            height: 22,
                            fontWeight: 800,
                            bgcolor: (session.probability || 50) > 70 ? '#ecfdf5' : '#fef3c7',
                            color: (session.probability || 50) > 70 ? '#047857' : '#b45309',
                          }}
                        />
                      </Stack>

                      <Button
                        size="small"
                        endIcon={<LaunchIcon sx={{ fontSize: 14 }} />}
                        onClick={() => onInspectSession && onInspectSession(session.sessionId)}
                        sx={{
                          fontSize: '0.8rem',
                          color: '#059669',
                          fontWeight: 700,
                          '&:hover': { bgcolor: '#ecfdf5' },
                        }}
                      >
                        View Details
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
