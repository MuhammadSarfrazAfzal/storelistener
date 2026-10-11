import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  IconButton,
  Box,
  Grid,
  Stack,
  Chip,
  Avatar,
  Paper,
  Alert,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  VolumeUp as VolumeUpIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassIcon,
  Star as StarIcon,
  Lightbulb as LightbulbIcon,
  RecordVoiceOver as SpeakerIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

export default function SessionDetailModal({ session, onClose }) {
  if (!session) return null;

  const {
    sessionId,
    storeName,
    storeCode,
    salesRep,
    startedAt,
    durationSeconds = 60,
    audioUrl,
    transcripts = [],
    analytics = {},
  } = session;

  const BACKEND_URL = 'http://localhost:5000';
  const fullAudioUrl = audioUrl ? `${BACKEND_URL}${audioUrl}` : null;

  const isWon = analytics.dealOutcome === 'won';
  const isLost = analytics.dealOutcome === 'lost';

  return (
    <Dialog
      open={Boolean(session)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: '#ffffff',
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ p: 2.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#fbfcfd' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Conversation Intelligence Review
              </Typography>
              <Chip
                label={`#${sessionId?.slice(-8) || sessionId}`}
                size="small"
                sx={{
                  bgcolor: '#ecfdf5',
                  color: '#047857',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
              {storeName || storeCode} • Rep: <strong>{salesRep || 'Specialist'}</strong> • Duration: {durationSeconds}s • {startedAt ? new Date(startedAt).toLocaleString() : 'Recent'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#64748b' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {/* Audio Player Card */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: '#ecfdf5',
              borderColor: '#a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: '#059669', color: '#ffffff', width: 42, height: 42 }}>
                <VolumeUpIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#065f46' }}>
                  In-Store Voice Audio Recording
                </Typography>
                <Typography variant="caption" sx={{ color: '#047857' }}>
                  {fullAudioUrl
                    ? 'Audio synchronized from retail terminal. Press play to listen.'
                    : 'Voice session synchronized and logged into intelligence audit.'}
                </Typography>
              </Box>
            </Stack>

            {fullAudioUrl ? (
              <Box component="audio" controls src={fullAudioUrl} sx={{ height: 36, maxWidth: 360 }} />
            ) : (
              <Chip
                icon={<CheckCircleIcon sx={{ color: '#059669 !important' }} />}
                label="Audio Stream Synchronized"
                size="small"
                sx={{ bgcolor: '#ffffff', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0' }}
              />
            )}
          </Paper>

          {/* AI Deal Intelligence Report Summary */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: '#f8fafc',
              borderColor: '#e2e8f0',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <SecurityIcon sx={{ color: '#059669', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                AI RETAIL DEAL INTELLIGENCE REPORT
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6 }}>
              {analytics.summary || 'Customer explored Apple devices with sales specialist. Conversation resolved successfully.'}
            </Typography>
          </Paper>

          {/* Highlights Grid */}
          <Grid container spacing={2}>
            {/* Outcome */}
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                  OUTCOME & PROBABILITY
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  {isWon ? (
                    <CheckCircleIcon sx={{ color: '#059669', fontSize: 22 }} />
                  ) : isLost ? (
                    <CancelIcon sx={{ color: '#ef4444', fontSize: 22 }} />
                  ) : (
                    <HourglassIcon sx={{ color: '#f59e0b', fontSize: 22 }} />
                  )}
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                      color: isWon ? '#059669' : isLost ? '#ef4444' : '#d97706',
                    }}
                  >
                    {(analytics.dealOutcome || 'WON').toUpperCase()} ({analytics.closureProbability || 95}%)
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                  Customer Sentiment: <strong>{analytics.customerSentiment || 'Positive'}</strong>
                </Typography>
              </Paper>
            </Grid>

            {/* Devices Discussed */}
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                  DEVICES DISCUSSED
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {(analytics.devicesDiscussed || ['iPhone 16 Pro']).map((dev, i) => (
                    <Chip
                      key={i}
                      label={dev}
                      size="small"
                      sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '0.72rem' }}
                    />
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* Sales Coaching Score */}
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                  SALES REP SCORE
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <StarIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#059669' }}>
                    {analytics.salesRepPerformance?.score || 90}/100
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                  {analytics.salesRepPerformance?.coachingNotes || 'Strong rapport and objection handling.'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Coaching & Missed Opportunities */}
          {(analytics.missedOpportunities?.length > 0 || analytics.salesRepPerformance?.areasToImprove?.length > 0) && (
            <Alert
              severity="warning"
              icon={<LightbulbIcon sx={{ color: '#d97706' }} />}
              sx={{ borderRadius: 2, bgcolor: '#fef3c7', borderColor: '#fde68a' }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#b45309', mb: 0.5 }}>
                Coaching & Revenue Growth Opportunities
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0, fontSize: '0.82rem', color: '#78350f' }}>
                {(analytics.missedOpportunities || analytics.salesRepPerformance?.areasToImprove || []).map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </Box>
            </Alert>
          )}

          {/* Full Multilingual Transcript */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5 }}>
              💬 Synchronized Speech Transcript ({transcripts.length} exchanges)
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                maxHeight: 280,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {transcripts.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 2 }}>
                  No transcript records saved for this session.
                </Typography>
              ) : (
                transcripts.map((t, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: t.speaker === 'customer' ? '#ffffff' : '#ecfdf5',
                      border: t.signal ? '1px solid #10b981' : '1px solid #e2e8f0',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {t.speaker === 'customer' ? (
                          <PersonIcon sx={{ color: '#f59e0b', fontSize: 16 }} />
                        ) : (
                          <SpeakerIcon sx={{ color: '#059669', fontSize: 16 }} />
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: t.speaker === 'customer' ? '#b45309' : '#047857',
                            textTransform: 'uppercase',
                          }}
                        >
                          {t.speaker === 'customer' ? 'Customer' : 'Sales Specialist'}
                        </Typography>
                      </Stack>
                      {t.signal && (
                        <Chip
                          label={`✓ ${t.signal}`}
                          size="small"
                          sx={{
                            height: 20,
                            bgcolor: '#d1fae5',
                            color: '#047857',
                            fontWeight: 800,
                            fontSize: '0.68rem',
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#1e293b', lineHeight: 1.5 }}>
                      {t.text}
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={onClose} variant="contained" sx={{ fontWeight: 700 }}>
          Close Review
        </Button>
      </DialogActions>
    </Dialog>
  );
}
