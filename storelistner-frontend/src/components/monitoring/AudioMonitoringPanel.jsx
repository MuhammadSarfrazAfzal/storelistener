/**
 * Storelistener — Audio Monitoring Panel Component for Live Monitoring
 * File: src/components/monitoring/AudioMonitoringPanel.jsx
 */

import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  Box,
  Chip,
  Paper,
  Tooltip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  VolumeOffOutlined as AudioStandbyIcon,
  PlayArrow as PlayIcon,
  GraphicEq as WaveIcon,
  MicNone as MicIcon,
} from '@mui/icons-material';

// 16-bar restrained waveform visual placeholder
const WAVEFORM_HEIGHTS = [20, 35, 60, 45, 80, 65, 30, 70, 90, 55, 40, 75, 50, 35, 60, 25];

export default function AudioMonitoringPanel({ conversation }) {
  if (!conversation) return null;

  return (
    <Card sx={{ mb: 2.5 }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Audio Feed Monitor
            </Typography>
            <Chip
              size="small"
              icon={<WaveIcon sx={{ fontSize: '11px !important', color: 'secondary.main !important' }} />}
              label="Simulated Waveform"
              sx={{
                height: 20,
                fontSize: '0.625rem',
                fontWeight: 600,
                bgcolor: '#EFF6FF',
                color: 'secondary.dark',
              }}
            />
          </Stack>
        }
        subheader={
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            Counter microphone hardware stream representation
          </Typography>
        }
        sx={{ p: 2, pb: 1.5 }}
      />
      <Divider />

      <CardContent sx={{ p: 2 }}>
        {/* Waveform Visualization Container */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: '#F8FAFC',
            borderRadius: 1.5,
            mb: 2,
          }}
        >
          {/* Status Label Row */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <MicIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Counter Terminal Audio Stream
              </Typography>
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
              48 kHz • Mono
            </Typography>
          </Stack>

          {/* Restrained Static Waveform Graphic */}
          <Box
            sx={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              px: 1,
            }}
          >
            {WAVEFORM_HEIGHTS.map((heightPercent, index) => (
              <Box
                key={index}
                sx={{
                  width: 4,
                  height: `${heightPercent}%`,
                  bgcolor: index % 3 === 0 ? 'secondary.main' : '#CBD5E1',
                  borderRadius: 1,
                  transition: 'height 200ms ease',
                }}
              />
            ))}
          </Box>
        </Paper>

        {/* Playback Controls & Connection Status */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Play/Pause Control explicitly disabled with transparent explanatory tooltip */}
            <Tooltip title="Audio playback is disabled in Module 2. Counter audio archives and playback controls are scheduled for Module 3.">
              <span>
                <IconButton
                  size="small"
                  disabled
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    bgcolor: '#F1F5F9',
                  }}
                  aria-label="play audio demonstration"
                >
                  <PlayIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Playback: <strong style={{ color: '#64748B' }}>Stream Only</strong>
            </Typography>
          </Stack>

          {/* Connection note badge */}
          <Stack direction="row" spacing={0.75} alignItems="center">
            <AudioStandbyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
              Direct streaming requires Electron client
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
