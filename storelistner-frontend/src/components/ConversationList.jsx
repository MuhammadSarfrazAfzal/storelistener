import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  IconButton,
  Avatar,
  Paper,
  Divider,
  CircularProgress,
  ButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  VolumeUp as VolumeUpIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassIcon,
  Description as DocumentIcon,
  Store as StoreIcon,
  Headset as HeadsetIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

import SessionDetailModal from './SessionDetailModal';

const BACKEND_URL = 'http://localhost:5000';

export default function ConversationList({
  sessions: propSessions,
  selectedStore = 'STORE-NYC-01',
  onSelectSession: propOnSelectSession,
}) {
  const [sessions, setSessions] = useState(propSessions || []);
  const [loading, setLoading] = useState(false);
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [playingSessionId, setPlayingSessionId] = useState(null);
  const [modalSession, setModalSession] = useState(null);

  // If sessions not passed down as prop, fetch from backend automatically
  useEffect(() => {
    if (propSessions && propSessions.length > 0) {
      setSessions(propSessions);
      return;
    }

    const fetchSessions = async () => {
      setLoading(true);
      try {
        const query = selectedStore ? `?storeCode=${selectedStore}` : '';
        const res = await fetch(`${BACKEND_URL}/api/sessions${query}`);
        const data = await res.json();
        if (data.success && data.sessions) {
          setSessions(data.sessions);
        }
      } catch (err) {
        console.warn('Could not fetch sessions:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [propSessions, selectedStore]);

  const filtered = sessions.filter((s) => {
    if (filterOutcome === 'all') return true;
    return s.analytics?.dealOutcome === filterOutcome;
  });

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'won':
        return (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#059669 !important' }} />}
            label="WON (CLOSED)"
            size="small"
            sx={{
              bgcolor: '#ecfdf5',
              color: '#047857',
              fontWeight: 800,
              border: '1px solid #a7f3d0',
              fontSize: '0.72rem',
            }}
          />
        );
      case 'lost':
        return (
          <Chip
            icon={<CancelIcon sx={{ fontSize: '14px !important', color: '#ef4444 !important' }} />}
            label="LOST"
            size="small"
            sx={{
              bgcolor: '#fef2f2',
              color: '#b91c1c',
              fontWeight: 800,
              border: '1px solid #fecaca',
              fontSize: '0.72rem',
            }}
          />
        );
      default:
        return (
          <Chip
            icon={<HourglassIcon sx={{ fontSize: '14px !important', color: '#f59e0b !important' }} />}
            label="IN NEGOTIATION"
            size="small"
            sx={{
              bgcolor: '#fef3c7',
              color: '#b45309',
              fontWeight: 800,
              border: '1px solid #fde68a',
              fontSize: '0.72rem',
            }}
          />
        );
    }
  };

  const handleInspect = (session) => {
    if (propOnSelectSession) {
      propOnSelectSession(session);
    } else {
      setModalSession(session);
    }
  };

  return (
    <Card sx={{ borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e2e8f0', p: { xs: 2, sm: 3 } }}>
      {/* Header & Filter Controls */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Recorded Store Conversations ({filtered.length})
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Audit recorded customer dialogues with synchronized Urdu/Punjabi/English transcripts & AI analytics
          </Typography>
        </Box>

        {/* Filter Pills */}
        <ButtonGroup variant="outlined" size="small">
          {[
            { id: 'all', label: 'All' },
            { id: 'won', label: 'Deals Won' },
            { id: 'lost', label: 'Lost' },
            { id: 'in_negotiation', label: 'Negotiation' },
          ].map((f) => (
            <Button
              key={f.id}
              onClick={() => setFilterOutcome(f.id)}
              variant={filterOutcome === f.id ? 'contained' : 'outlined'}
              sx={{
                fontWeight: 700,
                fontSize: '0.78rem',
                bgcolor: filterOutcome === f.id ? '#059669' : '#ffffff',
                color: filterOutcome === f.id ? '#ffffff' : '#047857',
                borderColor: '#a7f3d0',
                '&:hover': {
                  bgcolor: filterOutcome === f.id ? '#047857' : '#ecfdf5',
                },
              }}
            >
              {f.label}
            </Button>
          ))}
        </ButtonGroup>
      </Stack>

      {/* Sessions List */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={32} sx={{ color: '#059669', mb: 1.5 }} />
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Loading audit records...
          </Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            textAlign: 'center',
            py: 6,
            borderRadius: 2.5,
            bgcolor: '#f8fafc',
            borderColor: '#e2e8f0',
          }}
        >
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            No recorded conversations matching this filter. Start a live recording or simulator session to view dialogues here.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {filtered.map((session) => {
            const hasAudio = !!session.audioUrl;
            const fullAudioUrl = hasAudio ? `${BACKEND_URL}${session.audioUrl}` : null;
            const isPlayingThis = playingSessionId === session.sessionId;

            return (
              <Paper
                key={session.sessionId}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: '#ffffff',
                  borderColor: '#e2e8f0',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: '#10b981',
                    boxShadow: '0 4px 16px -2px rgba(5, 150, 105, 0.08)',
                  },
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  spacing={2}
                >
                  {/* Left: Icon & Store/Rep Details */}
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: hasAudio ? '#ecfdf5' : '#f1f5f9',
                        color: hasAudio ? '#059669' : '#64748b',
                        width: 42,
                        height: 42,
                        borderRadius: 2,
                      }}
                    >
                      {hasAudio ? <VolumeUpIcon /> : <DocumentIcon />}
                    </Avatar>

                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {session.storeName || session.storeCode}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                          #{session.sessionId?.slice(-6)}
                        </Typography>
                        {hasAudio && (
                          <Chip
                            label="AUDIO READY"
                            size="small"
                            sx={{
                              bgcolor: '#ecfdf5',
                              color: '#047857',
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                            }}
                          />
                        )}
                      </Stack>

                      <Typography variant="caption" sx={{ color: '#64748b', mt: 0.25, display: 'block' }}>
                        Rep: <strong>{session.salesRep || 'Specialist'}</strong> • Duration: {session.durationSeconds || 45}s • {session.startedAt ? new Date(session.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Middle: Devices discussed */}
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {(session.analytics?.devicesDiscussed || []).slice(0, 2).map((dev, i) => (
                      <Chip
                        key={i}
                        label={dev}
                        size="small"
                        sx={{
                          bgcolor: '#f1f5f9',
                          color: '#334155',
                          fontWeight: 600,
                          fontSize: '0.72rem',
                        }}
                      />
                    ))}
                  </Stack>

                  {/* Right: Outcome badge & Action buttons */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    {getOutcomeBadge(session.analytics?.dealOutcome)}

                    {hasAudio && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setPlayingSessionId(isPlayingThis ? null : session.sessionId)}
                        startIcon={<HeadsetIcon />}
                        sx={{
                          borderColor: '#a7f3d0',
                          color: '#047857',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          '&:hover': { bgcolor: '#ecfdf5' },
                        }}
                      >
                        {isPlayingThis ? 'Hide Player' : 'Play Audio'}
                      </Button>
                    )}

                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleInspect(session)}
                      startIcon={<PlayArrowIcon />}
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      Inspect
                    </Button>
                  </Stack>
                </Stack>

                {/* Inline Audio Player if open */}
                {isPlayingThis && fullAudioUrl && (
                  <Box
                    sx={{
                      mt: 2,
                      pt: 1.5,
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#047857', fontWeight: 700 }}>
                      🎧 Voice Recording: #{session.sessionId?.slice(-6)} ({session.salesRep})
                    </Typography>
                    <Box component="audio" controls autoPlay src={fullAudioUrl} sx={{ height: 32, width: 320 }} />
                  </Box>
                )}
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Internal Modal when not handled externally */}
      {modalSession && (
        <SessionDetailModal session={modalSession} onClose={() => setModalSession(null)} />
      )}
    </Card>
  );
}
